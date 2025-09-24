# LECO Energy Meter Test Report Management System

A comprehensive MERN stack web application for managing Energy Meter Accuracy Test Reports with role-based access control and digital report generation.

## Features

### 🔐 Authentication & Authorization
- Secure login system with JWT tokens
- Role-based access control with four user types:
  - **Administrator**: Full system access
  - **Technical Officer**: Create and manage test reports
  - **Chief Engineer**: Review and approve/reject reports
  - **Branch Viewer**: View approved reports only

### 📊 Report Management
- **Digital Report Creation**: Multi-step form matching LECO Bulk Meter Test Report structure
- **Report Repository**: Advanced filtering, searching, and pagination
- **Role-based Interactions**:
  - Technical Officers: Create, edit, and manage their reports
  - Chief Engineers: Review, approve, or reject reports
  - Branch Viewers: View approved reports in read-only mode

### 📋 Report Structure
The application follows the exact LECO Bulk Meter Test Report format including:

#### Header Information
- Report Number (auto-generated: FT-YYYYMM-XXXX)
- Date of Tested, Branch, CSC, Location
- Substation Number, Account Number, Contract Demand
- Reason, Request ID, Requested By

#### Technical Sections
- **Current Transformer**: Make, Ratio
- **Static Meter**: Make, Serial Number, Meter Constant, Class, Current, Voltage, Tester details
- **Check Section**: Physical condition, ratios, connections, phase sequence, earthing, error measurements
- **Measurings**: Energy kWh, Demand kVA, Reactive Energy kVArh with import/export rates
- **Phases**: Voltage and current readings for R, Y, B phases
- **Comments & Signatures**: Technical Officer and Chief Engineer signatures

### 🎨 User Interface
- Modern, responsive Material-UI design
- Intuitive navigation with role-based menu items
- Real-time form validation
- Interactive data tables with sorting and filtering
- Professional report viewing interface

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **PDFKit** for report generation
- **Express Validator** for input validation

### Frontend
- **React.js** with TypeScript
- **Material-UI** for components
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Axios** for API communication

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd energy-meter-test-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=7d
   PORT=5000
   NODE_ENV=development
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```
   This creates sample users for testing:
   - Admin: `admin` / `admin123`
   - Technical Officer: `tech_officer1` / `tech123`
   - Chief Engineer: `chief_engineer1` / `chief123`
   - Branch Viewer: `branch_viewer1` / `viewer123`

5. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Full Stack Development

To run both backend and frontend simultaneously:
```bash
npm run dev-full
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Test Reports
- `GET /api/test-data` - Get all reports (with filtering)
- `GET /api/test-data/:id` - Get specific report
- `POST /api/test-data` - Create new report
- `PUT /api/test-data/:id` - Update report
- `DELETE /api/test-data/:id` - Delete report
- `PUT /api/test-data/:id/approve` - Approve report
- `PUT /api/test-data/:id/reject` - Reject report

### Report Generation
- `POST /api/reports/generate/:id` - Generate PDF report
- `GET /api/reports/download/:filename` - Download PDF report
- `GET /api/reports/list` - Get generated reports list

## User Roles & Permissions

### Administrator
- Full system access
- User management
- All report operations
- System configuration

### Technical Officer
- Create new test reports
- Edit own reports (if not approved)
- View own reports
- Generate PDF reports

### Chief Engineer
- View all reports
- Approve or reject pending reports
- Cannot edit report data
- Generate PDF reports

### Branch Viewer
- View approved reports only
- View reports from their branch only
- Cannot create, edit, or approve reports
- Download approved reports

## Report Workflow

1. **Creation**: Technical Officer creates a new test report
2. **Review**: Report status is set to "pending"
3. **Approval**: Chief Engineer reviews and approves/rejects
4. **Finalization**: Approved reports are available to Branch Viewers
5. **PDF Generation**: Reports can be downloaded as formatted PDFs

## Database Schema

### User Model
- Username, email, password
- Role (admin, technical_officer, chief_engineer, branch_viewer)
- Branch assignment
- Active status

### TestReport Model
- Complete LECO report structure
- Status tracking (draft, pending, approved, rejected)
- Approval/rejection tracking
- File path for generated PDFs

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Secure file handling

## Development

### Project Structure
```
energy-meter-test-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
├── models/                # MongoDB models
├── routes/                # Express routes
├── middleware/            # Custom middleware
├── scripts/               # Utility scripts
└── server.js             # Main server file
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for LECO Energy Meter Testing**