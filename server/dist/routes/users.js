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
exports.default = router;
//# sourceMappingURL=users.js.map