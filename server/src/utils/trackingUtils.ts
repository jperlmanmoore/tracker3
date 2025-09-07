// Utility function to detect carrier from tracking number
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
