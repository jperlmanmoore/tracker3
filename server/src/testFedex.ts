import dotenv from 'dotenv';
import { getFedExPod, checkFedExDeliveryStatus } from './utils/fedexApi';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testFedExAPI() {
  const trackingNumber = '469822770290';

  console.log('Environment variables:');
  console.log('FEDEX_CLIENT_ID:', process.env.FEDEX_CLIENT_ID ? 'Set' : 'Not set');
  console.log('FEDEX_CLIENT_SECRET:', process.env.FEDEX_CLIENT_SECRET ? 'Set' : 'Not set');

  try {
    console.log(`Testing FedEx API for tracking number: ${trackingNumber}`);

    // Test POD retrieval
    const pod = await getFedExPod(trackingNumber);
    console.log('POD Data:', JSON.stringify(pod, null, 2));

    // Test delivery status
    const deliveryStatus = await checkFedExDeliveryStatus(trackingNumber);
    console.log('Delivery Status:', JSON.stringify(deliveryStatus, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFedExAPI();
