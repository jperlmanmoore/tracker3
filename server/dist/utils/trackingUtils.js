"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateDelivery = exports.parseTrackingNumbers = exports.getBulkTrackingUrl = exports.getTrackingUrl = exports.detectCarrier = void 0;
const fedexApi_1 = require("./fedexApi");
const detectCarrier = (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '').toUpperCase();
    console.log(`Detecting carrier for tracking number: ${trackingNumber}`);
    console.log(`Cleaned tracking number: ${cleanNumber}`);
    const uspsPatterns = [
        /^(94|93|92|95)\d{18}$/,
        /^(420\d{5}91|420\d{5}92|420\d{5}93|420\d{5}94|420\d{5}95)\d{8}$/,
        /^(EA|EC|ED|EE|EH|EJ|EK|EL|EM|EN|EP|ER|ET|EV|EW|EX|EY|EZ)\d{9}US$/,
        /^[A-Z]{2}\d{9}US$/,
        /^70\d{14}$/,
        /^23\d{8}$/,
        /^91\d{18}$/,
    ];
    const fedexPatterns = [
        /^\d{12}$/,
        /^\d{14}$/,
        /^\d{15}$/,
        /^\d{16}$/,
        /^\d{18}$/,
        /^96\d{20}$/,
        /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/,
    ];
    for (const pattern of uspsPatterns) {
        if (pattern.test(cleanNumber)) {
            console.log(`Matched USPS pattern: ${pattern}`);
            return 'USPS';
        }
    }
    for (const pattern of fedexPatterns) {
        if (pattern.test(cleanNumber)) {
            console.log(`Matched FedEx pattern: ${pattern}`);
            return 'FedEx';
        }
    }
    console.log('No specific pattern matched. Applying generic rules.');
    if (/^9\d{19,21}$/.test(cleanNumber)) {
        console.log('Matched generic USPS rule.');
        return 'USPS';
    }
    if (/^\d{20}$/.test(cleanNumber) && !cleanNumber.startsWith('9')) {
        console.log('Matched generic FedEx rule.');
        return 'FedEx';
    }
    console.log('No carrier detected.');
    return null;
};
exports.detectCarrier = detectCarrier;
const getTrackingUrl = (trackingNumber, carrier) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '');
    if (carrier === 'USPS') {
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanNumber}`;
    }
    else {
        return `https://www.fedex.com/fedextrack/?trknbr=${cleanNumber}`;
    }
};
exports.getTrackingUrl = getTrackingUrl;
const getBulkTrackingUrl = (trackingNumbers, carrier) => {
    const cleanNumbers = trackingNumbers.map(num => num.replace(/\s+/g, ''));
    if (carrier === 'USPS') {
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanNumbers.join(',')}`;
    }
    else {
        return `https://www.fedex.com/fedextrack/?trknbr=${cleanNumbers.join(',')}`;
    }
};
exports.getBulkTrackingUrl = getBulkTrackingUrl;
const parseTrackingNumbers = (input) => {
    return input
        .split(/[,\n\r\t\s]+/)
        .map(num => num.trim())
        .filter(num => num.length > 0);
};
exports.parseTrackingNumbers = parseTrackingNumbers;
const simulateDelivery = async (trackingNumber, carrier) => {
    try {
        if (carrier === 'FedEx') {
            console.log(`Attempting to fetch real FedEx POD data for ${trackingNumber}`);
            try {
                const deliveryStatus = await (0, fedexApi_1.checkFedExDeliveryStatus)(trackingNumber);
                if (deliveryStatus.isDelivered && deliveryStatus.pod) {
                    console.log(`Found real FedEx delivery data for ${trackingNumber}`);
                    return {
                        status: 'Delivered',
                        deliveryDate: deliveryStatus.deliveryDate || new Date(),
                        proofOfDelivery: deliveryStatus.pod
                    };
                }
                else {
                    console.log(`Package ${trackingNumber} not yet delivered according to FedEx API, generating simulated data`);
                }
            }
            catch (apiError) {
                console.log(`FedEx API error for ${trackingNumber}, falling back to simulated data:`, apiError);
            }
        }
        console.log(`Generating simulated POD data for ${trackingNumber} (${carrier})`);
        const baseProofOfDelivery = {
            deliveredTo: 'Recipient',
            deliveryLocation: Math.random() > 0.5 ? 'Front Door' : 'Mailbox',
            signatureRequired: carrier === 'FedEx' ? Math.random() > 0.4 : Math.random() > 0.7,
            signatureObtained: false,
            signedBy: '',
            deliveryPhoto: '',
            deliveryInstructions: Math.random() > 0.5 ? 'Left at front door' : 'Delivered to secure location',
            proofOfDeliveryUrl: `https://${carrier.toLowerCase()}.com/proof-of-delivery/${trackingNumber}`,
            lastUpdated: new Date()
        };
        if (baseProofOfDelivery.signatureRequired && Math.random() > 0.3) {
            baseProofOfDelivery.signatureObtained = true;
            baseProofOfDelivery.signedBy = 'J.DOE';
        }
        if (carrier === 'USPS' && Math.random() > 0.6) {
            baseProofOfDelivery.deliveryPhoto = `https://tools.usps.com/images/delivery-photo-${trackingNumber}.jpg`;
        }
        return {
            status: 'Delivered',
            deliveryDate: new Date(),
            proofOfDelivery: baseProofOfDelivery
        };
    }
    catch (error) {
        console.error(`Error in simulateDelivery for ${trackingNumber}:`, error);
        return {
            status: 'Delivered',
            deliveryDate: new Date(),
            proofOfDelivery: {
                deliveredTo: 'Recipient',
                deliveryLocation: 'Delivery Address',
                signatureRequired: false,
                signatureObtained: false,
                signedBy: '',
                deliveryPhoto: '',
                deliveryInstructions: 'Package delivered successfully',
                proofOfDeliveryUrl: `https://${carrier.toLowerCase()}.com/proof-of-delivery/${trackingNumber}`,
                lastUpdated: new Date()
            }
        };
    }
};
exports.simulateDelivery = simulateDelivery;
//# sourceMappingURL=trackingUtils.js.map