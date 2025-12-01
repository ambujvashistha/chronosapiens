require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { register, login, getProfile } = require('./controllers/authController');
const { getAllJobs } = require('./controllers/jobController');
const { authenticateToken } = require('./middleware/auth');
const { initScheduler, runAllScrapers } = require('./scheduler');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.json({
    message: 'JobSync API Server',
    version: '1.0.0',
    status: 'running',
  })
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
});

app.post('/api/auth/signup', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authenticateToken, getProfile);
app.get('/api/jobs', getAllJobs);

app.post('/api/scraper/run', async (req, res) => {
  try {
    res.json({ message: 'Scrapers started. This will run in the background.' });
    runAllScrapers().catch(err => console.error('Scraper error:', err));
  } catch (error) {
    res.status(500).json({ error: 'Failed to start scrapers' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(port, () => {
  console.log(`JobSync API Server running on port ${port}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`)
  initScheduler();
})