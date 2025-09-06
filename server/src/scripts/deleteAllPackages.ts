import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from '../models/Package';

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

const deleteAllPackages = async (): Promise<void> => {
  try {
    await connectDB();
    
    const result = await Package.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} packages.`);

  } catch (error) {
    console.error('Error deleting packages:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

deleteAllPackages();
