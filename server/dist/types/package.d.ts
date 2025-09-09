import { Document } from 'mongoose';
export interface IPackageInput {
    trackingNumber: string;
    carrier: 'USPS' | 'FedEx';
    customer: string;
    packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
    dateSent: Date;
    notes?: string;
}
export interface IPackageResponse {
    id: string;
    trackingNumber: string;
    carrier: 'USPS' | 'FedEx';
    customer: string;
    packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
    status: string;
    dateSent: Date;
    deliveryDate?: Date;
    notes?: string;
    trackingHistory?: TrackingEvent[];
    proofOfDelivery?: ProofOfDelivery;
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface TrackingEvent {
    date: Date;
    status: string;
    location?: string;
    description?: string;
}
export interface ProofOfDelivery {
    deliveredTo?: string;
    deliveryLocation?: string;
    signatureRequired?: boolean;
    signatureObtained?: boolean;
    signedBy?: string;
    deliveryPhoto?: string;
    deliveryInstructions?: string;
    proofOfDeliveryUrl?: string;
    lastUpdated?: Date;
}
export interface IPackage extends Document {
    trackingNumber: string;
    carrier: 'USPS' | 'FedEx';
    customer: string;
    packageType: 'LOR' | 'demand' | 'spol' | 'AL' | 'other';
    status: string;
    dateSent: Date;
    deliveryDate?: Date;
    notes?: string;
    trackingHistory: TrackingEvent[];
    proofOfDelivery?: ProofOfDelivery;
    lastUpdated: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=package.d.ts.map