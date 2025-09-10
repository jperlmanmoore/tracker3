import nodemailer from 'nodemailer';
import { ProofOfDelivery } from '../types/package';

interface PodEmailData {
  trackingNumber: string;
  customer: string;
  carrier: 'USPS' | 'FedEx';
  deliveryDate: Date;
  proofOfDelivery: ProofOfDelivery;
}

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send POD email
export const sendPodEmail = async (
  to: string,
  podData: PodEmailData
): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const subject = `${podData.customer} - FedEx POD - ${podData.trackingNumber}`;
    const htmlContent = generatePodEmailHtml(podData);

    // Prepare attachments array
    const attachments: any[] = [];
    const pod = podData.proofOfDelivery;

    // Attach SPOD PDF (by URL or base64)
    if (pod.spodPdfBase64) {
      attachments.push({
        filename: `SPOD_${podData.trackingNumber}.pdf`,
        content: pod.spodPdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      });
    } else if (pod.spodPdfUrl) {
      attachments.push({
        filename: `SPOD_${podData.trackingNumber}.pdf`,
        path: pod.spodPdfUrl,
        contentType: 'application/pdf'
      });
    }

    // Attach PPOD photo (by URL or base64)
    if (pod.deliveryPhoto && pod.deliveryPhoto.startsWith('http')) {
      attachments.push({
        filename: `PPOD_${podData.trackingNumber}.jpg`,
        path: pod.deliveryPhoto,
        contentType: 'image/jpeg'
      });
    } else if (pod.deliveryPhoto && !pod.deliveryPhoto.startsWith('http')) {
      attachments.push({
        filename: `PPOD_${podData.trackingNumber}.jpg`,
        content: pod.deliveryPhoto,
        encoding: 'base64',
        contentType: 'image/jpeg'
      });
    }

    const mailOptions: any = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending POD email:', error);
    return false;
  }
};

// Send POD emails to multiple recipients
export const sendPodEmailsToMultipleRecipients = async (
  emails: string[],
  podData: PodEmailData
): Promise<{ success: string[], failed: string[] }> => {
  const results: { success: string[], failed: string[] } = { success: [], failed: [] };

  for (const email of emails) {
    try {
      const success = await sendPodEmail(email, podData);
      if (success) {
        results.success.push(email);
      } else {
        results.failed.push(email);
      }
    } catch (error) {
      console.error(`Failed to send POD email to ${email}:`, error);
      results.failed.push(email);
    }
  }

  return results;
};

// Generate HTML content for POD email
const generatePodEmailHtml = (podData: PodEmailData): string => {
  const {
    trackingNumber,
    customer,
    carrier,
    deliveryDate,
    proofOfDelivery
  } = podData;

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
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
        .carrier-badge { display: inline-block; padding: 5px 10px; background-color: ${carrier === 'FedEx' ? '#0074D9' : '#0071BC'}; color: white; border-radius: 3px; font-weight: bold; }
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
              `<p><strong>Signature Required:</strong> No</p>`
            }

            ${proofOfDelivery.deliveryPhoto ? `<p><strong>Delivery Photo:</strong> <a href="${proofOfDelivery.deliveryPhoto}">View Photo</a></p>` : ''}
          </div>

          ${proofOfDelivery.proofOfDeliveryUrl ?
            `<p><strong>View Full Proof of Delivery:</strong> <a href="${proofOfDelivery.proofOfDeliveryUrl}" target="_blank">Click Here</a></p>`
            : ''
          }
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

// Test email configuration
export const testEmailConfiguration = async (testEmail: string): Promise<boolean> => {
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
  } catch (error) {
    console.error('Error testing email configuration:', error);
    return false;
  }
};
