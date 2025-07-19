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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aceme-7ec4f.appspot.com'
  });
}

const adminDB = admin.firestore();
const adminStorage = admin.storage();
const adminAuth = admin.auth();

const firebaseUtils = {
  async verifyIdToken(idToken) {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded;
  },

  async createCustomToken(uid, claims = {}) {
    const token = await adminAuth.createCustomToken(uid, claims);
    return token;
  },

  async getUserByEmail(email) {
    const user = await adminAuth.getUserByEmail(email);
    return user;
  },

  async createUser(data) {
    const user = await adminAuth.createUser(data);
    return user;
  },

  async updateUser(uid, data) {
    const user = await adminAuth.updateUser(uid, data);
    return user;
  },

  async deleteUser(uid) {
    await adminAuth.deleteUser(uid);
    return { success: true };
  }
};

module.exports = {
  admin,
  adminDB,
  adminAuth,
  adminStorage,
  firebaseUtils,

  getClientConfig: () => ({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  }),

  getServerConfig: () => ({
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  })
};
