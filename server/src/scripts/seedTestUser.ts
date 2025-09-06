import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User';

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

const seedTestUser = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@mailtracker.com' });
    
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Email: test@mailtracker.com');
      console.log('Password: password123');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@mailtracker.com',
      password: hashedPassword,
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

seedTestUser();
