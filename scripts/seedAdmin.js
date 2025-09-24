const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Malith:malith@cluster0.4frqd8c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Create admin user
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@leco.com',
        password: 'admin123',
        role: 'admin',
        branch: 'Head Office',
        isActive: true
      });

      await adminUser.save();
      console.log('Admin user created successfully:', adminUser.username);
    } else {
      console.log('Admin user already exists:', existingAdmin.username);
    }

    // Create sample users for each role
    const sampleUsers = [
      {
        username: 'tech_officer1',
        email: 'tech1@leco.com',
        password: 'tech123',
        role: 'technical_officer',
        branch: 'Negombo',
        isActive: true
      },
      {
        username: 'chief_engineer1',
        email: 'chief1@leco.com',
        password: 'chief123',
        role: 'chief_engineer',
        branch: 'Head Office',
        isActive: true
      },
      {
        username: 'branch_viewer1',
        email: 'viewer1@leco.com',
        password: 'viewer123',
        role: 'branch_viewer',
        branch: 'Negombo',
        isActive: true
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log('Sample user created:', user.username);
      } else {
        console.log('Sample user already exists:', userData.username);
      }
    }

    console.log('Seeding completed successfully!');
    console.log('\nSample login credentials:');
    console.log('Admin: admin / admin123');
    console.log('Technical Officer: tech_officer1 / tech123');
    console.log('Chief Engineer: chief_engineer1 / chief123');
    console.log('Branch Viewer: branch_viewer1 / viewer123');

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeding function
seedAdmin();