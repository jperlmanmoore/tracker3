import express, { Request, Response, Router } from 'express';
import Package from '../models/Package';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/common';
import { detectCarrier, getTrackingUrl, getBulkTrackingUrl, parseTrackingNumbers, simulateDelivery } from '../utils/trackingUtils';

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
              _id: "$_id",
              trackingNumber: "$trackingNumber",
              carrier: "$carrier",
              dateSent: "$dateSent",
              status: "$status",
              deliveryDate: "$deliveryDate",
              notes: "$notes"
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
    const { customer, packageType, dateSent, notes } = req.body;

    const pkg = await Package.findOne({ _id: packageId, userId });

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    // Update allowed fields
    if (customer !== undefined) pkg.customer = customer;
    if (packageType !== undefined) pkg.packageType = packageType;
    if (dateSent !== undefined) pkg.dateSent = new Date(dateSent);
    if (notes !== undefined) pkg.notes = notes;

    // Add tracking history entry for the update
    pkg.trackingHistory.push({
      date: new Date(),
      status: pkg.status,
      description: 'Package information updated'
    });

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

// Get proof of delivery for a package
router.get('/:id/proof-of-delivery', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const packageId = req.params.id;

    const pkg = await Package.findOne({ _id: packageId, userId }).select('proofOfDelivery trackingNumber customer carrier status deliveryDate');

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    // If package is not delivered yet, try to fetch proof of delivery
    if (pkg.status !== 'Delivered') {
      res.json({
        success: true,
        data: {
          packageInfo: {
            trackingNumber: pkg.trackingNumber,
            customer: pkg.customer,
            carrier: pkg.carrier,
            status: pkg.status
          },
          proofOfDelivery: null,
          message: 'Package not yet delivered'
        }
      } as ApiResponse);
      return;
    }

    // Simulate fetching proof of delivery from carrier APIs
    let simulatedProofOfDelivery = pkg.proofOfDelivery;
    
    if (!simulatedProofOfDelivery || Object.keys(simulatedProofOfDelivery).length === 0) {
      // Simulate proof of delivery data
      simulatedProofOfDelivery = {
        deliveredTo: 'Recipient',
        deliveryLocation: 'Front Door',
        signatureRequired: pkg.carrier === 'FedEx' ? Math.random() > 0.5 : Math.random() > 0.7,
        signatureObtained: false,
        signedBy: '',
        deliveryPhoto: pkg.carrier === 'USPS' ? (Math.random() > 0.6 ? 'https://example.com/delivery-photo.jpg' : '') : '',
        deliveryInstructions: 'Left at front door',
        proofOfDeliveryUrl: `https://${pkg.carrier.toLowerCase()}.com/proof-of-delivery/${pkg.trackingNumber}`,
        lastUpdated: new Date()
      };

      // If signature required, add signature data
      if (simulatedProofOfDelivery.signatureRequired && Math.random() > 0.3) {
        simulatedProofOfDelivery.signatureObtained = true;
        simulatedProofOfDelivery.signedBy = pkg.customer.split(' ')[0] || 'J.DOE';
      }

      // Update the package with proof of delivery
      pkg.proofOfDelivery = simulatedProofOfDelivery;
      await pkg.save();
    }

    res.json({
      success: true,
      data: {
        packageInfo: {
          trackingNumber: pkg.trackingNumber,
          customer: pkg.customer,
          carrier: pkg.carrier,
          status: pkg.status,
          deliveryDate: pkg.deliveryDate
        },
        proofOfDelivery: simulatedProofOfDelivery
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get proof of delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Update proof of delivery for a package
router.put('/:id/proof-of-delivery', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const packageId = req.params.id;
    const proofOfDeliveryData = req.body;

    const pkg = await Package.findOne({ _id: packageId, userId });

    if (!pkg) {
      res.status(404).json({
        success: false,
        message: 'Package not found'
      } as ApiResponse);
      return;
    }

    // Update proof of delivery data
    pkg.proofOfDelivery = {
      ...(pkg.proofOfDelivery || {}),
      ...proofOfDeliveryData,
      lastUpdated: new Date()
    };

    await pkg.save();

    res.json({
      success: true,
      message: 'Proof of delivery updated successfully',
      data: pkg.proofOfDelivery
    } as ApiResponse);
  } catch (error: any) {
    console.error('Update proof of delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Get proof of delivery status for multiple packages
router.post('/proof-of-delivery/batch', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const { trackingNumbers } = req.body;

    if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
      res.status(400).json({
        success: false,
        message: 'Tracking numbers array is required'
      } as ApiResponse);
      return;
    }

    const packages = await Package.find({
      userId,
      trackingNumber: { $in: trackingNumbers }
    }).select('trackingNumber customer carrier status deliveryDate proofOfDelivery');

    const proofOfDeliveryData = packages.map(pkg => ({
      trackingNumber: pkg.trackingNumber,
      customer: pkg.customer,
      carrier: pkg.carrier,
      status: pkg.status,
      deliveryDate: pkg.deliveryDate,
      hasProofOfDelivery: pkg.status === 'Delivered' && pkg.proofOfDelivery && Object.keys(pkg.proofOfDelivery).length > 0,
      proofOfDelivery: pkg.status === 'Delivered' ? pkg.proofOfDelivery : null
    }));

    res.json({
      success: true,
      data: proofOfDeliveryData
    } as ApiResponse);
  } catch (error: any) {
    console.error('Get batch proof of delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Simulate package delivery (for testing purposes)
router.post('/:id/simulate-delivery', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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

    if (pkg.status === 'Delivered') {
      res.status(400).json({
        success: false,
        message: 'Package is already delivered'
      } as ApiResponse);
      return;
    }

    // Simulate delivery
    const deliveryData = simulateDelivery(pkg.trackingNumber, pkg.carrier);
    
    pkg.status = deliveryData.status;
    pkg.deliveryDate = deliveryData.deliveryDate;
    pkg.proofOfDelivery = deliveryData.proofOfDelivery;
    
    // Add tracking history entry
    pkg.trackingHistory.push({
      date: new Date(),
      status: 'Delivered',
      description: 'Package delivered - Simulated for testing'
    });

    await pkg.save();

    res.json({
      success: true,
      message: 'Package delivery simulated successfully',
      data: {
        package: pkg,
        proofOfDelivery: pkg.proofOfDelivery
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Simulate delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Delete all packages for a customer
router.delete('/customer/:customerName', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const customerName = req.params.customerName;
    
    if (!customerName) {
      res.status(400).json({
        success: false,
        message: 'Customer name is required'
      } as ApiResponse);
      return;
    }

    const decodedCustomerName = decodeURIComponent(customerName);

    // Find all packages for this customer
    const packages = await Package.find({ userId, customer: decodedCustomerName });
    
    if (packages.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No packages found for this customer'
      } as ApiResponse);
      return;
    }

    // Delete all packages for this customer
    const deleteResult = await Package.deleteMany({ userId, customer: decodedCustomerName });

    res.json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} package(s) for customer: ${decodedCustomerName}`,
      data: {
        deletedCount: deleteResult.deletedCount,
        customerName: decodedCustomerName
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Delete customer packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

export default router;
