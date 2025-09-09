import express, { Request, Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { IUserResponse } from '../types/user';
import { ApiResponse } from '../types/common';

const router: Router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    const userResponse: IUserResponse = {
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
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { firstName, lastName, emailNotifications } = req.body;

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.emailNotifications = emailNotifications !== undefined ? emailNotifications : user.emailNotifications;

    await user.save();

    const userResponse: IUserResponse = {
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
    } as ApiResponse);
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Update POD email configuration
router.put('/pod-email-config', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { email1, email2, enabled } = req.body;

    // Validate email formats if provided
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (email1 && !emailRegex.test(email1)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format for email1'
      } as ApiResponse);
      return;
    }
    if (email2 && !emailRegex.test(email2)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format for email2'
      } as ApiResponse);
      return;
    }

    // Update POD email configuration
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
    } as ApiResponse);
  } catch (error: any) {
    console.error('Update POD email config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Get POD email configuration
router.get('/pod-email-config', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: user.podEmailConfig || { enabled: false }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get POD email config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

export default router;
