import { Document } from 'mongoose';
export interface IUserInput {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
export interface IUserLogin {
    email: string;
    password: string;
}
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
//# sourceMappingURL=user.d.ts.map