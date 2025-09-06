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

export default router;
