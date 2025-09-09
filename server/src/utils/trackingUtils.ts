// Utility function to detect carrier from tracking number
import { getFedExPod, checkFedExDeliveryStatus } from './fedexApi';

export const detectCarrier = (trackingNumber: string): 'USPS' | 'FedEx' | null => {
  const cleanNumber = trackingNumber.replace(/\s+/g, '').toUpperCase();

  console.log(`Detecting carrier for tracking number: ${trackingNumber}`);
  console.log(`Cleaned tracking number: ${cleanNumber}`);

  // USPS patterns (check these first as they're more specific)
  const uspsPatterns = [
    /^(94|93|92|95)\d{18}$/, // USPS Priority Mail Express & Priority Mail (22 digits total)
    /^(420\d{5}91|420\d{5}92|420\d{5}93|420\d{5}94|420\d{5}95)\d{8}$/, // USPS Tracking
    /^(EA|EC|ED|EE|EH|EJ|EK|EL|EM|EN|EP|ER|ET|EV|EW|EX|EY|EZ)\d{9}US$/, // USPS International
    /^[A-Z]{2}\d{9}US$/, // USPS International format
    /^70\d{14}$/, // USPS Certified Mail
    /^23\d{8}$/, // USPS Priority Mail Express
    /^91\d{18}$/, // USPS additional format
  ];

  // FedEx patterns (more flexible)
  const fedexPatterns = [
    /^\d{12}$/, // FedEx Express (12 digits)
    /^\d{14}$/, // FedEx Express (14 digits)
    /^\d{15}$/, // FedEx Ground (15 digits)
    /^\d{16}$/, // FedEx Ground (16 digits) - added this
    /^\d{18}$/, // FedEx Ground (18 digits)
    /^96\d{20}$/, // FedEx SmartPost (starts with 96, 22 digits total)
    /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/, // FedEx Express (formatted)
  ];

  // Check USPS patterns first (they're more specific)
  for (const pattern of uspsPatterns) {
    if (pattern.test(cleanNumber)) {
      console.log(`Matched USPS pattern: ${pattern}`);
      return 'USPS';
    }
  }

  // Check FedEx patterns
  for (const pattern of fedexPatterns) {
    if (pattern.test(cleanNumber)) {
      console.log(`Matched FedEx pattern: ${pattern}`);
      return 'FedEx';
    }
  }

  console.log('No specific pattern matched. Applying generic rules.');
  // If no specific pattern matches, try some generic rules
  // 20+ digit numbers starting with 9 are usually USPS
  if (/^9\d{19,21}$/.test(cleanNumber)) {
    console.log('Matched generic USPS rule.');
    return 'USPS';
  }

  // 20 digit numbers not starting with 9 could be FedEx
  if (/^\d{20}$/.test(cleanNumber) && !cleanNumber.startsWith('9')) {
    console.log('Matched generic FedEx rule.');
    return 'FedEx';
  }

  console.log('No carrier detected.');
  return null;
};

// Generate tracking URLs
export const getTrackingUrl = (trackingNumber: string, carrier: 'USPS' | 'FedEx'): string => {
  const cleanNumber = trackingNumber.replace(/\s+/g, '');
  
  if (carrier === 'USPS') {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanNumber}`;
  } else {
    return `https://www.fedex.com/fedextrack/?trknbr=${cleanNumber}`;
  }
};

// Generate bulk tracking URLs
export const getBulkTrackingUrl = (trackingNumbers: string[], carrier: 'USPS' | 'FedEx'): string => {
  const cleanNumbers = trackingNumbers.map(num => num.replace(/\s+/g, ''));
  
  if (carrier === 'USPS') {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${cleanNumbers.join(',')}`;
  } else {
    return `https://www.fedex.com/fedextrack/?trknbr=${cleanNumbers.join(',')}`;
  }
};

// Parse multiple tracking numbers from text input
export const parseTrackingNumbers = (input: string): string[] => {
  return input
    .split(/[,\n\r\t\s]+/)
    .map(num => num.trim())
    .filter(num => num.length > 0);
};

// Simulate delivery status update (for testing)
export const simulateDelivery = async (trackingNumber: string, carrier: 'USPS' | 'FedEx'): Promise<{
  status: string;
  deliveryDate: Date;
  proofOfDelivery: any;
}> => {
  try {
    // For FedEx packages, try to get real POD data from FedEx API
    if (carrier === 'FedEx') {
      console.log(`Attempting to fetch real FedEx POD data for ${trackingNumber}`);

      try {
        const deliveryStatus = await checkFedExDeliveryStatus(trackingNumber);

        if (deliveryStatus.isDelivered && deliveryStatus.pod) {
          console.log(`Found real FedEx delivery data for ${trackingNumber}`);
          return {
            status: 'Delivered',
            deliveryDate: deliveryStatus.deliveryDate || new Date(),
            proofOfDelivery: deliveryStatus.pod
          };
        } else {
          console.log(`Package ${trackingNumber} not yet delivered according to FedEx API, generating simulated data`);
        }
      } catch (apiError) {
        console.log(`FedEx API error for ${trackingNumber}, falling back to simulated data:`, apiError);
      }
    }

    // Fallback to simulated data for USPS or when FedEx API fails
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

    // If signature required, randomly add signature data
    if (baseProofOfDelivery.signatureRequired && Math.random() > 0.3) {
      baseProofOfDelivery.signatureObtained = true;
      baseProofOfDelivery.signedBy = 'J.DOE';
    }

    // USPS sometimes has delivery photos
    if (carrier === 'USPS' && Math.random() > 0.6) {
      baseProofOfDelivery.deliveryPhoto = `https://tools.usps.com/images/delivery-photo-${trackingNumber}.jpg`;
    }

    return {
      status: 'Delivered',
      deliveryDate: new Date(),
      proofOfDelivery: baseProofOfDelivery
    };
  } catch (error) {
    console.error(`Error in simulateDelivery for ${trackingNumber}:`, error);

    // Return basic fallback data
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
