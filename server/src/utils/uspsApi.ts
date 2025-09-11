import axios, { AxiosResponse } from 'axios';
import * as xml2js from 'xml2js';
import * as dotenv from 'dotenv';
dotenv.config();

// USPS Web Tools Configuration
const USPS_USER_ID = process.env.USPS_USER_ID;

/**
 * Check USPS delivery status using Web Tools API
 */
export const checkUSPSDeliveryStatus = async (trackingNumber: string): Promise<{
  isDelivered: boolean;
  deliveryDate?: Date;
  status: string;
}> => {
  try {
    console.log(`Checking USPS delivery status for ${trackingNumber}`);

    if (!USPS_USER_ID) {
      console.log('USPS_USER_ID not configured.');
      return { isDelivered: false, status: 'In Transit' };
    }

    // USPS Web Tools API URL
    const apiUrl = `https://secure.shippingapis.com/ShippingAPI.dll`;

    // Create XML request
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<TrackRequest USERID="${USPS_USER_ID}">
  <TrackID ID="${trackingNumber}"></TrackID>
</TrackRequest>`;

    const params = {
      API: 'TrackV2',
      XML: xmlRequest
    };

    const response: AxiosResponse<string> = await axios.get(apiUrl, { params });

    // Parse XML response using xml2js
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(response.data);

    // Check for errors
    if (result.TrackResponse?.Error) {
      const errorDesc = result.TrackResponse.Error.Description;
      console.error(`USPS API Error: ${errorDesc}`);
      return { isDelivered: false, status: 'In Transit' };
    }

    // Get track info
    const trackInfo = result.TrackResponse?.TrackInfo;
    if (!trackInfo) {
      return { isDelivered: false, status: 'In Transit' };
    }

    // Get track summary
    const trackSummary = trackInfo.TrackSummary || '';

    // Check if delivered
    const isDelivered = trackSummary.toLowerCase().includes('delivered') ||
                       trackSummary.toLowerCase().includes('your item was delivered');

    let deliveryDate: Date | undefined;

    // Get delivery date from track details
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

  } catch (error: any) {
    console.error(`Error checking USPS delivery status for ${trackingNumber}:`, error.message);
    return { isDelivered: false, status: 'In Transit' };
  }
};


/**
 * Get USPS tracking history
 */
export const getUSPSTrackingHistory = async (trackingNumber: string): Promise<Array<{
  date: Date;
  status: string;
  location?: string;
  description?: string;
}>> => {
  try {
    console.log(`Getting USPS tracking history for ${trackingNumber}`);

    if (!USPS_USER_ID) {
      console.log('USPS_USER_ID not configured.');
      return [];
    }

    // USPS Web Tools API URL
    const apiUrl = `https://secure.shippingapis.com/ShippingAPI.dll`;

    // Create XML request
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<TrackRequest USERID="${USPS_USER_ID}">
  <TrackID ID="${trackingNumber}"></TrackID>
</TrackRequest>`;

    const params = {
      API: 'TrackV2',
      XML: xmlRequest
    };

    const response: AxiosResponse<string> = await axios.get(apiUrl, { params });

    // Parse XML response using xml2js
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(response.data);

    // Check for errors
    if (result.TrackResponse?.Error) {
      console.error(`USPS API Error: ${result.TrackResponse.Error.Description}`);
      return [];
    }

    // Get track info
    const trackInfo = result.TrackResponse?.TrackInfo;
    if (!trackInfo) {
      return [];
    }

    // Get track details
    const trackDetails = trackInfo.TrackDetail;
    if (!trackDetails) {
      return [];
    }

    const detailsArray = Array.isArray(trackDetails) ? trackDetails : [trackDetails];

    return detailsArray.map((detail: any) => {
      const event = detail.Event || '';
      const eventDate = detail.EventDate;
      const eventTime = detail.EventTime;
      const eventCity = detail.EventCity;
      const eventState = detail.EventState;
      const eventZIPCode = detail.EventZIPCode;
      const eventCountry = detail.EventCountry;

      // Create location string
      const locationParts = [];
      if (eventCity) locationParts.push(eventCity);
      if (eventState) locationParts.push(eventState);
      if (eventZIPCode) locationParts.push(eventZIPCode);
      if (eventCountry) locationParts.push(eventCountry);

      const location = locationParts.length > 0 ? locationParts.join(', ') : undefined;

      // Create date
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

  } catch (error: any) {
    console.error(`Error getting USPS tracking history for ${trackingNumber}:`, error.message);
    return [];
  }
};