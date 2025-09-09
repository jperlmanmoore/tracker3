"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userResponse = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailNotifications: user.emailNotifications,
            podEmailConfig: user.podEmailConfig,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        res.json({
            success: true,
            data: userResponse
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { firstName, lastName, emailNotifications } = req.body;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.emailNotifications = emailNotifications !== undefined ? emailNotifications : user.emailNotifications;
        await user.save();
        const userResponse = {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailNotifications: user.emailNotifications,
            podEmailConfig: user.podEmailConfig,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: userResponse
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.put('/pod-email-config', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const { email1, email2, enabled } = req.body;
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (email1 && !emailRegex.test(email1)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format for email1'
            });
            return;
        }
        if (email2 && !emailRegex.test(email2)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format for email2'
            });
            return;
        }
        user.podEmailConfig = {
            email1: email1 || user.podEmailConfig?.email1,
            email2: email2 || user.podEmailConfig?.email2,
            enabled: enabled !== undefined ? enabled : user.podEmailConfig?.enabled || false
        };
        await user.save();
        res.json({
            success: true,
            message: 'POD email configuration updated successfully',
            data: user.podEmailConfig
        });
    }
    catch (error) {
        console.error('Update POD email config error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.get('/pod-email-config', auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            data: user.podEmailConfig || { enabled: false }
        });
    }
    catch (error) {
        console.error('Get POD email config error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map