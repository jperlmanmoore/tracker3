import * as fs from 'fs';
import * as path from 'path';
import { getFedExPod, checkFedExDeliveryStatus } from './src/utils/fedexApi';

// Load environment variables from the server directory
const envPath = path.resolve(__dirname, '.env');
console.log('🔍 Loading .env from:', envPath);
require('dotenv').config({ path: envPath });

// Debug: Check if environment variables are loaded
console.log('🔍 Environment variables check:');
console.log('FEDEX_API_KEY exists:', !!process.env.FEDEX_API_KEY);
console.log('FEDEX_API_SECRET exists:', !!process.env.FEDEX_API_SECRET);
console.log('Current directory:', process.cwd());
console.log('Contents of .env:', fs.readFileSync(envPath, 'utf8'));

async function testFedExIntegration() {
  console.log('🧪 Testing FedEx Web Services Integration...\n');

  const trackingNumber = '469822770290';

  try {
    console.log(`📦 Testing POD retrieval for: ${trackingNumber}`);
    const pod = await getFedExPod(trackingNumber);
    console.log('✅ POD Data Retrieved:', JSON.stringify(pod, null, 2));

    console.log(`\n📊 Testing delivery status for: ${trackingNumber}`);
    const status = await checkFedExDeliveryStatus(trackingNumber);
    console.log('✅ Delivery Status:', JSON.stringify(status, null, 2));

    console.log('\n🎉 FedEx Web Services integration test completed successfully!');

  } catch (error: any) {
    console.error('❌ FedEx API Test Failed:', error?.message || error);
    console.log('\n🔍 This could be due to:');
    console.log('   - Invalid API credentials');
    console.log('   - Network connectivity issues');
    console.log('   - FedEx service temporarily unavailable');
    console.log('   - Invalid tracking number format');
  }
}

testFedExIntegration();
