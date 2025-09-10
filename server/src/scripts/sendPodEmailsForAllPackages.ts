import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from '../models/Package';
import User from '../models/User';
import { sendPodEmailsToMultipleRecipients } from '../utils/emailService';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || '', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as any);

  const users = await User.find({ 'podEmailConfig.enabled': true });
  if (users.length === 0) {
    console.log('No users with POD email enabled.');
    return;
  }

  for (const user of users) {
    const packages = await Package.find({ userId: user._id, status: 'Delivered' });
    if (packages.length === 0) {
      console.log(`No delivered packages for user ${user.username}`);
      continue;
    }
    const emailsToSend: string[] = [];
    if (user.podEmailConfig) {
      if (user.podEmailConfig.email1) emailsToSend.push(user.podEmailConfig.email1);
      if (user.podEmailConfig.email2) emailsToSend.push(user.podEmailConfig.email2);
    }
    if (emailsToSend.length === 0) {
      console.log(`No email addresses configured for user ${user.username}`);
      continue;
    }
    for (const pkg of packages) {
      if (pkg.spodEmailSent) {
        console.log(`SPOD email already sent for ${pkg.trackingNumber}`);
        continue;
      }
      const podEmailData = {
        trackingNumber: pkg.trackingNumber,
        customer: pkg.customer,
        carrier: pkg.carrier,
        deliveryDate: pkg.deliveryDate || new Date(),
        proofOfDelivery: pkg.proofOfDelivery || {}
      };
      const results = await sendPodEmailsToMultipleRecipients(emailsToSend, podEmailData);
      pkg.spodEmailSent = true;
      await pkg.save();
      console.log(`POD emails sent for ${pkg.trackingNumber}:`, results);
    }
  }
  await mongoose.disconnect();
  console.log('Done sending POD emails for all delivered packages.');
}

main().catch(err => {
  console.error('Error in POD email script:', err);
  process.exit(1);
});
