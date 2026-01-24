// Simple test to check monthly savings API without auth
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testMonthlyData() {
    try {
        console.log('Testing monthly savings API directly...');
        const response = await fetch('http://localhost:5000/api/savings/monthly/all');
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMonthlyData();
