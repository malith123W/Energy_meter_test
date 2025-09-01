const express = require('express');
const { body, validationResult } = require('express-validator');
const TestReport = require('../models/TestReport');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/test-data
// @desc    Create a new test report
// @access  Private (technician or admin)
router.post('/', auth, authorize('technician', 'admin'), [
  body('branch').notEmpty().withMessage('Branch is required'),
  body('transformerNumber').notEmpty().withMessage('Transformer number is required'),
  body('meterDetails.meterNumber').notEmpty().withMessage('Meter number is required'),
  body('meterDetails.meterType').isIn(['Single Phase', 'Three Phase', 'CT Operated', 'Direct Connected']).withMessage('Invalid meter type'),
  body('meterDetails.meterClass').isIn(['0.5', '1.0', '1.5', '2.0']).withMessage('Invalid meter class'),
  body('meterDetails.manufacturer').notEmpty().withMessage('Manufacturer is required'),
  body('meterDetails.yearOfManufacture').isInt({ min: 1990, max: new Date().getFullYear() }).withMessage('Invalid year of manufacture'),
  body('testData.testConditions.temperature').isFloat({ min: -10, max: 60 }).withMessage('Temperature must be between -10°C and 60°C'),
  body('testData.testConditions.humidity').isFloat({ min: 0, max: 100 }).withMessage('Humidity must be between 0% and 100%'),
  body('testData.loadTests').isArray({ min: 1 }).withMessage('At least one load test is required')
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

    // Calculate overall result based on load tests
    const allTestsPass = testReportData.testData.loadTests.every(test => test.withinLimits);
    testReportData.testData.overallResult = allTestsPass ? 'PASS' : 'FAIL';

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
      transformerNumber,
      meterNumber,
      startDate,
      endDate,
      status,
      search
    } = req.query;

    // Build filter object
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'technician') {
      filter.createdBy = req.user.id;
    }

    if (branch) filter.branch = new RegExp(branch, 'i');
    if (transformerNumber) filter.transformerNumber = new RegExp(transformerNumber, 'i');
    if (meterNumber) filter['meterDetails.meterNumber'] = new RegExp(meterNumber, 'i');
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter['testData.testDate'] = {};
      if (startDate) filter['testData.testDate'].$gte = new Date(startDate);
      if (endDate) filter['testData.testDate'].$lte = new Date(endDate);
    }

    // General search
    if (search) {
      filter.$or = [
        { branch: new RegExp(search, 'i') },
        { transformerNumber: new RegExp(search, 'i') },
        { 'meterDetails.meterNumber': new RegExp(search, 'i') },
        { 'meterDetails.manufacturer': new RegExp(search, 'i') },
        { reportNumber: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reports = await TestReport.find(filter)
      .populate('createdBy', 'username email branch')
      .sort({ 'testData.testDate': -1 })
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
    if (req.user.role === 'technician' && report.createdBy._id.toString() !== req.user.id) {
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

    // Prevent editing completed reports unless admin
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

module.exports = router;
