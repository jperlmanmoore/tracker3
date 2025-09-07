const axios = require('axios');

(async () => {
  try {
    const token = '<YOUR_JWT_TOKEN>'; // Replace with a valid JWT token

    const response = await axios.post(
      'http://localhost:5001/api/packages',
      {
        trackingNumbers: '9405511206213334271430,1234567890123456',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: '2025-09-06',
        notes: 'Test package notes'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();
