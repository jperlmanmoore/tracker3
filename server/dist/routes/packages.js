"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Package_1 = __importDefault(require("../models/Package"));
const auth_1 = require("../middleware/auth");
const trackingUtils_1 = require("../utils/trackingUtils");
const emailService_1 = require("../utils/emailService");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
const sendPodEmailsIfConfigured = async (pkg, userId) => {
    try {
        const user = await User_1.default.findById(userId);
        if (!user?.podEmailConfig?.enabled) {
            return;
        }
        const { email1, email2 } = user.podEmailConfig;
        const emailsToSend = [];
        if (email1)
            emailsToSend.push(email1);
        if (email2)
            emailsToSend.push(email2);
        if (emailsToSend.length === 0) {
            return;
        }
        const podEmailData = {
            trackingNumber: pkg.trackingNumber,
            customer: pkg.customer,
            carrier: pkg.carrier,
            deliveryDate: pkg.deliveryDate,
            proofOfDelivery: pkg.proofOfDelivery
        };
        const results = await (0, emailService_1.sendPodEmailsToMultipleRecipients)(emailsToSend, podEmailData);
        console.log(`POD emails sent for ${pkg.trackingNumber}:`, results);
    }
    catch (error) {
        console.error('Error sending POD emails:', error);
    }
};
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { page = 1, limit = 20, sortBy = 'dateSent', sortOrder = 'desc', carrier, customer, packageType, status } = req.query;
        const filter = { userId };
        if (carrier)
            filter.carrier = carrier;
        if (customer)
            filter.customer = new RegExp(customer, 'i');
        if (packageType)
            filter.packageType = packageType;
        if (status)
            filter.status = status;
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [packages, total] = await Promise.all([
            Package_1.default.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Package_1.default.countDocuments(filter)
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
        });
    }
    catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { trackingNumbers, customer, packageType, dateSent, notes } = req.body;
        console.log('=== Package Creation Debug ===');
        console.log('Request body:', req.body);
        console.log('User ID:', userId);
        const parsedNumbers = (0, trackingUtils_1.parseTrackingNumbers)(trackingNumbers);
        console.log('Parsed tracking numbers:', parsedNumbers);
        if (parsedNumbers.length === 0) {
            console.log('No tracking numbers parsed');
            res.status(400).json({
                success: false,
                message: 'At least one tracking number is required'
            });
            return;
        }
        const createdPackages = [];
        const errors = [];
        for (const trackingNumber of parsedNumbers) {
            try {
                console.log(`Processing tracking number: ${trackingNumber}`);
                const detectedCarrier = (0, trackingUtils_1.detectCarrier)(trackingNumber);
                console.log(`Detected carrier for ${trackingNumber}: ${detectedCarrier}`);
                if (!detectedCarrier) {
                    const errorMsg = `Could not detect carrier for tracking number: ${trackingNumber}`;
                    console.log('ERROR:', errorMsg);
                    errors.push(errorMsg);
                    continue;
                }
                const existingPackage = await Package_1.default.findOne({
                    trackingNumber: trackingNumber.toUpperCase(),
                    userId
                });
                if (existingPackage) {
                    errors.push(`Package ${trackingNumber} already exists`);
                    continue;
                }
                const newPackage = new Package_1.default({
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
                await newPackage.save();
                console.log(`Successfully created package: ${trackingNumber}`);
                createdPackages.push(newPackage);
            }
            catch (error) {
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
            });
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
        });
    }
    catch (error) {
        console.error('Create packages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.get('/grouped', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        console.log('User ID:', userId);
        const groupedPackages = await Package_1.default.aggregate([
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
            { $sort: { _id: 1 } }
        ]);
        console.log('Grouped Packages:', groupedPackages);
        res.json({
            success: true,
            data: groupedPackages
        });
    }
    catch (error) {
        console.error('Get grouped packages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
        res.json({
            success: true,
            data: pkg
        });
    }
    catch (error) {
        console.error('Get package error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const { customer, packageType, dateSent, notes } = req.body;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
        if (customer !== undefined)
            pkg.customer = customer;
        if (packageType !== undefined)
            pkg.packageType = packageType;
        if (dateSent !== undefined)
            pkg.dateSent = new Date(dateSent);
        if (notes !== undefined)
            pkg.notes = notes;
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
        });
    }
    catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const pkg = await Package_1.default.findOneAndDelete({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Package deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.post('/:id/refresh', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
        const mockStatuses = ['In Transit', 'Out for Delivery', 'Delivered'];
        const randomIndex = Math.floor(Math.random() * mockStatuses.length);
        const randomStatus = mockStatuses[randomIndex];
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
        });
    }
    catch (error) {
        console.error('Refresh package error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.get('/tracking-urls/:carrier', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const carrier = req.params.carrier;
        const { customer } = req.query;
        if (!['USPS', 'FedEx'].includes(carrier)) {
            res.status(400).json({
                success: false,
                message: 'Invalid carrier. Must be USPS or FedEx'
            });
            return;
        }
        const filter = { userId, carrier };
        if (customer) {
            filter.customer = new RegExp(customer, 'i');
        }
        const packages = await Package_1.default.find(filter).select('trackingNumber customer');
        if (packages.length === 0) {
            res.status(404).json({
                success: false,
                message: `No ${carrier} packages found`
            });
            return;
        }
        const trackingNumbers = packages.map(pkg => pkg.trackingNumber);
        const bulkUrl = (0, trackingUtils_1.getBulkTrackingUrl)(trackingNumbers, carrier);
        const individualUrls = packages.map(pkg => ({
            trackingNumber: pkg.trackingNumber,
            customer: pkg.customer,
            url: (0, trackingUtils_1.getTrackingUrl)(pkg.trackingNumber, carrier)
        }));
        res.json({
            success: true,
            data: {
                carrier,
                bulkTrackingUrl: bulkUrl,
                packageCount: packages.length,
                packages: individualUrls
            }
        });
    }
    catch (error) {
        console.error('Get tracking URLs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.get('/customers', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const customers = await Package_1.default.distinct('customer', { userId });
        res.json({
            success: true,
            data: customers.sort()
        });
    }
    catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.get('/:id/proof-of-delivery', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId }).select('proofOfDelivery trackingNumber customer carrier status deliveryDate');
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
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
            });
            return;
        }
        let simulatedProofOfDelivery = pkg.proofOfDelivery;
        if (!simulatedProofOfDelivery || Object.keys(simulatedProofOfDelivery).length === 0) {
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
            if (simulatedProofOfDelivery.signatureRequired && Math.random() > 0.3) {
                simulatedProofOfDelivery.signatureObtained = true;
                simulatedProofOfDelivery.signedBy = pkg.customer.split(' ')[0] || 'J.DOE';
            }
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
        });
    }
    catch (error) {
        console.error('Get proof of delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.put('/:id/proof-of-delivery', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const proofOfDeliveryData = req.body;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
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
        });
    }
    catch (error) {
        console.error('Update proof of delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.post('/proof-of-delivery/batch', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { trackingNumbers } = req.body;
        if (!trackingNumbers || !Array.isArray(trackingNumbers)) {
            res.status(400).json({
                success: false,
                message: 'Tracking numbers array is required'
            });
            return;
        }
        const packages = await Package_1.default.find({
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
        });
    }
    catch (error) {
        console.error('Get batch proof of delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.post('/:id/simulate-delivery', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const packageId = req.params.id;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
        if (pkg.status === 'Delivered') {
            res.status(400).json({
                success: false,
                message: 'Package is already delivered'
            });
            return;
        }
        const deliveryData = await (0, trackingUtils_1.simulateDelivery)(pkg.trackingNumber, pkg.carrier);
        pkg.status = deliveryData.status;
        pkg.deliveryDate = deliveryData.deliveryDate;
        pkg.proofOfDelivery = deliveryData.proofOfDelivery;
        pkg.trackingHistory.push({
            date: new Date(),
            status: 'Delivered',
            description: 'Package delivered - Simulated for testing'
        });
        await pkg.save();
        await sendPodEmailsIfConfigured(pkg, userId);
        res.json({
            success: true,
            message: 'Package delivery simulated successfully',
            data: {
                package: pkg,
                proofOfDelivery: pkg.proofOfDelivery
            }
        });
    }
    catch (error) {
        console.error('Simulate delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.delete('/customer/:customerName', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const customerName = req.params.customerName;
        if (!customerName) {
            res.status(400).json({
                success: false,
                message: 'Customer name is required'
            });
            return;
        }
        const decodedCustomerName = decodeURIComponent(customerName);
        const packages = await Package_1.default.find({ userId, customer: decodedCustomerName });
        if (packages.length === 0) {
            res.status(404).json({
                success: false,
                message: 'No packages found for this customer'
            });
            return;
        }
        const deleteResult = await Package_1.default.deleteMany({ userId, customer: decodedCustomerName });
        res.json({
            success: true,
            message: `Deleted ${deleteResult.deletedCount} package(s) for customer: ${decodedCustomerName}`,
            data: {
                deletedCount: deleteResult.deletedCount,
                customerName: decodedCustomerName
            }
        });
    }
    catch (error) {
        console.error('Delete customer packages error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=packages.js.map