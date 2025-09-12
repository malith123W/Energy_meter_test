# Energy Meter Test Application

A comprehensive MERN stack application for managing energy meter accuracy tests with PDF report generation capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Component Documentation](#component-documentation)
- [Function Documentation](#function-documentation)
- [Architecture](#architecture)
- [Security](#security)
- [Contributing](#contributing)

## 🚀 Overview

The Energy Meter Test Application is designed to streamline the process of conducting and documenting energy meter accuracy tests. It provides a complete solution for technicians and administrators to create, manage, and generate professional PDF reports for energy meter testing procedures.

### Key Capabilities

- **User Management**: Role-based authentication with admin, technician, and viewer roles
- **Test Data Management**: Comprehensive test report creation and management
- **PDF Report Generation**: Professional PDF reports with detailed test results
- **Data Filtering & Search**: Advanced filtering and search capabilities
- **File Management**: Secure file upload and download system
- **Audit Trail**: Complete tracking of test reports and user activities

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Technician, Viewer)
- Secure password hashing
- User profile management

### 📊 Test Data Management
- Create comprehensive test reports
- Multiple meter types support (Single Phase, Three Phase, CT Operated, Direct Connected)
- Load test data with error calculations
- Test condition tracking (temperature, humidity, frequency)
- Automatic overall result calculation

### 📄 PDF Report Generation
- Professional PDF report generation
- Detailed test data tables
- Meter information and specifications
- Test conditions documentation
- Download and file management

### 🔍 Advanced Search & Filtering
- Filter by branch, transformer number, meter number
- Date range filtering
- General search across multiple fields
- Pagination support
- Role-based data access

### 📁 File Management
- Secure PDF file storage
- Access-controlled downloads
- File cleanup and management
- Organized file structure

## 🛠 Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation
- **PDFKit**: PDF generation
- **Multer**: File upload handling

### Development Tools
- **Nodemon**: Development server
- **Concurrently**: Run multiple processes
- **dotenv**: Environment variables

### Database
- **MongoDB**: NoSQL database
- **Mongoose**: Object modeling
- **Indexing**: Performance optimization

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd energy-meter-test-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/energy-meter-test
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

4. **Seed the database**
   ```bash
   node scripts/seedAdmin.js
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Default Credentials

After running the seed script, you can use these default credentials:

**Admin User:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@energymeter.com`

**Technician User:**
- Username: `technician1`
- Password: `tech123`
- Email: `tech1@energymeter.com`

## 📚 Documentation

### API Documentation
Comprehensive API documentation is available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)

**Key API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/auth/profile` - Get user profile
- `POST /api/test-data` - Create test report
- `GET /api/test-data` - Get test reports
- `POST /api/reports/generate/:id` - Generate PDF report
- `GET /api/reports/download/:filename` - Download PDF report

### Component Documentation
Detailed component documentation is available in [`COMPONENT_DOCUMENTATION.md`](./COMPONENT_DOCUMENTATION.md)

**Main Components:**
- Server configuration and middleware
- Route handlers for authentication, test data, and reports
- Mongoose models for User and TestReport
- Authentication and authorization middleware

### Function Documentation
In-depth function documentation is available in [`FUNCTION_DOCUMENTATION.md`](./FUNCTION_DOCUMENTATION.md)

**Key Functions:**
- Authentication middleware functions
- User model methods
- TestReport model methods
- Utility functions for token generation and file management

## 🏗 Architecture

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

### Data Models

**User Model:**
- Username, email, password
- Role-based access (admin, technician, viewer)
- Branch assignment
- Account status management

**TestReport Model:**
- Auto-generated report numbers
- Meter details and specifications
- Test data with load tests
- Test conditions and results
- File path for generated PDFs

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Secure file handling

## 🔒 Security

### Authentication
- JWT tokens with configurable expiration
- Secure password hashing
- Account status validation

### Authorization
- Role-based access control
- Resource ownership validation
- Permission-based route protection

### Input Validation
- Comprehensive validation using express-validator
- Mongoose schema validation
- Type and range checking

### File Security
- Controlled file types (PDF only)
- Access control for downloads
- Secure file path handling

## 📊 Usage Examples

### Creating a Test Report
```javascript
const testReport = {
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
  }
};
```

### Generating PDF Reports
```javascript
// Generate PDF report
const response = await fetch(`/api/reports/generate/${reportId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { downloadUrl } = await response.json();
// Use downloadUrl to download the PDF
```

## 🚀 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run client` - Start React client (if available)
- `npm run client-install` - Install client dependencies
- `npm run build` - Build client for production
- `npm run dev-full` - Run both server and client concurrently
- `npm run install-all` - Install all dependencies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Refer to the comprehensive documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - User authentication and authorization
  - Test data management
  - PDF report generation
  - File management system

---

*This application provides a complete solution for energy meter testing with professional documentation capabilities. The comprehensive documentation ensures easy integration and maintenance.*