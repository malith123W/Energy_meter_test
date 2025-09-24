const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient of the notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Sender of the notification (who triggered the action)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Type of notification
  type: {
    type: String,
    required: true,
    enum: [
      'report_rejected_chief',
      'report_rejected_technical', 
      'report_approved_chief',
      'report_approved_technical',
      'report_resubmitted',
      'report_created',
      'general'
    ]
  },
  
  // Title of the notification
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // Message content
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  // Related report (if applicable)
  relatedReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestReport'
  },
  
  // Additional data (rejection reason, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Read timestamp
  readAt: {
    type: Date
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ relatedReport: 1 });

// Static method to create a report rejection notification
notificationSchema.statics.createReportRejectionNotification = async function(
  recipientId, 
  senderId, 
  reportId, 
  rejectionReason, 
  rejectionType = 'chief'
) {
  const report = await this.model('TestReport').findById(reportId).populate('createdBy', 'username');
  const sender = await this.model('User').findById(senderId, 'username role');
  
  if (!report || !sender) {
    throw new Error('Report or sender not found');
  }
  
  const type = rejectionType === 'chief' ? 'report_rejected_chief' : 'report_rejected_technical';
  const title = `Report ${report.reportNumber} Rejected by ${sender.role === 'chief_engineer' ? 'Chief Engineer' : 'Technical Officer'}`;
  const message = `Your report ${report.reportNumber} has been rejected. Reason: ${rejectionReason}`;
  
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    relatedReport: reportId,
    metadata: {
      rejectionReason,
      rejectionType,
      reportNumber: report.reportNumber
    },
    priority: 'high'
  });
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      recipient: userId 
    },
    { 
      isRead: true, 
      readAt: new Date() 
    }
  );
};

// Instance method to mark single notification as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
