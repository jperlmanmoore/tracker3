import { Document } from 'mongoose';

// User input interface for registration
export interface IUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// User login interface
export interface IUserLogin {
  email: string;
  password: string;
}

// User response interface (without sensitive data)
export interface IUserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  emailNotifications?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// User document interface for Mongoose
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  emailNotifications: boolean;
  isActive: boolean;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
