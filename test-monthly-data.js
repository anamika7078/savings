// Test script to check monthly savings data structure
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testMonthlySavingsData() {
    try {
        console.log('Testing monthly savings data...');

        // Test without auth first to see if route exists
        const response = await fetch('http://localhost:5000/api/savings/monthly/all');
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.raw());

        const text = await response.text();
        console.log('Response text:', text);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMonthlySavingsData();
