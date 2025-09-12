# Energy Meter Test Application - API Documentation

## Overview

The Energy Meter Test Application is a MERN stack application designed for managing energy meter accuracy tests. It provides comprehensive APIs for user authentication, test data management, and report generation with PDF export capabilities.

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Test Data Management APIs](#test-data-management-apis)
3. [Report Generation APIs](#report-generation-apis)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Usage Examples](#usage-examples)
7. [Setup and Installation](#setup-and-installation)

---

## Authentication APIs

### Base URL
```
/api/auth
```

### POST /api/auth/register
Register a new user account.

**Access:** Public (in production, should be admin-only)

**Request Body:**
```json
{
  "username": "string (3-30 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)",
  "branch": "string (required)",
  "role": "string (optional, defaults to 'technician')"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com",
    "role": "technician",
    "branch": "Branch Name"
  }
}
```

**Validation Errors (400):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "username",
      "message": "Username must be between 3 and 30 characters"
    }
  ]
}
```

### POST /api/auth/login
Authenticate user and return JWT token.

**Access:** Public

**Request Body:**
```json
{
  "username": "string (username or email)",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com",
    "role": "technician",
    "branch": "Branch Name"
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `401`: Account is deactivated

### GET /api/auth/profile
Get current user profile information.

**Access:** Private (requires JWT token)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com",
    "role": "technician",
    "branch": "Branch Name",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/auth/profile
Update user profile information.

**Access:** Private (requires JWT token)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "email": "string (valid email, optional)",
  "branch": "string (optional)"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "updated@example.com",
    "role": "technician",
    "branch": "Updated Branch"
  }
}
```

---

## Test Data Management APIs

### Base URL
```
/api/test-data
```

### POST /api/test-data
Create a new test report.

**Access:** Private (technician or admin)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "branch": "string (required)",
  "transformerNumber": "string (required)",
  "meterDetails": {
    "meterNumber": "string (required)",
    "meterType": "Single Phase | Three Phase | CT Operated | Direct Connected",
    "meterClass": "0.5 | 1.0 | 1.5 | 2.0",
    "manufacturer": "string (required)",
    "yearOfManufacture": "number (1990-current year)"
  },
  "testData": {
    "testDate": "ISO date string (optional, defaults to now)",
    "testConditions": {
      "temperature": "number (-10 to 60)",
      "humidity": "number (0 to 100)",
      "frequency": "number (optional, defaults to 50)"
    },
    "loadTests": [
      {
        "loadPercentage": "number (0-200)",
        "powerFactor": "number (0-1)",
        "standardEnergy": "number (>=0)",
        "meterEnergy": "number (>=0)",
        "error": "number",
        "withinLimits": "boolean"
      }
    ]
  },
  "remarks": "string (optional, max 500 chars)"
}
```

**Response (201):**
```json
{
  "message": "Test report created successfully",
  "report": {
    "id": "report_id",
    "reportNumber": "EMT-202401-0001",
    "branch": "North Branch",
    "transformerNumber": "T001",
    "meterDetails": { /* meter details */ },
    "testData": { /* test data */ },
    "createdBy": {
      "id": "user_id",
      "username": "technician1",
      "email": "tech1@example.com",
      "branch": "North Branch"
    },
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/test-data
Get all test reports with filtering and pagination.

**Access:** Private

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `branch` (string): Filter by branch
- `transformerNumber` (string): Filter by transformer number
- `meterNumber` (string): Filter by meter number
- `startDate` (string): Filter by start date (ISO format)
- `endDate` (string): Filter by end date (ISO format)
- `status` (string): Filter by status
- `search` (string): General search across multiple fields

**Response (200):**
```json
{
  "message": "Test reports fetched successfully",
  "reports": [
    {
      "id": "report_id",
      "reportNumber": "EMT-202401-0001",
      "branch": "North Branch",
      "transformerNumber": "T001",
      "meterDetails": { /* meter details */ },
      "testData": { /* test data */ },
      "createdBy": { /* user info */ },
      "status": "completed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalReports": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### GET /api/test-data/:id
Get a specific test report by ID.

**Access:** Private (creator or admin)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Test report fetched successfully",
  "report": {
    "id": "report_id",
    "reportNumber": "EMT-202401-0001",
    "branch": "North Branch",
    "transformerNumber": "T001",
    "meterDetails": { /* meter details */ },
    "testData": { /* test data */ },
    "createdBy": { /* user info */ },
    "status": "completed",
    "remarks": "Test completed successfully",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /api/test-data/:id
Update a test report.

**Access:** Private (creator or admin)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:** Same as POST /api/test-data

**Response (200):**
```json
{
  "message": "Test report updated successfully",
  "report": { /* updated report object */ }
}
```

### DELETE /api/test-data/:id
Delete a test report.

**Access:** Private (creator or admin)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Test report deleted successfully"
}
```

---

## Report Generation APIs

### Base URL
```
/api/reports
```

### POST /api/reports/generate/:id
Generate PDF report for a test.

**Access:** Private (creator or admin)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "PDF report generated successfully",
  "fileName": "EMT-202401-0001.pdf",
  "downloadUrl": "/uploads/EMT-202401-0001.pdf"
}
```

### GET /api/reports/download/:filename
Download a generated report file.

**Access:** Private (creator or admin)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:** PDF file download

### GET /api/reports/list
Get list of all generated reports.

**Access:** Private

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `branch` (string): Filter by branch
- `transformerNumber` (string): Filter by transformer number
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date
- `search` (string): General search

**Response (200):**
```json
{
  "message": "Reports list fetched successfully",
  "reports": [
    {
      "id": "report_id",
      "reportNumber": "EMT-202401-0001",
      "branch": "North Branch",
      "transformerNumber": "T001",
      "meterNumber": "M001",
      "testDate": "2024-01-01T00:00:00.000Z",
      "overallResult": "PASS",
      "createdBy": { /* user info */ },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "downloadUrl": "/api/reports/download/EMT-202401-0001.pdf"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalReports": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### DELETE /api/reports/:id
Delete a report and its file.

**Access:** Private (admin only)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "message": "Report file deleted successfully"
}
```

---

## Data Models

### User Model
```javascript
{
  username: String (3-30 chars, unique, required),
  password: String (min 6 chars, required),
  email: String (valid email, unique, required),
  role: String (enum: ['admin', 'technician', 'viewer'], default: 'technician'),
  branch: String (required),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### TestReport Model
```javascript
{
  reportNumber: String (auto-generated, unique),
  branch: String (required),
  transformerNumber: String (required),
  meterDetails: {
    meterNumber: String (required),
    meterType: String (enum: ['Single Phase', 'Three Phase', 'CT Operated', 'Direct Connected']),
    meterClass: String (enum: ['0.5', '1.0', '1.5', '2.0']),
    manufacturer: String (required),
    yearOfManufacture: Number (1990-current year)
  },
  testData: {
    testDate: Date (default: now),
    testConditions: {
      temperature: Number (-10 to 60),
      humidity: Number (0 to 100),
      frequency: Number (default: 50)
    },
    loadTests: [{
      loadPercentage: Number (0-200),
      powerFactor: Number (0-1),
      standardEnergy: Number (>=0),
      meterEnergy: Number (>=0),
      error: Number,
      withinLimits: Boolean
    }],
    overallResult: String (enum: ['PASS', 'FAIL'])
  },
  createdBy: ObjectId (ref: 'User'),
  reportFilePath: String (optional),
  status: String (enum: ['draft', 'completed', 'approved'], default: 'completed'),
  remarks: String (max 500 chars),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Error Response Format
```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Specific error message"
    }
  ]
}
```

### Common Error Messages
- `"No token, authorization denied"`: Missing JWT token
- `"Token is not valid"`: Invalid or expired JWT token
- `"Access denied"`: Insufficient permissions
- `"User already exists with this email or username"`: Duplicate user registration
- `"Invalid credentials"`: Wrong username/password
- `"Account is deactivated"`: User account is disabled
- `"Test report not found"`: Report ID doesn't exist
- `"Cannot edit approved reports"`: Attempting to edit approved report

---

## Usage Examples

### 1. User Registration and Login
```javascript
// Register a new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    branch: 'North Branch',
    role: 'technician'
  })
});

const { token, user } = await registerResponse.json();

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'password123'
  })
});

const { token: loginToken } = await loginResponse.json();
```

### 2. Creating a Test Report
```javascript
const testReport = await fetch('/api/test-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    branch: 'North Branch',
    transformerNumber: 'T001',
    meterDetails: {
      meterNumber: 'M001',
      meterType: 'Three Phase',
      meterClass: '1.0',
      manufacturer: 'ABC Meters',
      yearOfManufacture: 2023
    },
    testData: {
      testConditions: {
        temperature: 25,
        humidity: 60,
        frequency: 50
      },
      loadTests: [
        {
          loadPercentage: 100,
          powerFactor: 0.8,
          standardEnergy: 100.000,
          meterEnergy: 99.950,
          error: -0.05,
          withinLimits: true
        }
      ]
    },
    remarks: 'Test completed successfully'
  })
});
```

### 3. Generating and Downloading Reports
```javascript
// Generate PDF report
const generateResponse = await fetch(`/api/reports/generate/${reportId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { downloadUrl } = await generateResponse.json();

// Download the report
window.open(downloadUrl, '_blank');
```

### 4. Fetching Reports with Filters
```javascript
// Get reports with pagination and filters
const reportsResponse = await fetch('/api/test-data?page=1&limit=10&branch=North%20Branch&search=T001', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { reports, pagination } = await reportsResponse.json();
```

---

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/energy-meter-test
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
NODE_ENV=development
```

### Installation Steps
1. Install dependencies:
   ```bash
   npm install
   ```

2. Install client dependencies:
   ```bash
   npm run client-install
   ```

3. Seed the database with admin user:
   ```bash
   node scripts/seedAdmin.js
   ```

4. Start the development server:
   ```bash
   npm run dev-full
   ```

### Available Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm run client`: Start React client
- `npm run client-install`: Install client dependencies
- `npm run build`: Build client for production
- `npm run dev-full`: Run both server and client concurrently
- `npm run install-all`: Install all dependencies

### Default Admin Credentials
After running the seed script:
- Username: `admin`
- Password: `admin123`
- Email: `admin@energymeter.com`
- Role: `admin`

### Sample Technician Credentials
- Username: `technician1`
- Password: `tech123`
- Email: `tech1@energymeter.com`
- Role: `technician`

---

## Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Password Hashing**: Bcrypt encryption for passwords
3. **Role-based Access Control**: Different permissions for admin, technician, and viewer roles
4. **Input Validation**: Comprehensive validation using express-validator
5. **CORS Protection**: Cross-origin resource sharing configuration
6. **File Upload Security**: Secure file handling for PDF reports

## Rate Limiting and Performance

- Pagination support for large datasets
- Database indexing for efficient queries
- File streaming for large PDF downloads
- Error handling and logging
- Input sanitization and validation

---

*This documentation covers all public APIs, functions, and components of the Energy Meter Test Application. For additional support or questions, please refer to the source code or contact the development team.*