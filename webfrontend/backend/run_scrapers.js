const { runAllScrapers } = require('./scheduler');

(async () => {
    try {
        await runAllScrapers()
        process.exit(0)
    } catch (error) {
        console.error('Failed to run scrapers:', error)
        process.exit(1)
    }
})()
