import mongoose from 'mongoose';
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

const deleteTestUser = async (): Promise<void> => {
  try {
    await connectDB();
    
    const result = await User.deleteOne({ email: 'test@mailtracker.com' });
    
    if (result.deletedCount > 0) {
      console.log('✅ Test user deleted successfully!');
    } else {
      console.log('⚠️ Test user not found.');
    }

  } catch (error) {
    console.error('Error deleting test user:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

deleteTestUser();
