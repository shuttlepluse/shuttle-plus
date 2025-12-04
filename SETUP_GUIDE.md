# Shuttle Plus - Production Setup Guide

This guide explains how to configure the remaining services for full production functionality.

---

## 1. MongoDB Database Setup (CRITICAL)

The website needs MongoDB to store bookings, users, and other data.

### Option A: MongoDB Atlas (Recommended - Free Tier Available)

1. **Create Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Click "Build a Database"
   - Select "FREE" tier (M0 Sandbox)
   - Choose region closest to your users (e.g., Europe for Africa)
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `shuttleplus`
   - Password: (generate a strong password)
   - Role: "Read and write to any database"
   - Click "Add User"

4. **Allow Network Access**
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (adds 0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" > "Connect"
   - Select "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Add database name: `shuttleplus`

   Example:
   ```
   mongodb+srv://shuttleplus:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/shuttleplus?retryWrites=true&w=majority
   ```

6. **Add to Render**
   - Go to Render Dashboard > Your Service > Environment
   - Add Environment Variable:
     - Key: `MONGODB_URI`
     - Value: Your connection string from step 5

---

## 2. Stripe Payment Setup

For credit/debit card payments.

### Setup Steps

1. **Create Stripe Account**
   - Go to [Stripe](https://stripe.com)
   - Sign up and verify your business

2. **Get API Keys**
   - Go to Developers > API Keys
   - Copy "Publishable key" (starts with `pk_`)
   - Copy "Secret key" (starts with `sk_`)

3. **Add to Render**
   - Add Environment Variables:
     - `STRIPE_PUBLISHABLE_KEY` = pk_live_xxx...
     - `STRIPE_SECRET_KEY` = sk_live_xxx...

4. **For Testing** (use test keys first)
   - `STRIPE_PUBLISHABLE_KEY` = pk_test_xxx...
   - `STRIPE_SECRET_KEY` = sk_test_xxx...

---

## 3. Telebirr Payment Setup

For Ethiopian mobile money payments.

### Setup Steps

1. **Contact Telebirr**
   - Apply for merchant account at Ethio Telecom
   - Get API credentials after approval

2. **Get Credentials**
   - App ID
   - App Key
   - Short Code
   - Public Key

3. **Add to Render**
   - Add Environment Variables:
     - `TELEBIRR_APP_ID` = your_app_id
     - `TELEBIRR_APP_KEY` = your_app_key
     - `TELEBIRR_SHORT_CODE` = your_short_code
     - `TELEBIRR_PUBLIC_KEY` = your_public_key

---

## 4. Email Service Setup (Optional)

For sending booking confirmations and notifications.

### Using SendGrid

1. Create account at [SendGrid](https://sendgrid.com)
2. Create API Key
3. Add to Render:
   - `SENDGRID_API_KEY` = your_api_key
   - `EMAIL_FROM` = noreply@shuttleplus.et

### Using SMTP

Add to Render:
- `SMTP_HOST` = smtp.gmail.com (or your provider)
- `SMTP_PORT` = 587
- `SMTP_USER` = your_email
- `SMTP_PASS` = your_password

---

## 5. All Environment Variables Summary

Add these to Render Dashboard > Environment:

```
# Database (REQUIRED)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/shuttleplus

# Server
NODE_ENV=production
PORT=3000

# Stripe (for card payments)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx

# Telebirr (for mobile money)
TELEBIRR_APP_ID=xxx
TELEBIRR_APP_KEY=xxx
TELEBIRR_SHORT_CODE=xxx

# Email (optional)
SENDGRID_API_KEY=xxx
EMAIL_FROM=noreply@shuttleplus.et

# Admin
ADMIN_TOKEN=shuttle-admin-2025

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this
```

---

## 6. After Setup

1. **Deploy**
   - Render will automatically redeploy when env vars change

2. **Test**
   - Make a test booking on the website
   - Check admin dashboard at /pages/admin.html
   - Verify booking appears in admin

3. **Verify Payments**
   - Use Stripe test cards first
   - Test Telebirr with sandbox if available

---

## Support

If you need help:
- MongoDB Atlas: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- Stripe: [stripe.com/docs](https://stripe.com/docs)
- Render: [render.com/docs](https://render.com/docs)
