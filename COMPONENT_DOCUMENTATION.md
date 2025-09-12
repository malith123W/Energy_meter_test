# Energy Meter Test Application - Component Documentation

## Overview

This document provides detailed documentation for all components, modules, and architectural elements of the Energy Meter Test Application.

## Table of Contents

1. [Server Component](#server-component)
2. [Route Components](#route-components)
3. [Model Components](#model-components)
4. [Middleware Components](#middleware-components)
5. [Utility Scripts](#utility-scripts)
6. [Architecture Overview](#architecture-overview)

---

## Server Component

### server.js

**File:** `server.js`

**Description:** Main server entry point and Express application configuration.

**Dependencies:**
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `cors`: Cross-origin resource sharing
- `path`: File path utilities
- `dotenv`: Environment variable management

**Configuration:**
```javascript
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://...';
```

**Middleware Stack:**
1. **CORS**: Enables cross-origin requests
2. **JSON Parsing**: Parses JSON request bodies
3. **URL Encoding**: Parses URL-encoded data
4. **Static Files**: Serves uploaded PDF reports
5. **API Routes**: Mounts route handlers
6. **Production Static**: Serves React build files
7. **Error Handling**: Global error handler

**Route Mounting:**
```javascript
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/test-data', require('./routes/testData'));
```

**Database Connection:**
- MongoDB connection with retry logic
- Connection options for modern MongoDB
- Error handling and logging

**Production Configuration:**
- Serves static React build files
- Handles client-side routing
- Fallback to index.html for SPA

**Error Handling:**
- Global error middleware
- Console logging for debugging
- Consistent error response format

---

## Route Components

### Authentication Routes (`routes/auth.js`)

**Description:** Handles user authentication, registration, and profile management.

**Dependencies:**
- `express`: Router creation
- `jsonwebtoken`: JWT token generation
- `express-validator`: Input validation
- `User` model: Database operations
- `auth` middleware: Authentication

**Routes:**

#### POST /register
- **Purpose**: Register new user accounts
- **Access**: Public (should be admin-only in production)
- **Validation**: Username, email, password, branch validation
- **Process**: Check duplicates, create user, generate token
- **Response**: User data and JWT token

#### POST /login
- **Purpose**: Authenticate users
- **Access**: Public
- **Validation**: Username/password validation
- **Process**: Find user, verify password, check active status
- **Response**: User data and JWT token

#### GET /profile
- **Purpose**: Get current user profile
- **Access**: Private (requires authentication)
- **Process**: Return authenticated user data
- **Response**: User profile information

#### PUT /profile
- **Purpose**: Update user profile
- **Access**: Private (requires authentication)
- **Validation**: Email and branch validation
- **Process**: Update user fields, handle duplicates
- **Response**: Updated user data

**Key Functions:**
- `generateToken(userId)`: Creates JWT tokens
- Input validation using express-validator
- Error handling for duplicate users
- Password comparison and verification

### Test Data Routes (`routes/testData.js`)

**Description:** Manages test report creation, retrieval, updating, and deletion.

**Dependencies:**
- `express`: Router creation
- `express-validator`: Input validation
- `TestReport` model: Database operations
- `auth` middleware: Authentication
- `authorize` middleware: Role-based access control

**Routes:**

#### POST /
- **Purpose**: Create new test report
- **Access**: Private (technician or admin)
- **Validation**: Comprehensive test data validation
- **Process**: Validate input, calculate overall result, save report
- **Response**: Created report with populated user data

#### GET /
- **Purpose**: Get all test reports with filtering
- **Access**: Private
- **Features**: Pagination, filtering, search, role-based access
- **Query Parameters**: page, limit, branch, transformerNumber, etc.
- **Response**: Paginated reports with metadata

#### GET /:id
- **Purpose**: Get specific test report
- **Access**: Private (creator or admin)
- **Process**: Find report, check permissions
- **Response**: Single report with populated data

#### PUT /:id
- **Purpose**: Update test report
- **Access**: Private (creator or admin)
- **Process**: Check permissions, prevent editing approved reports
- **Response**: Updated report data

#### DELETE /:id
- **Purpose**: Delete test report
- **Access**: Private (creator or admin)
- **Process**: Check permissions, remove from database
- **Response**: Success message

**Key Features:**
- Role-based filtering (technicians see only their reports)
- Comprehensive search across multiple fields
- Date range filtering
- Pagination with metadata
- Input validation for all test data fields

### Report Generation Routes (`routes/reports.js`)

**Description:** Handles PDF report generation, file management, and downloads.

**Dependencies:**
- `express`: Router creation
- `path`: File path utilities
- `fs`: File system operations
- `PDFDocument`: PDF generation
- `TestReport` model: Database operations
- `auth` middleware: Authentication
- `authorize` middleware: Role-based access control

**Routes:**

#### POST /generate/:id
- **Purpose**: Generate PDF report for test
- **Access**: Private (creator or admin)
- **Process**: Create PDF with test data, save file, update database
- **Features**: Professional PDF formatting, tables, styling
- **Response**: File name and download URL

#### GET /download/:filename
- **Purpose**: Download generated PDF report
- **Access**: Private (creator or admin)
- **Process**: Verify file exists, check permissions, stream file
- **Response**: PDF file download

#### GET /list
- **Purpose**: List all generated reports
- **Access**: Private
- **Features**: Pagination, filtering, search
- **Response**: List of reports with download URLs

#### DELETE /:id
- **Purpose**: Delete report and file
- **Access**: Private (admin only)
- **Process**: Remove file from filesystem, clear database reference
- **Response**: Success message

**Key Functions:**
- `ensureUploadDir()`: Creates upload directory
- PDF generation with professional formatting
- File streaming for downloads
- Permission checking for file access

---

## Model Components

### User Model (`models/User.js`)

**Description:** Mongoose schema for user management and authentication.

**Schema Fields:**
```javascript
{
  username: String (3-30 chars, unique, required),
  password: String (min 6 chars, required),
  email: String (valid email, unique, required),
  role: String (enum: ['admin', 'technician', 'viewer']),
  branch: String (required),
  isActive: Boolean (default: true),
  timestamps: true
}
```

**Pre-save Middleware:**
- Password hashing using bcrypt
- Salt generation (10 rounds)
- Only hashes when password is modified

**Instance Methods:**
- `comparePassword(candidatePassword)`: Compares plain text with hashed password
- `toJSON()`: Removes password from JSON output

**Validation:**
- Username: 3-30 characters, unique
- Email: Valid email format, unique, lowercase
- Password: Minimum 6 characters
- Role: Enum validation
- Branch: Required field

### TestReport Model (`models/TestReport.js`)

**Description:** Mongoose schema for energy meter test reports.

**Schema Structure:**
```javascript
{
  reportNumber: String (auto-generated, unique),
  branch: String (required),
  transformerNumber: String (required),
  meterDetails: {
    meterNumber: String (required),
    meterType: Enum ['Single Phase', 'Three Phase', 'CT Operated', 'Direct Connected'],
    meterClass: Enum ['0.5', '1.0', '1.5', '2.0'],
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
    overallResult: Enum ['PASS', 'FAIL']
  },
  createdBy: ObjectId (ref: 'User'),
  reportFilePath: String (optional),
  status: Enum ['draft', 'completed', 'approved'],
  remarks: String (max 500 chars),
  timestamps: true
}
```

**Pre-save Middleware:**
- Auto-generates report numbers
- Format: `EMT-YYYYMM-NNNN`
- Sequential numbering per month
- Handles year/month transitions

**Database Indexes:**
- `{ branch: 1, testDate: -1 }`: Branch queries with date sorting
- `{ transformerNumber: 1 }`: Transformer lookups
- `{ 'meterDetails.meterNumber': 1 }`: Meter number searches

**Validation:**
- Comprehensive field validation
- Range checks for numeric values
- Enum validation for categorical fields
- Required field validation
- Custom error messages

---

## Middleware Components

### Authentication Middleware (`middleware/auth.js`)

**Description:** JWT-based authentication middleware.

**Functions:**

#### auth(req, res, next)
- **Purpose**: Verify JWT tokens and authenticate users
- **Process**: Extract token, verify signature, fetch user, check active status
- **Error Handling**: Consistent 401 responses for various failure cases
- **Success**: Attaches user object to request

#### authorize(...roles)
- **Purpose**: Role-based access control
- **Parameters**: Array of allowed roles
- **Process**: Checks user role against allowed roles
- **Error Handling**: 403 response for unauthorized access
- **Returns**: Middleware function

**Security Features:**
- Token extraction from Authorization header
- JWT signature verification
- User existence and active status checks
- Role-based permission system

---

## Utility Scripts

### Database Seeding Script (`scripts/seedAdmin.js`)

**Description:** Seeds the database with default admin and technician users.

**Dependencies:**
- `mongoose`: Database connection
- `User` model: User creation
- `dotenv`: Environment variables

**Process:**
1. Connect to MongoDB
2. Check for existing admin user
3. Create admin user if not exists
4. Create sample technician user
5. Log success messages and exit

**Default Users:**
- **Admin**: admin/admin123, admin@energymeter.com
- **Technician**: technician1/tech123, tech1@energymeter.com

**Usage:**
```bash
node scripts/seedAdmin.js
```

**Error Handling:**
- Connection error handling
- Graceful exit on completion
- Console logging for debugging

---

## Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Express API   │    │   MongoDB       │
│   (React)       │◄──►│   Server        │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   File System   │
                       │   (PDF Reports) │
                       └─────────────────┘
```

### Component Relationships

```
server.js
├── routes/auth.js
│   ├── models/User.js
│   └── middleware/auth.js
├── routes/testData.js
│   ├── models/TestReport.js
│   ├── models/User.js
│   └── middleware/auth.js
├── routes/reports.js
│   ├── models/TestReport.js
│   ├── models/User.js
│   └── middleware/auth.js
└── scripts/seedAdmin.js
    └── models/User.js
```

### Data Flow

1. **Authentication Flow:**
   - Client sends credentials → Auth routes → User model → JWT token → Client

2. **Test Data Flow:**
   - Client sends test data → TestData routes → Validation → TestReport model → Database

3. **Report Generation Flow:**
   - Client requests PDF → Report routes → TestReport model → PDF generation → File system → Download URL

4. **File Management Flow:**
   - PDF generation → File system storage → Database file path update → Download endpoint

### Security Architecture

1. **Authentication Layer:**
   - JWT token-based authentication
   - Password hashing with bcrypt
   - Token expiration handling

2. **Authorization Layer:**
   - Role-based access control
   - Resource ownership validation
   - Permission-based route protection

3. **Input Validation Layer:**
   - Express-validator integration
   - Mongoose schema validation
   - Type and range checking

4. **File Security Layer:**
   - Controlled file types (PDF only)
   - Access control for downloads
   - Secure file path handling

### Error Handling Strategy

1. **Validation Errors:**
   - Field-specific error messages
   - Consistent error response format
   - Client-friendly error descriptions

2. **Authentication Errors:**
   - Consistent 401 responses
   - Clear error messages
   - Token validation feedback

3. **Authorization Errors:**
   - 403 responses for access denied
   - Role-based error messages
   - Resource ownership validation

4. **Database Errors:**
   - Duplicate key handling
   - Connection error management
   - Transaction rollback support

5. **File System Errors:**
   - File not found handling
   - Permission error management
   - Disk space error handling

### Performance Optimizations

1. **Database Optimizations:**
   - Compound indexes for common queries
   - Efficient pagination
   - Query optimization

2. **File Handling Optimizations:**
   - File streaming for large downloads
   - Memory-efficient PDF generation
   - Async file operations

3. **API Optimizations:**
   - Pagination for large datasets
   - Selective field population
   - Efficient filtering and searching

---

*This component documentation provides a comprehensive overview of all components, their relationships, and architectural patterns used in the Energy Meter Test Application.*