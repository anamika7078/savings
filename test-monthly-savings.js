// Test script to verify monthly savings API
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testMonthlySavingsAPI() {
    const baseURL = 'http://localhost:5000/api';

    try {
        // First test health
        console.log('Testing health endpoint...');
        const healthResponse = await fetch(`${baseURL.replace('/api', '')}/health`);
        console.log('Health:', await healthResponse.json());

        // Test login to get token
        console.log('\nTesting login...');
        const loginResponse = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'superadmin',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);

        if (loginData.success) {
            const token = loginData.data.token;

            // Test monthly savings API
            console.log('\nTesting monthly savings API...');
            const monthlyResponse = await fetch(`${baseURL}/savings/monthly/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const monthlyData = await monthlyResponse.json();
            console.log('Monthly savings response:', JSON.stringify(monthlyData, null, 2));

            // Test check duplicate endpoint
            console.log('\nTesting check duplicate endpoint...');
            const duplicateResponse = await fetch(`${baseURL}/savings/check-duplicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    memberId: 1,
                    savingMonth: '01',
                    savingYear: '2026'
                })
            });
            console.log('Duplicate check:', await duplicateResponse.json());

            // Test create monthly savings
            console.log('\nTesting create monthly savings...');
            const createResponse = await fetch(`${baseURL}/savings/monthly`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    memberId: 1,
                    savingMonth: '01',
                    savingYear: '2026',
                    monthlyFixedAmount: 2000,
                    fine: 0,
                    totalPayableAmount: 2000,
                    paymentStatus: 'unpaid',
                    carryForwardAmount: 0
                })
            });
            console.log('Create response:', await createResponse.json());
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMonthlySavingsAPI();
