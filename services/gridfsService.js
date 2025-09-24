const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

class GridFSService {
  constructor() {
    this.bucket = null;
    this.initialized = false;
    this.initializationPromise = null;
    // Don't initialize immediately - wait for MongoDB to be ready
  }

  async initializeGridFS() {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB not connected, GridFS initialization skipped');
        throw new Error('MongoDB not connected');
      }

      console.log('MongoDB connection state:', mongoose.connection.readyState);
      console.log('MongoDB database name:', mongoose.connection.db.databaseName);

      // Initialize GridFS using modern MongoDB driver
      this.bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'pdfs'
      });
      this.initialized = true;
      console.log('GridFS initialized successfully with bucket name: pdfs');
    } catch (error) {
      console.error('Error initializing GridFS:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (this.initialized) {
      return true;
    }
    
    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.initialized;
    }
    
    this.initializationPromise = this.initializeGridFS().catch(error => {
      console.warn('GridFS initialization failed:', error.message);
      this.initializationPromise = null;
      throw error;
    });
    
    await this.initializationPromise;
    return this.initialized;
  }

  // Upload a PDF file to GridFS
  async uploadPDF(filename, buffer, metadata = {}) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.bucket) {
        return reject(new Error('GridFS not initialized'));
      }

      console.log('GridFS: Starting upload for', filename, 'buffer size:', buffer.length);
      
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: metadata
      });

      // Add timeout
      const timeout = setTimeout(() => {
        console.error('GridFS upload timeout after 30 seconds');
        reject(new Error('GridFS upload timeout'));
      }, 30000);

      uploadStream.on('error', (error) => {
        console.error('GridFS upload error:', error);
        clearTimeout(timeout);
        reject(error);
      });

      uploadStream.on('finish', () => {
        console.log('GridFS: Upload completed successfully');
        console.log('GridFS: File ID:', uploadStream.id);
        console.log('GridFS: File length:', uploadStream.length);
        clearTimeout(timeout);
        resolve({
          _id: uploadStream.id,
          filename: filename,
          length: uploadStream.length
        });
      });

      // Create a readable stream from buffer
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);

      readable.pipe(uploadStream);
    });
  }

  // Download a PDF file from GridFS
  async downloadPDF(fileId) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.bucket) {
        return reject(new Error('GridFS not initialized'));
      }

      const downloadStream = this.bucket.openDownloadStream(fileId);
      const chunks = [];

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('error', (error) => {
        console.error('GridFS download error:', error);
        reject(error);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });
  }

  // Get file metadata from GridFS
  async getFileInfo(fileId) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.bucket) {
        return reject(new Error('GridFS not initialized'));
      }

      this.bucket.find({ _id: fileId }).toArray((error, files) => {
        if (error) {
          console.error('GridFS find error:', error);
          reject(error);
        } else if (files.length === 0) {
          reject(new Error('File not found'));
        } else {
          resolve(files[0]);
        }
      });
    });
  }

  // Delete a PDF file from GridFS
  async deletePDF(fileId) {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.bucket) {
        return reject(new Error('GridFS not initialized'));
      }

      this.bucket.delete(fileId, (error) => {
        if (error) {
          console.error('GridFS delete error:', error);
          reject(error);
        } else {
          console.log('PDF deleted from GridFS:', fileId);
          resolve(true);
        }
      });
    });
  }

  // Check if file exists in GridFS
  async fileExists(fileId) {
    try {
      await this.ensureInitialized();
      const file = await this.getFileInfo(fileId);
      return !!file;
    } catch (error) {
      return false;
    }
  }

  // Get file stream for direct serving
  async getFileStream(fileId) {
    await this.ensureInitialized();
    
    if (!this.bucket) {
      throw new Error('GridFS not initialized');
    }

    return this.bucket.openDownloadStream(fileId);
  }
}

// Create singleton instance
const gridFSService = new GridFSService();

module.exports = gridFSService;
