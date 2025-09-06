"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
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
const seedTestUser = async () => {
    try {
        await connectDB();
        const existingUser = await User_1.default.findOne({ email: 'test@mailtracker.com' });
        if (existingUser) {
            console.log('Test user already exists!');
            console.log('Email: test@mailtracker.com');
            console.log('Password: password123');
            process.exit(0);
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash('password123', salt);
        const testUser = new User_1.default({
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
    }
    catch (error) {
        console.error('Error creating test user:', error);
    }
    finally {
        mongoose_1.default.connection.close();
        process.exit(0);
    }
};
seedTestUser();
//# sourceMappingURL=seedTestUser.js.map