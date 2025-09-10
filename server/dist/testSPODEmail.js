"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const emailService_1 = require("./utils/emailService");
dotenv_1.default.config({ path: '../.env' });
async function testSPODEmail() {
    console.log('Testing SPOD Email Configuration...');
    console.log('SMTP Configuration:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
    try {
        const testEmails = ['your-test-email@example.com'];
        const podEmailData = {
            trackingNumber: 'TEST123456789',
            customer: 'John Doe',
            carrier: 'FedEx',
            deliveryDate: new Date(),
            proofOfDelivery: {
                deliveredTo: 'John Doe',
                deliveryLocation: 'Front Door',
                signatureRequired: true,
                signatureObtained: true,
                signedBy: 'J.DOE',
                deliveryPhoto: '',
                deliveryInstructions: 'Left at front door per instructions',
                proofOfDeliveryUrl: 'https://www.fedex.com/tracking',
                lastUpdated: new Date()
            }
        };
        console.log('Sending test SPOD email...');
        const results = await (0, emailService_1.sendPodEmailsToMultipleRecipients)(testEmails, podEmailData);
        console.log('Email Results:', results);
        if (results.success.length > 0) {
            console.log('✅ SPOD email sent successfully!');
        }
        else {
            console.log('❌ Failed to send SPOD email');
        }
    }
    catch (error) {
        console.error('SPOD Email test failed:', error);
    }
}
testSPODEmail();
//# sourceMappingURL=testSPODEmail.js.map