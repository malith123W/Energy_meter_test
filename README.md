# Energy Meter Test System

A comprehensive MERN stack web application for performing Energy Meter Accuracy Tests with automated report generation and management.

## Features

### 🔐 Authentication System
- Secure user login with JWT tokens
- Role-based access control (Admin, Technician, Viewer)
- Session management and automatic logout

### 📝 Data Input & Report Generation
- Comprehensive test data entry form
- Real-time error calculation and validation
- Automated PDF report generation
- Local report storage and management

### 📊 Report Repository
- Advanced search and filtering capabilities
- Sort by branch, date, transformer number
- Pagination for large datasets
- Download and view reports

### 🎨 Modern UI/UX
- Responsive Bootstrap design
- Dark navigation with intuitive icons
- Real-time form validation
- Toast notifications for user feedback

## Technology Stack

- **Frontend**: React.js, React Router, Bootstrap, React-Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **PDF Generation**: PDFKit
- **Styling**: Bootstrap 5, FontAwesome icons

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd energy-meter-test-app

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/energy_meter_test
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

### 3. Database Setup

Start MongoDB service, then seed the database with initial users:

```bash
# Create initial admin and technician users
node scripts/seedAdmin.js
```

This will create:
- **Admin User**: Username: `admin`, Password: `admin123`
- **Technician User**: Username: `technician1`, Password: `tech123`

### 4. Run the Application

#### Development Mode (Both Frontend and Backend)
```bash
# Install concurrently if not already installed
npm install -g concurrently

# Run both frontend and backend simultaneously
npm run dev-full
```

#### Manual Mode
```bash
# Terminal 1: Run backend server
npm run dev

# Terminal 2: Run frontend (in a new terminal)
cd client
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## User Guide

### 1. Logging In
- Access the application at http://localhost:3000
- Use the credentials provided above or create new users
- The system supports username or email for login

### 2. Creating Test Reports
1. Navigate to "New Test" from the dashboard
2. Fill in the required information:
   - Basic details (Branch, Transformer Number)
   - Meter details (Number, Type, Class, Manufacturer)
   - Test conditions (Temperature, Humidity, Frequency)
   - Load test data (multiple test points supported)
3. The system automatically calculates error percentages
4. Submit to create the report

### 3. Managing Reports
- View all reports in the "Reports" section
- Use search and filters to find specific reports
- Click "View" to see detailed report information
- Generate and download PDF reports
- Reports are automatically stored locally

### 4. Dashboard Overview
- View recent test statistics
- Quick access to common actions
- Real-time data updates

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Test Data
- `GET /api/test-data` - Get all test reports (with filtering)
- `POST /api/test-data` - Create new test report
- `GET /api/test-data/:id` - Get specific test report
- `PUT /api/test-data/:id` - Update test report
- `DELETE /api/test-data/:id` - Delete test report

### Reports
- `POST /api/reports/generate/:id` - Generate PDF report
- `GET /api/reports/download/:filename` - Download report file
- `GET /api/reports/list` - Get list of generated reports
- `DELETE /api/reports/:id` - Delete report file

## Project Structure

```
energy-meter-test-app/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── App.js         # Main App component
│   └── package.json
├── models/                 # MongoDB models
│   ├── User.js
│   └── TestReport.js
├── routes/                 # Express routes
│   ├── auth.js
│   ├── testData.js
│   └── reports.js
├── middleware/            # Custom middleware
│   └── auth.js
├── scripts/               # Utility scripts
│   └── seedAdmin.js
├── uploads/               # Generated reports storage
├── server.js              # Express server
├── package.json
└── README.md
```

## Key Features Explained

### Report Generation
- Uses PDFKit for server-side PDF generation
- Automatically includes all test data and calculations
- Professional formatting with tables and charts
- Stored locally for future access

### Authentication & Security
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected routes and API endpoints

### Data Validation
- Real-time form validation
- Server-side validation with express-validator
- Automatic error percentage calculations
- Pass/fail determination based on meter class

### Search & Filtering
- Multi-field search functionality
- Date range filtering
- Branch and transformer number filtering
- Pagination for performance

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the MONGODB_URI in .env file
   - Verify network connectivity

2. **Frontend Not Loading**
   - Check if both servers are running
   - Verify proxy configuration in client/package.json
   - Clear browser cache

3. **PDF Generation Fails**
   - Ensure uploads directory exists
   - Check file permissions
   - Verify PDFKit installation

4. **Authentication Issues**
   - Check JWT_SECRET in .env
   - Verify token expiration settings
   - Clear localStorage and re-login

### Development Tips

- Use browser developer tools for debugging
- Check server logs for API errors
- Use MongoDB Compass for database inspection
- Enable React Developer Tools for component debugging

## Future Enhancements

- Email notifications for test results
- Advanced analytics and reporting
- Multi-language support
- Mobile responsive improvements
- Integration with external testing equipment
- Audit trail and version control for reports
- Batch testing capabilities
- Advanced user management

## Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Verify all dependencies are installed correctly
4. Ensure MongoDB is running and accessible

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a development setup. For production deployment, ensure proper security measures, environment variables, and database security are implemented.

