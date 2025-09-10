export declare const checkUSPSDeliveryStatus: (trackingNumber: string) => Promise<{
    isDelivered: boolean;
    deliveryDate?: Date;
    status: string;
}>;
export declare const getUSPSTrackingHistory: (trackingNumber: string) => Promise<Array<{
    date: Date;
    status: string;
    location?: string;
    description?: string;
}>>;
//# sourceMappingURL=uspsApi.d.ts.map