// User registration data
export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// User login data
export interface LoginData {
  email: string;
  password: string;
}

// User profile data
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  emailNotifications?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
