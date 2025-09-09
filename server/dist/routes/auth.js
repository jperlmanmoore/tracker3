"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
router.post('/register', validation_1.validateRegistration, async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;
        const existingUser = await User_1.default.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
            return;
        }
        const user = new User_1.default({
            username,
            email,
            password,
            firstName,
            lastName
        });
        await user.save();
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        const userResponse = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailNotifications: user.emailNotifications,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: userResponse
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
});
router.post('/login', validation_1.validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
            return;
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
        const userResponse = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailNotifications: user.emailNotifications,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: userResponse
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000);
        await user.save();
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
        console.log(`Password reset requested for ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        res.json({
            success: true,
            message: 'Password reset email sent',
            data: { resetUrl }
        });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const user = await User_1.default.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
            return;
        }
        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map