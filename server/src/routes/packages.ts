import express, { Request, Response, Router } from 'express';
import Package from '../models/Package';
import { authenticateToken } from '../middleware/auth';
import { validatePackage } from '../middleware/validation';
import { IPackageInput, IPackageResponse } from '../types/package';
import { ApiResponse, PaginationParams } from '../types/common';
import { detectCarrier, getTrackingUrl, getBulkTrackingUrl, parseTrackingNumbers } from '../utils/trackingUtils';

const router: Router = express.Router();

// Get all packages for authenticated user
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const {
      page = 1,
      limit = 20,
      sortBy = 'dateSent',
      sortOrder = 'desc',
      carrier,
      customer,
      packageType,
      status
    } = req.query as any;

    // Build filter object
    const filter: any = { userId };
    if (carrier) filter.carrier = carrier;
    if (customer) filter.customer = new RegExp(customer, 'i');
    if (packageType) filter.packageType = packageType;
    if (status) filter.status = status;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [packages, total] = await Promise.all([
      Package.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Package.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        packages,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Create new package
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const { trackingNumbers, customer, packageType, dateSent, notes } = req.body;

    console.log('=== Package Creation Debug ===');
    console.log('Request body:', req.body);
    console.log('User ID:', userId);

    // Parse tracking numbers from input
    const parsedNumbers = parseTrackingNumbers(trackingNumbers);
    console.log('Parsed tracking numbers:', parsedNumbers);
    
    if (parsedNumbers.length === 0) {
      console.log('No tracking numbers parsed');
      res.status(400).json({
        success: false,
        message: 'At least one tracking number is required'
      } as ApiResponse);
      return;
    }

    const createdPackages = [];
    const errors = [];

    for (const trackingNumber of parsedNumbers) {
      try {
        console.log(`Processing tracking number: ${trackingNumber}`);
        
        // Auto-detect carrier
        const detectedCarrier = detectCarrier(trackingNumber);
        console.log(`Detected carrier for ${trackingNumber}: ${detectedCarrier}`);
        
        if (!detectedCarrier) {
          const errorMsg = `Could not detect carrier for tracking number: ${trackingNumber}`;
          console.log('ERROR:', errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // Check if package already exists for this user
        const existingPackage = await Package.findOne({
          trackingNumber: trackingNumber.toUpperCase(),
          userId
        });

        if (existingPackage) {
          errors.push(`Package ${trackingNumber} already exists`);
          continue;
        }

        // Create new package
        const newPackage = new Package({
          trackingNumber: trackingNumber.toUpperCase(),
          carrier: detectedCarrier,
          customer,
          packageType,
          dateSent: new Date(dateSent),
          notes: notes || '',
          userId,
          trackingHistory: [{
            date: new Date(),
            status: 'Package Created',
            description: `Package added to tracking system as ${detectedCarrier}`
          }]
        });

        // Save the new package to the database
        await newPackage.save();

        console.log(`Successfully created package: ${trackingNumber}`);
        createdPackages.push(newPackage);
      } catch (error) {
        const errorMsg = `Error creating package ${trackingNumber}: ${error}`;
        console.log('ERROR:', errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`Created ${createdPackages.length} packages`);
    console.log('Errors:', errors);

    if (createdPackages.length === 0) {
      console.log('No packages were created, returning error response');
      res.status(400).json({
        success: false,
        message: 'No packages were created',
        data: { errors }
      } as ApiResponse);
      return;
    }

    console.log('Returning success response');
    res.status(201).json({
      success: true,
      message: `${createdPackages.length} package(s) created successfully`,
      data: {
        packages: createdPackages,
        errors: errors.length > 0 ? errors : undefined
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Create packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Get packages grouped by customer - MUST be before /:id route
router.get('/grouped', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    console.log('User ID:', userId);

    const groupedPackages = await Package.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$customer",
          packages: {
            $push: {
              trackingNumber: "$trackingNumber",
              carrier: "$carrier",
              dateSent: "$dateSent",
              status: "$status"
            }
          }
        }
      },
      { $sort: { _id: 1 } } // Sort by customer name
    ]);

    console.log('Grouped Packages:', groupedPackages);

    res.json({
      success: true,
      data: groupedPackages
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get grouped packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Get single package
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const packageId = req.params.id;

    const pkg = await Package.findOne({ _id: packageId, userId });

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: pkg
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get package error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Update package
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const packageId = req.params.id;
    const { notes } = req.body;

    const pkg = await Package.findOne({ _id: packageId, userId });

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    if (notes !== undefined) pkg.notes = notes;
    await pkg.save();

    res.json({
      success: true,
      message: 'Package updated successfully',
      data: pkg
    } as ApiResponse);
  } catch (error: any) {
    console.error('Update package error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Delete package
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const packageId = req.params.id;

    const pkg = await Package.findOneAndDelete({ _id: packageId, userId });

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Package deleted successfully'
    } as ApiResponse);
  } catch (error: any) {
    console.error('Delete package error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Refresh package tracking
router.post('/:id/refresh', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const packageId = req.params.id;

    const pkg = await Package.findOne({ _id: packageId, userId });

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    // Simulate tracking update
    const mockStatuses: ('In Transit' | 'Out for Delivery' | 'Delivered')[] = ['In Transit', 'Out for Delivery', 'Delivered'];
    const randomIndex = Math.floor(Math.random() * mockStatuses.length);
    const randomStatus = mockStatuses[randomIndex]!;
    
    pkg.status = randomStatus;
    pkg.trackingHistory.push({
      date: new Date(),
      status: randomStatus,
      description: `Status updated via tracking refresh`
    });

    if (randomStatus === 'Delivered' && !pkg.deliveryDate) {
      pkg.deliveryDate = new Date();
    }

    await pkg.save();

    res.json({
      success: true,
      message: 'Package tracking refreshed',
      data: pkg
    } as ApiResponse);
  } catch (error: any) {
    console.error('Refresh package error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Get bulk tracking URLs
router.get('/tracking-urls/:carrier', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const carrier = req.params.carrier as 'USPS' | 'FedEx';
    const { customer } = req.query;

    if (!['USPS', 'FedEx'].includes(carrier)) {
      res.status(400).json({
        success: false,
        message: 'Invalid carrier. Must be USPS or FedEx'
      } as ApiResponse);
      return;
    }

    // Build filter
    const filter: any = { userId, carrier };
    if (customer) {
      filter.customer = new RegExp(customer as string, 'i');
    }

    // Get packages for the carrier
    const packages = await Package.find(filter).select('trackingNumber customer');
    
    if (packages.length === 0) {
      res.status(404).json({
        success: false,
        message: `No ${carrier} packages found`
      } as ApiResponse);
      return;
    }

    const trackingNumbers = packages.map(pkg => pkg.trackingNumber);
    const bulkUrl = getBulkTrackingUrl(trackingNumbers, carrier);
    const individualUrls = packages.map(pkg => ({
      trackingNumber: pkg.trackingNumber,
      customer: pkg.customer,
      url: getTrackingUrl(pkg.trackingNumber, carrier)
    }));

    res.json({
      success: true,
      data: {
        carrier,
        bulkTrackingUrl: bulkUrl,
        packageCount: packages.length,
        packages: individualUrls
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get tracking URLs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Get customers list for filtering
router.get('/customers', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    
    const customers = await Package.distinct('customer', { userId });
    
    res.json({
      success: true,
      data: customers.sort()
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

export default router;
