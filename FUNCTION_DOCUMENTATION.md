# Energy Meter Test Application - Function Documentation

## Overview

This document provides detailed documentation for all functions, middleware, and utility components in the Energy Meter Test Application.

## Table of Contents

1. [Authentication Middleware](#authentication-middleware)
2. [User Model Methods](#user-model-methods)
3. [TestReport Model Methods](#testreport-model-methods)
4. [Utility Functions](#utility-functions)
5. [Database Seeding Functions](#database-seeding-functions)

---

## Authentication Middleware

### auth(req, res, next)

**File:** `middleware/auth.js`

**Description:** Middleware function that verifies JWT tokens and authenticates users.

**Parameters:**
- `req` (Object): Express request object
- `res` (Object): Express response object  
- `next` (Function): Express next middleware function

**Process:**
1. Extracts JWT token from `Authorization` header
2. Verifies token using JWT_SECRET
3. Fetches user from database using decoded token ID
4. Validates user exists and is active
5. Attaches user object to request

**Returns:**
- Calls `next()` on success
- Returns 401 error on failure

**Error Responses:**
```javascript
// No token provided
{ message: 'No token, authorization denied' }

// Invalid token
{ message: 'Token is not valid' }

// User not found or inactive
{ message: 'User account is deactivated' }
```

**Usage Example:**
```javascript
router.get('/protected-route', auth, (req, res) => {
  // req.user contains authenticated user data
  res.json({ user: req.user });
});
```

### authorize(...roles)

**File:** `middleware/auth.js`

**Description:** Higher-order function that creates role-based access control middleware.

**Parameters:**
- `...roles` (String[]): Array of allowed roles

**Returns:** Middleware function

**Process:**
1. Checks if user's role is in allowed roles array
2. Calls next() if authorized
3. Returns 403 error if unauthorized

**Error Response:**
```javascript
{ message: 'Access denied. Insufficient permissions.' }
```

**Usage Example:**
```javascript
// Admin only route
router.delete('/admin-only', auth, authorize('admin'), (req, res) => {
  // Only admins can access this route
});

// Technician or admin route
router.post('/create-report', auth, authorize('technician', 'admin'), (req, res) => {
  // Technicians and admins can access this route
});
```

---

## User Model Methods

### comparePassword(candidatePassword)

**File:** `models/User.js`

**Description:** Compares a candidate password with the user's hashed password.

**Parameters:**
- `candidatePassword` (String): Plain text password to compare

**Returns:** Promise<Boolean>

**Process:**
1. Uses bcrypt.compare() to compare passwords
2. Returns true if passwords match
3. Returns false if passwords don't match

**Usage Example:**
```javascript
const user = await User.findOne({ username: 'john_doe' });
const isValid = await user.comparePassword('password123');
if (isValid) {
  // Password is correct
}
```

### toJSON()

**File:** `models/User.js`

**Description:** Custom JSON serialization method that removes password from output.

**Returns:** Object (user object without password)

**Process:**
1. Converts Mongoose document to plain object
2. Removes password field
3. Returns sanitized user object

**Usage Example:**
```javascript
const user = await User.findById(userId);
const safeUser = user.toJSON(); // Password field is removed
res.json({ user: safeUser });
```

### Pre-save Hook

**File:** `models/User.js`

**Description:** Mongoose pre-save middleware that hashes passwords before saving.

**Process:**
1. Checks if password field has been modified
2. Generates salt using bcrypt
3. Hashes password with salt
4. Saves hashed password

**Usage Example:**
```javascript
const user = new User({
  username: 'john_doe',
  password: 'plaintext123' // Will be automatically hashed
});
await user.save(); // Password is hashed before saving
```

---

## TestReport Model Methods

### Pre-save Hook (Report Number Generation)

**File:** `models/TestReport.js`

**Description:** Automatically generates unique report numbers before saving new reports.

**Process:**
1. Checks if document is new
2. Gets current year and month
3. Finds last report for current month
4. Increments sequence number
5. Generates report number in format: `EMT-YYYYMM-NNNN`

**Report Number Format:**
- `EMT`: Energy Meter Test prefix
- `YYYY`: 4-digit year
- `MM`: 2-digit month
- `NNNN`: 4-digit sequence number (padded with zeros)

**Usage Example:**
```javascript
const report = new TestReport({
  branch: 'North Branch',
  transformerNumber: 'T001',
  // ... other fields
});
await report.save(); // reportNumber automatically generated as "EMT-202401-0001"
```

### Database Indexes

**File:** `models/TestReport.js`

**Description:** Compound indexes for efficient database queries.

**Indexes Created:**
1. `{ branch: 1, testDate: -1 }` - For branch-based queries with date sorting
2. `{ transformerNumber: 1 }` - For transformer number lookups
3. `{ 'meterDetails.meterNumber': 1 }` - For meter number searches

**Benefits:**
- Faster query performance
- Optimized sorting and filtering
- Reduced database load

---

## Utility Functions

### generateToken(userId)

**File:** `routes/auth.js`

**Description:** Generates JWT token for user authentication.

**Parameters:**
- `userId` (String): MongoDB ObjectId of the user

**Returns:** String (JWT token)

**Process:**
1. Creates payload with user ID
2. Signs token with JWT_SECRET
3. Sets expiration time (default: 7 days)
4. Returns signed token

**Configuration:**
- Secret: `process.env.JWT_SECRET` or fallback
- Expiration: `process.env.JWT_EXPIRE` or '7d'

**Usage Example:**
```javascript
const token = generateToken(user._id);
res.json({ token, user });
```

### ensureUploadDir()

**File:** `routes/reports.js`

**Description:** Ensures the uploads directory exists for storing PDF reports.

**Returns:** Promise<void>

**Process:**
1. Defines upload directory path
2. Checks if directory exists
3. Creates directory if it doesn't exist
4. Handles errors gracefully

**Usage Example:**
```javascript
await ensureUploadDir();
// Now safe to save files to uploads directory
```

---

## Database Seeding Functions

### seedAdmin()

**File:** `scripts/seedAdmin.js`

**Description:** Seeds the database with default admin and technician users.

**Process:**
1. Connects to MongoDB
2. Checks if admin user already exists
3. Creates admin user if not exists
4. Creates sample technician user
5. Logs success messages and exits

**Default Users Created:**

**Admin User:**
- Username: `admin`
- Email: `admin@energymeter.com`
- Password: `admin123`
- Role: `admin`
- Branch: `Head Office`

**Technician User:**
- Username: `technician1`
- Email: `tech1@energymeter.com`
- Password: `tech123`
- Role: `technician`
- Branch: `North Branch`

**Usage:**
```bash
node scripts/seedAdmin.js
```

**Output:**
```
MongoDB connected successfully
Admin user created successfully!
Username: admin
Password: admin123
Email: admin@energymeter.com
Role: admin
Branch: Head Office

Sample technician user created!
Username: technician1
Password: tech123
Email: tech1@energymeter.com
Role: technician
Branch: North Branch

Database seeded successfully!
```

---

## Server Configuration

### Express App Setup

**File:** `server.js`

**Description:** Main server configuration and middleware setup.

**Middleware Stack:**
1. CORS - Cross-origin resource sharing
2. JSON parsing - Parse JSON request bodies
3. URL encoding - Parse URL-encoded data
4. Static files - Serve uploaded reports
5. Routes - API endpoints
6. Error handling - Global error handler

**Environment Variables:**
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment mode

**Database Connection:**
```javascript
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
```

**Production Configuration:**
- Serves static React build files
- Handles client-side routing
- Fallback to index.html for SPA

---

## Error Handling Patterns

### Validation Error Handling

**Pattern:** Express-validator integration
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array()
  });
}
```

### Database Error Handling

**Pattern:** Try-catch with specific error codes
```javascript
try {
  const user = await User.create(userData);
} catch (error) {
  if (error.code === 11000) {
    return res.status(400).json({ 
      message: 'User already exists' 
    });
  }
  res.status(500).json({ message: 'Server error' });
}
```

### Authentication Error Handling

**Pattern:** Consistent error responses
```javascript
if (!user) {
  return res.status(401).json({ message: 'Invalid credentials' });
}

if (!user.isActive) {
  return res.status(401).json({ message: 'Account is deactivated' });
}
```

---

## Security Considerations

### Password Security
- Bcrypt hashing with salt rounds: 10
- Minimum password length: 6 characters
- Password not included in JSON responses

### JWT Security
- Secret key from environment variables
- Token expiration: 7 days (configurable)
- Bearer token authentication

### Input Validation
- Express-validator for request validation
- Mongoose schema validation
- SQL injection prevention through parameterized queries

### File Upload Security
- Controlled file types (PDF only)
- Secure file path handling
- Access control for file downloads

---

## Performance Optimizations

### Database Indexing
- Compound indexes for common queries
- Efficient sorting and filtering
- Reduced query execution time

### Pagination
- Configurable page size
- Skip/limit for large datasets
- Metadata for navigation

### File Streaming
- Stream large PDF files
- Memory-efficient file handling
- Proper content-type headers

---

*This function documentation provides detailed information about all internal functions, middleware, and utilities in the Energy Meter Test Application. Each function includes parameters, return values, usage examples, and implementation details.*