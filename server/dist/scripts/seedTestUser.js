"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFedExAPI = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const fedexApi_1 = require("../utils/fedexApi");
dotenv_1.default.config();
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailtracker';
        await mongoose_1.default.connect(mongoURI);
        console.log('MongoDB Connected:', mongoose_1.default.connection.host);
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
const testFedExAPI = async () => {
    try {
        console.log('🔍 Testing FedEx API Integration with enhanced debugging...');
        const testTrackingNumbers = [
            '771234567890',
            '612909123456789',
            '986578788855'
        ];
        for (const trackingNumber of testTrackingNumbers) {
            console.log(`\n📦 Testing tracking number: ${trackingNumber}`);
            try {
                const result = await (0, fedexApi_1.checkFedExDeliveryStatus)(trackingNumber);
                console.log(`✅ Result for ${trackingNumber}:`, JSON.stringify(result, null, 2));
            }
            catch (error) {
                console.log(`❌ Error for ${trackingNumber}:`, error.message);
            }
        }
    }
    catch (error) {
        console.error('❌ Error testing FedEx API:', error);
    }
};
exports.testFedExAPI = testFedExAPI;
const seedTestUser = async () => {
    try {
        await connectDB();
        await testFedExAPI();
        const existingUser = await User_1.default.findOne({ email: 'test@mailtracker.com' });
        if (existingUser) {
            console.log('Test user already exists!');
            console.log('Email: test@mailtracker.com');
            console.log('Password: password123');
            process.exit(0);
        }
        const testUser = new User_1.default({
            username: 'testuser',
            email: 'test@mailtracker.com',
            password: 'password123',
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
    }
    catch (error) {
        console.error('Error creating test user:', error);
    }
    finally {
        mongoose_1.default.connection.close();
        process.exit(0);
    }
};
if (require.main === module) {
    seedTestUser();
}
//# sourceMappingURL=seedTestUser.js.map