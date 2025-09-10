# FedEx SPOD (Signature Proof of Delivery) Feature

This feature automatically sends Proof of Delivery emails when FedEx packages are marked as delivered.

## Setup

### 1. Configure Email Settings

Update your `server/.env` file with SMTP settings:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

### 2. Configure POD Email Recipients

Use the user settings API to configure email addresses for POD notifications:

```javascript
// PUT /api/users/pod-email-config
{
  "email1": "recipient1@example.com",
  "email2": "recipient2@example.com",
  "enabled": true
}
```

## How It Works

### Automatic Email Triggers

- When a package status changes to "Delivered" (via refresh or simulate-delivery)
- SPOD email is sent automatically to configured recipients
- Email includes client's name in subject: `{Client Name} - FedEx POD - {Tracking Number}`

### Email Content

The email includes:
- Package tracking number
- Client/customer name
- Carrier (FedEx)
- Delivery date
- Proof of delivery details (signature, delivery location, etc.)
- Link to carrier's tracking page

## Testing

### Test Email Configuration

Run the test script:

```bash
cd server
npx ts-node src/testSPODEmail.ts
```

### Manual SPOD Email Trigger

For testing purposes, you can manually trigger SPOD emails:

```javascript
// POST /api/packages/{packageId}/send-spod-email
// This resets the email sent flag and sends the email again
```

## API Endpoints

### Configure POD Emails
- `PUT /api/users/pod-email-config` - Set email addresses and enable/disable

### Manual Testing
- `POST /api/packages/{id}/send-spod-email` - Manually trigger SPOD email

## Database Changes

Added `spodEmailSent` field to Package model to prevent duplicate emails.

## Environment Variables

Required for email functionality:
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - From email address

## Troubleshooting

1. **Emails not sending**: Check SMTP configuration and credentials
2. **Duplicate emails**: Check `spodEmailSent` flag in database
3. **Email format issues**: Verify email template in `emailService.ts`
