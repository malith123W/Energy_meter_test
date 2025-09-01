const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Malith:malith@cluster0.4frqd8c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('MongoDB connected successfully');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@energymeter.com',
      password: 'admin123', // This will be hashed automatically
      role: 'admin',
      branch: 'Head Office'
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@energymeter.com');
    console.log('Role: admin');
    console.log('Branch: Head Office');

    // Create a sample technician user
    const techUser = new User({
      username: 'technician1',
      email: 'tech1@energymeter.com',
      password: 'tech123',
      role: 'technician',
      branch: 'North Branch'
    });

    await techUser.save();
    console.log('\nSample technician user created!');
    console.log('Username: technician1');
    console.log('Password: tech123');
    console.log('Email: tech1@energymeter.com');
    console.log('Role: technician');
    console.log('Branch: North Branch');

    console.log('\nDatabase seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedAdmin();

