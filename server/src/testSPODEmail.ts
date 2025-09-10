import dotenv from 'dotenv';
import { sendPodEmailsToMultipleRecipients } from './utils/emailService';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testSPODEmail() {
  console.log('Testing SPOD Email Configuration...');

  // Check SMTP configuration
  console.log('SMTP Configuration:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');

  try {
    // Test email data
    const testEmails = ['your-test-email@example.com']; // Replace with your actual test email

    const podEmailData = {
      trackingNumber: 'TEST123456789',
      customer: 'John Doe',
      carrier: 'FedEx' as const,
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
    const results = await sendPodEmailsToMultipleRecipients(testEmails, podEmailData);

    console.log('Email Results:', results);

    if (results.success.length > 0) {
      console.log('✅ SPOD email sent successfully!');
    } else {
      console.log('❌ Failed to send SPOD email');
    }

  } catch (error) {
    console.error('SPOD Email test failed:', error);
  }
}

testSPODEmail();
