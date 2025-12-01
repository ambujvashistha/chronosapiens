import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import mysql from 'mysql2/promise';
import { createObjectCsvWriter } from 'csv-writer';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

dotenv.config();

const BASE_URL = 'https://internshala.com/internships';

const HEADLESS_MODE = (process.env.HEADLESS || 'false').toLowerCase() === 'true' || (process.env.HEADLESS || '0') === '1';
const DB_ENABLED = (process.env.DB_ENABLED || 'true').toLowerCase() === 'true' || (process.env.DB_ENABLED || '1') === '1';

const FRESHNESS_OPTIONS = {
    '1': { days: 1, text: 'Last 1 day' },
    '2': { days: 3, text: 'Last 3 days' },
    '3': { days: 7, text: 'Last 7 days' },
    '4': { days: 15, text: 'Last 15 days' },
    '5': { days: 30, text: 'Last 30 days' }
};

function ensureFolder(p) {
    try { fs.mkdirSync(p, { recursive: true }); } catch (e) { }
}


async function dbConnect() {
    if (!DB_ENABLED) return null;
    try {
        let connectionConfig = {};
        if (process.env.DATABASE_URL) {
            connectionConfig = { uri: process.env.DATABASE_URL, multipleStatements: false };
        } else {
            connectionConfig = {
                host: process.env.MYSQL_HOST || 'localhost',
                user: process.env.MYSQL_USER || 'root',
                password: process.env.MYSQL_PASSWORD || 'password',
                database: process.env.MYSQL_DB || 'internshala_db',
                multipleStatements: false
            };
        }
        const conn = await mysql.createConnection(connectionConfig);
        return conn;
    } catch (e) {
        console.warn('⚠️ Could not connect to DB:', e.message);
        return null;
    }
}

async function ensureInternshipTable(conn) {
    if (!conn) return;
    const q = `
    CREATE TABLE IF NOT EXISTS internships (
      internship_url VARCHAR(600) PRIMARY KEY,
      title VARCHAR(300),
      company VARCHAR(300),
      location VARCHAR(300),
      stipend VARCHAR(200),
      duration VARCHAR(100),
      start_date VARCHAR(100),
      apply_by VARCHAR(100),
      applicants VARCHAR(100),
      skills TEXT,
      openings VARCHAR(100),
      category VARCHAR(100),
      page INT,
      data_hash CHAR(64),
      first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
    await conn.execute(q);
}

function computeInternshipHash(info) {
    const fields = [
        'Title', 'Company', 'Location', 'Stipend', 'Duration', 'Start Date', 'Apply By'
    ];
    const s = fields.map(k => info[k] || '').join('|');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

async function upsertInternship(conn, info) {
    if (!conn) return;
    const dataHash = computeInternshipHash(info);
    const q = `INSERT INTO internships (internship_url, title, company, location, stipend, duration,
    start_date, apply_by, applicants, skills, openings, category, page, data_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE title=VALUES(title), company=VALUES(company), location=VALUES(location),
      stipend=VALUES(stipend), duration=VALUES(duration), start_date=VALUES(start_date),
      apply_by=VALUES(apply_by), applicants=VALUES(applicants), skills=VALUES(skills),
      openings=VALUES(openings), category=VALUES(category), data_hash=VALUES(data_hash)`;
    const vals = [
        info['Internship URL'], info['Title'], info['Company'], info['Location'], info['Stipend'],
        info['Duration'], info['Start Date'], info['Apply By'], info['Applicants'], info['Skills'],
        info['Openings'], info['Category'], info['Page'], dataHash
    ];
    await conn.execute(q, vals);
}

async function loadExisting(conn) {
    const urls = new Set();
    const hashes = {};
    if (!conn) return { urls, hashes };
    const [rows] = await conn.execute('SELECT internship_url, data_hash FROM internships');
    for (const r of rows) {
        urls.add(r.internship_url);
        hashes[r.internship_url] = r.data_hash;
    }
    return { urls, hashes };
}

const rl = readline.createInterface({ input, output });

async function getIntInput(promptText, defaultVal = null) {
    while (true) {
        const v = (await rl.question(promptText)).trim();
        if (!v && defaultVal !== null) return defaultVal;
        const parsed = parseInt(v);
        if (!isNaN(parsed)) return parsed;
        console.log('⚠️ Please enter a valid number.');
    }
}

async function getChoice(promptText, choices) {
    while (true) {
        const v = (await rl.question(promptText)).trim();
        if (choices.includes(v)) return v;
        console.log(`⚠️ Choose one of ${choices}`);
    }
}

async function chooseFreshness() {
    console.log('\n📅 Freshness filters:');
    for (const k of Object.keys(FRESHNESS_OPTIONS)) {
        console.log(` ${k}. ${FRESHNESS_OPTIONS[k].text}`);
    }
    const key = await getChoice('Select freshness (1-5): ', Object.keys(FRESHNESS_OPTIONS));
    return FRESHNESS_OPTIONS[key];
}

async function gotoWithRetries(page, url, attempts = 3) {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            return true;
        } catch (e) {
            lastErr = e;
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                return true;
            } catch (e2) {
                lastErr = e2;
            }
        }
        await new Promise(res => setTimeout(res, 1000 + i * 1000));
    }
    console.log(`   ❌ Failed to load URL after retries: ${url} | ${lastErr}`);
    return false;
}

async function parseInternshipCard(card) {
    let title = null, href = null, company = null, location = null, stipend = null, duration = null;
    try {
        const links = card.locator('a');
        const linkCount = await links.count();
        for (let i = 0; i < linkCount; i++) {
            const h = await links.nth(i).getAttribute('href');
            if (h && h.includes('/internship/')) {
                href = h.startsWith('http') ? h : 'https://internshala.com' + h;
                break;
            }
        }

        const titleLoc = card.locator(".heading_4_5, .profile, h3, .internship_meta a, .internship_meta h3, .job-internship-name, a[href*='/internship/']").first();
        if (await titleLoc.count() > 0) title = (await titleLoc.innerText()).trim();

        const selectors = [
            { sel: ".company_name a, .company, .company_name, a.company_name", var: "company" },
            { sel: ".location, .location_link, .internship_location", var: "location" },
            { sel: ".stipend, .stp", var: "stipend" },
            { sel: ".duration, span:has-text('Duration') ~ span, span:has-text('month'), span:has-text('Month'), span:has-text('week'), span:has-text('Week')", var: "duration" }
        ];

        for (const { sel, var: varName } of selectors) {
            try {
                const loc = card.locator(sel).first();
                if (await loc.count() > 0) {
                    const val = (await loc.innerText()).trim();
                    if (varName === "company") company = val;
                    else if (varName === "location") location = val;
                    else if (varName === "stipend") stipend = val;
                    else if (varName === "duration") duration = val;
                }
            } catch (e) { }
        }
    } catch (e) { }
    return { title, company, location, stipend, duration, href };
}

async function parseDetailPage(page) {
    async function safe(sel) {
        try {
            const el = page.locator(sel).first();
            if (await el.count() > 0) return (await el.innerText()).trim();
        } catch (e) { }
        return "N/A";
    }

    const start_date = await safe(".start-date-container .item_body, .start_date");
    const apply_by = await safe(".apply_by .item_body");
    const applicants = await safe(".applications_message .message, .total_applications");
    const openings = await safe(".openings .item_body");
    const category = await safe(".profile_on_detail_page, h1.profile");

    let skills = "N/A";
    try {
        const skillsElements = page.locator(".round_tabs_container .round_tabs");
        const count = await skillsElements.count();
        if (count > 0) {
            const skillList = [];
            for (let i = 0; i < count; i++) {
                skillList.push((await skillsElements.nth(i).innerText()).trim());
            }
            skills = skillList.join(', ');
        }
    } catch (e) { }

    let postedAgeDays = null;
    try {
        const txt = (await page.innerText('body')).toLowerCase();
        if (txt.includes('post')) {
            const m = txt.match(/posted\s*(\d{1,3})\s*day/);
            if (m) {
                postedAgeDays = parseInt(m[1]);
            }
        }
    } catch (e) { }

    return {
        "Start Date": start_date,
        "Apply By": apply_by,
        "Applicants": applicants,
        "Skills": skills,
        "Openings": openings,
        "Category": category,
        "PostedAgeDays": postedAgeDays
    };
}

async function scrapePages(context, searchPath, startPage, conn, freshness, maxPages) {
    const page = await context.newPage();
    if (DEBUG_MODE) ensureFolder(DEBUG_FOLDER);
    const results = [];

    const { urls: scraped_urls, hashes: existing_hashes } = await loadExisting(conn);
    const scraped_keys = new Set();

    const skipped = { no_href: 0, dup_url: 0, freshness: 0, dup_key: 0, unchanged: 0, detail_fail: 0 };

    let currentPage = startPage;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 2;
    let consecutiveZeroPages = 0;
    const maxZeroPages = 3;

    while (consecutiveEmptyPages < maxEmptyPages) {
        if (maxPages && currentPage >= startPage + maxPages) {
            console.log(`\n⚠️ Reached maximum page limit (${maxPages} pages)`);
            break;
        }

        const urlBase = BASE_URL + (searchPath ? `/${searchPath.replace(/^\//, '')}` : '');
        const url = currentPage === 1 ? urlBase : `${urlBase}/page-${currentPage}/`;
        console.log(`\n🔍 Scraping page ${currentPage}: ${url}`);

        const ok = await gotoWithRetries(page, url, 3);
        if (!ok) {
            console.log(`   ❌ Failed to load page ${currentPage}`);
            consecutiveEmptyPages++;
            currentPage++;
            continue;
        }

        let cards = page.locator("div.card, .internship_list_container li, li.internship, div.internship_meta, .profile, div.container-fluid.individual_internship");
        let count = await cards.count()
        console.log(`   → Found ${count} internships on page`)

        if (count === 0) {
            try {
                await page.reload({ waitUntil: 'domcontentloaded' })
                await new Promise(res => setTimeout(res, 1000));
                cards = page.locator("div.card, .internship_list_container li, li.internship, div.internship_meta, .profile, div.container-fluid.individual_internship");
                count = await cards.count()
            } catch (e) { }
            if (count === 0) {
                consecutiveEmptyPages++
                currentPage++
                continue
            }
        }

        let pageResults = 0;
        const pageBatch = [];

        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            const { title, company, location, stipend, duration, href } = await parseInternshipCard(card);

            if (!href) { skipped.no_href++; continue; }
            if (scraped_urls.has(href)) { skipped.dup_url++; continue; }

            const detail = await context.newPage();
            try {
                const okDetail = await gotoWithRetries(detail, href, 2);
                if (!okDetail) throw new Error('detail navigation failed');

                const detailInfo = await parseDetailPage(detail);
                const pad = detailInfo.PostedAgeDays;

                if (pad !== null && freshness && pad > freshness.days) {
                    skipped.freshness++
                    continue
                }

                if (title && company) {
                    const unique_key = `${title}|${company}|${location || ''}`;
                    if (scraped_keys.has(unique_key)) { skipped.dup_key++; continue; }
                    scraped_keys.add(unique_key);

                    const info = {
                        "Internship URL": href,
                        "Title": title,
                        "Company": company,
                        "Location": location,
                        "Stipend": stipend,
                        "Duration": duration,
                        ...detailInfo,
                        "Page": currentPage
                    };

                    const new_hash = computeInternshipHash(info);
                    if (existing_hashes[href] === new_hash) {
                        skipped.unchanged++;
                        continue;
                    }

                    results.push(info);
                    pageBatch.push(info);
                    pageResults++;
                    console.log(`   ✅ [${results.length}] ${title} @ ${company}`);
                    await upsertInternship(conn, info).catch(() => { });
                    scraped_urls.add(href);
                }
            } catch (e) {
                console.log(`     → Detail error for ${title}: ${e.message}`);
                skipped.detail_fail++;
            } finally {
                await detail.close().catch(() => { });
            }
        }

        console.log(`   📊 Page ${currentPage}: ${pageResults} new internships scraped`);
        // if (pageBatch.length > 0) await saveToCsv(pageBatch, OUTPUT_FILE).catch(()=>{});

        if (pageResults === 0) {
            consecutiveZeroPages++;
        } else {
            consecutiveZeroPages = 0;
        }

        if (consecutiveZeroPages >= maxZeroPages) {
            console.log('   ⚠️ No new internships found in consecutive pages, stopping.');
            break;
        }

        currentPage++;
    }

    await page.close().catch(() => { });
    console.log(`\n🏁 Scraping completed! Total pages scraped: ${currentPage - startPage}`);
    console.log(`📈 Total unique internships found: ${results.length}`);
    console.log('\n📊 Skip Summary:');
    console.log(`   · No href: ${skipped.no_href}`);
    console.log(`   · Duplicate URL: ${skipped.dup_url}`);
    console.log(`   · Duplicate key: ${skipped.dup_key}`);
    console.log(`   · Freshness filter: ${skipped.freshness}`);
    console.log(`   · Unchanged data: ${skipped.unchanged}`);
    console.log(`   · Detail page errors: ${skipped.detail_fail}`);
    return results;
}

async function main() {
    let searchPath = process.env.SEARCH_PATH;
    if (!searchPath) {
        if (process.env.HEADLESS === 'true') {
            searchPath = ''
        } else {
            searchPath = (await rl.question("Search path (e.g., 'engineering' or leave blank for all): ")).trim();
        }
    }

    let startPage = parseInt(process.env.START_PAGE || '')
    if (!startPage || isNaN(startPage)) startPage = await getIntInput('Start page (default 1): ', 1)

    let freshness = null;
    const envDays = process.env.FRESHNESS_DAYS;
    if (envDays && Object.values(FRESHNESS_OPTIONS).some(v => String(v.days) === String(envDays))) {
        freshness = Object.values(FRESHNESS_OPTIONS).find(v => String(v.days) === String(envDays));
    } else {
        freshness = await chooseFreshness()
    }

    let maxPages = parseInt(process.env.MAX_PAGES || '')
    if (isNaN(maxPages)) {
        if (process.env.HEADLESS === 'true') {
            maxPages = 5;
        } else {
            maxPages = await getIntInput('Max pages to scrape (default 5, 0 for unlimited): ', 5);
            if (maxPages === 0) maxPages = null;
        }
    }

    console.log(`\n🚀 Scraping starting from page ${startPage} with freshness '${freshness.text}'`);
    if (maxPages) console.log(`📄 Will scrape up to ${maxPages} pages`);
    console.log('📝 Note: Scraping will automatically stop when no more internships are found\n');

    const conn = await dbConnect();
    await ensureInternshipTable(conn);

    const browser = await chromium.launch({
        headless: HEADLESS_MODE, args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-infobars', '--disable-notifications'
        ]
    });

    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        timezoneId: 'Asia/Kolkata'
    });

    try {
        await scrapePages(ctx, searchPath, startPage, conn, freshness, maxPages);
    } finally {
        await browser.close();
        try { if (conn) await conn.end(); } catch (e) { }
        rl.close();
    }

    console.log('\n🎉 Scraping completed!');
}

if (process.argv[1] && process.argv[1].endsWith('internshala_scraper.js')) {
    main().catch(e => { console.error('Fatal:', e); process.exit(1); });
}
