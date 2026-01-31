const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./src/config/db');
const logger = require('./src/config/logger');

const app = express();

/* ---------- Middleware ---------- */

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});

app.use(helmet());
app.use(cors({
    origin: [
        process.env.CORS_ORIGIN || 'https://savingclient.vercel.app/', 'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Routes ---------- */

app.get('/', (req, res) => {
    res.json({
        message: 'Community Finance API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            members: '/api/members',
            savings: '/api/savings',
            loans: '/api/loans',
            fines: '/api/fines',
            repayments: '/api/repayments',
            reports: '/api/reports'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/members', require('./src/routes/member.routes'));
app.use('/api/savings', require('./src/routes/savings.routes'));
app.use('/api/loans', require('./src/routes/loan.routes'));
app.use('/api/fines', require('./src/routes/fine.routes'));
app.use('/api/repayments', require('./src/routes/repayment.routes'));
app.use('/api/reports', require('./src/routes/report.routes'));

/* ---------- Error handling ---------- */

app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

/* ---------- Start server FIRST ---------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);

    // connect DB AFTER server is live
    sequelize.authenticate()
        .then(() => logger.info('Database connected'))
        .catch(err => logger.error('Database connection failed', err));
});

module.exports = app;
