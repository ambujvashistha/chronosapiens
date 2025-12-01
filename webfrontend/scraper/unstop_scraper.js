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

const BASE_URL = 'https://unstop.com';
const OUTPUT_FILE = 'unstop_jobs.csv';
const DEBUG_FOLDER = 'debug_unstop';

const DEBUG_MODE = (process.env.DEBUG || 'true').toLowerCase() === 'true' || (process.env.DEBUG || '1') === '1';
const HEADLESS_MODE = (process.env.HEADLESS || 'false').toLowerCase() === 'true' || (process.env.HEADLESS || '0') === '1';
const DB_ENABLED = (process.env.DB_ENABLED || 'true').toLowerCase() === 'true' || (process.env.DB_ENABLED || '1') === '1';

const FRESHNESS_OPTIONS = {
    '1': { days: 1, text: 'Last 1 day' },
    '2': { days: 3, text: 'Last 3 days' },
    '3': { days: 7, text: 'Last 7 days' },
    '4': { days: 15, text: 'Last 15 days' },
    '5': { days: 30, text: 'Last 30 days' }
};

const TYPE_OPTIONS = {
    '1': { value: 'jobs', text: 'Jobs' },
    '2': { value: 'internships', text: 'Internships' }
};

function ensureFolder(p) {
    try { fs.mkdirSync(p, { recursive: true }); } catch (e) { }
}

async function saveToCsv(data, filePath) {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).map(k => ({ id: k, title: k }));
    const csvWriter = createObjectCsvWriter({ path: filePath, header: headers, append: fs.existsSync(filePath) });
    await csvWriter.writeRecords(data);
    console.log(`💾 Saved ${data.length} records to ${filePath}`);
}

async function dbConnect() {
    if (!DB_ENABLED) return null;
    try {
        const conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || 'password',
            database: process.env.MYSQL_DB || 'scrapers',
            multipleStatements: false
        });
        return conn;
    } catch (e) {
        console.warn('⚠️ Could not connect to DB:', e.message);
        return null;
    }
}

async function ensureJobsTable(conn) {
    if (!conn) return;
    const q = `
    CREATE TABLE IF NOT EXISTS unstop_jobs (
      job_url VARCHAR(800) PRIMARY KEY,
      title VARCHAR(500),
      organization VARCHAR(300),
      type VARCHAR(100),
      location VARCHAR(300),
      deadline VARCHAR(200),
      applicants VARCHAR(100),
      salary VARCHAR(200),
      experience VARCHAR(200),
      description TEXT,
      skills TEXT,
      posted_date VARCHAR(100),
      page INT,
      freshness VARCHAR(50),
      first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      data_hash CHAR(64)
    )
  `;
    await conn.execute(q);
}

function computeJobHash(info) {
    const fields = [
        info['Title'] || '', info['Organization'] || '', info['Location'] || '',
        info['Deadline'] || '', info['Salary'] || '', info['Experience'] || ''
    ];
    const s = fields.join('|');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

async function upsertJob(conn, info) {
    if (!conn) return;
    const dataHash = computeJobHash(info);
    const q = `INSERT INTO unstop_jobs (job_url, title, organization, type, location, deadline, applicants,
    salary, experience, description, skills, posted_date, page, freshness, data_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE title=VALUES(title), organization=VALUES(organization),
      location=VALUES(location), deadline=VALUES(deadline), applicants=VALUES(applicants),
      salary=VALUES(salary), experience=VALUES(experience), description=VALUES(description),
      skills=VALUES(skills), posted_date=VALUES(posted_date), page=VALUES(page),
      freshness=VALUES(freshness), data_hash=VALUES(data_hash)`;
    const vals = [
        info['Job URL'], info['Title'], info['Organization'], info['Type'], info['Location'],
        info['Deadline'], info['Applicants'], info['Salary'], info['Experience'], info['Description'],
        info['Skills'], info['Posted Date'], info['Page'], info['Freshness'], dataHash
    ];
    await conn.execute(q, vals);
}

async function loadExistingJobs(conn) {
    const urls = new Set();
    const hashes = {};
    if (!conn) return { urls, hashes };
    const [rows] = await conn.execute('SELECT job_url, data_hash FROM unstop_jobs');
    for (const r of rows) {
        urls.add(r.job_url);
        hashes[r.job_url] = r.data_hash;
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

async function chooseType() {
    console.log('\n📋 Content type:');
    for (const k of Object.keys(TYPE_OPTIONS)) {
        console.log(` ${k}. ${TYPE_OPTIONS[k].text}`);
    }
    const key = await getChoice('Select type (1-2): ', Object.keys(TYPE_OPTIONS));
    return TYPE_OPTIONS[key];
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

async function safeGetText(pageOrElem, selector, defaultVal = 'N/A') {
    try {
        const elem = pageOrElem.locator(selector).first();
        if (await elem.count() > 0) {
            const txt = await elem.innerText();
            return (txt || '').trim() || defaultVal;
        }
    } catch (e) { }
    return defaultVal;
}

async function parseListingCard(card) {
    let title = null, href = null, org = null, loc = null, deadline = null, applicants = null;
    try {
        const titleElem = card.locator('h2').first();
        if (await titleElem.count() > 0) title = (await titleElem.innerText()).trim();

        href = await card.getAttribute('href');
        if (href && !href.startsWith('http')) {
            if (!href.startsWith('/')) href = '/' + href;
            href = BASE_URL + href;
        }

        const orgElem = card.locator('p.single-wrap').first();
        if (await orgElem.count() > 0) org = (await orgElem.innerText()).trim();

        const otherElems = card.locator('.other_fields > div');
        const count = await otherElems.count();
        if (count > 0) {
            const texts = [];
            for (let i = 0; i < count; i++) {
                texts.push((await otherElems.nth(i).innerText()).trim());
            }
            for (const t of texts) {
                const tLower = t.toLowerCase();
                if (tLower.includes('salary') || tLower.includes('stipend')) continue;
                if (tLower.includes('experience')) continue;
                if (['full time', 'part time', 'internship'].includes(tLower)) continue;
                if (['in office', 'remote', 'hybrid'].includes(tLower)) continue;
                loc = t;
            }
        }
    } catch (e) { }
    return { title, href, org, loc, deadline, applicants };
}

async function parseDetailPage(page) {
    const salary = await safeGetText(page, "[class*='salary'], [class*='stipend']");
    const experience = await safeGetText(page, "[class*='experience']");
    const posted_date = await safeGetText(page, "[class*='posted']");

    let description = 'N/A';
    try {
        const descElem = page.locator("[class*='description'], [class*='about']").first();
        if (await descElem.count() > 0) description = (await descElem.innerText()).trim();
    } catch (e) { }

    let skills = 'N/A';
    try {
        const skillsElements = page.locator("[class*='skill'], [class*='tag']");
        const count = await skillsElements.count();
        if (count > 0) {
            const skillList = [];
            for (let i = 0; i < Math.min(count, 20); i++) {
                skillList.push((await skillsElements.nth(i).innerText()).trim());
            }
            skills = skillList.join(', ');
        }
    } catch (e) { }

    return {
        'Salary': salary,
        'Experience': experience,
        'Posted Date': posted_date,
        'Description': description,
        'Skills': skills
    };
}

async function scrapePages(context, contentTypeObj, freshness, start_page, conn, max_pages) {
    const page = await context.newPage();
    ensureFolder(DEBUG_FOLDER);
    const results = [];

    const { urls: scraped_urls, hashes: existing_hashes } = await loadExistingJobs(conn);
    const scraped_keys = new Set();

    const skipped = { no_href: 0, dup_url: 0, dup_key: 0, unchanged: 0, detail_fail: 0 };

    const url = `${BASE_URL}/${contentTypeObj.value}?oppstatus=open`;
    console.log(`\n Loading: ${url}`);

    const ok = await gotoWithRetries(page, url, 3);
    if (!ok) {
        console.log('Failed to load page');
        await page.close();
        return results;
    }

    await new Promise(res => setTimeout(res, 2000));

    let scroll_count = 0;
    const max_scrolls = max_pages ? max_pages * 3 : 50;
    let consecutive_no_new = 0;
    const max_consecutive_no_new = 3;

    console.log(`Starting infinite scroll (max ${max_scrolls} scroll attempts)`);

    while (scroll_count < max_scrolls && consecutive_no_new < max_consecutive_no_new) {
        const cards = page.locator("a.item[class*='opp_']");
        const count = await cards.count();
        console.log(`\n   → Scroll ${scroll_count + 1}: Found ${count} total listings visible`);

        if (count === 0) {
            console.log('   ⚠️ No listings found, stopping');
            break;
        }

        let batch_results = 0;
        const batch_data = [];

        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            const { title, href, org, loc, deadline, applicants } = await parseListingCard(card);

            if (!href) { skipped.no_href++; continue; }
            if (scraped_urls.has(href)) { skipped.dup_url++; continue; }

            const detail = await context.newPage();
            try {
                const okDetail = await gotoWithRetries(detail, href, 2);
                if (!okDetail) throw new Error('detail navigation failed');

                await new Promise(res => setTimeout(res, 1000));
                const detailInfo = await parseDetailPage(detail);

                if (title && org) {
                    const unique_key = `${title}|${org}|${loc || ''}`;
                    if (scraped_keys.has(unique_key)) { skipped.dup_key++; continue; }
                    scraped_keys.add(unique_key);

                    const info = {'Job URL': href, 'Title': title, 'Organization': org,
                        'Type': contentTypeObj.value.charAt(0).toUpperCase() + contentTypeObj.value.slice(1),
                        'Location': loc || 'N/A', 'Deadline': deadline || 'N/A', 'Applicants': applicants || 'N/A',
                        ...detailInfo, 'Page': scroll_count + 1, 'Freshness': freshness.text};

                    const new_hash = computeJobHash(info);
                    if (existing_hashes[href] === new_hash) {
                        skipped.unchanged++;
                        scraped_urls.add(href);
                        continue;
                    }

                    results.push(info);
                    batch_data.push(info);
                    batch_results++;
                    console.log(`   ✅ [${results.length}] ${title} @ ${org}`);
                    await upsertJob(conn, info).catch(() => { });
                    scraped_urls.add(href);
                }
            } catch (e) {
                console.log(`     → Detail error for ${title}: ${e.message}`);
                skipped.detail_fail++;
            } finally {
                await detail.close().catch(() => { });
            }
        }

        console.log(`   📊 Scroll ${scroll_count + 1}: ${batch_results} new listings scraped`);
        // if (batch_data.length > 0) await saveToCsv(batch_data, OUTPUT_FILE).catch(()=>{});

        if (batch_results === 0) {
            consecutive_no_new++;
            console.log(`   ⚠️ No new listings this scroll (${consecutive_no_new}/${max_consecutive_no_new})`);
        } else {
            consecutive_no_new = 0;
        }

        scroll_count++;
        if (scroll_count < max_scrolls && consecutive_no_new < max_consecutive_no_new) {
            console.log('   ⬇️ Scrolling down to load more content...');
            await page.evaluate(() => {
                const container = document.querySelector('div.user_list');
                if (container) {
                    container.scrollTo(0, container.scrollHeight);
                } else {
                    window.scrollTo(0, document.body.scrollHeight);
                }
            });
            await new Promise(res => setTimeout(res, 3000));
        }
    }

    await page.close().catch(() => { });
    console.log(`\n🏁 Scraping completed! Total scrolls: ${scroll_count}`);
    console.log(`📈 Total unique listings found: ${results.length}`);
    console.log('\n📊 Skip Summary:');
    console.log(`   · No href: ${skipped.no_href}`);
    console.log(`   · Duplicate URL: ${skipped.dup_url}`);
    console.log(`   · Duplicate key: ${skipped.dup_key}`);
    console.log(`   · Unchanged data: ${skipped.unchanged}`);
    console.log(`   · Detail page errors: ${skipped.detail_fail}`);
    return results;
}

async function main() {
    let contentTypeObj = null;
    if (process.env.CONTENT_TYPE && TYPE_OPTIONS[process.env.CONTENT_TYPE]) {
        contentTypeObj = TYPE_OPTIONS[process.env.CONTENT_TYPE];
    } else {
        contentTypeObj = await chooseType();
    }

    let freshness = null;
    const envDays = process.env.FRESHNESS_DAYS;
    if (envDays && Object.values(FRESHNESS_OPTIONS).some(v => String(v.days) === String(envDays))) {
        freshness = Object.values(FRESHNESS_OPTIONS).find(v => String(v.days) === String(envDays));
    } else {
        freshness = await chooseFreshness();
    }

    let start_page = parseInt(process.env.START_PAGE || '');
    if (!start_page || isNaN(start_page)) start_page = await getIntInput('Start page (default 1): ', 1);

    let max_pages = parseInt(process.env.MAX_PAGES || '');
    if (isNaN(max_pages)) {
        max_pages = await getIntInput('Max pages to scrape (default 5, 0 for unlimited): ', 5);
        if (max_pages === 0) max_pages = null;
    }

    console.log(`\n🚀 Scraping ${contentTypeObj.text} starting from page ${start_page} with freshness '${freshness.text}'`);
    if (max_pages) console.log(`📄 Will scrape up to ${max_pages} pages`);
    console.log('📝 Note: Scraping will automatically stop when no more listings are found\n');

    const conn = await dbConnect();
    await ensureJobsTable(conn);

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
        await scrapePages(ctx, contentTypeObj, freshness, start_page, conn, max_pages);
    } finally {
        await browser.close();
        try { if (conn) await conn.end(); } catch (e) { }
        rl.close();
    }

    console.log('\n🎉 Scraping completed!');
}

if (process.argv[1] && process.argv[1].endsWith('unstop_scraper.js')) {
    main().catch(e => { console.error('Fatal:', e); process.exit(1); });
}
