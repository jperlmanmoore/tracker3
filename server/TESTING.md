# Testing Guide

## Overview
This project uses Jest for testing with TypeScript support and MongoDB Memory Server for database testing.

## Test Structure
- **Location**: `src/__tests__/`
- **Setup**: `src/__tests__/setup.ts` - Global test configuration
- **Auth Tests**: `src/__tests__/auth.test.ts` - Authentication endpoint tests
- **Package Tests**: `src/__tests__/packages.test.ts` - Package management tests

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test auth.test.ts
npm test packages.test.ts
```

## Test Features

### Database Testing
- Uses MongoDB Memory Server for isolated testing
- Automatic database cleanup after each test
- No need for external MongoDB instance

### Authentication Testing
- User registration and validation
- Login with valid/invalid credentials
- JWT token generation and validation
- Password reset functionality

### Package Testing
- Package creation with tracking numbers
- Carrier detection (USPS/FedEx)
- Package retrieval and filtering
- Authentication-protected endpoints
- Duplicate package prevention

## Test Coverage
The tests cover:
- ✅ API endpoints
- ✅ Authentication middleware
- ✅ Database operations
- ✅ Error handling
- ✅ Input validation
- ✅ Business logic

## Test Environment
- **Framework**: Jest with TypeScript
- **HTTP Testing**: Supertest
- **Database**: MongoDB Memory Server
- **Timeout**: 30 seconds per test
- **Coverage**: Excludes type definitions and main server file

## Adding New Tests
1. Create test files in `src/__tests__/` with `.test.ts` extension
2. Import required modules and setup test data
3. Use `describe` and `it` blocks for test organization
4. Use `beforeEach`/`afterEach` for test setup/cleanup
5. Follow existing patterns for consistency
