import { ProofOfDelivery } from '../types/package';
export declare const fetchFedExSpodPdf: (trackingNumber: string) => Promise<{
    pdfUrl?: string;
    pdfBase64?: string;
}>;
export declare const fetchFedExPpodPhoto: (trackingNumber: string) => Promise<{
    photoUrl?: string;
    photoBase64?: string;
}>;
export declare const getFedExPod: (trackingNumber: string) => Promise<ProofOfDelivery>;
export declare const checkFedExDeliveryStatus: (trackingNumber: string) => Promise<{
    isDelivered: boolean;
    deliveryDate?: Date;
    pod?: ProofOfDelivery;
}>;
export declare const getFedExTrackingHistory: (trackingNumber: string) => Promise<Array<{
    date: Date;
    status: string;
    location?: string;
    description?: string;
}>>;
//# sourceMappingURL=fedexApi.d.ts.map