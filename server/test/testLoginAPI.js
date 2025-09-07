const axios = require('axios');

(async () => {
  try {
    const response = await axios.post(
      'http://localhost:5001/api/auth/login',
      {
        email: 'test2@mailtracker.com', // Replace with a valid email
        password: 'password123'  // Replace with the correct password
      }
    );

    console.log('Login Successful! Token:', response.data.data.token);
  } catch (error) {
    console.error('Login Failed:', error.response?.data || error.message);
  }
})();
