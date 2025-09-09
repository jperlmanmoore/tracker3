export declare const detectCarrier: (trackingNumber: string) => "USPS" | "FedEx" | null;
export declare const getTrackingUrl: (trackingNumber: string, carrier: "USPS" | "FedEx") => string;
export declare const getBulkTrackingUrl: (trackingNumbers: string[], carrier: "USPS" | "FedEx") => string;
export declare const parseTrackingNumbers: (input: string) => string[];
export declare const simulateDelivery: (trackingNumber: string, carrier: "USPS" | "FedEx") => Promise<{
    status: string;
    deliveryDate: Date;
    proofOfDelivery: any;
}>;
//# sourceMappingURL=trackingUtils.d.ts.map