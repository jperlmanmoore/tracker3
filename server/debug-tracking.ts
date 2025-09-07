import { detectCarrier, parseTrackingNumbers } from './src/utils/trackingUtils';

console.log('=== Testing Tracking Number Detection ===\n');

// Test common tracking numbers
const testNumbers = [
  '9405511206213334271430', // USPS
  '9400136105303504041015', // USPS
  '1234567890123456',       // FedEx (generic)
  '123456789012',          // FedEx 12-digit
  '12345678901234',        // FedEx 14-digit
  '123456789012345',       // FedEx 15-digit
  'invalid123'             // Invalid
];

console.log('Testing individual tracking numbers:');
testNumbers.forEach((num: string) => {
  const carrier = detectCarrier(num);
  console.log(`${num} => ${carrier || 'UNKNOWN'}`);
});

console.log('\n=== Testing Parsing ===\n');

const testInput = '9405511206213334271430, 1234567890123456';
const parsed = parseTrackingNumbers(testInput);
console.log(`Input: "${testInput}"`);
console.log('Parsed:', parsed);

parsed.forEach((num: string) => {
  const carrier = detectCarrier(num);
  console.log(`  ${num} => ${carrier || 'UNKNOWN'}`);
});

console.log('\n=== Testing Common USPS Patterns ===\n');

const uspsNumbers = [
  '9405511206213334271430',
  '9400136105303504041015',
  '9261299998888123456789',
  'EA123456789US',
  '7012345678901234567890'
];

uspsNumbers.forEach((num: string) => {
  const carrier = detectCarrier(num);
  console.log(`${num} => ${carrier || 'UNKNOWN'}`);
});

console.log('\n=== Testing Common FedEx Patterns ===\n');

const fedexNumbers = [
  '123456789012',      // 12 digits
  '12345678901234',    // 14 digits  
  '123456789012345',   // 15 digits
  '12345678901234567890', // 20 digits
  '9612345678901234567890' // 22 digits starting with 96
];

fedexNumbers.forEach((num: string) => {
  const carrier = detectCarrier(num);
  console.log(`${num} => ${carrier || 'UNKNOWN'}`);
});
