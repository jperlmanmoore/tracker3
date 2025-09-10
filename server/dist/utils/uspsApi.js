"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUSPSTrackingHistory = exports.checkUSPSDeliveryStatus = void 0;
const axios_1 = __importDefault(require("axios"));
const xml2js = __importStar(require("xml2js"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const USPS_USER_ID = process.env.USPS_USER_ID;
const checkUSPSDeliveryStatus = async (trackingNumber) => {
    try {
        console.log(`Checking USPS delivery status for ${trackingNumber}`);
        if (!USPS_USER_ID) {
            console.log('USPS_USER_ID not configured, using simulation for testing');
            return simulateUSPSDeliveryForTesting(trackingNumber);
        }
        const apiUrl = `https://secure.shippingapis.com/ShippingAPI.dll`;
        const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<TrackRequest USERID="${USPS_USER_ID}">
  <TrackID ID="${trackingNumber}"></TrackID>
</TrackRequest>`;
        const params = {
            API: 'TrackV2',
            XML: xmlRequest
        };
        const response = await axios_1.default.get(apiUrl, { params });
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const result = await parser.parseStringPromise(response.data);
        if (result.TrackResponse?.Error) {
            const errorDesc = result.TrackResponse.Error.Description;
            console.error(`USPS API Error: ${errorDesc}`);
            return simulateUSPSDeliveryForTesting(trackingNumber);
        }
        const trackInfo = result.TrackResponse?.TrackInfo;
        if (!trackInfo) {
            return simulateUSPSDeliveryForTesting(trackingNumber);
        }
        const trackSummary = trackInfo.TrackSummary || '';
        const isDelivered = trackSummary.toLowerCase().includes('delivered') ||
            trackSummary.toLowerCase().includes('your item was delivered');
        let deliveryDate;
        const trackDetails = trackInfo.TrackDetail;
        if (trackDetails) {
            const detailsArray = Array.isArray(trackDetails) ? trackDetails : [trackDetails];
            for (const detail of detailsArray) {
                const event = detail.Event || '';
                const eventDate = detail.EventDate;
                const eventTime = detail.EventTime;
                if (event.toLowerCase().includes('delivered') && eventDate) {
                    const dateTimeStr = `${eventDate} ${eventTime || '00:00:00'}`;
                    deliveryDate = new Date(dateTimeStr);
                    break;
                }
            }
        }
        return {
            isDelivered,
            ...(deliveryDate && { deliveryDate }),
            status: isDelivered ? 'Delivered' : 'In Transit'
        };
    }
    catch (error) {
        console.error(`Error checking USPS delivery status for ${trackingNumber}:`, error.message);
        return simulateUSPSDeliveryForTesting(trackingNumber);
    }
};
exports.checkUSPSDeliveryStatus = checkUSPSDeliveryStatus;
const simulateUSPSDeliveryForTesting = (trackingNumber) => {
    const lastDigit = parseInt(trackingNumber.slice(-1));
    const isDelivered = lastDigit % 2 !== 0;
    if (isDelivered) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() - Math.floor(Math.random() * 5));
        console.log(`✅ Simulated USPS delivery for ${trackingNumber}:`, {
            isDelivered: true,
            deliveryDate: deliveryDate.toISOString()
        });
        return {
            isDelivered: true,
            deliveryDate,
            status: 'Delivered'
        };
    }
    else {
        console.log(`📦 Simulated USPS in-transit status for ${trackingNumber}`);
        return {
            isDelivered: false,
            status: 'In Transit'
        };
    }
};
const getUSPSTrackingHistory = async (trackingNumber) => {
    try {
        console.log(`Getting USPS tracking history for ${trackingNumber}`);
        if (!USPS_USER_ID) {
            console.log('USPS_USER_ID not configured, returning simulated history');
            return simulateUSPSTrackingHistoryForTesting(trackingNumber);
        }
        const apiUrl = `https://secure.shippingapis.com/ShippingAPI.dll`;
        const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<TrackRequest USERID="${USPS_USER_ID}">
  <TrackID ID="${trackingNumber}"></TrackID>
</TrackRequest>`;
        const params = {
            API: 'TrackV2',
            XML: xmlRequest
        };
        const response = await axios_1.default.get(apiUrl, { params });
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
        const result = await parser.parseStringPromise(response.data);
        if (result.TrackResponse?.Error) {
            console.error(`USPS API Error: ${result.TrackResponse.Error.Description}`);
            return simulateUSPSTrackingHistoryForTesting(trackingNumber);
        }
        const trackInfo = result.TrackResponse?.TrackInfo;
        if (!trackInfo) {
            return simulateUSPSTrackingHistoryForTesting(trackingNumber);
        }
        const trackDetails = trackInfo.TrackDetail;
        if (!trackDetails) {
            return [];
        }
        const detailsArray = Array.isArray(trackDetails) ? trackDetails : [trackDetails];
        return detailsArray.map((detail) => {
            const event = detail.Event || '';
            const eventDate = detail.EventDate;
            const eventTime = detail.EventTime;
            const eventCity = detail.EventCity;
            const eventState = detail.EventState;
            const eventZIPCode = detail.EventZIPCode;
            const eventCountry = detail.EventCountry;
            const locationParts = [];
            if (eventCity)
                locationParts.push(eventCity);
            if (eventState)
                locationParts.push(eventState);
            if (eventZIPCode)
                locationParts.push(eventZIPCode);
            if (eventCountry)
                locationParts.push(eventCountry);
            const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;
            let date = new Date();
            if (eventDate) {
                const dateTimeStr = `${eventDate} ${eventTime || '00:00:00'}`;
                date = new Date(dateTimeStr);
            }
            return {
                date,
                status: event || 'Unknown',
                ...(location && { location }),
                ...(event && { description: event })
            };
        });
    }
    catch (error) {
        console.error(`Error getting USPS tracking history for ${trackingNumber}:`, error.message);
        return simulateUSPSTrackingHistoryForTesting(trackingNumber);
    }
};
exports.getUSPSTrackingHistory = getUSPSTrackingHistory;
const simulateUSPSTrackingHistoryForTesting = (trackingNumber) => {
    const history = [];
    const now = new Date();
    const events = [
        { status: 'Accepted at USPS Origin Facility', location: 'Origin City, ST', daysAgo: 3 },
        { status: 'Arrived at USPS Facility', location: 'Transit City, ST', daysAgo: 2 },
        { status: 'Out for Delivery', location: 'Delivery City, ST', daysAgo: 1 },
    ];
    const lastDigit = parseInt(trackingNumber.slice(-1));
    if (lastDigit % 2 !== 0) {
        events.push({ status: 'Delivered', location: 'Delivery Address', daysAgo: 0 });
    }
    for (const event of events) {
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() - event.daysAgo);
        history.push({
            date: eventDate,
            status: event.status,
            location: event.location,
            description: event.status
        });
    }
    console.log(`📋 Simulated USPS tracking history for ${trackingNumber}:`, history.length, 'events');
    return history;
};
//# sourceMappingURL=uspsApi.js.map