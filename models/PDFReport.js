const mongoose = require('mongoose');

const pdfReportSchema = new mongoose.Schema({
  // Reference to the original test report
  testReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestReport',
    required: true
  },
  
  // PDF file information
  filename: {
    type: String,
    required: true,
    trim: true
  },
  
  // GridFS file ID
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // File metadata
  contentType: {
    type: String,
    default: 'application/pdf'
  },
  
  fileSize: {
    type: Number,
    required: true
  },
  
  // Report metadata for easy searching
  reportNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  branch: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  substationNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  dateOfTested: {
    type: Date,
    required: true,
    index: true
  },
  
  // User information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // PDF generation metadata
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['generated', 'archived', 'deleted'],
    default: 'generated'
  },
  
  // Download tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  
  lastDownloadedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient searching
pdfReportSchema.index({ reportNumber: 1, generatedAt: -1 });
pdfReportSchema.index({ branch: 1, dateOfTested: -1 });
pdfReportSchema.index({ createdBy: 1, generatedAt: -1 });
pdfReportSchema.index({ status: 1, generatedAt: -1 });

// Virtual for download URL
pdfReportSchema.virtual('downloadUrl').get(function() {
  return `/api/reports/pdf/download/${this.fileId}`;
});

// Virtual for view URL
pdfReportSchema.virtual('viewUrl').get(function() {
  return `/api/reports/pdf/view/${this.fileId}`;
});

// Ensure virtual fields are serialized
pdfReportSchema.set('toJSON', { virtuals: true });
pdfReportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PDFReport', pdfReportSchema);
