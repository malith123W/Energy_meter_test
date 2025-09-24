const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const TestReport = require('../models/TestReport');
const PDFReport = require('../models/PDFReport');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
const gridFSService = require('../services/gridfsService');
// Force reload of PDF service to ensure latest changes
delete require.cache[require.resolve('../services/pdfGeneratorService')];
const pdfGeneratorService = require('../services/pdfGeneratorService');

const router = express.Router();

// Test route to check if server is working
router.get('/test', (req, res) => {
  res.json({ message: 'Reports API is working', timestamp: new Date().toISOString() });
});

// Test route to check PDF service methods
router.get('/test-pdf-methods', (req, res) => {
  const methods = Object.getOwnPropertyNames(pdfGeneratorService).filter(name => typeof pdfGeneratorService[name] === 'function');
  const prototypeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(pdfGeneratorService)).filter(name => typeof pdfGeneratorService[name] === 'function');
  
  console.log('PDF Service Debug:');
  console.log('Direct properties:', Object.getOwnPropertyNames(pdfGeneratorService));
  console.log('Prototype methods:', prototypeMethods);
  console.log('generateProfessionalLECOReport type:', typeof pdfGeneratorService.generateProfessionalLECOReport);
  console.log('generateProfessionalLECOReport exists:', 'generateProfessionalLECOReport' in pdfGeneratorService);
  
  res.json({ 
    message: 'PDF Service methods available', 
    methods: methods,
    prototypeMethods: prototypeMethods,
    hasProfessionalMethod: typeof pdfGeneratorService.generateProfessionalLECOReport === 'function',
    professionalMethodExists: 'generateProfessionalLECOReport' in pdfGeneratorService
  });
});

// Test route to generate a PDF with professional template
router.post('/test-pdf-generation', async (req, res) => {
  try {
    console.log('=== TEST PDF GENERATION ===');
    console.log('Template requested:', req.body.template);
    
    const testReport = {
      reportNumber: 'F T-202509-0011',
      branch: 'gal',
      location: '5',
      accountNumber: '5',
      contractDemand: '5',
      dateOfTested: new Date('2022-02-25'),
      csc: 'e',
      substationNumber: '5',
      reason: 'route',
      requestId: '5',
      currentTransformer: {
        make: '5',
        ratio: '5'
      },
      staticMeter: {
        make: '5',
        serialNumber: '5',
        meterConstant: '5',
        class: '5',
        meterCurrent: '5',
        meterVoltage: '5',
        testerMake: '5',
        testerSerialNumber: '5'
      },
      checkSection: {
        physicalCondition: 'Good',
        ctRatio: '5',
        meterRatio: '5',
        multiplyingFactor: '1',
        connectionOfMeterElements: '3ph4w',
        phaseSequence: 'Correct',
        ctEarthing: 'Yes',
        errorAsFound: '0',
        errorAsLeft: '0'
      },
      measurings: {
        energyKWh: {
          totalImport: '0',
          totalExport: '0',
          rateAImport: '0',
          rateAExport: '0',
          rateBImport: '0',
          rateBExport: '0',
          rateCImport: '0',
          rateCExport: '0'
        },
        demandKVA: {
          totalImport: '0',
          totalExport: '0',
          rateAImport: '0',
          rateAExport: '0',
          rateBImport: '0',
          rateBExport: '0',
          rateCImport: '0',
          rateCExport: '0'
        },
        reactiveEnergyKVArh: {
          totalImport: '0',
          totalExport: '0',
          rateAImport: '0',
          rateAExport: '0',
          rateBImport: '0',
          rateBExport: '0',
          rateCImport: '0',
          rateCExport: '0'
        },
        averagePowerFactor: 0.000
      },
      phases: {
        voltage: {
          r: '0',
          y: '0',
          b: '0'
        },
        current: {
          rPrimary: '0',
          yPrimary: '0',
          bPrimary: '0',
          rSecondary: '0',
          ySecondary: '0',
          bSecondary: '0'
        }
      },
      comments: 'Test comments for the report'
    };

    // Prepare options for PDF generation
    const pdfOptions = {
      interchangeTables: req.body.interchangeTables || false
    };
    
    let pdfBuffer;
    if (req.body.template === 'professional') {
      console.log('Generating professional PDF...');
      pdfBuffer = await pdfGeneratorService.generateProfessionalLECOReport(testReport, pdfOptions);
      console.log('Professional PDF generated, size:', pdfBuffer.length);
    } else {
      console.log('Generating default PDF...');
      pdfBuffer = await pdfGeneratorService.generateEnergyMeterReport(testReport, pdfOptions);
      console.log('Default PDF generated, size:', pdfBuffer.length);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test-report.pdf');
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating test PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadDir);
  } catch (error) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// @route   POST /api/reports
// @desc    Create a new test report
// @access  Private (admin or technical officer)
router.post('/', auth, async (req, res) => {
  try {
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'technical_officer') {
      return res.status(403).json({ message: 'Access denied. Only Technical Officers and Admins can create reports.' });
    }

    const testReportData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'pending_technical' // Set initial status according to new flow
    };

    const testReport = new TestReport(testReportData);
    await testReport.save();

    await testReport.populate('createdBy', 'username email branch');

    res.status(201).json({
      message: 'Test report created successfully',
      data: testReport
    });
  } catch (error) {
    console.error('Test report creation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Report number already exists' });
    }
    res.status(500).json({ message: 'Server error during test report creation' });
  }
});

// @route   GET /api/reports
// @desc    Get all test reports with filtering and pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    console.log('=== GET /api/reports ===');
    console.log('User:', req.user.username, 'Role:', req.user.role);
    
    const {
      page = 1,
      limit = 10,
      branch,
      substationNumber,
      accountNumber,
      startDate,
      endDate,
      status,
      search,
      reportNumber,
      depot
    } = req.query;

    console.log('Query params:', { page, limit, status, search });

    // Build filter object based on user role
    const filter = {};
    console.log('Initial filter:', filter);

    // Role-based filtering according to new approval flow
    if (req.user.role === 'technical_officer') {
      // Technical officers can see:
      // 1. Reports they created (any status)
      // 2. Reports pending technical review (any creator)
      // 3. Reports pending chief engineer review (to track progress)
      // 4. Reports rejected by chief engineer (for resubmission)
      filter.$or = [
        { createdBy: req.user.id },
        { status: 'pending_technical' },
        { status: 'pending_chief' },
        { status: 'rejected_chief' }
      ];
    } else if (req.user.role === 'chief_engineer') {
        // Chief engineers can see:
        // 1. Reports pending their review
        // 2. Reports they have approved
        // 3. Reports they have rejected
        filter.$or = [
          { status: 'pending_chief' },
          { status: 'approved', chiefEngineerApprovedBy: new mongoose.Types.ObjectId(req.user.id) },
          { status: 'rejected_chief', chiefEngineerRejectedBy: req.user.id }
        ];
    } else if (req.user.role === 'branch_viewer') {
      // Branch viewers can see all approved reports
      filter.status = 'approved';
    }
    // Admins can see all reports (no additional filters)

    // Apply additional filters
    if (branch) filter.branch = new RegExp(branch, 'i');
    if (substationNumber) filter.substationNumber = new RegExp(substationNumber, 'i');
    if (accountNumber) filter.accountNumber = new RegExp(accountNumber, 'i');
    if (reportNumber) filter.reportNumber = new RegExp(reportNumber, 'i');
    if (depot) filter.depot = new RegExp(depot, 'i');
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.dateOfTested = {};
      if (startDate) filter.dateOfTested.$gte = new Date(startDate);
      if (endDate) filter.dateOfTested.$lte = new Date(endDate);
    }

    // General search
    if (search) {
      const searchFilter = {
        $or: [
          { branch: new RegExp(search, 'i') },
          { substationNumber: new RegExp(search, 'i') },
          { accountNumber: new RegExp(search, 'i') },
          { reportNumber: new RegExp(search, 'i') },
          { location: new RegExp(search, 'i') }
        ]
      };
      
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchFilter];
        delete filter.$or;
      } else {
        Object.assign(filter, searchFilter);
      }
    }

    console.log('Final filter:', JSON.stringify(filter, null, 2));
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user.id);
    console.log('User ID type:', typeof req.user.id);
    if (req.user.role === 'chief_engineer') {
      console.log('Chief Engineer ObjectId:', new mongoose.Types.ObjectId(req.user.id));
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('Pagination:', { skip, limit: parseInt(limit) });
    
    const reports = await TestReport.find(filter)
      .populate('createdBy', 'username email branch')
      .populate('technicalOfficerApprovedBy', 'username email')
      .populate('chiefEngineerApprovedBy', 'username email')
      .populate('technicalOfficerRejectedBy', 'username email')
      .populate('chiefEngineerRejectedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log('Found reports:', reports.length);
    console.log('Report statuses:', reports.map(r => ({ id: r._id, status: r.status, chiefApprovedBy: r.chiefEngineerApprovedBy })));

    const total = await TestReport.countDocuments(filter);
    
    console.log('Total reports matching filter:', total);

    res.json({
      message: 'Test reports fetched successfully',
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalReports: total,
        hasNextPage: skip + reports.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get test reports error:', error);
    res.status(500).json({ message: 'Server error while fetching test reports' });
  }
});

// @route   GET /api/reports/:id
// @desc    Get a single test report
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id)
      .populate('createdBy', 'username email branch')
      .populate('technicalOfficerApprovedBy', 'username email')
      .populate('chiefEngineerApprovedBy', 'username email')
      .populate('technicalOfficerRejectedBy', 'username email')
      .populate('chiefEngineerRejectedBy', 'username email');

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    // Check permissions based on user role and report status
    const hasAccess = 
      req.user.role === 'admin' ||
      (req.user.role === 'technical_officer' && (
        report.createdBy._id.toString() === req.user.id ||
        ['pending_technical', 'rejected_chief'].includes(report.status)
      )) ||
       (req.user.role === 'chief_engineer' && (
         report.status === 'pending_chief' || 
         (report.status === 'approved' && report.chiefEngineerApprovedBy && report.chiefEngineerApprovedBy._id.toString() === req.user.id) ||
         (report.status === 'rejected_chief' && report.chiefEngineerRejectedBy && report.chiefEngineerRejectedBy._id.toString() === req.user.id)
       )) ||
      (req.user.role === 'branch_viewer' && report.status === 'approved');

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Test report fetched successfully',
      report
    });
  } catch (error) {
    console.error('Get test report error:', error);
    res.status(500).json({ message: 'Server error while fetching test report' });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update a test report
// @access  Private (admin or technical officer)
router.put('/:id', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    // Check permissions - only admin and technical officers can edit
    if (req.user.role !== 'admin' && req.user.role !== 'technical_officer') {
      return res.status(403).json({ message: 'Access denied. Only Technical Officers and Admins can edit reports.' });
    }

    // Technical officers can edit any report that hasn't been approved by Chief Engineer
    if (req.user.role === 'technical_officer' && report.status === 'approved') {
      return res.status(403).json({ message: 'Cannot edit reports that have been approved by Chief Engineer.' });
    }

    // When a report is edited, reset status to pending technical review
    const updateData = {
      ...req.body,
      status: 'pending_technical'
    };

    const updatedReport = await TestReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email branch');

    res.json({
      message: 'Test report updated successfully',
      data: updatedReport
    });
  } catch (error) {
    console.error('Update test report error:', error);
    res.status(500).json({ message: 'Server error while updating test report' });
  }
});

// @route   POST /api/reports/generate/:id
// @desc    Generate PDF report for a test and store in GridFS
// @access  Private
router.post('/generate/:id', auth, async (req, res) => {
  try {
    console.log('=== PDF GENERATION REQUEST ===');
    console.log('Report ID:', req.params.id);
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.user.role);

    const report = await TestReport.findById(req.params.id).populate('createdBy', 'username email branch');

    if (!report) {
      console.log('Report not found');
      return res.status(404).json({ message: 'Test report not found' });
    }
    
    console.log('Report found:', report.reportNumber);

    // Check permissions
    if (req.user.role === 'technical_officer' && report.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role === 'branch_viewer' && report.status !== 'approved') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allow selecting a template. Default to 'full'. Supported: 'cover', 'full'
    const template = (req.query.template || req.body?.template || 'full').toString();
    const forceRegenerate = req.query.force === 'true' || req.body?.force === true;

    // Check if PDF already exists for the same template (by filename suffix)
    // Skip cache check if force regenerate is requested
    if (!forceRegenerate) {
      const existingPDF = await PDFReport.findOne({ 
        testReportId: report._id,
        filename: { $regex: template === 'cover' ? /-cover\.pdf$/ : /^(?!.*-cover\.pdf).*\.pdf$/ }
      });
      if (existingPDF) {
        return res.json({
          message: 'PDF report already exists',
          pdfId: existingPDF._id,
          downloadUrl: existingPDF.downloadUrl,
          viewUrl: existingPDF.viewUrl
        });
      }
    } else {
      // Force regenerate - delete existing PDFs for this report
      console.log('Force regenerate requested - clearing existing PDFs');
      await PDFReport.deleteMany({ testReportId: report._id });
      
      // Also delete from file system
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        files.forEach(file => {
          if (file.includes(report.reportNumber)) {
            fs.unlinkSync(path.join(uploadsDir, file));
            console.log('Deleted cached file:', file);
          }
        });
      }
    }

    // Generate PDF using the selected template
    console.log('=== PDF GENERATION DEBUG ===');
    console.log('Template requested:', template);
    console.log('Report ID:', report._id);
    console.log('Report Number:', report.reportNumber);
    console.log('Interchange Tables:', report.interchangeTables);
    
    // Prepare options for PDF generation
    const pdfOptions = {
      interchangeTables: report.interchangeTables || false
    };
    
    let pdfBuffer;
    if (template === 'cover') {
      console.log('Using cover page template');
      pdfBuffer = await pdfGeneratorService.generateCoverPageReport(report);
    } else if (template === 'professional') {
      console.log('Using professional LECO template - CALLING NEW METHOD');
      console.log('Method exists:', typeof pdfGeneratorService.generateProfessionalLECOReport);
      pdfBuffer = await pdfGeneratorService.generateProfessionalLECOReport(report, pdfOptions);
      console.log('Professional template completed, buffer size:', pdfBuffer.length);
    } else {
      console.log('Using default energy meter template');
      pdfBuffer = await pdfGeneratorService.generateEnergyMeterReport(report, pdfOptions);
    }
    console.log('Final PDF buffer size:', pdfBuffer.length);
    console.log('=== END PDF GENERATION DEBUG ===');
    
    // For now, let's use a simple approach - save to file system temporarily
    const fileName = `${report.reportNumber}${template === 'cover' ? '-cover' : template === 'professional' ? '-professional' : ''}.pdf`;
    const fs = require('fs');
    const path = require('path');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, fileName);
    console.log('Saving PDF to file system:', filePath);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log('PDF saved to file system successfully');
    
    // Create a mock GridFS file object for compatibility
    const gridFile = {
      _id: new mongoose.Types.ObjectId(),
      filename: fileName,
      length: pdfBuffer.length
    };
    console.log('Mock GridFS file created, ID:', gridFile._id);

    // Save PDF metadata to database
    const pdfReport = new PDFReport({
      testReportId: report._id,
      filename: fileName,
      fileId: gridFile._id,
      fileSize: pdfBuffer.length,
      reportNumber: report.reportNumber,
      branch: report.branch,
      substationNumber: report.substationNumber,
      accountNumber: report.accountNumber,
      dateOfTested: report.dateOfTested,
      createdBy: req.user.id
    });

    await pdfReport.save();

    res.json({
      message: 'PDF report generated and stored successfully',
      pdfId: pdfReport._id,
      fileName: fileName,
      fileSize: pdfBuffer.length,
      downloadUrl: pdfReport.downloadUrl,
      viewUrl: pdfReport.viewUrl
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Error generating PDF report' });
  }
});

// @route   GET /api/reports/pdf/download/:fileId
// @desc    Download a PDF report from GridFS
// @access  Private
router.get('/pdf/download/:fileId', auth, async (req, res) => {
  try {
    console.log('=== PDF DOWNLOAD REQUEST ===');
    console.log('File ID:', req.params.fileId);
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.user.role);
    
    const fileId = req.params.fileId;
    
    // Get PDF metadata
    const pdfReport = await PDFReport.findById(fileId).populate('testReportId createdBy');
    
    if (!pdfReport) {
      console.log('PDF report not found in database');
      return res.status(404).json({ message: 'PDF report not found' });
    }
    
    console.log('PDF report found:', pdfReport.filename);

    // Check permissions
    const testReport = pdfReport.testReportId;
    if (req.user.role === 'technical_officer' && testReport.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role === 'branch_viewer' && (testReport.status !== 'approved' || testReport.branch !== req.user.branch)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // For now, serve from file system
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'uploads', pdfReport.filename);
    
    console.log('Looking for PDF file at:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('PDF file not found in file system');
      return res.status(404).json({ message: 'PDF file not found in storage' });
    }
    
    console.log('PDF file found, serving from file system');
    
    // Update download count and last downloaded time
    pdfReport.downloadCount += 1;
    pdfReport.lastDownloadedAt = new Date();
    await pdfReport.save();

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfReport.filename}"`);
    res.setHeader('Content-Length', pdfReport.fileSize);

    // Stream the file from file system
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('GridFS stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming PDF file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading PDF report' });
  }
});

// @route   GET /api/reports/pdf/view/:fileId
// @desc    View a PDF report in browser
// @access  Private
router.get('/pdf/view/:fileId', auth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Get PDF metadata
    const pdfReport = await PDFReport.findById(fileId).populate('testReportId createdBy');
    
    if (!pdfReport) {
      return res.status(404).json({ message: 'PDF report not found' });
    }

    // Check permissions
    const testReport = pdfReport.testReportId;
    if (req.user.role === 'technical_officer' && testReport.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role === 'branch_viewer' && (testReport.status !== 'approved' || testReport.branch !== req.user.branch)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if file exists in GridFS
    const fileExists = await gridFSService.fileExists(pdfReport.fileId);
    if (!fileExists) {
      return res.status(404).json({ message: 'PDF file not found in storage' });
    }

    // Get file info from GridFS
    const fileInfo = await gridFSService.getFileInfo(pdfReport.fileId);

    // Set headers for inline viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfReport.filename}"`);
    res.setHeader('Content-Length', fileInfo.length);

    // Stream the file from GridFS
    const fileStream = await gridFSService.getFileStream(pdfReport.fileId);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('GridFS stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming PDF file' });
      }
    });
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ message: 'Error viewing PDF report' });
  }
});

// @route   GET /api/reports/pdf/list
// @desc    Get list of all PDF reports
// @access  Private
router.get('/pdf/list', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      branch,
      substationNumber,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = { status: 'generated' };

    // Role-based filtering
    if (req.user.role === 'technical_officer') {
      filter.createdBy = req.user.id;
    } else if (req.user.role === 'branch_viewer') {
      filter.branch = req.user.branch;
    }

    if (branch) filter.branch = new RegExp(branch, 'i');
    if (substationNumber) filter.substationNumber = new RegExp(substationNumber, 'i');

    // Date range filter
    if (startDate || endDate) {
      filter.dateOfTested = {};
      if (startDate) filter.dateOfTested.$gte = new Date(startDate);
      if (endDate) filter.dateOfTested.$lte = new Date(endDate);
    }

    // General search
    if (search) {
      filter.$or = [
        { branch: new RegExp(search, 'i') },
        { substationNumber: new RegExp(search, 'i') },
        { accountNumber: new RegExp(search, 'i') },
        { reportNumber: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pdfReports = await PDFReport.find(filter)
      .populate('createdBy', 'username email branch')
      .populate('testReportId', 'status')
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PDFReport.countDocuments(filter);

    res.json({
      message: 'PDF reports list fetched successfully',
      reports: pdfReports.map(pdfReport => ({
        id: pdfReport._id,
        reportNumber: pdfReport.reportNumber,
        branch: pdfReport.branch,
        substationNumber: pdfReport.substationNumber,
        accountNumber: pdfReport.accountNumber,
        testDate: pdfReport.dateOfTested,
        filename: pdfReport.filename,
        fileSize: pdfReport.fileSize,
        downloadCount: pdfReport.downloadCount,
        lastDownloadedAt: pdfReport.lastDownloadedAt,
        generatedAt: pdfReport.generatedAt,
        createdBy: pdfReport.createdBy,
        testReportStatus: pdfReport.testReportId.status,
        downloadUrl: pdfReport.downloadUrl,
        viewUrl: pdfReport.viewUrl
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalReports: total,
        hasNextPage: skip + pdfReports.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('PDF reports list error:', error);
    res.status(500).json({ message: 'Error fetching PDF reports list' });
  }
});

// @route   DELETE /api/reports/pdf/:id
// @desc    Delete a PDF report from GridFS
// @access  Private (admin or creator)
router.delete('/pdf/:id', auth, async (req, res) => {
  try {
    const pdfReport = await PDFReport.findById(req.params.id).populate('testReportId createdBy');

    if (!pdfReport) {
      return res.status(404).json({ message: 'PDF report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && pdfReport.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete from GridFS
    await gridFSService.deletePDF(pdfReport.fileId);

    // Mark as deleted in database
    pdfReport.status = 'deleted';
    await pdfReport.save();

    res.json({ message: 'PDF report deleted successfully' });
  } catch (error) {
    console.error('Delete PDF report error:', error);
    res.status(500).json({ message: 'Error deleting PDF report' });
  }
});

// @route   POST /api/reports/:id/approve-technical
// @desc    Approve a report by Technical Officer
// @access  Private (admin or technical officer)
router.post('/:id/approve-technical', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'technical_officer') {
      return res.status(403).json({ message: 'Access denied. Only Technical Officers and Admins can perform this action.' });
    }

    // Check if report is in the correct state
    if (report.status !== 'pending_technical') {
      return res.status(400).json({ message: 'Report is not in pending technical review state' });
    }

    // Update report status and approval fields
    report.status = 'pending_chief';
    report.technicalOfficerApprovedBy = req.user.id;
    report.technicalOfficerApprovedAt = new Date();
    
    await report.save();

    res.json({ 
      message: 'Report approved by Technical Officer successfully',
      report: await TestReport.findById(req.params.id).populate('createdBy technicalOfficerApprovedBy', 'username email branch')
    });
  } catch (error) {
    console.error('Technical Officer approval error:', error);
    res.status(500).json({ message: 'Error approving report' });
  }
});

// @route   POST /api/reports/:id/reject-technical
// @desc    Reject a report by Technical Officer
// @access  Private (admin or technical officer)
router.post('/:id/reject-technical', auth, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const report = await TestReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'technical_officer') {
      return res.status(403).json({ message: 'Access denied. Only Technical Officers and Admins can perform this action.' });
    }

    // Check if report is in the correct state
    if (report.status !== 'pending_technical') {
      return res.status(400).json({ message: 'Report is not in pending technical review state' });
    }

    // Update report status and rejection fields
    report.status = 'rejected_technical';
    report.technicalOfficerRejectedBy = req.user.id;
    report.technicalOfficerRejectedAt = new Date();
    report.technicalOfficerRejectionReason = rejectionReason.trim();
    
    await report.save();

    // Create notification for the technical officer who created the report
    try {
      await Notification.createReportRejectionNotification(
        report.createdBy,
        req.user.id,
        report._id,
        rejectionReason.trim(),
        'technical'
      );
    } catch (notificationError) {
      console.error('Error creating rejection notification:', notificationError);
      // Don't fail the rejection if notification creation fails
    }

    res.json({ 
      message: 'Report rejected by Technical Officer successfully',
      report: await TestReport.findById(req.params.id).populate('createdBy technicalOfficerRejectedBy', 'username email branch')
    });
  } catch (error) {
    console.error('Technical Officer rejection error:', error);
    res.status(500).json({ message: 'Error rejecting report' });
  }
});

// @route   POST /api/reports/:id/approve-chief
// @desc    Approve a report by Chief Engineer
// @access  Private (admin or chief engineer)
router.post('/:id/approve-chief', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'chief_engineer') {
      return res.status(403).json({ message: 'Access denied. Only Chief Engineers and Admins can perform this action.' });
    }

    // Check if report is in the correct state
    if (report.status !== 'pending_chief') {
      return res.status(400).json({ message: 'Report is not in pending chief engineer review state' });
    }

    // Update report status and approval fields
    report.status = 'approved';
    report.chiefEngineerApprovedBy = req.user.id;
    report.chiefEngineerApprovedAt = new Date();
    
    // Set legacy fields for backward compatibility
    report.approvedBy = req.user.id;
    report.approvedAt = new Date();
    
    await report.save();

    res.json({ 
      message: 'Report approved by Chief Engineer successfully',
      report: await TestReport.findById(req.params.id).populate('createdBy technicalOfficerApprovedBy chiefEngineerApprovedBy', 'username email branch')
    });
  } catch (error) {
    console.error('Chief Engineer approval error:', error);
    res.status(500).json({ message: 'Error approving report' });
  }
});

// @route   POST /api/reports/:id/reject-chief
// @desc    Reject a report by Chief Engineer
// @access  Private (admin or chief engineer)
router.post('/:id/reject-chief', auth, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const report = await TestReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'chief_engineer') {
      return res.status(403).json({ message: 'Access denied. Only Chief Engineers and Admins can perform this action.' });
    }

    // Check if report is in the correct state
    if (report.status !== 'pending_chief') {
      return res.status(400).json({ message: 'Report is not in pending chief engineer review state' });
    }

    // Update report status and rejection fields
    report.status = 'rejected_chief';
    report.chiefEngineerRejectedBy = req.user.id;
    report.chiefEngineerRejectedAt = new Date();
    report.chiefEngineerRejectionReason = rejectionReason.trim();
    
    // Set legacy fields for backward compatibility
    report.rejectedBy = req.user.id;
    report.rejectedAt = new Date();
    report.rejectionReason = rejectionReason.trim();
    
    await report.save();

    // Create notification for the technical officer who created the report
    try {
      await Notification.createReportRejectionNotification(
        report.createdBy,
        req.user.id,
        report._id,
        rejectionReason.trim(),
        'chief'
      );
    } catch (notificationError) {
      console.error('Error creating rejection notification:', notificationError);
      // Don't fail the rejection if notification creation fails
    }

    res.json({ 
      message: 'Report rejected by Chief Engineer successfully',
      report: await TestReport.findById(req.params.id).populate('createdBy chiefEngineerRejectedBy', 'username email branch')
    });
  } catch (error) {
    console.error('Chief Engineer rejection error:', error);
    res.status(500).json({ message: 'Error rejecting report' });
  }
});

// @route   POST /api/reports/:id/resubmit
// @desc    Resubmit a rejected report for review
// @access  Private (admin or technical officer who created the report)
router.post('/:id/resubmit', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'technical_officer') {
      return res.status(403).json({ message: 'Access denied. Only Technical Officers and Admins can resubmit reports.' });
    }

    // Check if report is in the correct state for resubmission
    if (!['rejected_technical', 'rejected_chief'].includes(report.status)) {
      return res.status(400).json({ message: 'Report must be rejected before it can be resubmitted' });
    }

    // Reset to pending technical review
    report.status = 'pending_technical';
    
    // Clear rejection fields but keep them for audit trail
    // Don't clear the rejection fields, just reset status
    
    await report.save();

    res.json({ 
      message: 'Report resubmitted for review successfully',
      report: await TestReport.findById(req.params.id).populate('createdBy', 'username email branch')
    });
  } catch (error) {
    console.error('Report resubmission error:', error);
    res.status(500).json({ message: 'Error resubmitting report' });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a test report and its associated PDFs
// @access  Private (admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Find and delete associated PDF reports
    const pdfReports = await PDFReport.find({ testReportId: report._id });
    
    for (const pdfReport of pdfReports) {
      try {
        await gridFSService.deletePDF(pdfReport.fileId);
        pdfReport.status = 'deleted';
        await pdfReport.save();
      } catch (error) {
        console.log('Error deleting PDF:', error.message);
      }
    }

    // Delete the test report
    await TestReport.findByIdAndDelete(req.params.id);

    res.json({ message: 'Report and associated PDFs deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Error deleting report' });
  }
});

module.exports = router;
