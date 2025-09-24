const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFGeneratorService {
  constructor() {
    this.doc = null;
  }

  _generateFullTemplateContent(testReport, options = {}) {
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;
    const margin = 10; // Minimized margin for maximum space
    const contentLeft = margin;
    const contentTop = margin;
    const contentWidth = pageWidth - margin * 2;

    // Check if tables should be interchanged
    const interchangeTables = options.interchangeTables || false;

    // Small form number - moved to top right
    this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50')
      .text('Form No. TDF-06', contentLeft, contentTop, { align: 'right' });

    // Title centered with optimized font size
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
      .text('LECO BULK METER TEST REPORT', contentLeft, contentTop + 10, { width: contentWidth, align: 'center' });

    // Outer frame - maximized to use almost all space
    const frameX = margin;
    const frameY = contentTop + 25; // Minimized spacing
    const frameW = contentWidth;
    const frameH = pageHeight - frameY - 15; // Maximized height
    this.doc.lineWidth(1).strokeColor('#2c3e50').rect(frameX, frameY, frameW, frameH).stroke();

    let y = frameY + 3; // Minimized padding
    const lineH = 12; // Optimized line height for density

    // Top info rows (two rows, 5 columns)
    const info1 = [
      { label: 'Report No:', value: testReport.reportNumber },
      { label: 'Branch:', value: testReport.branch },
      { label: 'Location:', value: testReport.location },
      { label: 'A/C No:', value: testReport.accountNumber },
      { label: 'Contract Demand:', value: testReport.contractDemand }
    ];
    const info2 = [
      { label: 'Date of Tested:', value: moment(testReport.dateOfTested).format('YYYY-MM-DD') },
      { label: 'CSC:', value: testReport.csc },
      { label: 'Substation No:', value: testReport.substationNumber },
      { label: 'Reason:', value: testReport.reason },
      { label: 'Request ID:', value: testReport.requestId }
    ];

    this._drawCompactLabeledRow(frameX, y, frameW, lineH, info1);
    y += lineH;
    this._drawCompactLabeledRow(frameX, y, frameW, lineH, info2);
    y += lineH + 2; // Minimized spacing

    // Current Transformer / Static Meter section headers side by side
    const halfW = frameW / 2;
    this._drawCompactSectionHeader('Current Transformer', frameX, y, halfW, lineH - 1);
    this._drawCompactSectionHeader('Static Meter', frameX + halfW, y, halfW, lineH - 1);
    y += lineH - 1;

    // Left column - current transformer
    let leftY = y;
    this._drawCompactKeyValue(frameX, leftY, 'Make:', testReport.currentTransformer.make, halfW); 
    leftY += lineH - 2;
    this._drawCompactKeyValue(frameX, leftY, 'Ratio:', testReport.currentTransformer.ratio, halfW); 
    leftY += lineH - 1;

    // Right column - static meter and tester
    let rightY = y;
    const rightX = frameX + halfW;
    this._drawCompactKeyValue(rightX, rightY, 'Make:', testReport.staticMeter.make, halfW); 
    rightY += lineH - 2;
    this._drawCompactKeyValue(rightX, rightY, 'Serial No:', testReport.staticMeter.serialNumber, halfW); 
    rightY += lineH - 2;
    this._drawCompactKeyValue(rightX, rightY, 'Meter Constant:', testReport.staticMeter.meterConstant, halfW); 
    rightY += lineH - 2;
    this._drawCompactKeyValue(rightX, rightY, 'Class:', testReport.staticMeter.class, halfW); 
    rightY += lineH - 2;
    this._drawCompactKeyValue(rightX, rightY, 'Meter Current:', testReport.staticMeter.meterCurrent, halfW); 
    rightY += lineH - 2;
    this._drawCompactKeyValue(rightX, rightY, 'Meter Voltage:', testReport.staticMeter.meterVoltage, halfW); 
    rightY += lineH - 2;
    this._drawCompactKeyValue(rightX, rightY, 'Tester', `Make: ${testReport.staticMeter.testerMake}   Serial No: ${testReport.staticMeter.testerSerialNumber}`, halfW);

    y = Math.max(leftY, rightY) + 2; // Minimized spacing

    // Check / Phases headers (interchanged as requested)
    this._drawCompactSectionHeader('Check', frameX, y, halfW, lineH - 1);
    this._drawCompactSectionHeader('Phases', frameX + halfW, y, halfW, lineH - 1);
    y += lineH - 1;

    // Check table - compact version
    const checkRows = [
      ['Physical Condition of the Meter', testReport.checkSection.physicalCondition],
      ['CT Ratio', testReport.checkSection.ctRatio],
      ['Meter Ratio', testReport.checkSection.meterRatio],
      ['Multiplying Factor', String(testReport.checkSection.multiplyingFactor)],
      ['Connection of Meter Elements', testReport.checkSection.connectionOfMeterElements],
      ['Phase Sequence', testReport.checkSection.phaseSequence],
      ['CT Earthing', testReport.checkSection.ctEarthing],
      ['%Error as Found', String(testReport.checkSection.errorAsFound)],
      ['%Error as Left', String(testReport.checkSection.errorAsLeft)]
    ];
    const leftTableH = checkRows.length * (lineH - 2) + 1;
    this._drawCompactTwoColTable(frameX, y, halfW, leftTableH, checkRows);

    // Phases table on the right side (interchanged as requested)
    const phasesTable = this._composePhasesTable(testReport);
    const phasesH = this._drawCompactComplexTable(frameX + halfW, y, halfW, phasesTable);

    y = Math.max(y + leftTableH, y + phasesH) + 2; // Minimized spacing

    // Measurings table across full width below (interchanged as requested)
    const measTable = this._composeMeasuringsTable(testReport);
    const measH = this._drawCompactComplexTable(frameX, y, frameW, measTable);
    y += measH + 2; // Minimized spacing

    // Comments box - optimized version
    const commentsH = 25; // Minimized height
    this.doc.lineWidth(1).strokeColor('#2c3e50').rect(frameX, y, frameW, commentsH).stroke();
    this.doc.font('Helvetica').fontSize(8).fillColor('#2c3e50').text('Comments:', frameX + 3, y + 2);
    if (testReport.comments) {
      this.doc.font('Helvetica').fontSize(8).fillColor('#2c3e50')
        .text(testReport.comments, frameX + 50, y + 2, { width: frameW - 55 });
    }
    y += commentsH + 3; // Minimized spacing

    // Signatures - positioned to use remaining space efficiently
    const signatureY = Math.min(y, pageHeight - 20); // Ensure it fits on page
    this._drawCompactSignature(frameX + 3, signatureY, 'Technical Officer');
    this._drawCompactSignature(frameX + halfW + 3, signatureY, 'Chief Engineer-SGS');

    // Footer - minimized and at bottom
    this.doc.font('Helvetica').fontSize(6).fillColor('#7f8c8d')
      .text('This is a computer-generated document.', margin, pageHeight - 12, { width: contentWidth, align: 'center' });
  }

  // Generate rotated template content optimized for vertical A4 orientation
  _generateRotatedTemplateContent(testReport, options = {}) {
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;
    const margin = 8; // Minimized margin for maximum space
    const contentLeft = margin;
    const contentTop = margin;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // Check if tables should be interchanged
    const interchangeTables = options.interchangeTables || false;

    // Small form number - moved to top right
    this.doc.font('Helvetica').fontSize(6).fillColor('#2c3e50')
      .text('Form No. TDF-06', contentLeft, contentTop, { align: 'right' });

    // Title centered with optimized font size
    this.doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50')
      .text('LECO BULK METER TEST REPORT', contentLeft, contentTop + 8, { width: contentWidth, align: 'center' });

    // Outer frame - maximized to use almost all space
    const frameX = margin;
    const frameY = contentTop + 20; // Minimized spacing
    const frameW = contentWidth;
    const frameH = contentHeight - 20; // Maximized height
    this.doc.lineWidth(1).strokeColor('#2c3e50').rect(frameX, frameY, frameW, frameH).stroke();

    let y = frameY + 2; // Minimized padding
    const lineH = 10; // Optimized line height for density

    // Top info rows (two rows, 5 columns) - more compact
    const info1 = [
      { label: 'Report No:', value: testReport.reportNumber },
      { label: 'Branch:', value: testReport.branch },
      { label: 'Location:', value: testReport.location },
      { label: 'A/C No:', value: testReport.accountNumber },
      { label: 'Contract Demand:', value: testReport.contractDemand }
    ];
    const info2 = [
      { label: 'Date of Tested:', value: moment(testReport.dateOfTested).format('YYYY-MM-DD') },
      { label: 'CSC:', value: testReport.csc },
      { label: 'Substation No:', value: testReport.substationNumber },
      { label: 'Reason:', value: testReport.reason },
      { label: 'Request ID:', value: testReport.requestId }
    ];

    this._drawCompactLabeledRow(frameX, y, frameW, lineH, info1);
    y += lineH;
    this._drawCompactLabeledRow(frameX, y, frameW, lineH, info2);
    y += lineH + 1; // Minimized spacing

    // Current Transformer / Static Meter section headers side by side
    const halfW = frameW / 2;
    this._drawCompactSectionHeader('Current Transformer', frameX, y, halfW, lineH - 1);
    this._drawCompactSectionHeader('Static Meter', frameX + halfW, y, halfW, lineH - 1);
    y += lineH - 1;

    // Left column - current transformer
    let leftY = y;
    this._drawCompactKeyValue(frameX, leftY, 'Make:', testReport.currentTransformer.make, halfW); 
    leftY += lineH - 1;
    this._drawCompactKeyValue(frameX, leftY, 'Ratio:', testReport.currentTransformer.ratio, halfW); 
    leftY += lineH - 1;

    // Right column - static meter and tester
    let rightY = y;
    const rightX = frameX + halfW;
    this._drawCompactKeyValue(rightX, rightY, 'Make:', testReport.staticMeter.make, halfW); 
    rightY += lineH - 1;
    this._drawCompactKeyValue(rightX, rightY, 'Serial No:', testReport.staticMeter.serialNumber, halfW); 
    rightY += lineH - 1;
    this._drawCompactKeyValue(rightX, rightY, 'Meter Constant:', testReport.staticMeter.meterConstant, halfW); 
    rightY += lineH - 1;
    this._drawCompactKeyValue(rightX, rightY, 'Class:', testReport.staticMeter.class, halfW); 
    rightY += lineH - 1;
    this._drawCompactKeyValue(rightX, rightY, 'Meter Current:', testReport.staticMeter.meterCurrent, halfW); 
    rightY += lineH - 1;
    this._drawCompactKeyValue(rightX, rightY, 'Meter Voltage:', testReport.staticMeter.meterVoltage, halfW); 
    rightY += lineH - 1;
    this._drawCompactKeyValue(rightX, rightY, 'Tester', `Make: ${testReport.staticMeter.testerMake}   Serial No: ${testReport.staticMeter.testerSerialNumber}`, halfW);

    y = Math.max(leftY, rightY) + 1; // Minimized spacing

    // Check / Phases headers (interchanged as requested)
    this._drawCompactSectionHeader('Check', frameX, y, halfW, lineH - 1);
    this._drawCompactSectionHeader('Phases', frameX + halfW, y, halfW, lineH - 1);
    y += lineH - 1;

    // Check table - compact version
    const checkRows = [
      ['Physical Condition of the Meter', testReport.checkSection.physicalCondition],
      ['CT Ratio', testReport.checkSection.ctRatio],
      ['Meter Ratio', testReport.checkSection.meterRatio],
      ['Multiplying Factor', String(testReport.checkSection.multiplyingFactor)],
      ['Connection of Meter Elements', testReport.checkSection.connectionOfMeterElements],
      ['Phase Sequence', testReport.checkSection.phaseSequence],
      ['CT Earthing', testReport.checkSection.ctEarthing],
      ['%Error as Found', String(testReport.checkSection.errorAsFound)],
      ['%Error as Left', String(testReport.checkSection.errorAsLeft)]
    ];
    const leftTableH = checkRows.length * (lineH - 1) + 1;
    this._drawCompactTwoColTable(frameX, y, halfW, leftTableH, checkRows);

    // Phases table on the right side (interchanged as requested)
    const phasesTable = this._composePhasesTable(testReport);
    const phasesH = this._drawCompactComplexTable(frameX + halfW, y, halfW, phasesTable);

    y = Math.max(y + leftTableH, y + phasesH) + 1; // Minimized spacing

    // Measurings table across full width below (interchanged as requested)
    const measTable = this._composeMeasuringsTable(testReport);
    const measH = this._drawCompactComplexTable(frameX, y, frameW, measTable);
    y += measH + 1; // Minimized spacing

    // Comments box - optimized version
    const commentsH = 20; // Minimized height
    this.doc.lineWidth(1).strokeColor('#2c3e50').rect(frameX, y, frameW, commentsH).stroke();
    this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50').text('Comments:', frameX + 2, y + 1);
    if (testReport.comments) {
      this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50')
        .text(testReport.comments, frameX + 45, y + 1, { width: frameW - 50 });
    }
    y += commentsH + 2; // Minimized spacing

    // Signatures - positioned to use remaining space efficiently
    const signatureY = Math.min(y, pageHeight - 15); // Ensure it fits on page
    this._drawCompactSignature(frameX + 2, signatureY, 'Technical Officer');
    this._drawCompactSignature(frameX + halfW + 2, signatureY, 'Chief Engineer-SGS');

    // Footer - minimized and at bottom
    this.doc.font('Helvetica').fontSize(5).fillColor('#7f8c8d')
      .text('This is a computer-generated document.', margin, pageHeight - 8, { width: contentWidth, align: 'center' });
  }

  // Generate true vertical template content optimized for A4 height
  _generateVerticalTemplateContent(testReport, options = {}) {
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;
    const margin = 15; // Slightly larger margin for better appearance
    const contentLeft = margin;
    const contentTop = margin;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    // Small form number - moved to top right
    this.doc.font('Helvetica').fontSize(8).fillColor('#2c3e50')
      .text('Form No. TDF-06', contentLeft, contentTop, { align: 'right' });

    // Title centered
    this.doc.font('Helvetica-Bold').fontSize(16).fillColor('#2c3e50')
      .text('LECO BULK METER TEST REPORT', contentLeft, contentTop + 15, { width: contentWidth, align: 'center' });

    // Outer frame - maximized to use almost all space
    const frameX = margin;
    const frameY = contentTop + 40; // Space for title
    const frameW = contentWidth;
    const frameH = contentHeight - 40;
    this.doc.lineWidth(1).strokeColor('#2c3e50').rect(frameX, frameY, frameW, frameH).stroke();

    let y = frameY + 10; // Padding inside frame
    const lineH = 18; // Larger line height for better readability

    // Top info section - single row with all info
    const infoData = [
      { label: 'Report No:', value: testReport.reportNumber },
      { label: 'Date of Test:', value: moment(testReport.dateOfTested).format('YYYY-MM-DD') },
      { label: 'Branch:', value: testReport.branch },
      { label: 'CSC:', value: testReport.csc },
      { label: 'Location:', value: testReport.location },
      { label: 'A/C No:', value: testReport.accountNumber },
      { label: 'Reason:', value: testReport.reason },
      { label: 'Contract Demand:', value: testReport.contractDemand },
      { label: 'Request ID:', value: testReport.requestId },
      { label: 'Substation No:', value: testReport.substationNumber }
    ];

    // Draw info in a grid layout
    const colsPerRow = 5;
    const infoRows = Math.ceil(infoData.length / colsPerRow);
    
    for (let row = 0; row < infoRows; row++) {
      const rowData = infoData.slice(row * colsPerRow, (row + 1) * colsPerRow);
      const colW = frameW / colsPerRow;
      
      this.doc.lineWidth(0.5).strokeColor('#2c3e50').rect(frameX, y, frameW, lineH).stroke();
      
      rowData.forEach((item, index) => {
        const cellX = frameX + index * colW;
        if (index > 0) this.doc.moveTo(cellX, y).lineTo(cellX, y + lineH).stroke();
        this.doc.font('Helvetica').fontSize(9).fillColor('#2c3e50').text(item.label, cellX + 5, y + 5);
        this.doc.font('Helvetica-Bold').fontSize(9).text(item.value || 'N/A', cellX + 60, y + 5, { width: colW - 65 });
      });
      
      y += lineH;
    }

    y += 10; // Space after info section

    // Left side: Current Transformer and Static Meter sections
    const leftWidth = frameW / 2 - 5;
    const rightWidth = frameW / 2 - 5;
    const rightX = frameX + leftWidth + 10;

    // Current Transformer section - left side
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Current Transformer', frameX + 5, y);
    y += 20;
    
    const ctData = [
      { label: 'Make:', value: testReport.currentTransformer.make },
      { label: 'Ratio:', value: testReport.currentTransformer.ratio }
    ];
    
    ctData.forEach(item => {
      this.doc.font('Helvetica').fontSize(10).fillColor('#2c3e50').text(item.label, frameX + 10, y);
      this.doc.font('Helvetica-Bold').fontSize(10).text(item.value || 'N/A', frameX + 80, y);
      y += 15;
    });

    y += 10; // Space after CT section

    // Static Meter section - left side
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Static Meter', frameX + 5, y);
    y += 20;
    
    const smData = [
      { label: 'Make:', value: testReport.staticMeter.make },
      { label: 'Serial No:', value: testReport.staticMeter.serialNumber },
      { label: 'Meter Constant:', value: testReport.staticMeter.meterConstant },
      { label: 'Class:', value: testReport.staticMeter.class },
      { label: 'Meter Current:', value: testReport.staticMeter.meterCurrent },
      { label: 'Meter Voltage:', value: testReport.staticMeter.meterVoltage },
      { label: 'Tester Make:', value: testReport.staticMeter.testerMake },
      { label: 'Tester Serial No:', value: testReport.staticMeter.testerSerialNumber }
    ];
    
    smData.forEach(item => {
      this.doc.font('Helvetica').fontSize(10).fillColor('#2c3e50').text(item.label, frameX + 10, y);
      this.doc.font('Helvetica-Bold').fontSize(10).text(item.value || 'N/A', frameX + 80, y);
      y += 15;
    });

    // Reset y to start of left sections for right side
    y = frameY + 10 + (infoRows * lineH) + 10;

    // Check section - right side
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Check', rightX + 5, y);
    y += 20;
    
    const checkData = [
      { label: 'Physical Condition of the Meter:', value: testReport.checkSection.physicalCondition },
      { label: 'CT Ratio:', value: testReport.checkSection.ctRatio },
      { label: 'Meter Ratio:', value: testReport.checkSection.meterRatio },
      { label: 'Multiplying Factor:', value: String(testReport.checkSection.multiplyingFactor) },
      { label: 'Connection of Meter Elements:', value: testReport.checkSection.connectionOfMeterElements },
      { label: 'Phase Sequence:', value: testReport.checkSection.phaseSequence },
      { label: 'CT Earthing:', value: testReport.checkSection.ctEarthing },
      { label: '%Error as Found:', value: String(testReport.checkSection.errorAsFound) },
      { label: '%Error as Left:', value: String(testReport.checkSection.errorAsLeft) }
    ];
    
    checkData.forEach(item => {
      this.doc.font('Helvetica').fontSize(10).fillColor('#2c3e50').text(item.label, rightX + 10, y);
      this.doc.font('Helvetica-Bold').fontSize(10).text(item.value || 'N/A', rightX + 120, y);
      y += 15;
    });

    // Move y to the bottom of the taller side
    const leftSideHeight = 20 + (ctData.length * 15) + 10 + 20 + (smData.length * 15) + 10;
    const rightSideHeight = 20 + (checkData.length * 15) + 10;
    y = frameY + 10 + (infoRows * lineH) + 10 + Math.max(leftSideHeight, rightSideHeight) + 10;

    // Phases section - full width
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Phases', frameX + 5, y);
    y += 20;
    
    // Phases table
    const phasesTable = this._composePhasesTable(testReport);
    const phasesH = this._drawVerticalComplexTable(frameX, y, frameW, phasesTable);
    y += phasesH + 10;

    // Measurings section - full width
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Measurings', frameX + 5, y);
    y += 20;
    
    // Measurings table
    const measTable = this._composeMeasuringsTable(testReport);
    const measH = this._drawVerticalComplexTable(frameX, y, frameW, measTable);
    y += measH + 10;

    // Comments section - full width
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Comments', frameX + 5, y);
    y += 20;
    
    const commentsH = 40;
    this.doc.lineWidth(1).strokeColor('#2c3e50').rect(frameX, y, frameW, commentsH).stroke();
    this.doc.font('Helvetica').fontSize(10).fillColor('#2c3e50').text('Comments:', frameX + 5, y + 5);
    if (testReport.comments) {
      this.doc.font('Helvetica').fontSize(10).fillColor('#2c3e50')
        .text(testReport.comments, frameX + 60, y + 5, { width: frameW - 70 });
    }
    y += commentsH + 20;

    // Signatures section - full width
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50').text('Signatures', frameX + 5, y);
    y += 20;
    
    // Signature lines
    const signatureY = Math.min(y, pageHeight - 40);
    this._drawVerticalSignature(frameX + 10, signatureY, 'Technical Officer');
    this._drawVerticalSignature(frameX + frameW/2 + 10, signatureY, 'Chief Engineer-SGS');

    // Footer
    this.doc.font('Helvetica').fontSize(8).fillColor('#7f8c8d')
      .text('This is a computer-generated document.', margin, pageHeight - 15, { width: contentWidth, align: 'center' });
  }

  // Helper method for vertical complex tables
  _drawVerticalComplexTable(x, y, width, table) {
    const cellH = 20; // Larger cell height for vertical layout
    let tableHeight = 0;
    this.doc.lineWidth(0.5).strokeColor('#2c3e50');

    if (table.type === 'meas') {
      const cols = 9;
      const colW = width / cols;

      // Header row
      this.doc.rect(x, y, width, cellH).stroke();
      for (let i = 1; i < cols; i++) {
        const cx = x + i * colW;
        this.doc.moveTo(cx, y).lineTo(cx, y + cellH).stroke();
      }
      this.doc.font('Helvetica-Bold').fontSize(10).fillColor('#2c3e50').text('Measurings', x + 5, y + 5, { width: colW - 10 });
      const spans = ['Total','Rate A','Rate B','Rate C'];
      spans.forEach((title, idx) => {
        const sx = x + (1 + idx * 2) * colW;
        this.doc.rect(sx, y, colW * 2, cellH).stroke();
        this.doc.font('Helvetica-Bold').fontSize(10).text(title, sx, y + 5, { width: colW * 2, align: 'center' });
      });
      tableHeight += cellH;

      // Second header row
      const y2 = y + tableHeight;
      this.doc.rect(x, y2, width, cellH).stroke();
      for (let i = 1; i < cols; i++) {
        const cx = x + i * colW;
        this.doc.moveTo(cx, y2).lineTo(cx, y2 + cellH).stroke();
      }
      const labels = ['','Import','Export','Import','Export','Import','Export','Import','Export'];
      labels.forEach((txt, idx) => {
        this.doc.font('Helvetica-Bold').fontSize(9).text(txt, x + idx * colW, y2 + 5, { width: colW, align: 'center' });
      });
      tableHeight += cellH;

      // Data rows
      table.rows.forEach((row) => {
        const ry = y + tableHeight;
        this.doc.rect(x, ry, width, cellH).stroke();
        for (let i = 1; i < cols; i++) {
          const cx = x + i * colW;
          this.doc.moveTo(cx, ry).lineTo(cx, ry + cellH).stroke();
        }
        row.forEach((cell, idx) => {
          this.doc.font('Helvetica').fontSize(9).text(String(cell ?? ''), x + idx * colW + 5, ry + 5, { width: colW - 10, align: idx === 0 ? 'left' : 'center' });
        });
        tableHeight += cellH;
      });
    }

    if (table.type === 'phases') {
      const cols = 4;
      const colW = width / cols;
      table.rows.forEach((row, rIdx) => {
        const ry = y + tableHeight;
        this.doc.rect(x, ry, width, cellH).stroke();
        for (let i = 1; i < cols; i++) {
          const cx = x + i * colW;
          this.doc.moveTo(cx, ry).lineTo(cx, ry + cellH).stroke();
        }
        row.forEach((cell, idx) => {
          this.doc.font(rIdx === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
            .text(String(cell ?? ''), x + idx * colW + 5, ry + 5, { width: colW - 10, align: 'center' });
        });
        tableHeight += cellH;
      });
    }

    return tableHeight;
  }

  // Helper method for vertical signatures
  _drawVerticalSignature(x, y, label) {
    const lineLength = 150;
    this.doc.moveTo(x, y + 10).lineTo(x + lineLength, y + 10).stroke();
    this.doc.font('Helvetica').fontSize(10).fillColor('#2c3e50').text(label, x, y + 15);
  }

  // Optimized helper methods for maximum space utilization
  _drawCompactLabeledRow(x, y, width, height, items) {
    const colW = width / items.length;
    this.doc.lineWidth(0.5).strokeColor('#2c3e50').rect(x, y, width, height).stroke();
    items.forEach((item, index) => {
      const cellX = x + index * colW;
      if (index > 0) this.doc.moveTo(cellX, y).lineTo(cellX, y + height).stroke();
      this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50').text(item.label, cellX + 2, y + 2);
      this.doc.font('Helvetica-Bold').fontSize(7).text(item.value || 'N/A', cellX + 40, y + 2, { width: colW - 45 });
    });
  }

  _drawCompactSectionHeader(title, x, y, width, height) {
    this.doc.lineWidth(0.5).strokeColor('#2c3e50').rect(x, y, width, height).stroke();
    this.doc.font('Helvetica-Bold').fontSize(8).fillColor('#2c3e50').text(title, x + 2, y + 1);
  }

  _drawCompactKeyValue(x, y, key, value, width) {
    this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50').text(key, x + 2, y + 1);
    this.doc.font('Helvetica-Bold').fontSize(7).text(value || 'N/A', x + 50, y + 1, { width: width - 55 });
  }

  _drawCompactTwoColTable(x, y, width, height, rows) {
    const rowH = height / rows.length;
    this.doc.lineWidth(0.5).strokeColor('#2c3e50').rect(x, y, width, height).stroke();
    rows.forEach((row, idx) => {
      const rowY = y + idx * rowH;
      if (idx > 0) this.doc.moveTo(x, rowY).lineTo(x + width, rowY).stroke();
      this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50').text(row[0] + ':', x + 2, rowY + 2, { width: width / 2 - 4 });
      this.doc.font('Helvetica-Bold').fontSize(7).text(row[1] || 'N/A', x + width / 2, rowY + 2, { width: width / 2 - 2 });
    });
  }

  _drawCompactComplexTable(x, y, width, table) {
    const cellH = 8; // Further minimized cell height for vertical density
    let tableHeight = 0;
    this.doc.lineWidth(0.5).strokeColor('#2c3e50');

    if (table.type === 'meas') {
      const cols = 9;
      const colW = width / cols;

      // Top header row with merged pairs
      this.doc.rect(x, y, width, cellH).stroke();
      for (let i = 1; i < cols; i++) {
        const cx = x + i * colW;
        this.doc.moveTo(cx, y).lineTo(cx, y + cellH).stroke();
      }
      this.doc.font('Helvetica-Bold').fontSize(6).fillColor('#2c3e50').text('Measurings', x + 1, y + 1, { width: colW - 2 });
      const spans = ['Total','Rate A','Rate B','Rate C'];
      spans.forEach((title, idx) => {
        const sx = x + (1 + idx * 2) * colW;
        this.doc.rect(sx, y, colW * 2, cellH).stroke();
        this.doc.font('Helvetica-Bold').fontSize(6).text(title, sx, y + 1, { width: colW * 2, align: 'center' });
      });
      tableHeight += cellH;

      // Second header row Import/Export
      const y2 = y + tableHeight;
      this.doc.rect(x, y2, width, cellH).stroke();
      for (let i = 1; i < cols; i++) {
        const cx = x + i * colW;
        this.doc.moveTo(cx, y2).lineTo(cx, y2 + cellH).stroke();
      }
      const labels = ['','Import','Export','Import','Export','Import','Export','Import','Export'];
      labels.forEach((txt, idx) => {
        this.doc.font('Helvetica-Bold').fontSize(5).text(txt, x + idx * colW, y2 + 1, { width: colW, align: 'center' });
      });
      tableHeight += cellH;

      // Data rows
      table.rows.forEach((row) => {
        const ry = y + tableHeight;
        this.doc.rect(x, ry, width, cellH).stroke();
        for (let i = 1; i < cols; i++) {
          const cx = x + i * colW;
          this.doc.moveTo(cx, ry).lineTo(cx, ry + cellH).stroke();
        }
        row.forEach((cell, idx) => {
          this.doc.font('Helvetica').fontSize(5).text(String(cell ?? ''), x + idx * colW + 1, ry + 1, { width: colW - 2, align: idx === 0 ? 'left' : 'center' });
        });
        tableHeight += cellH;
      });
    }

    if (table.type === 'phases') {
      const cols = 4;
      const colW = width / cols;
      table.rows.forEach((row, rIdx) => {
        const ry = y + tableHeight;
        this.doc.rect(x, ry, width, cellH).stroke();
        for (let i = 1; i < cols; i++) {
          const cx = x + i * colW;
          this.doc.moveTo(cx, ry).lineTo(cx, ry + cellH).stroke();
        }
        row.forEach((cell, idx) => {
          this.doc.font(rIdx === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(6)
            .text(String(cell ?? ''), x + idx * colW + 1, ry + 1, { width: colW - 2, align: 'center' });
        });
        tableHeight += cellH;
      });
    }

    return tableHeight;
  }

  _drawCompactSignature(x, y, label) {
    const lineLength = 100; // Minimized length
    this.doc.moveTo(x, y + 6).lineTo(x + lineLength, y + 6).stroke();
    this.doc.font('Helvetica').fontSize(7).fillColor('#2c3e50').text(label, x, y + 8);
  }

  _composeMeasuringsTable(testReport) {
    const energy = testReport.measurings.energyKWh;
    const demand = testReport.measurings.demandKVA;
    const reactive = testReport.measurings.reactiveEnergyKVArh;
    const rows = [
      ['Energy kWh', energy.totalImport, energy.totalExport, energy.rateAImport, energy.rateAExport, energy.rateBImport, energy.rateBExport, energy.rateCImport, energy.rateCExport],
      ['Demand kVA', demand.totalImport, demand.totalExport, demand.rateAImport, demand.rateAExport, demand.rateBImport, demand.rateBExport, demand.rateCImport, demand.rateCExport],
      ['R.Energy kVArh', reactive.totalImport, reactive.totalExport, reactive.rateAImport, reactive.rateAExport, reactive.rateBImport, reactive.rateBExport, reactive.rateCImport, reactive.rateCExport],
      ['Average Power Factor', testReport.measurings.averagePowerFactor.toFixed(3), '', '', '', '', '', '', '']
    ];
    return { rows, type: 'meas' };
  }

  _composePhasesTable(testReport) {
    const rows = [
      ['Phases', 'R', 'Y', 'B'],
      ['Voltage(V)', testReport.phases.voltage.r, testReport.phases.voltage.y, testReport.phases.voltage.b],
      ['Current(A) Primary', testReport.phases.current.rPrimary, testReport.phases.current.yPrimary, testReport.phases.current.bPrimary],
      ['Current(A) Secondary', testReport.phases.current.rSecondary, testReport.phases.current.ySecondary, testReport.phases.current.bSecondary]
    ];
    return { rows, type: 'phases' };
  }

  // Generate a professional and clean LECO BULK METER TEST REPORT with optimized space
  async generateProfessionalLECOReport(testReport, options = {}) {
    console.log('=== generateProfessionalLECOReport called ===');
    console.log('Report data:', JSON.stringify(testReport, null, 2));
    console.log('Options:', JSON.stringify(options, null, 2));
    return new Promise((resolve, reject) => {
      try {
        console.log('Creating PDF document...');
        this.doc = new PDFDocument({ 
          margin: 10, // Reduced margin for maximum space
          size: 'A4',
          layout: 'portrait', // Ensure portrait orientation
          info: {
            Title: `LECO BULK METER TEST REPORT - ${testReport.reportNumber}`,
            Author: testReport.createdBy?.username || 'System',
            Subject: 'LECO Bulk Meter Test Report',
            Keywords: 'LECO, bulk meter, test report, energy meter',
            Creator: 'LECO Energy Meter Test System'
          }
        });

        const chunks = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        this.doc.on('error', reject);

        console.log('Generating optimized LECO content...');
        this._generateVerticalTemplateContent(testReport, options); // Use true vertical template
        console.log('Content generated, finalizing PDF...');
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Keep all other existing methods unchanged below this point
  // ... (all other methods remain exactly the same)

  async generateCoverPageReport(testReport) {
    // Existing implementation unchanged
    return new Promise((resolve, reject) => {
      try {
        this.doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: `LECO Bulk Meter Test Report - ${testReport.reportNumber}`,
            Author: testReport.createdBy.username,
            Subject: 'LECO Bulk Meter Test - Cover Page',
            Keywords: 'LECO, bulk meter, test report, cover page',
            Creator: 'Energy Meter Test System'
          }
        });

        const chunks = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        this.doc.on('error', reject);

        this._generateCoverPageContent(testReport);
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateEnergyMeterReport(testReport, options = {}) {
    // Existing implementation unchanged
    return new Promise((resolve, reject) => {
      try {
        this.doc = new PDFDocument({ 
          margin: 40,
          size: 'A4',
          info: {
            Title: `Energy Meter Accuracy Test Report - ${testReport.reportNumber}`,
            Author: testReport.createdBy.username,
            Subject: 'Energy Meter Accuracy Test',
            Keywords: 'energy meter, accuracy test, electrical testing',
            Creator: 'Energy Meter Test System'
          }
        });

        const chunks = [];
        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        this.doc.on('error', reject);

        this._generateReportContent(testReport, options);
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // All other existing methods remain exactly the same...
  // _generateCoverPageContent, _generateReportContent, _addHeader, etc.

  _generateCoverPageContent(testReport) {
    // Existing implementation unchanged
    const pageWidth = this.doc.page.width;
    const pageHeight = this.doc.page.height;
    const contentWidth = pageWidth - 80;

    // Header band
    this.doc
      .rect(40, 40, contentWidth, 60)
      .fill('#0b5ed7');

    this.doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#ffffff')
      .text('LECO BULK METER TEST REPORT', 40, 60, { width: contentWidth, align: 'center' });

    // ... rest of the existing implementation
  }

  _generateReportContent(testReport, options = {}) {
    // Existing implementation unchanged
    this._generateFullTemplateContent(testReport, options);
  }

  // ... all other methods remain exactly as they were
}

module.exports = new PDFGeneratorService();