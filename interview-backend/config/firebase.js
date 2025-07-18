// backend/config/firebase.js
const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { getStorage } = require('firebase/storage');
const { getAuth } = require('firebase/auth');

// Firebase Admin SDK initialization
const serviceAccount = {
  type: process.env.FIREBASE_ADMIN_TYPE,
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
  token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
  auth_provider_x509_cert_url: `https://www.googleapis.com/oauth2/v1/certs`,
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_ADMIN_CLIENT_EMAIL}`
};

// Initialize Firebase Admin (Server-side only)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aceme-7ec4f.appspot.com'
  });
}

// Admin instances for server-side operations
const adminDB = admin.firestore();
const adminStorage = admin.storage();
const adminAuth = admin.auth();

// Utility functions for common operations
const firebaseUtils = {
  // Verify Firebase ID token
  async verifyIdToken(idToken) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  },

  // Create custom token
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      const customToken = await adminAuth.createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      throw new Error('Error creating custom token: ' + error.message);
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      return userRecord;
    } catch (error) {
      throw new Error('Error fetching user: ' + error.message);
    }
  },

  // Create user
  async createUser(userData) {
    try {
      const userRecord = await adminAuth.createUser(userData);
      return userRecord;
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  },

  // Update user
  async updateUser(uid, userData) {
    try {
      const userRecord = await adminAuth.updateUser(uid, userData);
      return userRecord;
    } catch (error) {
      throw new Error('Error updating user: ' + error.message);
    }
  },

  // Delete user
  async deleteUser(uid) {
    try {
      await adminAuth.deleteUser(uid);
      return { success: true };
    } catch (error) {
      throw new Error('Error deleting user: ' + error.message);
    }
  }
};

module.exports = {
  // Admin SDK instances
  admin,
  adminDB,
  adminStorage,
  adminAuth,
  
  // Utility functions
  firebaseUtils,
  
  // Firebase config for client-side (to be sent to frontend)
  getClientConfig: () => ({
    apiKey: "AIzaSyA6TiOM6JvE_f4ohOmCqqrI4WAzvjmhz0o",
    authDomain: "aceme-7ec4f.firebaseapp.com",
    projectId: "aceme-7ec4f",
    storageBucket: "aceme-7ec4f.firebasestorage.app",
    messagingSenderId: "1092971619463",
    appId: "1:1092971619463:web:9d5f944aa34881bcbb0422",
    measurementId: "G-39Y7L7MFPG"
  })
};
