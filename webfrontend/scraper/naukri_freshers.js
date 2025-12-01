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

const JOBS_BASE_URL = 'https://www.naukri.com/jobs-in-india';
const DEBUG_FOLDER = 'debug_jobs';

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
    CREATE TABLE IF NOT EXISTS naukri_jobs (
      job_url VARCHAR(600) PRIMARY KEY,
      job_name VARCHAR(300),
      company VARCHAR(300),
      rating VARCHAR(50),
      reviews VARCHAR(100),
      experience VARCHAR(200),
      salary VARCHAR(200),
      location VARCHAR(300),
      posted VARCHAR(100),
      openings VARCHAR(100),
      applicants VARCHAR(100),
      page INT,
      freshness VARCHAR(50),
      function_gid VARCHAR(50),
      first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      data_hash CHAR(64)
    )
  `;
  await conn.execute(q);
}

function computeJobHash(info) {
  const fields = [
    info['Job Name'] || '', info['Company'] || '', info['Rating'] || '', info['Reviews'] || '',
    info['Experience'] || '', info['Salary'] || '', info['Location'] || '', info['Posted'] || '',
    info['Openings'] || '', info['Applicants'] || ''
  ];
  const s = fields.join('|');
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

async function upsertJob(conn, info) {
  if (!conn) return;
  const dataHash = computeJobHash(info);
  const q = `INSERT INTO naukri_jobs (job_url, job_name, company, rating, reviews, experience, salary, location, posted, openings, applicants, page, freshness, function_gid, data_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE job_name=VALUES(job_name), company=VALUES(company), rating=VALUES(rating), reviews=VALUES(reviews),
      experience=VALUES(experience), salary=VALUES(salary), location=VALUES(location), posted=VALUES(posted), openings=VALUES(openings),
      applicants=VALUES(applicants), page=VALUES(page), freshness=VALUES(freshness), function_gid=VALUES(function_gid), data_hash=VALUES(data_hash)`;
  const vals = [
    info['Job URL'], info['Job Name'], info['Company'], info['Rating'], info['Reviews'], info['Experience'], info['Salary'], info['Location'],
    info['Posted'], info['Openings'], info['Applicants'], info['Page'], info['Freshness'], info['FunctionGID'], dataHash
  ];
  await conn.execute(q, vals);
}

async function loadExistingJobs(conn) {
  const urls = new Set();
  const hashes = {};
  if (!conn) return { urls, hashes };
  const [rows] = await conn.execute('SELECT job_url, data_hash FROM naukri_jobs');
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

async function handlePrivacyPolicy(page) {
  try {
    await page.waitForTimeout(2000);
    const selectors = [
      "button[aria-label='Close']",
      '.close-btn', '.close-button', 'button.close',
      "[data-dismiss='modal']", "button:has-text('Close')",
      "button:has-text('×')", 'i.close', '.modal-close',
      "button:has-text('Accept')", "button:has-text('Got it')"
    ];
    for (const sel of selectors) {
      const el = page.locator(sel);
      if (await el.count() > 0) {
        await el.first().click({ timeout: 3000 }).catch(() => { });
        await page.waitForTimeout(1000);
        return true;
      }
    }
    await page.keyboard.press('Escape').catch(() => { });
    await page.waitForTimeout(500);
    return true;
  } catch (e) {
    return false;
  }
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

async function parseListingCard(card) {
  let title = null, href = null;
  const selectors = ['a[title]', '.title a', 'h3 a', 'h2 a', 'a.title'];
  for (const sel of selectors) {
    try {
      const elem = card.locator(sel).first();
      if (await elem.count() > 0) {
        title = (await elem.innerText()).trim();
        href = await elem.getAttribute('href');
        if (href && !href.startsWith('http')) href = 'https://www.naukri.com' + href;
        break;
      }
    } catch (e) { continue; }
  }
  return { title, href };
}

async function safeGetText(pageOrElem, selector, defaultVal = 'N/A') {
  try {
    let elem;
    if (typeof pageOrElem.locator === 'function') elem = pageOrElem.locator(selector).first();
    else elem = pageOrElem.locator(selector).first();
    if (await elem.count() > 0) {
      const txt = await elem.innerText();
      return (txt || '').trim() || defaultVal;
    }
  } catch (e) { }
  return defaultVal;
}

async function parseDetailPage(page) {
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch (e) { }
  const job_name = await safeGetText(page, 'h1.styles_jd-header-title__rZwM1');
  const company = await safeGetText(page, 'div.styles_jd-header-comp-name__MvqAI a');
  const rating = await safeGetText(page, 'span.styles_amb-rating__4UyFL');
  const reviews = await safeGetText(page, 'span.styles_amb-reviews__0J1e3');
  const experience = await safeGetText(page, 'div.styles_jhc__exp__k_giM span');
  const salary = await safeGetText(page, 'div.styles_jhc__salary__jdfEC span');
  const location = await safeGetText(page, 'span.styles_jhc__location__W_pVs');

  let posted = 'N/A', openings = 'N/A', applicants = 'N/A';
  const stats = page.locator('span.styles_jhc__stat__PgY67');
  for (let i = 0; i < await stats.count(); i++) {
    const txt = await stats.nth(i).innerText().catch(() => '');
    if (txt.includes('Posted:')) posted = txt.replace('Posted:', '').trim();
    else if (txt.includes('Openings:')) openings = txt.replace('Openings:', '').trim();
    else if (txt.includes('Applicants:')) applicants = txt.replace('Applicants:', '').trim();
  }

  return {
    'Job Name': job_name,
    'Company': company,
    'Rating': rating,
    'Reviews': reviews,
    'Experience': experience,
    'Salary': salary,
    'Location': location,
    'Posted': posted,
    'Openings': openings,
    'Applicants': applicants
  };
}

async function checkIfPageHasJobs(page) {
  try {
    await page.waitForTimeout(3000);
    if ((await page.locator('text=Oops! Something went wrong').count()) > 0 ||
      (await page.locator('text=There was an error loading the page').count()) > 0) {
      try { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000); } catch (e) { }
    }
    const cards = page.locator('div.srp-jobtuple-wrapper, div.cust-job-tuple');
    const count = await cards.count();

    const noResultSelectors = ['.noResultContainer', '.no-result', 'text=No jobs found', 'text=No results found', '.emptyResults'];
    for (const sel of noResultSelectors) {
      if ((await page.locator(sel).count()) > 0) return false;
    }
    return count > 0;
  } catch (e) {
    return false;
  }
}

async function scrapePages(context, freshness, function_gid, start_page, conn) {
  const page = await context.newPage();
  ensureFolder(DEBUG_FOLDER);
  const results = [];

  const { urls: scraped_urls, hashes: existing_hashes } = await loadExistingJobs(conn);
  const scraped_keys = new Set();

  let current_page = start_page;
  let consecutive_empty_pages = 0; const max_empty_pages = 2;
  let consecutive_zero_pages = 0; const max_zero_pages = 3;

  while (consecutive_empty_pages < max_empty_pages) {
    const url = (current_page === 1) ? `${JOBS_BASE_URL}` : `${JOBS_BASE_URL}-${current_page}`;
    const params = [
      'clusters=experience%2CFreshness',
      'experience=0',
      `jobAge=${freshness.days}`
    ];
    if (function_gid) params.push(`functionAreaIdGid=${function_gid}`);
    const fullUrl = url + '?' + params.join('&');
    console.log(`\n🔍 Scraping page ${current_page}: ${fullUrl}`);

    const ok = await gotoWithRetries(page, fullUrl, 3);
    if (!ok) { console.log(`   ❌ Failed to load page ${current_page}`); consecutive_empty_pages++; current_page++; continue; }

    await handlePrivacyPolicy(page);
    const has_jobs = await checkIfPageHasJobs(page);
    if (!has_jobs) { console.log(`   ⚠️ Page ${current_page} has no jobs`); consecutive_empty_pages++; current_page++; continue; }

    consecutive_empty_pages = 0;
    const cards = page.locator('div.srp-jobtuple-wrapper, div.cust-job-tuple');
    const count = await cards.count();
    console.log(`   → Found ${count} job cards`);

    if (DEBUG_MODE) {
      await page.screenshot({ path: path.join(DEBUG_FOLDER, `page_${current_page}.png`), fullPage: true }).catch(() => { });
    }

    let page_results = 0;
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const { title, href } = await parseListingCard(card);
      if (!href) continue;

      if (scraped_urls.has(href)) {
        console.log(`   ⏭️ Skipping duplicate: ${title}`);
        continue;
      }

      scraped_urls.add(href);
      const detail = await context.newPage();
      try {
        const okDetail = await gotoWithRetries(detail, href, 2);
        if (!okDetail) throw new Error('detail navigation failed');
        const info = await parseDetailPage(detail);
        if (info && info['Job Name'] !== 'N/A') {
          const unique_key = `${info['Job Name']}|${info['Company']}|${info['Location']}`;
          if (scraped_keys.has(unique_key)) continue;
          scraped_keys.add(unique_key);

          Object.assign(info, {
            'Page': current_page,
            'Freshness': freshness.text,
            'FunctionGID': function_gid,
            'Job URL': href
          });

          const new_hash = computeJobHash(info);
          if (existing_hashes[href] && existing_hashes[href] === new_hash) continue;

          results.push(info);
          page_results += 1;
          console.log(`   ✅ [${results.length}] ${info['Job Name']} @ ${info['Company']}`);
          await upsertJob(conn, info).catch(() => { });
        }
      } catch (e) {
        console.log(`     → Detail error for ${title}: ${e.message}`);
      } finally {
        await detail.close().catch(() => { });
      }
    }

    console.log(`   📊 Page ${current_page}: ${page_results} new jobs scraped`);
    // if (page_results > 0) await saveToCsv(results.slice(-page_results), OUTPUT_FILE).catch(()=>{});

    if (page_results === 0) consecutive_zero_pages++; else consecutive_zero_pages = 0;
    if (consecutive_zero_pages >= max_zero_pages) { console.log('   ⚠️ No new jobs found in consecutive pages, stopping.'); break; }

    current_page += 1;
  }

  await page.close().catch(() => { });
  console.log(`\n🏁 Scraping completed! Total pages scraped: ${current_page - start_page}`);
  console.log(`📈 Total unique jobs found: ${results.length}`);
  return results;
}

async function main() {
  let freshness = null;
  const envDays = process.env.FRESHNESS_DAYS;
  if (envDays && Object.values(FRESHNESS_OPTIONS).some(v => String(v.days) === String(envDays))) {
    freshness = Object.values(FRESHNESS_OPTIONS).find(v => String(v.days) === String(envDays));
  } else {
    freshness = await chooseFreshness();
  }

  let function_gid = process.env.FUNCTION_GID || (await rl.question('\n🏷️ Enter functionAreaIdGid (e.g., 3 for IT): ')).trim();
  if (!function_gid) function_gid = '3';

  let start_page = parseInt(process.env.START_PAGE || '');
  if (!start_page || isNaN(start_page)) start_page = await getIntInput('Start page  (default 1): ', 1);

  console.log(`\n🚀 Scraping starting from page ${start_page} with freshness '${freshness.text}' and functionAreaIdGid=${function_gid}`);
  console.log('📝 Note: Scraping will automatically stop when no more jobs are found\n');

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
    await scrapePages(ctx, freshness, function_gid, start_page, conn);
  } finally {
    await browser.close();
    try { if (conn) await conn.end(); } catch (e) { }
    rl.close();
  }

  console.log('\n🎉 Scraping completed!');
}

if (process.argv[1] && process.argv[1].endsWith('naukri_freshers.js')) {
  main().catch(e => { console.error('Fatal:', e); process.exit(1); });
}
