#!/usr/bin/env node

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const knex = require('knex');
const knexConfig = require('../knexfile');

async function seedTestUser() {
  const db = knex(knexConfig[process.env.NODE_ENV || 'development']);
  
  try {
    // Check if test user already exists
    const existingUser = await db('users')
      .where('email', 'test@example.com')
      .first();
    
    if (existingUser) {
      console.log('Test user already exists');
      process.exit(0);
    }
    
    // Create test user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('testpassword123', 10);
    
    await db('users').insert({
      id: userId,
      email: 'test@example.com',
      password_hash: passwordHash,
      name: 'Test User',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('Test user created successfully:');
    console.log('Email: test@example.com');
    console.log('Password: testpassword123');
    console.log('User ID:', userId);
    
    // Also create an admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('adminpassword123', 10);
    
    const existingAdmin = await db('users')
      .where('email', 'admin@example.com')
      .first();
    
    if (!existingAdmin) {
      await db('users').insert({
        id: adminId,
        email: 'admin@example.com',
        password_hash: adminPasswordHash,
        name: 'Admin User',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      console.log('\nAdmin user created successfully:');
      console.log('Email: admin@example.com');
      console.log('Password: adminpassword123');
      console.log('User ID:', adminId);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test user:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedTestUser();