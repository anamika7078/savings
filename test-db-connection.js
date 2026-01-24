const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('Testing database connection...');
console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[HIDDEN]' : 'NOT_SET');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'community_finance',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const testConnection = async () => {
    try {
        console.log('\nAttempting to connect to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection successful!');

        console.log('\nTesting database query...');
        await sequelize.query('SELECT 1');
        console.log('✅ Database query successful!');

    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Original error:', error.original);

        if (error.original) {
            console.error('Error code:', error.original.code);
            console.error('Error errno:', error.original.errno);
            console.error('Error syscall:', error.original.syscall);
            console.error('Error hostname:', error.original.hostname);
        }
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

testConnection();
