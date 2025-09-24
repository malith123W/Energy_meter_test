const express = require('express');
const { body, validationResult } = require('express-validator');
const TestReport = require('../models/TestReport');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/test-data
// @desc    Create a new test report
// @access  Private (technical_officer or admin)
router.post('/', auth, authorize('technical_officer', 'admin'), [
  body('branch').notEmpty().withMessage('Branch is required'),
  body('csc').notEmpty().withMessage('CSC is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('substationNumber').notEmpty().withMessage('Substation number is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('contractDemand').notEmpty().withMessage('Contract demand is required'),
  body('requestId').notEmpty().withMessage('Request ID is required'),
  body('currentTransformer.make').notEmpty().withMessage('CT Make is required'),
  body('currentTransformer.ratio').notEmpty().withMessage('CT Ratio is required'),
  body('staticMeter.make').notEmpty().withMessage('Meter Make is required'),
  body('staticMeter.serialNumber').notEmpty().withMessage('Serial Number is required'),
  body('checkSection.physicalCondition').isIn(['Good', 'Fair', 'Poor']).withMessage('Invalid physical condition'),
  body('checkSection.multiplyingFactor').isFloat({ min: 0 }).withMessage('Multiplying factor must be positive'),
  body('measurings.energyKWh.totalImport').isFloat({ min: 0 }).withMessage('Total import energy must be positive'),
  body('measurings.averagePowerFactor').isFloat({ min: 0, max: 1 }).withMessage('Power factor must be between 0 and 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const testReportData = {
      ...req.body,
      createdBy: req.user.id
    };

    const testReport = new TestReport(testReportData);
    await testReport.save();

    await testReport.populate('createdBy', 'username email branch');

    res.status(201).json({
      message: 'Test report created successfully',
      report: testReport
    });
  } catch (error) {
    console.error('Test data creation error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Report number already exists' });
    }
    res.status(500).json({ message: 'Server error during test report creation' });
  }
});

// @route   GET /api/test-data
// @desc    Get all test reports with filtering and pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
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

    // Build filter object
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'technical_officer') {
      filter.createdBy = req.user.id;
    } else if (req.user.role === 'branch_viewer') {
      filter.status = 'approved';
      filter.branch = req.user.branch;
    }

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
      filter.$or = [
        { branch: new RegExp(search, 'i') },
        { substationNumber: new RegExp(search, 'i') },
        { accountNumber: new RegExp(search, 'i') },
        { 'staticMeter.serialNumber': new RegExp(search, 'i') },
        { 'staticMeter.make': new RegExp(search, 'i') },
        { reportNumber: new RegExp(search, 'i') },
        { depot: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reports = await TestReport.find(filter)
      .populate('createdBy', 'username email branch')
      .populate('approvedBy', 'username email')
      .populate('rejectedBy', 'username email')
      .sort({ dateOfTested: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TestReport.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      message: 'Test reports fetched successfully',
      reports: reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalReports: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Fetch test reports error:', error);
    res.status(500).json({ message: 'Server error while fetching test reports' });
  }
});

// @route   GET /api/test-data/:id
// @desc    Get a specific test report
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id).populate('createdBy', 'username email branch');

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    // Check if user has permission to view this report
    if (req.user.role === 'technical_officer' && report.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role === 'branch_viewer' && (report.status !== 'approved' || report.branch !== req.user.branch)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      message: 'Test report fetched successfully',
      report
    });
  } catch (error) {
    console.error('Fetch test report error:', error);
    res.status(500).json({ message: 'Server error while fetching test report' });
  }
});

// @route   PUT /api/test-data/:id
// @desc    Update a test report
// @access  Private (creator or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && report.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Prevent editing approved reports unless admin
    if (report.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Cannot edit approved reports' });
    }

    const updatedReport = await TestReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email branch');

    res.json({
      message: 'Test report updated successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Update test report error:', error);
    res.status(500).json({ message: 'Server error while updating test report' });
  }
});

// @route   DELETE /api/test-data/:id
// @desc    Delete a test report
// @access  Private (creator or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && report.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await TestReport.findByIdAndDelete(req.params.id);

    res.json({ message: 'Test report deleted successfully' });
  } catch (error) {
    console.error('Delete test report error:', error);
    res.status(500).json({ message: 'Server error while deleting test report' });
  }
});

// @route   PUT /api/test-data/:id/approve
// @desc    Approve a test report
// @access  Private (chief_engineer or admin)
router.put('/:id/approve', auth, authorize('chief_engineer', 'admin'), async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending reports can be approved' });
    }

    const updatedReport = await TestReport.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        technicalOfficerSignature: report.createdBy.username,
        chiefEngineerSignature: req.user.username,
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email branch')
     .populate('approvedBy', 'username email');

    res.json({
      message: 'Report approved successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Approve report error:', error);
    res.status(500).json({ message: 'Server error while approving report' });
  }
});

// @route   PUT /api/test-data/:id/reject
// @desc    Reject a test report
// @access  Private (chief_engineer or admin)
router.put('/:id/reject', auth, authorize('chief_engineer', 'admin'), [
  body('reason').notEmpty().withMessage('Rejection reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending reports can be rejected' });
    }

    const updatedReport = await TestReport.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason: req.body.reason,
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email branch')
     .populate('rejectedBy', 'username email');

    res.json({
      message: 'Report rejected successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Reject report error:', error);
    res.status(500).json({ message: 'Server error while rejecting report' });
  }
});

module.exports = router;
