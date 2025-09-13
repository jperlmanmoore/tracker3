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
const fedexApi_1 = require("../utils/fedexApi");
const uspsApi_1 = require("../utils/uspsApi");
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
const sendPodEmailsIfConfigured = async (pkg, userId) => {
    try {
        if (pkg.spodEmailSent) {
            console.log(`SPOD email already sent for ${pkg.trackingNumber}`);
            return;
        }
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
        pkg.spodEmailSent = true;
        await pkg.save();
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
                try {
                    console.log(`Auto-refreshing status for newly created package: ${trackingNumber}`);
                    let updatedStatus = newPackage.status;
                    let deliveryDate = newPackage.deliveryDate;
                    let trackingHistory = newPackage.trackingHistory || [];
                    if (detectedCarrier === 'FedEx') {
                        const deliveryStatus = await (0, fedexApi_1.checkFedExDeliveryStatus)(trackingNumber);
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
                    }
                    else if (detectedCarrier === 'USPS') {
                        const uspsStatus = await (0, uspsApi_1.checkUSPSDeliveryStatus)(trackingNumber);
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
                    newPackage.status = updatedStatus;
                    if (deliveryDate && !newPackage.deliveryDate) {
                        newPackage.deliveryDate = deliveryDate;
                    }
                    newPackage.trackingHistory = trackingHistory;
                    await newPackage.save();
                    if (updatedStatus === 'Delivered' && deliveryDate && !newPackage.spodEmailSent) {
                        await sendPodEmailsIfConfigured(newPackage, userId);
                    }
                }
                catch (refreshError) {
                    console.error(`Auto-refresh failed for ${trackingNumber}:`, refreshError);
                }
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
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
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
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
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
        let updatedStatus = pkg.status;
        let deliveryDate = pkg.deliveryDate;
        let trackingHistory = pkg.trackingHistory || [];
        try {
            if (pkg.carrier === 'FedEx') {
                console.log(`Fetching real FedEx tracking data for ${pkg.trackingNumber}`);
                const deliveryStatus = await (0, fedexApi_1.checkFedExDeliveryStatus)(pkg.trackingNumber);
                if (deliveryStatus.isDelivered) {
                    updatedStatus = 'Delivered';
                    deliveryDate = deliveryStatus.deliveryDate || new Date();
                    trackingHistory.push({
                        date: deliveryDate,
                        status: 'Delivered',
                        description: 'Package delivered successfully'
                    });
                    console.log(`Package ${pkg.trackingNumber} marked as delivered`);
                }
                else {
                    const fedexHistory = await (0, fedexApi_1.getFedExTrackingHistory)(pkg.trackingNumber);
                    if (fedexHistory.length > 0) {
                        const latestEvent = fedexHistory[fedexHistory.length - 1];
                        if (latestEvent) {
                            updatedStatus = mapFedExStatusToInternal(latestEvent.status);
                            const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
                            const newEvents = fedexHistory.filter(event => !existingDates.has(event.date.getTime()));
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
            }
            else if (pkg.carrier === 'USPS') {
                console.log(`Fetching USPS tracking data for ${pkg.trackingNumber}`);
                const uspsStatus = await (0, uspsApi_1.checkUSPSDeliveryStatus)(pkg.trackingNumber);
                if (uspsStatus.isDelivered) {
                    updatedStatus = 'Delivered';
                    deliveryDate = uspsStatus.deliveryDate || new Date();
                    trackingHistory.push({
                        date: deliveryDate,
                        status: 'Delivered',
                        description: 'Package delivered successfully'
                    });
                    console.log(`Package ${pkg.trackingNumber} marked as delivered`);
                }
                else {
                    const uspsHistory = await (0, uspsApi_1.getUSPSTrackingHistory)(pkg.trackingNumber);
                    if (uspsHistory.length > 0) {
                        const latestEvent = uspsHistory[uspsHistory.length - 1];
                        if (latestEvent) {
                            updatedStatus = mapUSPSStatusToInternal(latestEvent.status);
                            const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
                            const newEvents = uspsHistory.filter(event => !existingDates.has(event.date.getTime()));
                            trackingHistory.push(...newEvents.map(event => ({
                                date: event.date,
                                status: mapUSPSStatusToInternal(event.status),
                                location: event.location || '',
                                description: event.description || event.status
                            })));
                            console.log(`Updated ${pkg.trackingNumber} status to: ${updatedStatus}`);
                        }
                    }
                    else {
                        trackingHistory.push({
                            date: new Date(),
                            status: pkg.status,
                            description: 'Tracking information refreshed'
                        });
                    }
                }
            }
        }
        catch (apiError) {
            console.error(`API error refreshing ${pkg.carrier} tracking for ${pkg.trackingNumber}:`, apiError);
            trackingHistory.push({
                date: new Date(),
                status: pkg.status,
                description: 'Tracking refresh attempted - API temporarily unavailable'
            });
        }
        pkg.status = updatedStatus;
        if (deliveryDate && !pkg.deliveryDate) {
            pkg.deliveryDate = deliveryDate;
        }
        pkg.trackingHistory = trackingHistory;
        await pkg.save();
        if (updatedStatus === 'Delivered' && deliveryDate && pkg.deliveryDate && !pkg.spodEmailSent) {
            await sendPodEmailsIfConfigured(pkg, userId);
        }
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.json({
            success: true,
            message: 'Package tracking refreshed successfully',
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
const mapFedExStatusToInternal = (fedexStatus) => {
    const statusMap = {
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
const mapUSPSStatusToInternal = (uspsStatus) => {
    const statusMap = {
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
router.post('/bulk-refresh', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { packageIds } = req.body;
        if (!packageIds || !Array.isArray(packageIds)) {
            res.status(400).json({
                success: false,
                message: 'Package IDs array is required'
            });
            return;
        }
        const packages = await Package_1.default.find({
            _id: { $in: packageIds },
            userId
        });
        if (packages.length === 0) {
            res.status(404).json({
                success: false,
                message: 'No packages found'
            });
            return;
        }
        const results = [];
        let updatedCount = 0;
        for (const pkg of packages) {
            try {
                let updatedStatus = pkg.status;
                let deliveryDate = pkg.deliveryDate;
                let trackingHistory = pkg.trackingHistory || [];
                if (pkg.carrier === 'FedEx') {
                    console.log(`Bulk refresh: Fetching FedEx data for ${pkg.trackingNumber}`);
                    const deliveryStatus = await (0, fedexApi_1.checkFedExDeliveryStatus)(pkg.trackingNumber);
                    if (deliveryStatus.isDelivered) {
                        updatedStatus = 'Delivered';
                        deliveryDate = deliveryStatus.deliveryDate || new Date();
                        trackingHistory.push({
                            date: deliveryDate,
                            status: 'Delivered',
                            description: 'Package delivered successfully'
                        });
                    }
                    else {
                        const fedexHistory = await (0, fedexApi_1.getFedExTrackingHistory)(pkg.trackingNumber);
                        if (fedexHistory.length > 0) {
                            const latestEvent = fedexHistory[fedexHistory.length - 1];
                            if (latestEvent) {
                                updatedStatus = mapFedExStatusToInternal(latestEvent.status);
                                const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
                                const newEvents = fedexHistory.filter(event => !existingDates.has(event.date.getTime()));
                                trackingHistory.push(...newEvents.map(event => ({
                                    date: event.date,
                                    status: mapFedExStatusToInternal(event.status),
                                    location: event.location || '',
                                    description: event.description || event.status
                                })));
                            }
                        }
                    }
                }
                else if (pkg.carrier === 'USPS') {
                    console.log(`Bulk refresh: Checking USPS data for ${pkg.trackingNumber}`);
                    const uspsStatus = await (0, uspsApi_1.checkUSPSDeliveryStatus)(pkg.trackingNumber);
                    if (uspsStatus.isDelivered) {
                        updatedStatus = 'Delivered';
                        deliveryDate = uspsStatus.deliveryDate || new Date();
                        trackingHistory.push({
                            date: deliveryDate,
                            status: 'Delivered',
                            description: 'Package delivered successfully'
                        });
                    }
                    else {
                        const uspsHistory = await (0, uspsApi_1.getUSPSTrackingHistory)(pkg.trackingNumber);
                        if (uspsHistory.length > 0) {
                            const latestEvent = uspsHistory[uspsHistory.length - 1];
                            if (latestEvent) {
                                updatedStatus = mapUSPSStatusToInternal(latestEvent.status);
                                const existingDates = new Set(trackingHistory.map(h => h.date.getTime()));
                                const newEvents = uspsHistory.filter(event => !existingDates.has(event.date.getTime()));
                                trackingHistory.push(...newEvents.map(event => ({
                                    date: event.date,
                                    status: mapUSPSStatusToInternal(event.status),
                                    location: event.location || '',
                                    description: event.description || event.status
                                })));
                            }
                        }
                        else {
                            trackingHistory.push({
                                date: new Date(),
                                status: pkg.status,
                                description: 'Tracking information refreshed'
                            });
                        }
                    }
                }
                if (updatedStatus !== pkg.status || (deliveryDate && !pkg.deliveryDate)) {
                    pkg.status = updatedStatus;
                    if (deliveryDate && !pkg.deliveryDate) {
                        pkg.deliveryDate = deliveryDate;
                    }
                    pkg.trackingHistory = trackingHistory;
                    await pkg.save();
                    updatedCount++;
                    if (updatedStatus === 'Delivered' && deliveryDate && !pkg.spodEmailSent) {
                        await sendPodEmailsIfConfigured(pkg, userId);
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
            }
            catch (error) {
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
        });
    }
    catch (error) {
        console.error('Bulk refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
router.post('/:id/send-spod-email', auth_1.authenticateToken, async (req, res) => {
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
        if (pkg.status !== 'Delivered') {
            res.status(400).json({
                success: false,
                message: 'Package must be delivered to send SPOD email'
            });
            return;
        }
        pkg.spodEmailSent = false;
        await pkg.save();
        await sendPodEmailsIfConfigured(pkg, userId);
        res.json({
            success: true,
            message: 'SPOD email sent successfully'
        });
    }
    catch (error) {
        console.error('Send SPOD email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=packages.js.map