// backend/config/firebase.js
const admin = require('firebase-admin');

// Firebase Admin SDK initialization
const serviceAccount = {
  type: process.env.FIREBASE_ADMIN_TYPE || "service_account",
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
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

// Utility functions for common Auth operations
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

  // Firebase config for client-side (to be sent to frontend if needed)
  getClientConfig: () => ({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  })
};
