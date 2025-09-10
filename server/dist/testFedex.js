"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fedexApi_1 = require("./utils/fedexApi");
const emailService_1 = require("./utils/emailService");
dotenv_1.default.config({ path: '../.env' });
async function testFedExAPI() {
    const trackingNumber = '469822770290';
    console.log('Environment variables:');
    console.log('FEDEX_CLIENT_ID:', process.env.FEDEX_CLIENT_ID ? 'Set' : 'Not set');
    console.log('FEDEX_API_KEY:', process.env.FEDEX_API_KEY ? 'Set' : 'Not set');
    console.log('FEDEX_API_SECRET:', process.env.FEDEX_API_SECRET ? 'Set' : 'Not set');
    try {
        console.log(`Testing FedEx API for tracking number: ${trackingNumber}`);
        const pod = await (0, fedexApi_1.getFedExPod)(trackingNumber);
        console.log('POD Data:', JSON.stringify(pod, null, 2));
        const deliveryStatus = await (0, fedexApi_1.checkFedExDeliveryStatus)(trackingNumber);
        console.log('Delivery Status:', JSON.stringify(deliveryStatus, null, 2));
        if (deliveryStatus.isDelivered && deliveryStatus.pod) {
            console.log('Testing SPOD email...');
            const testEmails = ['test@example.com'];
            const podEmailData = {
                trackingNumber: trackingNumber,
                customer: 'Test Customer',
                carrier: 'FedEx',
                deliveryDate: deliveryStatus.deliveryDate || new Date(),
                proofOfDelivery: deliveryStatus.pod
            };
            const emailResults = await (0, emailService_1.sendPodEmailsToMultipleRecipients)(testEmails, podEmailData);
            console.log('SPOD Email Results:', emailResults);
        }
    }
    catch (error) {
        console.error('Test failed:', error);
    }
}
testFedExAPI();
//# sourceMappingURL=testFedex.js.map