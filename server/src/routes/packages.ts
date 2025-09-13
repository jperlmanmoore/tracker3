import express, { Request, Response, Router } from 'express';
import Package from '../models/Package';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/common';
import { detectCarrier, getTrackingUrl, getBulkTrackingUrl, parseTrackingNumbers } from '../utils/trackingUtils';
import { sendPodEmailsToMultipleRecipients } from '../utils/emailService';
import { checkFedExDeliveryStatus, getFedExTrackingHistory } from '../utils/fedexApi';
import { checkUSPSDeliveryStatus, getUSPSTrackingHistory } from '../utils/uspsApi';
import User from '../models/User';

const router: Router = express.Router();

// Helper function to send POD emails if configured
const sendPodEmailsIfConfigured = async (pkg: any, userId: string, fedexResponse?: any): Promise<void> => {
  try {
    // Check if SPOD email has already been sent
    if (pkg.spodEmailSent) {
      console.log(`SPOD email already sent for ${pkg.trackingNumber}`);
      return;
    }

    // Get user's POD email configuration
    const user = await User.findById(userId);
    if (!user?.podEmailConfig?.enabled) {
      return; // POD emails not enabled for this user
    }

    const { email1, email2 } = user.podEmailConfig;
    const emailsToSend: string[] = [];

    if (email1) emailsToSend.push(email1);
    if (email2) emailsToSend.push(email2);

    if (emailsToSend.length === 0) {
      return; // No email addresses configured
    }

    // Prepare POD email data
    const podEmailData = {
      trackingNumber: pkg.trackingNumber,
      customer: pkg.customer,
      carrier: pkg.carrier,
      deliveryDate: pkg.deliveryDate,
      proofOfDelivery: pkg.proofOfDelivery,
      fedexResponse: fedexResponse // Pass FedEx response for SPOD/PPOD extraction
    };

    // Send emails
    const results = await sendPodEmailsToMultipleRecipients(emailsToSend, podEmailData);

    // Mark SPOD email as sent
    pkg.spodEmailSent = true;
    await pkg.save();

    console.log(`POD emails sent for ${pkg.trackingNumber}:`, results);
  } catch (error) {
    console.error('Error sending POD emails:', error);
    // Don't throw error - we don't want email failures to break the main functionality
  }
};

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

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

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

        // Automatically refresh the package status after creation
        try {
          console.log(`Auto-refreshing status for newly created package: ${trackingNumber}`);
          
          let updatedStatus = newPackage.status;
          let deliveryDate = newPackage.deliveryDate;
          let trackingHistory = newPackage.trackingHistory || [];

          if (detectedCarrier === 'FedEx') {
            const deliveryStatus = await checkFedExDeliveryStatus(trackingNumber);
            
            if (deliveryStatus.isDelivered) {
              updatedStatus = 'Delivered';
              deliveryDate = deliveryStatus.deliveryDate || new Date();
              trackingHistory.push({
                date: deliveryDate,
                status: 'Delivered',
                description: 'Package delivered successfully'
              });
              console.log(`Auto-updated ${trackingNumber} to Delivered status`);
            }
          } else if (detectedCarrier === 'USPS') {
            const uspsStatus = await checkUSPSDeliveryStatus(trackingNumber);
            
            if (uspsStatus.isDelivered) {
              updatedStatus = 'Delivered';
              deliveryDate = uspsStatus.deliveryDate || new Date();
              trackingHistory.push({
                date: deliveryDate,
                status: 'Delivered',
                description: 'Package delivered successfully'
              });
              console.log(`Auto-updated ${trackingNumber} to Delivered status`);
            }
          }

          // Update package with refreshed data
          newPackage.status = updatedStatus;
          if (deliveryDate && !newPackage.deliveryDate) {
            newPackage.deliveryDate = deliveryDate;
          }
          newPackage.trackingHistory = trackingHistory;
          await newPackage.save();

          // Send POD emails if package was delivered
          if (updatedStatus === 'Delivered' && deliveryDate && !newPackage.spodEmailSent) {
            // For FedEx packages, pass the delivery status response for SPOD/PPOD extraction
            if (detectedCarrier === 'FedEx') {
              const deliveryStatus = await checkFedExDeliveryStatus(trackingNumber);
              await sendPodEmailsIfConfigured(newPackage, userId, deliveryStatus);
            } else {
              await sendPodEmailsIfConfigured(newPackage, userId);
            }
          }
        } catch (refreshError) {
          console.error(`Auto-refresh failed for ${trackingNumber}:`, refreshError);
          // Continue with package creation even if refresh fails
        }

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

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

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

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

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

    // Fetch real tracking data based on carrier
    let updatedStatus = pkg.status;
    let deliveryDate = pkg.deliveryDate;
    let trackingHistory = pkg.trackingHistory || [];

    try {
      if (pkg.carrier === 'FedEx') {
        console.log(`Fetching real FedEx tracking data for ${pkg.trackingNumber}`);

        // Get delivery status from FedEx API
        const deliveryStatus = await checkFedExDeliveryStatus(pkg.trackingNumber);

        if (deliveryStatus.isDelivered) {
          updatedStatus = 'Delivered';
          deliveryDate = deliveryStatus.deliveryDate || new Date();

          // Add delivery event to tracking history
          trackingHistory.push({
            date: deliveryDate,
            status: 'Delivered',
            description: 'Package delivered successfully'
          });

          console.log(`Package ${pkg.trackingNumber} marked as delivered`);
        } else {
          // Get tracking history for more detailed status
          const fedexHistory = await getFedExTrackingHistory(pkg.trackingNumber);

          if (fedexHistory.length > 0) {
            // Use the latest event from FedEx
            const latestEvent = fedexHistory[fedexHistory.length - 1];
            if (latestEvent) {
              updatedStatus = mapFedExStatusToInternal(latestEvent.status);

              // Add new events to tracking history (avoid duplicates)
              const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
              const newEvents = fedexHistory.filter(event =>
                !existingDates.has(event.date.getTime())
              );

              trackingHistory.push(...newEvents.map(event => ({
                date: event.date,
                status: mapFedExStatusToInternal(event.status),
                location: event.location || '',
                description: event.description || event.status
              })));

              console.log(`Updated ${pkg.trackingNumber} status to: ${updatedStatus}`);
            }
          }
        }
      } else if (pkg.carrier === 'USPS') {
        // Check USPS delivery status
        console.log(`Fetching USPS tracking data for ${pkg.trackingNumber}`);

        const uspsStatus = await checkUSPSDeliveryStatus(pkg.trackingNumber);

        if (uspsStatus.isDelivered) {
          updatedStatus = 'Delivered';
          deliveryDate = uspsStatus.deliveryDate || new Date();

          // Add delivery event to tracking history
          trackingHistory.push({
            date: deliveryDate,
            status: 'Delivered',
            description: 'Package delivered successfully'
          });

          console.log(`Package ${pkg.trackingNumber} marked as delivered`);
        } else {
          // Get tracking history for more detailed status
          const uspsHistory = await getUSPSTrackingHistory(pkg.trackingNumber);

          if (uspsHistory.length > 0) {
            // Use the latest event from USPS
            const latestEvent = uspsHistory[uspsHistory.length - 1];
            if (latestEvent) {
              updatedStatus = mapUSPSStatusToInternal(latestEvent.status);

              // Add new events to tracking history (avoid duplicates)
              const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
              const newEvents = uspsHistory.filter(event =>
                !existingDates.has(event.date.getTime())
              );

              trackingHistory.push(...newEvents.map(event => ({
                date: event.date,
                status: mapUSPSStatusToInternal(event.status),
                location: event.location || '',
                description: event.description || event.status
              })));

              console.log(`Updated ${pkg.trackingNumber} status to: ${updatedStatus}`);
            }
          } else {
            // Keep current status but add refresh note
            trackingHistory.push({
              date: new Date(),
              status: pkg.status,
              description: 'Tracking information refreshed'
            });
          }
        }
      }
    } catch (apiError) {
      console.error(`API error refreshing ${pkg.carrier} tracking for ${pkg.trackingNumber}:`, apiError);

      // Fallback: keep current status but add refresh note
      trackingHistory.push({
        date: new Date(),
        status: pkg.status,
        description: 'Tracking refresh attempted - API temporarily unavailable'
      });
    }

    // Update package with new data
    pkg.status = updatedStatus;
    if (deliveryDate && !pkg.deliveryDate) {
      pkg.deliveryDate = deliveryDate;
    }
    pkg.trackingHistory = trackingHistory;
    await pkg.save();

    // Send POD emails if package was just delivered
    if (updatedStatus === 'Delivered' && deliveryDate && pkg.deliveryDate && !pkg.spodEmailSent) {
      // For FedEx packages, pass the delivery status response for SPOD/PPOD extraction
      if (pkg.carrier === 'FedEx') {
        const deliveryStatus = await checkFedExDeliveryStatus(pkg.trackingNumber);
        await sendPodEmailsIfConfigured(pkg, userId, deliveryStatus);
      } else {
        await sendPodEmailsIfConfigured(pkg, userId);
      }
    }

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      message: 'Package tracking refreshed successfully',
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

// Helper function to map FedEx status to internal status
const mapFedExStatusToInternal = (fedexStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'Delivered': 'Delivered',
    'Out for Delivery': 'Out for Delivery',
    'In Transit': 'In Transit',
    'Picked Up': 'In Transit',
    'Arrived at FedEx location': 'In Transit',
    'Departed FedEx location': 'In Transit',
    'At FedEx destination facility': 'In Transit',
    'On FedEx vehicle for delivery': 'Out for Delivery',
    'Delivered to recipient': 'Delivered'
  };

  return statusMap[fedexStatus] || 'In Transit';
};

// Helper function to map USPS status to internal status
const mapUSPSStatusToInternal = (uspsStatus: string): string => {
  const statusMap: { [key: string]: string } = {
    'Delivered': 'Delivered',
    'Out for Delivery': 'Out for Delivery',
    'In Transit': 'In Transit',
    'Processed': 'In Transit',
    'Departed': 'In Transit',
    'Arrived': 'In Transit',
    'Acceptance': 'In Transit',
    'Delivered to Recipient': 'Delivered'
  };

  return statusMap[uspsStatus] || 'In Transit';
};

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

// Bulk refresh package tracking
router.post('/bulk-refresh', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user._id.toString();
    const { packageIds } = req.body;

    if (!packageIds || !Array.isArray(packageIds)) {
      res.status(400).json({
        success: false,
        message: 'Package IDs array is required'
      } as ApiResponse);
      return;
    }

    const packages = await Package.find({
      _id: { $in: packageIds },
      userId
    });

    if (packages.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No packages found'
      } as ApiResponse);
      return;
    }

    const results = [];
    let updatedCount = 0;

    for (const pkg of packages) {
      try {
        // Fetch real tracking data based on carrier
        let updatedStatus = pkg.status;
        let deliveryDate = pkg.deliveryDate;
        let trackingHistory = pkg.trackingHistory || [];

        if (pkg.carrier === 'FedEx') {
          console.log(`Bulk refresh: Fetching FedEx data for ${pkg.trackingNumber}`);

          const deliveryStatus = await checkFedExDeliveryStatus(pkg.trackingNumber);

          if (deliveryStatus.isDelivered) {
            updatedStatus = 'Delivered';
            deliveryDate = deliveryStatus.deliveryDate || new Date();
            trackingHistory.push({
              date: deliveryDate,
              status: 'Delivered',
              description: 'Package delivered successfully'
            });
          } else {
            const fedexHistory = await getFedExTrackingHistory(pkg.trackingNumber);
            if (fedexHistory.length > 0) {
              const latestEvent = fedexHistory[fedexHistory.length - 1];
              if (latestEvent) {
                updatedStatus = mapFedExStatusToInternal(latestEvent.status);
                const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
                const newEvents = fedexHistory.filter(event =>
                  !existingDates.has(event.date.getTime())
                );
                trackingHistory.push(...newEvents.map(event => ({
                  date: event.date,
                  status: mapFedExStatusToInternal(event.status),
                  location: event.location || '',
                  description: event.description || event.status
                })));
              }
            }
          }
        } else if (pkg.carrier === 'USPS') {
          console.log(`Bulk refresh: Checking USPS data for ${pkg.trackingNumber}`);

          const uspsStatus = await checkUSPSDeliveryStatus(pkg.trackingNumber);

          if (uspsStatus.isDelivered) {
            updatedStatus = 'Delivered';
            deliveryDate = uspsStatus.deliveryDate || new Date();
            trackingHistory.push({
              date: deliveryDate,
              status: 'Delivered',
              description: 'Package delivered successfully'
            });
          } else {
            const uspsHistory = await getUSPSTrackingHistory(pkg.trackingNumber);
            if (uspsHistory.length > 0) {
              const latestEvent = uspsHistory[uspsHistory.length - 1];
              if (latestEvent) {
                updatedStatus = mapUSPSStatusToInternal(latestEvent.status);
                const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
                const newEvents = uspsHistory.filter(event =>
                  !existingDates.has(event.date.getTime())
                );
                trackingHistory.push(...newEvents.map(event => ({
                  date: event.date,
                  status: mapUSPSStatusToInternal(event.status),
                  location: event.location || '',
                  description: event.description || event.status
                })));
              }
            } else {
              trackingHistory.push({
                date: new Date(),
                status: pkg.status,
                description: 'Tracking information refreshed'
              });
            }
          }
        }

        // Update package if status changed
        if (updatedStatus !== pkg.status || (deliveryDate && !pkg.deliveryDate)) {
          pkg.status = updatedStatus;
          if (deliveryDate && !pkg.deliveryDate) {
            pkg.deliveryDate = deliveryDate;
          }
          pkg.trackingHistory = trackingHistory;
          await pkg.save();
          updatedCount++;

          // Send POD emails if package was just delivered
          if (updatedStatus === 'Delivered' && deliveryDate && !pkg.spodEmailSent) {
            // For FedEx packages, pass the delivery status response for SPOD/PPOD extraction
            if (pkg.carrier === 'FedEx') {
              const deliveryStatus = await checkFedExDeliveryStatus(pkg.trackingNumber);
              await sendPodEmailsIfConfigured(pkg, userId, deliveryStatus);
            } else {
              await sendPodEmailsIfConfigured(pkg, userId);
            }
          }
        }

        results.push({
          id: pkg._id,
          trackingNumber: pkg.trackingNumber,
          carrier: pkg.carrier,
          oldStatus: pkg.status,
          newStatus: updatedStatus,
          updated: updatedStatus !== pkg.status
        });

      } catch (error) {
        console.error(`Error refreshing ${pkg.trackingNumber}:`, error);
        results.push({
          id: pkg._id,
          trackingNumber: pkg.trackingNumber,
          carrier: pkg.carrier,
          error: 'Failed to refresh tracking'
        });
      }
    }

    res.json({
      success: true,
      message: `Refreshed ${packages.length} packages, ${updatedCount} updated`,
      data: {
        totalPackages: packages.length,
        updatedPackages: updatedCount,
        results
      }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Bulk refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

// Manually trigger SPOD email for testing
router.post('/:id/send-spod-email', authenticateToken, async (req: Request, res: Response): Promise<void> => {
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

    if (pkg.status !== 'Delivered') {
      res.status(400).json({
        success: false,
        message: 'Package must be delivered to send SPOD email'
      } as ApiResponse);
      return;
    }

    // Reset SPOD email sent flag for testing
    pkg.spodEmailSent = false;
    await pkg.save();

    // Send POD emails
    await sendPodEmailsIfConfigured(pkg, userId);

    res.json({
      success: true,
      message: 'SPOD email sent successfully'
    } as ApiResponse);
  } catch (error: any) {
    console.error('Send SPOD email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    } as ApiResponse);
  }
});

export default router;
