const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./src/config/db');
const logger = require('./src/config/logger');

const app = express();

// Connect to Database
connectDB();

/* ---------- Middleware ---------- */

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});

// Configure helmet to allow CORS
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://savingclient.vercel.app',
            'http://localhost:3000',
            'http://localhost:3001'
        ];

        // Clean trailing slash from env var if present
        const envOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.replace(/\/$/, '') : null;

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || envOrigin === origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

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
});

module.exports = app;
