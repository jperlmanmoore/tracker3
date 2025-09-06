"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTrackingNumbers = exports.getBulkTrackingUrl = exports.getTrackingUrl = exports.detectCarrier = void 0;
const detectCarrier = (trackingNumber) => {
    const cleanNumber = trackingNumber.replace(/\s+/g, '').toUpperCase();
    const uspsPatterns = [
        /^(94|93|92|94|95)\d{20}$/,
        /^(420\d{5}91|420\d{5}92|420\d{5}93|420\d{5}94|420\d{5}95)\d{13}$/,
        /^(EA|EC|ED|EE|EH|EJ|EK|EL|EM|EN|EP|ER|ET|EV|EW|EX|EY|EZ)\d{9}US$/,
        /^[A-Z]{2}\d{9}US$/,
        /^(91|92|93|94|95)\d{20}$/,
        /^70\d{14}$/,
        /^23\d{8}$/,
        /^[0-9]{20}$/,
        /^[0-9]{22}$/,
    ];
    const fedexPatterns = [
        /^\d{12}$/,
        /^\d{14}$/,
        /^\d{15}$/,
        /^\d{20}$/,
        /^\d{22}$/,
        /^96\d{20}$/,
        /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/,
    ];
    for (const pattern of uspsPatterns) {
        if (pattern.test(cleanNumber)) {
            return 'USPS';
        }
    }
    for (const pattern of fedexPatterns) {
        if (pattern.test(cleanNumber)) {
            return 'FedEx';
        }
    }
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
//# sourceMappingURL=trackingUtils.js.map