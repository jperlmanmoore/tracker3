"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmailConfiguration = exports.sendPodEmailsToMultipleRecipients = exports.sendPodEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};
const sendPodEmail = async (to, podData) => {
    try {
        const transporter = createTransporter();
        const subject = `${podData.customer} - FedEx POD - ${podData.trackingNumber}`;
        const htmlContent = generatePodEmailHtml(podData);
        const attachments = [];
        const pod = podData.proofOfDelivery;
        let spodInfo = '';
        let ppodInfo = '';
        if (podData.carrier === 'FedEx' && podData.fedexResponse) {
            const fedexResponse = podData.fedexResponse;
            try {
                const output = fedexResponse.output;
                if (output && output.completeTrackResults && output.completeTrackResults[0]) {
                    const trackResult = output.completeTrackResults[0];
                    if (trackResult.trackResults && trackResult.trackResults[0]) {
                        const trackingResult = trackResult.trackResults[0];
                        if (trackingResult.deliveryDetails) {
                            const deliveryDetails = trackingResult.deliveryDetails;
                            if (deliveryDetails.signedProofOfDelivery) {
                                spodInfo = 'Available';
                                if (deliveryDetails.signedProofOfDelivery.startsWith('http')) {
                                    attachments.push({
                                        filename: `SPOD_${podData.trackingNumber}.pdf`,
                                        path: deliveryDetails.signedProofOfDelivery,
                                        contentType: 'application/pdf'
                                    });
                                }
                            }
                            if (deliveryDetails.photoProofOfDelivery) {
                                ppodInfo = 'Available';
                                if (deliveryDetails.photoProofOfDelivery.startsWith('http')) {
                                    attachments.push({
                                        filename: `PPOD_${podData.trackingNumber}.jpg`,
                                        path: deliveryDetails.photoProofOfDelivery,
                                        contentType: 'image/jpeg'
                                    });
                                }
                            }
                        }
                        if (trackingResult.scanEvents) {
                            const deliveryEvent = trackingResult.scanEvents.find((event) => event.eventType === 'DL' || event.eventDescription?.toLowerCase().includes('delivered'));
                            if (deliveryEvent && deliveryEvent.scanDetails) {
                                if (deliveryEvent.scanDetails.signedProofOfDelivery && !spodInfo) {
                                    spodInfo = 'Available';
                                    if (deliveryEvent.scanDetails.signedProofOfDelivery.startsWith('http')) {
                                        attachments.push({
                                            filename: `SPOD_${podData.trackingNumber}.pdf`,
                                            path: deliveryEvent.scanDetails.signedProofOfDelivery,
                                            contentType: 'application/pdf'
                                        });
                                    }
                                }
                                if (deliveryEvent.scanDetails.photoProofOfDelivery && !ppodInfo) {
                                    ppodInfo = 'Available';
                                    if (deliveryEvent.scanDetails.photoProofOfDelivery.startsWith('http')) {
                                        attachments.push({
                                            filename: `PPOD_${podData.trackingNumber}.jpg`,
                                            path: deliveryEvent.scanDetails.photoProofOfDelivery,
                                            contentType: 'image/jpeg'
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error extracting SPOD/PPOD from FedEx response:', error);
            }
        }
        if (pod.spodPdfBase64 && attachments.length === 0) {
            attachments.push({
                filename: `SPOD_${podData.trackingNumber}.pdf`,
                content: pod.spodPdfBase64,
                encoding: 'base64',
                contentType: 'application/pdf'
            });
        }
        else if (pod.spodPdfUrl && attachments.length === 0) {
            attachments.push({
                filename: `SPOD_${podData.trackingNumber}.pdf`,
                path: pod.spodPdfUrl,
                contentType: 'application/pdf'
            });
        }
        if (pod.deliveryPhoto && pod.deliveryPhoto.startsWith('http') && attachments.length < 2) {
            attachments.push({
                filename: `PPOD_${podData.trackingNumber}.jpg`,
                path: pod.deliveryPhoto,
                contentType: 'image/jpeg'
            });
        }
        else if (pod.deliveryPhoto && !pod.deliveryPhoto.startsWith('http') && attachments.length < 2) {
            attachments.push({
                filename: `PPOD_${podData.trackingNumber}.jpg`,
                content: pod.deliveryPhoto,
                encoding: 'base64',
                contentType: 'image/jpeg'
            });
        }
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            html: htmlContent,
            attachments: attachments.length > 0 ? attachments : undefined
        };
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error('Error sending POD email:', error);
        return false;
    }
};
exports.sendPodEmail = sendPodEmail;
const sendPodEmailsToMultipleRecipients = async (emails, podData) => {
    const results = { success: [], failed: [] };
    for (const email of emails) {
        try {
            const success = await (0, exports.sendPodEmail)(email, podData);
            if (success) {
                results.success.push(email);
            }
            else {
                results.failed.push(email);
            }
        }
        catch (error) {
            console.error(`Failed to send POD email to ${email}:`, error);
            results.failed.push(email);
        }
    }
    return results;
};
exports.sendPodEmailsToMultipleRecipients = sendPodEmailsToMultipleRecipients;
const generatePodEmailHtml = (podData) => {
    const { trackingNumber, customer, carrier, deliveryDate, proofOfDelivery } = podData;
    let spodStatus = 'Not available';
    let ppodStatus = 'Not available';
    if (podData.carrier === 'FedEx' && podData.fedexResponse) {
        try {
            const output = podData.fedexResponse.output;
            if (output && output.completeTrackResults && output.completeTrackResults[0]) {
                const trackResult = output.completeTrackResults[0];
                if (trackResult.trackResults && trackResult.trackResults[0]) {
                    const trackingResult = trackResult.trackResults[0];
                    if (trackingResult.deliveryDetails) {
                        if (trackingResult.deliveryDetails.signedProofOfDelivery) {
                            spodStatus = 'Available';
                        }
                        if (trackingResult.deliveryDetails.photoProofOfDelivery) {
                            ppodStatus = 'Available';
                        }
                    }
                    if (trackingResult.scanEvents) {
                        const deliveryEvent = trackingResult.scanEvents.find((event) => event.eventType === 'DL' || event.eventDescription?.toLowerCase().includes('delivered'));
                        if (deliveryEvent && deliveryEvent.scanDetails) {
                            if (deliveryEvent.scanDetails.signedProofOfDelivery && spodStatus === 'Not available') {
                                spodStatus = 'Available';
                            }
                            if (deliveryEvent.scanDetails.photoProofOfDelivery && ppodStatus === 'Not available') {
                                ppodStatus = 'Available';
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error checking SPOD/PPOD status:', error);
        }
    }
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Proof of Delivery - ${trackingNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .content { background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px; }
        .tracking-info { background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .signature-info { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .spod-ppod-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        .carrier-badge { display: inline-block; padding: 5px 10px; background-color: ${carrier === 'FedEx' ? '#0074D9' : '#0071BC'}; color: white; border-radius: 3px; font-weight: bold; }
        .status-badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
        .status-available { background-color: #28a745; color: white; }
        .status-unavailable { background-color: #6c757d; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📦 Proof of Delivery</h2>
          <p>Package has been successfully delivered</p>
        </div>

        <div class="content">
          <div class="tracking-info">
            <h3>Package Information</h3>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            <p><strong>Customer:</strong> ${customer}</p>
            <p><strong>Carrier:</strong> <span class="carrier-badge">${carrier}</span></p>
            <p><strong>Delivery Date:</strong> ${new Date(deliveryDate).toLocaleDateString()}</p>
          </div>

          <div class="signature-info">
            <h3>Delivery Details</h3>
            ${proofOfDelivery.deliveredTo ? `<p><strong>Delivered To:</strong> ${proofOfDelivery.deliveredTo}</p>` : ''}
            ${proofOfDelivery.deliveryLocation ? `<p><strong>Delivery Location:</strong> ${proofOfDelivery.deliveryLocation}</p>` : ''}
            ${proofOfDelivery.deliveryInstructions ? `<p><strong>Delivery Instructions:</strong> ${proofOfDelivery.deliveryInstructions}</p>` : ''}

            ${proofOfDelivery.signatureRequired ?
        `<p><strong>Signature Required:</strong> Yes</p>
               <p><strong>Signature Obtained:</strong> ${proofOfDelivery.signatureObtained ? 'Yes' : 'No'}</p>
               ${proofOfDelivery.signedBy ? `<p><strong>Signed By:</strong> ${proofOfDelivery.signedBy}</p>` : ''}`
        :
            `<p><strong>Signature Required:</strong> No</p>`}

            ${proofOfDelivery.deliveryPhoto ? `<p><strong>Delivery Photo:</strong> <a href="${proofOfDelivery.deliveryPhoto}">View Photo</a></p>` : ''}
          </div>

          ${carrier === 'FedEx' ? `
          <div class="spod-ppod-info">
            <h3>FedEx Proof of Delivery Documents</h3>
            <p><strong>SPOD (Signed Proof of Delivery):</strong> <span class="status-badge ${spodStatus === 'Available' ? 'status-available' : 'status-unavailable'}">${spodStatus}</span></p>
            <p><strong>PPOD (Photo Proof of Delivery):</strong> <span class="status-badge ${ppodStatus === 'Available' ? 'status-available' : 'status-unavailable'}">${ppodStatus}</span></p>
            <p><em>Documents are attached to this email if available.</em></p>
          </div>
          ` : ''}

          ${proofOfDelivery.proofOfDeliveryUrl ?
        `<p><strong>View Full Proof of Delivery:</strong> <a href="${proofOfDelivery.proofOfDeliveryUrl}" target="_blank">Click Here</a></p>`
        : ''}
        </div>

        <div class="footer">
          <p>This is an automated message from your Package Tracking System.</p>
          <p>If you have any questions, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
const testEmailConfiguration = async (testEmail) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: testEmail,
            subject: 'POD Email Configuration Test',
            html: `
        <h2>✅ POD Email Configuration Test</h2>
        <p>Your POD email configuration is working correctly!</p>
        <p>You will receive Proof of Delivery emails at this address when packages are delivered.</p>
        <p><strong>Test sent at:</strong> ${new Date().toLocaleString()}</p>
      `
        };
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch (error) {
        console.error('Error testing email configuration:', error);
        return false;
    }
};
exports.testEmailConfiguration = testEmailConfiguration;
//# sourceMappingURL=emailService.js.map