const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

const SCRAPER_DIR = path.join(__dirname, '../scraper');
const SCRAPERS = [
    { name: 'Unstop', script: 'unstop_scraper.js' },
    { name: 'Naukri', script: 'naukri_freshers.js' },
    { name: 'Internshala', script: 'internshala_scraper.js' }
];

const runScraper = (scraper) => {
    return new Promise((resolve, reject) => {
        console.log(`[Scheduler] Starting ${scraper.name} scraper...`);

        const env = {
            ...process.env,
            HEADLESS: 'true',
            DEBUG: 'false',
            DB_ENABLED: 'true',
            START_PAGE: '1',
            MAX_PAGES: '5',
            FRESHNESS_DAYS: '1', 
            FUNCTION_GID: '3', 
            SEARCH_PATH: 'computer-science-internship', 
            CONTENT_TYPE: '1'
        };

        const child = spawn('node', [path.join(SCRAPER_DIR, scraper.script)], { env, stdio: 'inherit' })

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`[Scheduler] ${scraper.name} scraper completed successfully.`)
                resolve();
            } else {
                console.error(`[Scheduler] ${scraper.name} scraper failed with code ${code}.`)
                resolve();
            }
        });

        child.on('error', (err) => {
            console.error(`[Scheduler] Error running ${scraper.name}:`, err);
            resolve();
        });
    });
};

const runAllScrapers = async () => {
    console.log('[Scheduler] Starting automated scraping cycle...');
    for (const scraper of SCRAPERS) {
        await runScraper(scraper);
    }
    console.log('[Scheduler] All scrapers finished.');
};

const initScheduler = () => {
    cron.schedule('0 0,6 * * *', () => {
        runAllScrapers() })

    console.log('[Scheduler] Initialized. Scrapers will run every 12 hours.')
};

module.exports = { initScheduler, runAllScrapers };
