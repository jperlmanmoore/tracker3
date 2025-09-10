import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { checkFedExDeliveryStatus } from '../utils/fedexApi';

// Load environment variables
dotenv.config();

// Database connection function
const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailtracker';
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected:', mongoose.connection.host);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testFedExAPI = async (): Promise<void> => {
  try {
    console.log('🔍 Testing FedEx API Integration with enhanced debugging...');

    // Test with a known FedEx tracking number format
    const testTrackingNumbers = [
      '771234567890', // Test tracking number
      '612909123456789', // FedEx Express
      '986578788855' // FedEx Ground
    ];

    for (const trackingNumber of testTrackingNumbers) {
      console.log(`\n📦 Testing tracking number: ${trackingNumber}`);
      try {
        const result = await checkFedExDeliveryStatus(trackingNumber);
        console.log(`✅ Result for ${trackingNumber}:`, JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.log(`❌ Error for ${trackingNumber}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error testing FedEx API:', error);
  }
};

const seedTestUser = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();

    // Test FedEx API first
    await testFedExAPI();

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@mailtracker.com' });

    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Email: test@mailtracker.com');
      console.log('Password: password123');
      process.exit(0);
    }

    // Create test user (don't pre-hash password - let the model handle it)
    const testUser = new User({
      username: 'testuser',
      email: 'test@mailtracker.com',
      password: 'password123', // Plain text - model will hash it
      firstName: 'Test',
      lastName: 'User'
    });

    await testUser.save();

    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('Email: test@mailtracker.com');
    console.log('Password: password123');
    console.log('');
    console.log('You can now log in to the application using these credentials.');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

// If this script is run directly, run the test
if (require.main === module) {
  seedTestUser();
}

export { testFedExAPI };