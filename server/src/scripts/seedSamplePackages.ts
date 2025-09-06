import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
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

const seedSamplePackages = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    
    // Find the test user (try both emails)
    let testUser = await User.findOne({ email: 'test2@mailtracker.com' });
    
    if (!testUser) {
      testUser = await User.findOne({ email: 'test@mailtracker.com' });
    }
    
    if (!testUser) {
      console.log('Test user not found. Please create a test user first.');
      console.log('Available users:');
      const users = await User.find({}, 'email username');
      users.forEach(user => console.log(`- ${user.email} (${user.username})`));
      process.exit(1);
    }

    console.log(`Using test user: ${testUser.email}`);

    // Check if sample packages already exist
    const existingPackages = await Package.find({ userId: testUser._id });
    
    if (existingPackages.length > 0) {
      console.log('Sample packages already exist!');
      console.log(`Found ${existingPackages.length} existing packages for test user.`);
      process.exit(0);
    }

    // Sample package data
    const samplePackages = [
      {
        trackingNumber: '9405511206213334271430',
        carrier: 'USPS',
        customer: 'John Smith',
        packageType: 'LOR',
        status: 'Delivered',
        dateSent: new Date('2025-08-15'),
        deliveryDate: new Date('2025-08-18'),
        notes: 'Important legal documents',
        userId: testUser._id.toString(),
        trackingHistory: [
          {
            date: new Date('2025-08-15'),
            status: 'Shipped',
            location: 'Origin Facility',
            description: 'Package accepted at origin facility'
          },
          {
            date: new Date('2025-08-16'),
            status: 'In Transit',
            location: 'Processing Facility',
            description: 'Package in transit to destination'
          },
          {
            date: new Date('2025-08-18'),
            status: 'Delivered',
            location: 'Customer Address',
            description: 'Package delivered to recipient'
          }
        ]
      },
      {
        trackingNumber: '1234567890123456',
        carrier: 'FedEx',
        customer: 'ABC Corporation',
        packageType: 'demand',
        status: 'In Transit',
        dateSent: new Date('2025-09-01'),
        notes: 'Urgent business documents',
        userId: testUser._id.toString(),
        trackingHistory: [
          {
            date: new Date('2025-09-01'),
            status: 'Shipped',
            location: 'Memphis, TN',
            description: 'Package picked up'
          },
          {
            date: new Date('2025-09-02'),
            status: 'In Transit',
            location: 'Chicago, IL',
            description: 'At FedEx facility'
          }
        ]
      },
      {
        trackingNumber: '9405511206213334271437',
        carrier: 'USPS',
        customer: 'Mary Johnson',
        packageType: 'spol',
        status: 'Out for Delivery',
        dateSent: new Date('2025-09-03'),
        notes: 'Special handling required',
        userId: testUser._id.toString(),
        trackingHistory: [
          {
            date: new Date('2025-09-03'),
            status: 'Shipped',
            location: 'Local Post Office',
            description: 'Package accepted'
          },
          {
            date: new Date('2025-09-05'),
            status: 'Out for Delivery',
            location: 'Local Delivery Unit',
            description: 'Out for delivery'
          }
        ]
      },
      {
        trackingNumber: '7777888899991111',
        carrier: 'FedEx',
        customer: 'Tech Solutions Inc',
        packageType: 'AL',
        status: 'Exception',
        dateSent: new Date('2025-08-28'),
        notes: 'Address verification needed',
        userId: testUser._id.toString(),
        trackingHistory: [
          {
            date: new Date('2025-08-28'),
            status: 'Shipped',
            location: 'Origin',
            description: 'Package shipped'
          },
          {
            date: new Date('2025-08-30'),
            status: 'Exception',
            location: 'Destination Facility',
            description: 'Address verification required'
          }
        ]
      },
      {
        trackingNumber: 'EA123456789US',
        carrier: 'USPS',
        customer: 'Global Imports LLC',
        packageType: 'other',
        status: 'Delivered',
        dateSent: new Date('2025-08-20'),
        deliveryDate: new Date('2025-08-25'),
        notes: 'International shipping',
        userId: testUser._id.toString(),
        trackingHistory: [
          {
            date: new Date('2025-08-20'),
            status: 'Shipped',
            location: 'International Service Center',
            description: 'Package processed'
          },
          {
            date: new Date('2025-08-25'),
            status: 'Delivered',
            location: 'Customer Address',
            description: 'Package delivered'
          }
        ]
      }
    ];

    // Create sample packages
    await Package.insertMany(samplePackages);

    console.log('✅ Sample packages created successfully!');
    console.log('');
    console.log(`Created ${samplePackages.length} sample packages:`);
    samplePackages.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.carrier} - ${pkg.trackingNumber} (${pkg.customer}) - ${pkg.status}`);
    });
    console.log('');
    console.log('You can now log in and see sample package data in the dashboard.');

  } catch (error) {
    console.error('Error creating sample packages:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seedSamplePackages();
