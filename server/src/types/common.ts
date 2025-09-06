// Common API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Pagination interface
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiError extends Error {
  statusCode: number;
  errors?: ValidationError[];
}
