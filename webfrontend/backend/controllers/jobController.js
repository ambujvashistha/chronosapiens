const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllJobs = async (req, res) => {
    try {
        const { limit = 50, offset = 0, search } = req.query;

        const [unstopJobs, naukriJobs, internships] = await Promise.all([
            prisma.unstopJob.findMany({ orderBy: { first_seen: 'desc' }, take: 20 }),
            prisma.naukriJob.findMany({ orderBy: { first_seen: 'desc' }, take: 20 }),
            prisma.internship.findMany({ orderBy: { first_seen: 'desc' }, take: 20})
        ]);

        const normalizedJobs = [
            ...unstopJobs.map(job => ({
                id: job.job_url,
                title: job.title,
                company: job.organization,
                location: job.location,
                link: job.job_url,
                source: 'Unstop',
                posted: job.posted_date,
                type: 'Job'
            })),
            ...naukriJobs.map(job => ({
                id: job.job_url,
                title: job.job_name,
                company: job.company,
                location: job.location,
                link: job.job_url,
                source: 'Naukri',
                posted: job.posted,
                type: 'Job'
            })),
            ...internships.map(job => ({
                id: job.internship_url,
                title: job.title,
                company: job.company,
                location: job.location,
                link: job.internship_url,
                source: 'Internshala',
                posted: job.start_date,
                type: 'Internship'
            }))
        ];

        res.json({ success: true, count: normalizedJobs.length, data: normalizedJobs })

    } catch (error) {
        console.error('Error fetching jobs:', error)
        res.status(500).json({ error: 'Failed to fetch jobs' })
    }
};

module.exports = { getAllJobs }
