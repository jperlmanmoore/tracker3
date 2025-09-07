import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import packageRoutes from '../routes/packages';
import User from '../models/User';
import Package from '../models/Package';

const app = express();
app.use(express.json());
app.use('/api/packages', packageRoutes);

// Helper function to create a test user and get JWT token
async function createTestUserAndToken() {
  const user = new User({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  });
  await user.save();

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  return { user, token };
}

describe('Package Routes', () => {
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    const { user, token } = await createTestUserAndToken();
    testUser = user;
    authToken = token;
  });

  describe('POST /api/packages', () => {
    it('should create packages successfully with valid data', async () => {
      const packageData = {
        trackingNumbers: '9405511206213334271430,1234567890123456',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: '2025-09-06',
        notes: 'Test package notes'
      };

      const response = await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('package(s) created successfully');
      expect(response.body.data.packages).toBeDefined();
      expect(response.body.data.packages.length).toBeGreaterThan(0);
    });

    it('should return error for invalid tracking numbers', async () => {
      const packageData = {
        trackingNumbers: '',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: '2025-09-06'
      };

      const response = await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('At least one tracking number is required');
    });

    it('should return error for duplicate tracking numbers', async () => {
      const packageData = {
        trackingNumbers: '9405511206213334271430',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: '2025-09-06'
      };

      // Create package first
      await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(201);

      // Try to create same package again
      const response = await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No packages were created');
      expect(response.body.data.errors).toBeDefined();
      expect(response.body.data.errors[0]).toContain('already exists');
    });

    it('should return error without authentication token', async () => {
      const packageData = {
        trackingNumbers: '9405511206213334271430',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: '2025-09-06'
      };

      const response = await request(app)
        .post('/api/packages')
        .send(packageData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should detect carriers correctly', async () => {
      const packageData = {
        trackingNumbers: '9405511206213334271430', // USPS format
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: '2025-09-06'
      };

      const response = await request(app)
        .post('/api/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(packageData)
        .expect(201);

      expect(response.body.data.packages[0].carrier).toBe('USPS');
    });
  });

  describe('GET /api/packages', () => {
    beforeEach(async () => {
      // Create test packages
      const package1 = new Package({
        trackingNumber: '9405511206213334271430',
        carrier: 'USPS',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: new Date('2025-09-06'),
        userId: testUser._id,
        trackingHistory: [{
          date: new Date(),
          status: 'Package Created',
          description: 'Package added to tracking system as USPS'
        }]
      });

      const package2 = new Package({
        trackingNumber: '1234567890123456',
        carrier: 'FedEx',
        customer: 'Jane Smith',
        packageType: 'demand',
        dateSent: new Date('2025-09-05'),
        userId: testUser._id,
        trackingHistory: [{
          date: new Date(),
          status: 'Package Created',
          description: 'Package added to tracking system as FedEx'
        }]
      });

      await package1.save();
      await package2.save();
    });

    it('should get all packages for authenticated user', async () => {
      const response = await request(app)
        .get('/api/packages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages).toBeDefined();
      expect(response.body.data.packages.length).toBe(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter packages by carrier', async () => {
      const response = await request(app)
        .get('/api/packages?carrier=USPS')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages.length).toBe(1);
      expect(response.body.data.packages[0].carrier).toBe('USPS');
    });

    it('should filter packages by customer', async () => {
      const response = await request(app)
        .get('/api/packages?customer=Jane')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.packages.length).toBe(1);
      expect(response.body.data.packages[0].customer).toBe('Jane Smith');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/packages')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('GET /api/packages/:id', () => {
    let packageId: string;

    beforeEach(async () => {
      const testPackage = new Package({
        trackingNumber: '9405511206213334271430',
        carrier: 'USPS',
        customer: 'John Doe',
        packageType: 'LOR',
        dateSent: new Date('2025-09-06'),
        userId: testUser._id,
        trackingHistory: [{
          date: new Date(),
          status: 'Package Created',
          description: 'Package added to tracking system as USPS'
        }]
      });
      
      const savedPackage = await testPackage.save();
      packageId = savedPackage._id.toString();
    });

    it('should get single package by id', async () => {
      const response = await request(app)
        .get(`/api/packages/${packageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trackingNumber).toBe('9405511206213334271430');
      expect(response.body.data.customer).toBe('John Doe');
    });

    it('should return 404 for non-existent package', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/packages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Package not found');
    });
  });
});
