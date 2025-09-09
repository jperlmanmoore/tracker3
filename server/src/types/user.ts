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

// POD email configuration interface
export interface IPodEmailConfig {
  email1?: string;
  email2?: string;
  enabled: boolean;
}

// User response interface (without sensitive data)
export interface IUserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  emailNotifications?: boolean;
  podEmailConfig?: IPodEmailConfig;
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
  podEmailConfig?: IPodEmailConfig;
  isActive: boolean;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
