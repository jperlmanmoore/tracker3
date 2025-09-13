const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/mailtracker';

async function deleteTestPackages() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Remove packages with test customers or 'wrong response'
  const result = await db.collection('packages').deleteMany({
    customer: { $in: ['test', 'wrong response', 'test spod eail'] }
  });

  console.log(`Deleted ${result.deletedCount} test/simulated packages.`);
  await mongoose.disconnect();
}

deleteTestPackages().catch(err => {
  console.error('Error deleting test packages:', err);
  process.exit(1);
});
