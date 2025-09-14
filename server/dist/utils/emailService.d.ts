import { ProofOfDelivery } from '../types/package';
interface PodEmailData {
    trackingNumber: string;
    customer: string;
    carrier: 'USPS' | 'FedEx';
    deliveryDate: Date;
    proofOfDelivery: ProofOfDelivery;
    fedexResponse?: any;
}
export declare const sendPodEmail: (to: string, podData: PodEmailData) => Promise<boolean>;
export declare const sendPodEmailsToMultipleRecipients: (emails: string[], podData: PodEmailData) => Promise<{
    success: string[];
    failed: string[];
}>;
export declare const testEmailConfiguration: (testEmail: string) => Promise<boolean>;
export {};
//# sourceMappingURL=emailService.d.ts.map