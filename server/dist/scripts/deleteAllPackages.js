"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Package_1 = __importDefault(require("../models/Package"));
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
const deleteAllPackages = async () => {
    try {
        await connectDB();
        const result = await Package_1.default.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} packages.`);
    }
    catch (error) {
        console.error('Error deleting packages:', error);
    }
    finally {
        mongoose_1.default.connection.close();
        process.exit(0);
    }
};
deleteAllPackages();
//# sourceMappingURL=deleteAllPackages.js.map