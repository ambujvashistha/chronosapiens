const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllJobs = async (req, res) => {
    try {
        const { limit = 20, offset = 0, search = '', source = 'All' } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        const [unstopJobs, naukriJobs, internships] = await Promise.all([
            prisma.unstopJob.findMany({ orderBy: { first_seen: 'desc' } }),
            prisma.naukriJob.findMany({ orderBy: { first_seen: 'desc' } }),
            prisma.internship.findMany({ orderBy: { first_seen: 'desc' } })
        ]);

        let normalizedJobs = [
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

        if (source !== 'All') {
            normalizedJobs = normalizedJobs.filter(job => job.source === source);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            normalizedJobs = normalizedJobs.filter(job => job.title?.toLowerCase().includes(searchLower) || job.company?.toLowerCase().includes(searchLower))
        }

        const totalCount = normalizedJobs.length;
        const paginatedJobs = normalizedJobs.slice(offsetNum, offsetNum + limitNum);

        res.json({  success: true,  count: paginatedJobs.length, total: totalCount, data: paginatedJobs  })

    } catch (error) {
        console.error('Error fetching jobs:', error)
        res.status(500).json({ error: 'Failed to fetch jobs' })
    }
};

module.exports = { getAllJobs }
