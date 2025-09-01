const mongoose = require('mongoose');

const testReportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  branch: {
    type: String,
    required: [true, 'Branch is required'],
    trim: true
  },
  transformerNumber: {
    type: String,
    required: [true, 'Transformer number is required'],
    trim: true
  },
  meterDetails: {
    meterNumber: {
      type: String,
      required: [true, 'Meter number is required'],
      trim: true
    },
    meterType: {
      type: String,
      required: [true, 'Meter type is required'],
      enum: ['Single Phase', 'Three Phase', 'CT Operated', 'Direct Connected']
    },
    meterClass: {
      type: String,
      required: [true, 'Meter class is required'],
      enum: ['0.5', '1.0', '1.5', '2.0']
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required'],
      trim: true
    },
    yearOfManufacture: {
      type: Number,
      required: [true, 'Year of manufacture is required'],
      min: 1990,
      max: new Date().getFullYear()
    }
  },
  testData: {
    testDate: {
      type: Date,
      required: [true, 'Test date is required'],
      default: Date.now
    },
    testConditions: {
      temperature: {
        type: Number,
        required: [true, 'Temperature is required'],
        min: -10,
        max: 60
      },
      humidity: {
        type: Number,
        required: [true, 'Humidity is required'],
        min: 0,
        max: 100
      },
      frequency: {
        type: Number,
        required: [true, 'Frequency is required'],
        default: 50
      }
    },
    loadTests: [{
      loadPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 200
      },
      powerFactor: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      standardEnergy: {
        type: Number,
        required: true,
        min: 0
      },
      meterEnergy: {
        type: Number,
        required: true,
        min: 0
      },
      error: {
        type: Number,
        required: true
      },
      withinLimits: {
        type: Boolean,
        required: true
      }
    }],
    overallResult: {
      type: String,
      enum: ['PASS', 'FAIL'],
      required: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportFilePath: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'approved'],
    default: 'completed'
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Create compound index for efficient searching
testReportSchema.index({ branch: 1, testDate: -1 });
testReportSchema.index({ transformerNumber: 1 });
testReportSchema.index({ 'meterDetails.meterNumber': 1 });

// Generate report number before saving
testReportSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Find the last report for this month
    const lastReport = await this.constructor.findOne({
      reportNumber: new RegExp(`^EMT-${year}${month}-`)
    }).sort({ reportNumber: -1 });
    
    let sequence = 1;
    if (lastReport) {
      const lastSequence = parseInt(lastReport.reportNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.reportNumber = `EMT-${year}${month}-${String(sequence).padStart(4, '0')}`;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('TestReport', testReportSchema);
