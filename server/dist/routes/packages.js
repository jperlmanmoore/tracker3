"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Package_1 = __importDefault(require("../models/Package"));
const auth_1 = require("../middleware/auth");
const trackingUtils_1 = require("../utils/trackingUtils");
const router = express_1.default.Router();
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
        const parsedNumbers = (0, trackingUtils_1.parseTrackingNumbers)(trackingNumbers);
        if (parsedNumbers.length === 0) {
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
                const detectedCarrier = (0, trackingUtils_1.detectCarrier)(trackingNumber);
                if (!detectedCarrier) {
                    errors.push(`Could not detect carrier for tracking number: ${trackingNumber}`);
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
                createdPackages.push(newPackage);
            }
            catch (error) {
                errors.push(`Error creating package ${trackingNumber}: ${error}`);
            }
        }
        if (createdPackages.length === 0) {
            res.status(400).json({
                success: false,
                message: 'No packages were created',
                data: { errors }
            });
            return;
        }
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
        const { notes } = req.body;
        const pkg = await Package_1.default.findOne({ _id: packageId, userId });
        if (!pkg) {
            res.status(404).json({
                success: false,
                message: 'Package not found'
            });
            return;
        }
        if (notes !== undefined)
            pkg.notes = notes;
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
exports.default = router;
//# sourceMappingURL=packages.js.map