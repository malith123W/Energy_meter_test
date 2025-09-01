const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');
const TestReport = require('../models/TestReport');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads');
  try {
    await fs.access(uploadDir);
  } catch (error) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// @route   POST /api/reports/generate/:id
// @desc    Generate PDF report for a test
// @access  Private
router.post('/generate/:id', auth, async (req, res) => {
  try {
    await ensureUploadDir();

    const report = await TestReport.findById(req.params.id).populate('createdBy', 'username email branch');

    if (!report) {
      return res.status(404).json({ message: 'Test report not found' });
    }

    // Check permissions
    if (req.user.role === 'technician' && report.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fileName = `${report.reportNumber}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Pipe the PDF to a file
    doc.pipe(require('fs').createWriteStream(filePath));

    // Add header
    doc.fontSize(20).text('Energy Meter Accuracy Test Report', { align: 'center' });
    doc.moveDown(0.5);
    
    doc.fontSize(12).text(`Report Number: ${report.reportNumber}`, { align: 'right' });
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(1);

    // Add test information
    doc.fontSize(16).text('Test Information', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(12);
    doc.text(`Branch: ${report.branch}`);
    doc.text(`Transformer Number: ${report.transformerNumber}`);
    doc.text(`Test Date: ${new Date(report.testData.testDate).toLocaleDateString()}`);
    doc.text(`Tested By: ${report.createdBy.username} (${report.createdBy.email})`);
    doc.moveDown(1);

    // Add meter details
    doc.fontSize(16).text('Meter Details', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(12);
    doc.text(`Meter Number: ${report.meterDetails.meterNumber}`);
    doc.text(`Meter Type: ${report.meterDetails.meterType}`);
    doc.text(`Meter Class: ${report.meterDetails.meterClass}`);
    doc.text(`Manufacturer: ${report.meterDetails.manufacturer}`);
    doc.text(`Year of Manufacture: ${report.meterDetails.yearOfManufacture}`);
    doc.moveDown(1);

    // Add test conditions
    doc.fontSize(16).text('Test Conditions', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(12);
    doc.text(`Temperature: ${report.testData.testConditions.temperature}°C`);
    doc.text(`Humidity: ${report.testData.testConditions.humidity}%`);
    doc.text(`Frequency: ${report.testData.testConditions.frequency} Hz`);
    doc.moveDown(1);

    // Add load test results
    doc.fontSize(16).text('Load Test Results', { underline: true });
    doc.moveDown(0.5);

    // Create table headers
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [80, 60, 80, 80, 60, 80];
    const headers = ['Load %', 'PF', 'Std Energy', 'Meter Energy', 'Error %', 'Result'];
    
    let currentX = tableLeft;
    doc.fontSize(10);
    headers.forEach((header, i) => {
      doc.text(header, currentX, tableTop, { width: colWidths[i], align: 'center' });
      currentX += colWidths[i];
    });

    // Draw header line
    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
       .stroke();

    let currentY = tableTop + 20;
    
    report.testData.loadTests.forEach((test, index) => {
      currentX = tableLeft;
      const rowData = [
        test.loadPercentage.toString(),
        test.powerFactor.toFixed(2),
        test.standardEnergy.toFixed(3),
        test.meterEnergy.toFixed(3),
        test.error.toFixed(2),
        test.withinLimits ? 'PASS' : 'FAIL'
      ];

      rowData.forEach((data, i) => {
        doc.text(data, currentX, currentY, { width: colWidths[i], align: 'center' });
        currentX += colWidths[i];
      });
      currentY += 15;
    });

    // Draw table border
    doc.rect(tableLeft, tableTop, colWidths.reduce((a, b) => a + b, 0), currentY - tableTop)
       .stroke();

    doc.y = currentY + 20;

    // Add overall result
    doc.fontSize(16).text('Overall Result', { underline: true });
    doc.moveDown(0.5);
    
    const resultColor = report.testData.overallResult === 'PASS' ? 'green' : 'red';
    doc.fontSize(14).fillColor(resultColor).text(`Result: ${report.testData.overallResult}`, { align: 'center' });
    doc.fillColor('black');

    if (report.remarks) {
      doc.moveDown(1);
      doc.fontSize(16).text('Remarks', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(report.remarks);
    }

    // Add footer
    doc.fontSize(10).text(
      'This report is computer generated and does not require signature.',
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    // Update report with file path
    report.reportFilePath = `uploads/${fileName}`;
    await report.save();

    res.json({
      message: 'PDF report generated successfully',
      fileName,
      downloadUrl: `/uploads/${fileName}`
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Error generating PDF report' });
  }
});

// @route   GET /api/reports/download/:filename
// @desc    Download a generated report
// @access  Private
router.get('/download/:filename', auth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: 'Report file not found' });
    }

    // Verify user has access to this report
    const reportNumber = filename.replace('.pdf', '');
    const report = await TestReport.findOne({ reportNumber }).populate('createdBy');

    if (!report) {
      return res.status(404).json({ message: 'Report not found in database' });
    }

    // Check permissions
    if (req.user.role === 'technician' && report.createdBy._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Error downloading report' });
  }
});

// @route   GET /api/reports/list
// @desc    Get list of all generated reports
// @access  Private
router.get('/list', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      branch,
      transformerNumber,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = { reportFilePath: { $exists: true, $ne: null } };

    // Role-based filtering
    if (req.user.role === 'technician') {
      filter.createdBy = req.user.id;
    }

    if (branch) filter.branch = new RegExp(branch, 'i');
    if (transformerNumber) filter.transformerNumber = new RegExp(transformerNumber, 'i');

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // General search
    if (search) {
      filter.$or = [
        { branch: new RegExp(search, 'i') },
        { transformerNumber: new RegExp(search, 'i') },
        { 'meterDetails.meterNumber': new RegExp(search, 'i') },
        { reportNumber: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reports = await TestReport.find(filter)
      .populate('createdBy', 'username email branch')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TestReport.countDocuments(filter);

    res.json({
      message: 'Reports list fetched successfully',
      reports: reports.map(report => ({
        id: report._id,
        reportNumber: report.reportNumber,
        branch: report.branch,
        transformerNumber: report.transformerNumber,
        meterNumber: report.meterDetails.meterNumber,
        testDate: report.testData.testDate,
        overallResult: report.testData.overallResult,
        createdBy: report.createdBy,
        createdAt: report.createdAt,
        downloadUrl: `/api/reports/download/${path.basename(report.reportFilePath)}`
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalReports: total,
        hasNextPage: skip + reports.length < total,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Reports list error:', error);
    res.status(500).json({ message: 'Error fetching reports list' });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a report and its file
// @access  Private (admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const report = await TestReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Delete the file if it exists
    if (report.reportFilePath) {
      const filePath = path.join(__dirname, '../', report.reportFilePath);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.log('File not found or already deleted:', error.message);
      }
    }

    // Remove file path from database
    report.reportFilePath = null;
    await report.save();

    res.json({ message: 'Report file deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Error deleting report' });
  }
});

module.exports = router;
