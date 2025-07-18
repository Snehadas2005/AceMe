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

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aceme-7ec4f.appspot.com'
  });
}

// Client-side Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA6TiOM6JvE_f4ohOmCqqrI4WAzvjmhz0o",
  authDomain: "aceme-7ec4f.firebaseapp.com",
  projectId: "aceme-7ec4f",
  storageBucket: "aceme-7ec4f.firebasestorage.app",
  messagingSenderId: "1092971619463",
  appId: "1:1092971619463:web:9d5f944aa34881bcbb0422",
  measurementId: "G-39Y7L7MFPG"
};

// Initialize Firebase Client SDK
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Admin instances
const adminDB = admin.firestore();
const adminStorage = admin.storage();
const adminAuth = admin.auth();

module.exports = {
  // Client SDK
  app,
  db,
  storage,
  auth,
  
  // Admin SDK
  admin,
  adminDB,
  adminStorage,
  adminAuth
};
