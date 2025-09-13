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
exports.getFedExTrackingHistory = exports.checkFedExDeliveryStatus = exports.getFedExPod = exports.fetchFedExPpodPhoto = exports.fetchFedExSpodPdf = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const fetchFedExSpodPdf = async (trackingNumber) => {
    return {
        pdfUrl: `https://www.fedex.com/spod/${trackingNumber}.pdf`
    };
};
exports.fetchFedExSpodPdf = fetchFedExSpodPdf;
const fetchFedExPpodPhoto = async (trackingNumber) => {
    return {
        photoUrl: `https://www.fedex.com/ppod/${trackingNumber}.jpg`
    };
};
exports.fetchFedExPpodPhoto = fetchFedExPpodPhoto;
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_API_SECRET = process.env.FEDEX_API_SECRET;
const FEDEX_API_BASE_URL = process.env.FEDEX_API_BASE_URL || 'https://apis.fedex.com';
let accessToken = null;
let tokenExpiry = null;
const getFedExAccessToken = async () => {
    console.log('🔍 FedEx REST API Debug:');
    console.log('API Key:', FEDEX_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('API Secret:', FEDEX_API_SECRET ? '✅ Set' : '❌ Not set');
    console.log('API Base URL:', FEDEX_API_BASE_URL);
    if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
        return accessToken;
    }
    if (!FEDEX_API_KEY || !FEDEX_API_SECRET) {
        throw new Error('FedEx REST API credentials not configured. Please set FEDEX_API_KEY and FEDEX_API_SECRET environment variables.');
    }
    try {
        const response = await axios_1.default.post(`${FEDEX_API_BASE_URL}/oauth/token`, {
            grant_type: 'client_credentials',
            client_id: FEDEX_API_KEY,
            client_secret: FEDEX_API_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        accessToken = response.data.access_token;
        tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
        console.log('✅ FedEx access token obtained successfully');
        return accessToken;
    }
    catch (error) {
        console.error('❌ FedEx OAuth2 authentication error:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with FedEx REST API');
    }
};
const fetchFedExTracking = async (trackingNumber) => {
    const token = await getFedExAccessToken();
    console.log(`📤 FedEx REST API Request for ${trackingNumber}`);
    try {
        const response = await axios_1.default.post(`${FEDEX_API_BASE_URL}/track/v1/trackingnumbers`, {
            trackingInfo: [{
                    trackingNumberInfo: {
                        trackingNumber: trackingNumber
                    }
                }],
            includeDetailedScans: true
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-locale': 'en_US'
            }
        });
        console.log(`📥 FedEx REST API Response Status for ${trackingNumber}:`, response.status);
        console.log(`📥 FedEx REST API Response Data for ${trackingNumber}:`, JSON.stringify(response.data, null, 2));
        return response.data;
    }
    catch (error) {
        console.error('❌ FedEx REST API error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch FedEx tracking data for ${trackingNumber}`);
    }
};
const extractPodFromFedExResponse = (jsonResult, trackingNumber) => {
    const pod = {
        lastUpdated: new Date()
    };
    try {
        const output = jsonResult.output;
        if (!output || !output.completeTrackResults) {
            console.log('No tracking results found in FedEx response');
            return pod;
        }
        const trackResult = output.completeTrackResults[0];
        if (!trackResult || !trackResult.trackResults) {
            console.log('No track results found');
            return pod;
        }
        const trackingResult = trackResult.trackResults[0];
        if (!trackingResult) {
            console.log('No tracking result found');
            return pod;
        }
        const deliveryDetails = trackingResult.deliveryDetails;
        if (deliveryDetails) {
            const actualDeliveryTimestamp = deliveryDetails.actualDeliveryTimestamp;
            if (actualDeliveryTimestamp) {
            }
            const locationDescription = deliveryDetails.locationDescription;
            if (locationDescription) {
                pod.deliveryLocation = locationDescription;
            }
        }
        const scanEvents = trackingResult.scanEvents;
        if (scanEvents && scanEvents.length > 0) {
            const deliveryEvent = scanEvents.find((event) => event.eventType === 'DL' || event.eventDescription?.toLowerCase().includes('delivered'));
            if (deliveryEvent) {
                const eventDescription = deliveryEvent.eventDescription;
                if (eventDescription) {
                    pod.deliveryInstructions = eventDescription;
                    if (eventDescription.toLowerCase().includes('signature') ||
                        eventDescription.toLowerCase().includes('signed')) {
                        pod.signatureObtained = true;
                        pod.signatureRequired = true;
                        const signatureMatch = eventDescription.match(/signed by (.+)/i);
                        if (signatureMatch) {
                            pod.signedBy = signatureMatch[1].trim();
                        }
                    }
                }
            }
        }
        pod.proofOfDeliveryUrl = `https://www.fedex.com/en-us/tracking.html?tracknumbers=${trackingNumber}`;
    }
    catch (error) {
        console.error('Error parsing FedEx REST API response:', error);
    }
    return pod;
};
const getFedExPod = async (trackingNumber) => {
    try {
        console.log(`Fetching FedEx SPOD for tracking number: ${trackingNumber}`);
        const jsonResult = await fetchFedExTracking(trackingNumber);
        const pod = extractPodFromFedExResponse(jsonResult, trackingNumber);
        console.log(`Successfully retrieved FedEx SPOD for ${trackingNumber}:`, pod);
        return pod;
    }
    catch (error) {
        console.error(`Error fetching FedEx SPOD for ${trackingNumber}:`, error.message);
        throw error;
    }
};
exports.getFedExPod = getFedExPod;
const checkFedExDeliveryStatus = async (trackingNumber) => {
    try {
        console.log(`🔍 Checking FedEx delivery status for ${trackingNumber}`);
        const jsonResult = await fetchFedExTracking(trackingNumber);
        console.log(`📄 FedEx API Raw Response for ${trackingNumber}:`, JSON.stringify(jsonResult, null, 2));
        const output = jsonResult.output;
        if (!output) {
            console.log(`❌ No output found in FedEx response for ${trackingNumber}`);
            return { isDelivered: false };
        }
        const completeTrackResults = output.completeTrackResults;
        if (!completeTrackResults || completeTrackResults.length === 0) {
            console.log(`❌ No complete track results found in FedEx response for ${trackingNumber}`);
            return { isDelivered: false };
        }
        const trackResult = completeTrackResults[0];
        if (!trackResult || !trackResult.trackResults || trackResult.trackResults.length === 0) {
            console.log(`❌ No track results found in FedEx response for ${trackingNumber}`);
            return { isDelivered: false };
        }
        const trackingResult = trackResult.trackResults[0];
        if (trackingResult.error) {
            console.log(`❌ FedEx API Error for ${trackingNumber}:`, trackingResult.error);
            throw new Error(`FedEx API error: ${trackingResult.error.message || 'Unknown error'}`);
        }
        const deliveryDetails = trackingResult.deliveryDetails;
        const scanEvents = trackingResult.scanEvents || [];
        const hasDeliveryTimestamp = !!deliveryDetails?.actualDeliveryTimestamp;
        const hasDeliveryScanEvent = scanEvents.some((event) => event.eventType === 'DL' ||
            event.eventDescription?.toLowerCase().includes('delivered') ||
            event.eventDescription?.toLowerCase().includes('delivered to recipient') ||
            event.eventDescription?.toLowerCase().includes('package delivered'));
        if (scanEvents.length > 0) {
            console.log(`📋 Recent FedEx Scan Events for ${trackingNumber}:`);
            scanEvents.slice(-3).forEach((event, index) => {
                console.log(`  ${index + 1}. ${event.eventType}: ${event.eventDescription} (${event.date || event.timestamp})`);
            });
        }
        const isDelivered = hasDeliveryTimestamp || hasDeliveryScanEvent;
        console.log(`📊 FedEx Status Analysis for ${trackingNumber}:`, {
            hasDeliveryTimestamp,
            hasDeliveryScanEvent,
            deliveryTimestamp: deliveryDetails?.actualDeliveryTimestamp,
            scanEventsCount: scanEvents.length,
            isDelivered,
            deliveryDetails: deliveryDetails ? JSON.stringify(deliveryDetails, null, 2) : 'No delivery details'
        });
        let deliveryDate;
        let pod;
        if (isDelivered) {
            if (deliveryDetails?.actualDeliveryTimestamp) {
                deliveryDate = new Date(deliveryDetails.actualDeliveryTimestamp);
            }
            else {
                const deliveryEvent = scanEvents.find((event) => event.eventType === 'DL' ||
                    event.eventDescription?.toLowerCase().includes('delivered'));
                if (deliveryEvent?.date) {
                    deliveryDate = new Date(deliveryEvent.date);
                }
                else if (deliveryEvent?.timestamp) {
                    deliveryDate = new Date(deliveryEvent.timestamp);
                }
            }
            pod = extractPodFromFedExResponse(jsonResult, trackingNumber);
        }
        return {
            isDelivered,
            ...(deliveryDate && { deliveryDate }),
            ...(pod && { pod })
        };
    }
    catch (error) {
        console.error(`❌ Error checking FedEx delivery status for ${trackingNumber}:`, error.message);
        return { isDelivered: false };
    }
};
exports.checkFedExDeliveryStatus = checkFedExDeliveryStatus;
const getFedExTrackingHistory = async (trackingNumber) => {
    try {
        const jsonResult = await fetchFedExTracking(trackingNumber);
        const output = jsonResult.output;
        if (!output || !output.completeTrackResults || output.completeTrackResults.length === 0) {
            return [];
        }
        const trackResult = output.completeTrackResults[0];
        if (!trackResult || !trackResult.trackResults || trackResult.trackResults.length === 0) {
            return [];
        }
        const trackingResult = trackResult.trackResults[0];
        const scanEvents = trackingResult.scanEvents;
        if (!scanEvents || scanEvents.length === 0) {
            return [];
        }
        return scanEvents.map((event) => {
            const timestamp = event.date || event.timestamp;
            const eventType = event.eventType;
            const description = event.eventDescription;
            let locationStr;
            if (event.location) {
                const location = event.location;
                const city = location.city;
                const state = location.stateOrProvinceCode;
                const country = location.countryCode;
                locationStr = [city, state, country].filter(Boolean).join(', ');
            }
            return {
                date: timestamp ? new Date(timestamp) : new Date(),
                status: eventType || 'Unknown',
                ...(locationStr && { location: locationStr }),
                ...(description && { description })
            };
        });
    }
    catch (error) {
        console.error(`Error fetching FedEx tracking history for ${trackingNumber}:`, error.message);
        return [];
    }
};
exports.getFedExTrackingHistory = getFedExTrackingHistory;
//# sourceMappingURL=fedexApi.js.map