import dotenv from 'dotenv';
import { getFedExPod, checkFedExDeliveryStatus } from './utils/fedexApi';
import { sendPodEmailsToMultipleRecipients } from './utils/emailService';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testFedExAPI() {
  const trackingNumber = '469822770290';

  console.log('Environment variables:');
  console.log('FEDEX_CLIENT_ID:', process.env.FEDEX_CLIENT_ID ? 'Set' : 'Not set');
  console.log('FEDEX_API_KEY:', process.env.FEDEX_API_KEY ? 'Set' : 'Not set');
  console.log('FEDEX_API_SECRET:', process.env.FEDEX_API_SECRET ? 'Set' : 'Not set');

  try {
    console.log(`Testing FedEx API for tracking number: ${trackingNumber}`);

    // Test POD retrieval
    const pod = await getFedExPod(trackingNumber);
    console.log('POD Data:', JSON.stringify(pod, null, 2));

    // Test delivery status
    const deliveryStatus = await checkFedExDeliveryStatus(trackingNumber);
    console.log('Delivery Status:', JSON.stringify(deliveryStatus, null, 2));

    // Test SPOD email if package is delivered
    if (deliveryStatus.isDelivered && deliveryStatus.pod) {
      console.log('Testing SPOD email...');

      const testEmails = ['test@example.com']; // Replace with actual test email

      const podEmailData = {
        trackingNumber: trackingNumber,
        customer: 'Test Customer',
        carrier: 'FedEx' as const,
        deliveryDate: deliveryStatus.deliveryDate || new Date(),
        proofOfDelivery: deliveryStatus.pod
      };

      const emailResults = await sendPodEmailsToMultipleRecipients(testEmails, podEmailData);
      console.log('SPOD Email Results:', emailResults);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFedExAPI();
