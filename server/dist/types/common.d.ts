export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface ApiError extends Error {
    statusCode: number;
    errors?: ValidationError[];
}
//# sourceMappingURL=common.d.ts.map