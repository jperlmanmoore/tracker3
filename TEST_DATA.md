# Test Data & Credentials

## 🔑 Test Login Credentials

### Primary Test Account
- **Email:** `test2@mailtracker.com`
- **Password:** `password123`
- **Username:** `testuser2`
- **Name:** Test User2

### Alternative Test Account (if needed)
- **Email:** `test@mailtracker.com`
- **Password:** `password123`
- **Username:** `testuser`
- **Name:** Test User
- **Note:** If this account has login issues, use the primary account above

## 📦 Sample Package Data

### Pre-loaded Test Packages

The following sample packages are automatically created for the test account:

#### 1. USPS Package - Delivered
- **Tracking Number:** `9405511206213334271430`
- **Carrier:** USPS
- **Customer:** John Smith
- **Package Type:** LOR
- **Status:** Delivered
- **Date Sent:** August 15, 2025
- **Delivery Date:** August 18, 2025
- **Notes:** Important legal documents
- **Tracking URL:** https://tools.usps.com/go/TrackConfirmAction?tLabels=9405511206213334271430

#### 2. FedEx Package - In Transit
- **Tracking Number:** `1234567890123456`
- **Carrier:** FedEx
- **Customer:** ABC Corporation
- **Package Type:** demand
- **Status:** In Transit
- **Date Sent:** September 1, 2025
- **Notes:** Urgent business documents
- **Tracking URL:** https://www.fedex.com/fedextrack/?tracknumber=1234567890123456

#### 3. USPS Package - Out for Delivery
- **Tracking Number:** `9405511206213334271437`
- **Carrier:** USPS
- **Customer:** Mary Johnson
- **Package Type:** spol
- **Status:** Out for Delivery
- **Date Sent:** September 3, 2025
- **Notes:** Special handling required
- **Tracking URL:** https://tools.usps.com/go/TrackConfirmAction?tLabels=9405511206213334271437

#### 4. FedEx Package - Exception
- **Tracking Number:** `7777888899991111`
- **Carrier:** FedEx
- **Customer:** Tech Solutions Inc
- **Package Type:** AL
- **Status:** Exception
- **Date Sent:** August 28, 2025
- **Notes:** Address verification needed
- **Tracking URL:** https://www.fedex.com/fedextrack/?tracknumber=7777888899991111

#### 5. USPS International - Delivered
- **Tracking Number:** `EA123456789US`
- **Carrier:** USPS
- **Customer:** Global Imports LLC
- **Package Type:** other
- **Status:** Delivered
- **Date Sent:** August 20, 2025
- **Delivery Date:** August 25, 2025
- **Notes:** International shipping
- **Tracking URL:** https://tools.usps.com/go/TrackConfirmAction?tLabels=EA123456789US

## 🧪 Test Tracking Numbers for Manual Testing

### Valid USPS Tracking Numbers
```
9405511206213334271430
9405511206213334271437
EA123456789US
CP123456789US
LZ123456789US
```

### Valid FedEx Tracking Numbers
```
1234567890123456
7777888899991111
123456789012
987654321098
555444333222111
```

## 🛠️ Development Commands

### Seed Test Data
```bash
# Create test user account
npm run seed

# Create sample packages
npm run seed-packages
```

### Reset Test Data (if needed)
```bash
# Connect to MongoDB and clear test data
mongosh mailtracker
db.users.deleteOne({email: "test@mailtracker.com"})
db.packages.deleteMany({userId: "test_user_id"})
```

## 🌐 Application URLs

### Frontend (React)
- **URL:** http://localhost:3000
- **Login Page:** http://localhost:3000/auth
- **Dashboard:** http://localhost:3000/dashboard

### Backend (Express API)
- **Base URL:** http://localhost:5001
- **API Endpoints:** http://localhost:5001/api
- **Health Check:** http://localhost:5001/health

### API Endpoints for Testing
```
POST /api/auth/login
POST /api/auth/register
GET  /api/packages
POST /api/packages
DELETE /api/packages/:id
GET  /api/users/profile
```

## 📋 Testing Scenarios

### 1. Login Flow
1. Navigate to http://localhost:3000
2. Use test credentials above
3. Should redirect to dashboard with 5 sample packages

### 2. Package Management
- View packages sorted by date (default)
- Filter by client name (e.g., "John Smith")
- Filter by carrier (USPS/FedEx)
- Click tracking numbers to open carrier websites
- Sort by different columns (client, carrier, status)

### 3. Add New Packages
- Click "Add Package" button
- Enter multiple tracking numbers:
  ```
  9405511206213334271444
  1234567890123457
  ```
- Customer: "Test Client"
- Package Type: "LOR"
- Verify automatic carrier detection

### 4. Bulk Tracking URLs
Test the bulk tracking URL generation feature with multiple packages from the same carrier.

## 🔧 Database Connection

### MongoDB
- **URI:** `mongodb://localhost:27017/mailtracker`
- **Database:** `mailtracker`
- **Collections:** `users`, `packages`

## 📝 Notes

- All test data is created with realistic tracking history
- Package dates span from August to September 2025
- Different package types and statuses are represented
- Both domestic and international tracking numbers included
- Carrier detection works with the provided sample tracking numbers
- **Fixed:** Axios base URL configuration to prevent double `/api` in request paths
