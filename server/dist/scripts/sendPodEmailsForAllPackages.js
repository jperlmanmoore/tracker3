"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Package_1 = __importDefault(require("../models/Package"));
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = require("../utils/emailService");
dotenv_1.default.config();
async function main() {
    await mongoose_1.default.connect(process.env.MONGODB_URI || '', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    const users = await User_1.default.find({ 'podEmailConfig.enabled': true });
    if (users.length === 0) {
        console.log('No users with POD email enabled.');
        return;
    }
    for (const user of users) {
        const packages = await Package_1.default.find({ userId: user._id, status: 'Delivered' });
        if (packages.length === 0) {
            console.log(`No delivered packages for user ${user.username}`);
            continue;
        }
        const emailsToSend = [];
        if (user.podEmailConfig) {
            if (user.podEmailConfig.email1)
                emailsToSend.push(user.podEmailConfig.email1);
            if (user.podEmailConfig.email2)
                emailsToSend.push(user.podEmailConfig.email2);
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
            const results = await (0, emailService_1.sendPodEmailsToMultipleRecipients)(emailsToSend, podEmailData);
            pkg.spodEmailSent = true;
            await pkg.save();
            console.log(`POD emails sent for ${pkg.trackingNumber}:`, results);
        }
    }
    await mongoose_1.default.disconnect();
    console.log('Done sending POD emails for all delivered packages.');
}
main().catch(err => {
    console.error('Error in POD email script:', err);
    process.exit(1);
});
//# sourceMappingURL=sendPodEmailsForAllPackages.js.map