export declare const detectCarrier: (trackingNumber: string) => "USPS" | "FedEx" | null;
export declare const getTrackingUrl: (trackingNumber: string, carrier: "USPS" | "FedEx") => string;
export declare const getBulkTrackingUrl: (trackingNumbers: string[], carrier: "USPS" | "FedEx") => string;
export declare const parseTrackingNumbers: (input: string) => string[];
//# sourceMappingURL=trackingUtils.d.ts.map