// Utility function to detect carrier from tracking number
export const detectCarrier = (trackingNumber: string): 'USPS' | 'FedEx' | null => {
  const cleanNumber = trackingNumber.replace(/\s+/g, '').toUpperCase();
  
  // USPS patterns
  const uspsPatterns = [
    /^(94|93|92|94|95)\d{20}$/, // USPS Priority Mail Express & Priority Mail
    /^(420\d{5}91|420\d{5}92|420\d{5}93|420\d{5}94|420\d{5}95)\d{13}$/, // USPS Tracking
    /^(EA|EC|ED|EE|EH|EJ|EK|EL|EM|EN|EP|ER|ET|EV|EW|EX|EY|EZ)\d{9}US$/, // USPS International
    /^[A-Z]{2}\d{9}US$/, // USPS International format
    /^(91|92|93|94|95)\d{20}$/, // Additional USPS formats
    /^70\d{14}$/, // USPS Certified Mail
    /^23\d{8}$/, // USPS Priority Mail Express
    /^[0-9]{20}$/, // USPS 20-digit
    /^[0-9]{22}$/, // USPS 22-digit
  ];
  
  // FedEx patterns
  const fedexPatterns = [
    /^\d{12}$/, // FedEx Express (12 digits)
    /^\d{14}$/, // FedEx Express (14 digits)
    /^\d{15}$/, // FedEx Ground (15 digits)
    /^\d{20}$/, // FedEx Ground (20 digits)
    /^\d{22}$/, // FedEx Ground (22 digits)
    /^96\d{20}$/, // FedEx SmartPost
    /^[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}$/, // FedEx Express (formatted)
  ];
  
  // Check USPS patterns first
  for (const pattern of uspsPatterns) {
    if (pattern.test(cleanNumber)) {
      return 'USPS';
    }
  }
  
  // Check FedEx patterns
  for (const pattern of fedexPatterns) {
    if (pattern.test(cleanNumber)) {
      return 'FedEx';
    }
  }
  
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
