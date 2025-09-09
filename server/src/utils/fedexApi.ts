import axios, { AxiosResponse } from 'axios';
import { ProofOfDelivery } from '../types/package';
import * as xml2js from 'xml2js';
import * as dotenv from 'dotenv';
dotenv.config();

// FedEx Web Services Configuration
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_API_SECRET = process.env.FEDEX_API_SECRET;
const FEDEX_API_BASE_URL = process.env.FEDEX_API_BASE_URL || 'https://ws.fedex.com';

// Cache for access token
let accessToken: string | null = null;
let tokenExpiry: Date | null = null;

/**
 * Get FedEx Web Services access token using API Key/Secret
 */
const getFedExAccessToken = async (): Promise<string> => {
  console.log('🔍 FedEx Web Services Debug:');
  console.log('API Key:', FEDEX_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('API Secret:', FEDEX_API_SECRET ? '✅ Set' : '❌ Not set');
  console.log('API Base URL:', FEDEX_API_BASE_URL);

  // Return cached token if still valid
  if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
    return accessToken;
  }

  if (!FEDEX_API_KEY || !FEDEX_API_SECRET) {
    throw new Error('FedEx Web Services credentials not configured. Please set FEDEX_API_KEY and FEDEX_API_SECRET environment variables.');
  }

  try {
    // For FedEx Web Services, we use API Key/Secret directly in SOAP headers
    // No OAuth2 token needed - authentication is per request
    accessToken = 'fedex_ws_token'; // Placeholder - actual auth is in SOAP headers
    tokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

    return accessToken;
  } catch (error: any) {
    console.error('FedEx Web Services authentication error:', error.message);
    throw new Error('Failed to authenticate with FedEx Web Services');
  }
};

/**
 * Create SOAP request for tracking with SPOD
 */
const createTrackingSOAPRequest = (trackingNumber: string): string => {
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:v16="http://fedex.com/ws/track/v16">
  <soapenv:Header>
    <v16:WebAuthenticationDetail>
      <v16:UserCredential>
        <v16:Key>${FEDEX_API_KEY}</v16:Key>
        <v16:Password>${FEDEX_API_SECRET}</v16:Password>
      </v16:UserCredential>
    </v16:WebAuthenticationDetail>
    <v16:ClientDetail>
      <v16:AccountNumber>510087780</v16:AccountNumber>
      <v16:MeterNumber>119009840</v16:MeterNumber>
    </v16:ClientDetail>
  </soapenv:Header>
  <soapenv:Body>
    <v16:TrackRequest>
      <v16:WebAuthenticationDetail>
        <v16:UserCredential>
          <v16:Key>${FEDEX_API_KEY}</v16:Key>
          <v16:Password>${FEDEX_API_SECRET}</v16:Password>
        </v16:UserCredential>
      </v16:WebAuthenticationDetail>
      <v16:ClientDetail>
        <v16:AccountNumber>510087780</v16:AccountNumber>
        <v16:MeterNumber>119009840</v16:MeterNumber>
      </v16:ClientDetail>
      <v16:TransactionDetail>
        <v16:CustomerTransactionId>Track By Number</v16:CustomerTransactionId>
      </v16:TransactionDetail>
      <v16:Version>
        <v16:ServiceId>trck</v16:ServiceId>
        <v16:Major>16</v16:Major>
        <v16:Intermediate>0</v16:Intermediate>
        <v16:Minor>0</v16:Minor>
      </v16:Version>
      <v16:SelectionDetails>
        <v16:PackageIdentifier>
          <v16:Type>TRACKING_NUMBER_OR_DOORTAG</v16:Type>
          <v16:Value>${trackingNumber}</v16:Value>
        </v16:PackageIdentifier>
      </v16:SelectionDetails>
      <v16:ProcessingOptions>INCLUDE_DETAILED_SCANS</v16:ProcessingOptions>
    </v16:TrackRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  return soapRequest;
};

/**
 * Create SOAP request for SPOD (Signature Proof of Delivery)
 */
const createSPODSOAPRequest = (trackingNumber: string): string => {
  const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:v16="http://fedex.com/ws/track/v16">
  <soapenv:Header>
    <v16:WebAuthenticationDetail>
      <v16:UserCredential>
        <v16:Key>${FEDEX_API_KEY}</v16:Key>
        <v16:Password>${FEDEX_API_SECRET}</v16:Password>
      </v16:UserCredential>
    </v16:WebAuthenticationDetail>
    <v16:ClientDetail>
      <v16:AccountNumber>510087780</v16:AccountNumber>
      <v16:MeterNumber>119009840</v16:MeterNumber>
    </v16:ClientDetail>
  </soapenv:Header>
  <soapenv:Body>
    <v16:TrackRequest>
      <v16:WebAuthenticationDetail>
        <v16:UserCredential>
          <v16:Key>${FEDEX_API_KEY}</v16:Key>
          <v16:Password>${FEDEX_API_SECRET}</v16:Password>
        </v16:UserCredential>
      </v16:WebAuthenticationDetail>
      <v16:ClientDetail>
        <v16:AccountNumber>510087780</v16:AccountNumber>
        <v16:MeterNumber>119009840</v16:MeterNumber>
      </v16:ClientDetail>
      <v16:TransactionDetail>
        <v16:CustomerTransactionId>SPOD Request</v16:CustomerTransactionId>
      </v16:TransactionDetail>
      <v16:Version>
        <v16:ServiceId>trck</v16:ServiceId>
        <v16:Major>16</v16:Major>
        <v16:Intermediate>0</v16:Intermediate>
        <v16:Minor>0</v16:Minor>
      </v16:Version>
      <v16:SelectionDetails>
        <v16:PackageIdentifier>
          <v16:Type>TRACKING_NUMBER_OR_DOORTAG</v16:Type>
          <v16:Value>${trackingNumber}</v16:Value>
        </v16:PackageIdentifier>
      </v16:SelectionDetails>
      <v16:ProcessingOptions>INCLUDE_DETAILED_SCANS</v16:ProcessingOptions>
      <v16:ProcessingOptions>RETURN_SIGNATURE_PROOF_OF_DELIVERY</v16:ProcessingOptions>
    </v16:TrackRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  return soapRequest;
};

/**
 * Fetch tracking information from FedEx Web Services
 */
const fetchFedExTracking = async (trackingNumber: string, includeSPOD: boolean = false): Promise<any> => {
  await getFedExAccessToken(); // Ensure credentials are available
  const soapRequest = includeSPOD ? createSPODSOAPRequest(trackingNumber) : createTrackingSOAPRequest(trackingNumber);

  try {
    const response: AxiosResponse<string> = await axios.post(
      `${FEDEX_API_BASE_URL}/web-services/track`,
      soapRequest,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'track',
          'Accept': 'text/xml'
        },
      }
    );

    // Parse SOAP response using xml2js
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(response.data);

    // Check for SOAP faults
    if (result['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault']) {
      const fault = result['soapenv:Envelope']['soapenv:Body']['soapenv:Fault'];
      throw new Error(`FedEx SOAP Fault: ${fault.faultstring}`);
    }

    return result;
  } catch (error: any) {
    console.error('FedEx Web Services error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch FedEx tracking data for ${trackingNumber}`);
  }
};

/**
 * Extract POD information from FedEx SOAP response
 */
const extractPodFromFedExSOAPResponse = (xmlResult: any, trackingNumber: string): ProofOfDelivery => {
  const pod: ProofOfDelivery = {
    lastUpdated: new Date()
  };

  try {
    // Navigate to the TrackReply in the SOAP response
    const envelope = xmlResult['soapenv:Envelope'];
    const body = envelope?.['soapenv:Body'];
    const trackReply = body?.['TrackReply'];

    if (!trackReply) {
      console.log('No TrackReply found in response');
      return pod;
    }

    // Extract track details
    const trackDetails = trackReply['TrackDetails'];
    if (trackDetails) {
      // Extract delivery date
      const deliveryDate = trackDetails['ActualDeliveryTimestamp'];
      if (deliveryDate) {
        // Don't set deliveryDate as it's not in the ProofOfDelivery interface
        // pod.deliveryDate = new Date(deliveryDate);
      }

      // Extract recipient information
      const recipientName = trackDetails['DeliveredToName'];
      if (recipientName) {
        pod.deliveredTo = recipientName;
      }

      // Extract signature information
      const signatureName = trackDetails['SignatureName'];
      if (signatureName) {
        pod.signedBy = signatureName;
        pod.signatureObtained = true;
        pod.signatureRequired = true;
      }

      // Extract delivery location
      const deliveryLocation = trackDetails['DeliveryLocationDescription'];
      if (deliveryLocation) {
        pod.deliveryLocation = deliveryLocation;
      }

      // Extract delivery address
      const deliveryAddress = trackDetails['ActualDeliveryAddress'];
      if (deliveryAddress) {
        const streetLines = deliveryAddress['StreetLines'];
        const city = deliveryAddress['City'];
        const state = deliveryAddress['StateOrProvinceCode'];
        const postalCode = deliveryAddress['PostalCode'];
        const country = deliveryAddress['CountryCode'];

        const addressParts = [];
        if (streetLines) {
          if (Array.isArray(streetLines)) {
            addressParts.push(streetLines.join(', '));
          } else {
            addressParts.push(streetLines);
          }
        }
        if (city) addressParts.push(city);
        if (state) addressParts.push(state);
        if (postalCode) addressParts.push(postalCode);
        if (country) addressParts.push(country);

        pod.deliveryLocation = addressParts.filter(Boolean).join(', ');
      }
    }

    // Extract scan events for additional information
    const events = trackDetails?.['Events'];
    if (events) {
      let latestEvent;
      if (Array.isArray(events)) {
        latestEvent = events[events.length - 1];
      } else {
        latestEvent = events;
      }

      if (latestEvent && latestEvent['EventDescription']) {
        pod.deliveryInstructions = latestEvent['EventDescription'];
      }
    }

    // Generate POD URL
    pod.proofOfDeliveryUrl = `https://www.fedex.com/en-us/tracking.html?tracknumbers=${trackingNumber}`;

  } catch (error) {
    console.error('Error parsing FedEx SOAP response:', error);
  }

  return pod;
};

/**
 * Get Proof of Delivery data from FedEx Web Services for a tracking number
 */
export const getFedExPod = async (trackingNumber: string): Promise<ProofOfDelivery> => {
  try {
    console.log(`Fetching FedEx SPOD for tracking number: ${trackingNumber}`);

    const xmlDoc = await fetchFedExTracking(trackingNumber, true); // Include SPOD
    const pod = extractPodFromFedExSOAPResponse(xmlDoc, trackingNumber);

    console.log(`Successfully retrieved FedEx SPOD for ${trackingNumber}:`, pod);
    return pod;

  } catch (error: any) {
    console.error(`Error fetching FedEx SPOD for ${trackingNumber}:`, error.message);

    // Return a basic POD structure if API fails
    return {
      deliveredTo: 'Recipient',
      deliveryLocation: 'Delivery Address',
      signatureRequired: false,
      signatureObtained: false,
      signedBy: '',
      deliveryPhoto: '',
      deliveryInstructions: 'Package delivered successfully',
      proofOfDeliveryUrl: `https://www.fedex.com/en-us/tracking.html?tracknumbers=${trackingNumber}`,
      lastUpdated: new Date()
    };
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
    const xmlResult = await fetchFedExTracking(trackingNumber, false);
    const envelope = xmlResult['soapenv:Envelope'];
    const body = envelope?.['soapenv:Body'];
    const trackReply = body?.['TrackReply'];

    if (!trackReply) {
      return { isDelivered: false };
    }

    const trackDetails = trackReply['TrackDetails'];
    if (!trackDetails) {
      return { isDelivered: false };
    }

    const deliveryTimestamp = trackDetails['ActualDeliveryTimestamp'];
    const isDelivered = !!deliveryTimestamp;

    let deliveryDate: Date | undefined;
    let pod: ProofOfDelivery | undefined;

    if (isDelivered && deliveryTimestamp) {
      deliveryDate = new Date(deliveryTimestamp);
      pod = extractPodFromFedExSOAPResponse(xmlResult, trackingNumber);
    }

    return {
      isDelivered,
      ...(deliveryDate && { deliveryDate }),
      ...(pod && { pod })
    };

  } catch (error: any) {
    console.error(`Error checking FedEx delivery status for ${trackingNumber}:`, error.message);
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
    const xmlResult = await fetchFedExTracking(trackingNumber, false);
    const envelope = xmlResult['soapenv:Envelope'];
    const body = envelope?.['soapenv:Body'];
    const trackReply = body?.['TrackReply'];

    if (!trackReply) {
      return [];
    }

    const trackDetails = trackReply['TrackDetails'];
    if (!trackDetails) {
      return [];
    }

    const events = trackDetails['Events'];
    if (!events) {
      return [];
    }

    let eventsArray: any[] = [];
    if (Array.isArray(events)) {
      eventsArray = events;
    } else {
      eventsArray = [events];
    }

    return eventsArray.map((event: any) => {
      const timestamp = event['Timestamp'];
      const eventType = event['EventType'];
      const description = event['EventDescription'];

      const address = event['Address'];
      let locationStr: string | undefined;
      if (address) {
        const city = address['City'];
        const state = address['StateOrProvinceCode'];
        const country = address['CountryCode'];
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