import axios, { AxiosResponse } from 'axios';
import { ProofOfDelivery } from '../types/package';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Fetch FedEx SPOD PDF for a delivered package
 * Returns PDF as base64 or URL
 */
export const fetchFedExSpodPdf = async (trackingNumber: string): Promise<{ pdfUrl?: string; pdfBase64?: string }> => {
  // TODO: Implement FedEx SPOD PDF retrieval for REST API
  return {
    pdfUrl: `https://www.fedex.com/spod/${trackingNumber}.pdf`
  };
};

/**
 * Fetch FedEx PPOD photo for a delivered package
 * Returns photo as URL or base64
 */
export const fetchFedExPpodPhoto = async (trackingNumber: string): Promise<{ photoUrl?: string; photoBase64?: string }> => {
  // TODO: Implement FedEx PPOD photo retrieval for REST API
  return {
    photoUrl: `https://www.fedex.com/ppod/${trackingNumber}.jpg`
  };
};

// FedEx REST API Configuration
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_API_SECRET = process.env.FEDEX_API_SECRET;
const FEDEX_API_BASE_URL = process.env.FEDEX_API_BASE_URL || 'https://apis.fedex.com';

// Cache for access token
let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

/**
 * Get FedEx REST API access token using OAuth2
 */
const getFedExAccessToken = async (): Promise<string> => {
  console.log('🔍 FedEx REST API Debug:');
  console.log('API Key:', FEDEX_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('API Secret:', FEDEX_API_SECRET ? '✅ Set' : '❌ Not set');
  console.log('API Base URL:', FEDEX_API_BASE_URL);

  // Return cached token if still valid
  if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
    return accessToken!;
  }

  if (!FEDEX_API_KEY || !FEDEX_API_SECRET) {
    throw new Error('FedEx REST API credentials not configured. Please set FEDEX_API_KEY and FEDEX_API_SECRET environment variables.');
  }

  try {
    const response = await axios.post(`${FEDEX_API_BASE_URL}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: FEDEX_API_KEY,
      client_secret: FEDEX_API_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    // Token expires in 1 hour
    tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

    console.log('✅ FedEx access token obtained successfully');
    return accessToken!;
  } catch (error: any) {
    console.error('❌ FedEx OAuth2 authentication error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with FedEx REST API');
  }
};

/**
 * Fetch tracking information from FedEx REST API
 */
const fetchFedExTracking = async (trackingNumber: string): Promise<any> => {
  const token = await getFedExAccessToken();

  console.log(`📤 FedEx REST API Request for ${trackingNumber}`);

  try {
    const response: AxiosResponse = await axios.post(
      `${FEDEX_API_BASE_URL}/track/v1/trackingnumbers`,
      {
        trackingInfo: [{
          trackingNumberInfo: {
            trackingNumber: trackingNumber
          }
        }],
        includeDetailedScans: true
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US'
        }
      }
    );

    console.log(`📥 FedEx REST API Response Status for ${trackingNumber}:`, response.status);
    console.log(`📥 FedEx REST API Response Data for ${trackingNumber}:`, JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error('❌ FedEx REST API error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch FedEx tracking data for ${trackingNumber}`);
  }
};

/**
 * Extract POD information from FedEx REST API response
 */
const extractPodFromFedExResponse = (jsonResult: any, trackingNumber: string): ProofOfDelivery => {
  const pod: ProofOfDelivery = {
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

    // Extract delivery information
    const deliveryDetails = trackingResult.deliveryDetails;
    if (deliveryDetails) {
      const actualDeliveryTimestamp = deliveryDetails.actualDeliveryTimestamp;
      if (actualDeliveryTimestamp) {
        // Don't set deliveryDate as it's not in the ProofOfDelivery interface
        // pod.deliveryDate = new Date(actualDeliveryTimestamp);
      }

      // Extract recipient information
      const locationDescription = deliveryDetails.locationDescription;
      if (locationDescription) {
        pod.deliveryLocation = locationDescription;
      }

      // Extract SPOD and PPOD information
      if (deliveryDetails.signedProofOfDelivery) {
        pod.spodPdfUrl = deliveryDetails.signedProofOfDelivery;
      }
      if (deliveryDetails.photoProofOfDelivery) {
        pod.deliveryPhoto = deliveryDetails.photoProofOfDelivery;
      }
    }

    // Extract signature information from scan events
    const scanEvents = trackingResult.scanEvents;
    if (scanEvents && scanEvents.length > 0) {
      // Look for delivery event with signature
      const deliveryEvent = scanEvents.find((event: any) =>
        event.eventType === 'DL' || event.eventDescription?.toLowerCase().includes('delivered')
      );

      if (deliveryEvent) {
        const eventDescription = deliveryEvent.eventDescription;
        if (eventDescription) {
          pod.deliveryInstructions = eventDescription;

          // Check if signature was obtained
          if (eventDescription.toLowerCase().includes('signature') ||
              eventDescription.toLowerCase().includes('signed')) {
            pod.signatureObtained = true;
            pod.signatureRequired = true;
            // Try to extract signature name if available
            const signatureMatch = eventDescription.match(/signed by (.+)/i);
            if (signatureMatch) {
              pod.signedBy = signatureMatch[1].trim();
            }
          }
        }

        // Extract SPOD/PPOD from scan event details if available
        if (deliveryEvent.scanDetails) {
          if (deliveryEvent.scanDetails.signedProofOfDelivery) {
            pod.spodPdfUrl = deliveryEvent.scanDetails.signedProofOfDelivery;
          }
          if (deliveryEvent.scanDetails.photoProofOfDelivery) {
            pod.deliveryPhoto = deliveryEvent.scanDetails.photoProofOfDelivery;
          }
        }
      }
    }

    // Generate POD URL
    pod.proofOfDeliveryUrl = `https://www.fedex.com/en-us/tracking.html?tracknumbers=${trackingNumber}`;

  } catch (error) {
    console.error('Error parsing FedEx REST API response:', error);
  }

  return pod;
};

/**
 * Get Proof of Delivery data from FedEx REST API for a tracking number
 */
export const getFedExPod = async (trackingNumber: string): Promise<ProofOfDelivery> => {
  try {
    console.log(`Fetching FedEx SPOD for tracking number: ${trackingNumber}`);

    const jsonResult = await fetchFedExTracking(trackingNumber);
    const pod = extractPodFromFedExResponse(jsonResult, trackingNumber);

    console.log(`Successfully retrieved FedEx SPOD for ${trackingNumber}:`, pod);
    return pod;

  } catch (error: any) {
    console.error(`Error fetching FedEx SPOD for ${trackingNumber}:`, error.message);
    throw error;
  }
};

/**
 * Check if a package has been delivered according to FedEx
 */
export const checkFedExDeliveryStatus = async (trackingNumber: string): Promise<{
  isDelivered: boolean;
  deliveryDate?: Date;
  pod?: ProofOfDelivery;
}> => {
  try {
    console.log(`🔍 Checking FedEx delivery status for ${trackingNumber}`);

    const jsonResult = await fetchFedExTracking(trackingNumber);
    console.log(`📄 FedEx API Raw Response for ${trackingNumber}:`, JSON.stringify(jsonResult, null, 2));

    // Parse REST API response
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

    // Check for errors
    if (trackingResult.error) {
      console.log(`❌ FedEx API Error for ${trackingNumber}:`, trackingResult.error);
      throw new Error(`FedEx API error: ${trackingResult.error.message || 'Unknown error'}`);
    }

    // Check delivery status - look for actualDeliveryTimestamp OR delivery scan events
    const deliveryDetails = trackingResult.deliveryDetails;
    const scanEvents = trackingResult.scanEvents || [];

    // Check if package has actual delivery timestamp
    const hasDeliveryTimestamp = !!deliveryDetails?.actualDeliveryTimestamp;

    // Also check scan events for delivery-related events
    const hasDeliveryScanEvent = scanEvents.some((event: any) =>
      event.eventType === 'DL' ||
      event.eventDescription?.toLowerCase().includes('delivered') ||
      event.eventDescription?.toLowerCase().includes('delivered to recipient') ||
      event.eventDescription?.toLowerCase().includes('package delivered')
    );

    // Log scan events for debugging
    if (scanEvents.length > 0) {
      console.log(`📋 Recent FedEx Scan Events for ${trackingNumber}:`);
      scanEvents.slice(-3).forEach((event: any, index: number) => {
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

    let deliveryDate: Date | undefined;
    let pod: ProofOfDelivery | undefined;

    if (isDelivered) {
      // Try to get delivery date from actualDeliveryTimestamp first
      if (deliveryDetails?.actualDeliveryTimestamp) {
        deliveryDate = new Date(deliveryDetails.actualDeliveryTimestamp);
      } else {
        // Fallback: get delivery date from scan events
        const deliveryEvent = scanEvents.find((event: any) =>
          event.eventType === 'DL' ||
          event.eventDescription?.toLowerCase().includes('delivered')
        );
        if (deliveryEvent?.date) {
          deliveryDate = new Date(deliveryEvent.date);
        } else if (deliveryEvent?.timestamp) {
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

  } catch (error: any) {
    console.error(`❌ Error checking FedEx delivery status for ${trackingNumber}:`, error.message);
    return { isDelivered: false };
  }
};

/**
 * Get detailed tracking history from FedEx
 */
export const getFedExTrackingHistory = async (trackingNumber: string): Promise<Array<{
  date: Date;
  status: string;
  location?: string;
  description?: string;
}>> => {
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

    return scanEvents.map((event: any) => {
      const timestamp = event.date || event.timestamp;
      const eventType = event.eventType;
      const description = event.eventDescription;

      // Extract location information
      let locationStr: string | undefined;
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

  } catch (error: any) {
    console.error(`Error fetching FedEx tracking history for ${trackingNumber}:`, error.message);
    return [];
  }
};

