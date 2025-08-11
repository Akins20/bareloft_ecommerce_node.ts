# Nodemailer Email Configuration

## Environment Variables

The system uses **nodemailer** with Gmail service. Add these to your `.env` file:

```env
# Email Configuration (Nodemailer)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
REPLY_TO_EMAIL=your-email@gmail.com
```

## Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use the generated password (e.g., `abcdefghijklmnop`)

## Current Configuration

The system automatically:
- ✅ Uses Gmail service through nodemailer
- ✅ Handles TLS unauthorized issues with `rejectUnauthorized: false`
- ✅ Falls back to development mode if credentials missing
- ✅ Logs emails to console in development mode

## Development vs Production

**Development (no credentials):**
- OTP generation works
- Emails logged to console
- API returns success responses

**Production (with credentials):**
- Actual emails sent via Gmail
- TLS issues handled automatically
- Full email functionality

## No Configuration Needed

The system is already configured to use nodemailer properly:
- No SendGrid references
- No manual host/port configuration
- Just email user and password required