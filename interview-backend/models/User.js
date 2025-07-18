const admin = require('firebase-admin');

class User {
  constructor(data) {
    this.uid = data.uid;
    this.email = data.email;
    this.name = data.name;
    this.resumeUrl = data.resumeUrl || null;
    this.resumeData = data.resumeData || null;
    this.createdAt = data.createdAt || admin.firestore.FieldValue.serverTimestamp();
    this.updatedAt = data.updatedAt || admin.firestore.FieldValue.serverTimestamp();
    this.lastInterviewId = data.lastInterviewId || null;
  }

  static collection() {
    return admin.firestore().collection('users');
  }

  static async create(userData) {
    const user = new User(userData);
    const docRef = await this.collection().doc(user.uid).set(user.toObject());
    return user;
  }

  static async findById(uid) {
    const doc = await this.collection().doc(uid).get();
    if (!doc.exists) {
      return null;
    }
    return new User({ uid, ...doc.data() });
  }

  static async updateResume(uid, resumeUrl, resumeData) {
    await this.collection().doc(uid).update({
      resumeUrl,
      resumeData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  static async updateLastInterview(uid, interviewId) {
    await this.collection().doc(uid).update({
      lastInterviewId: interviewId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  toObject() {
    return {
      uid: this.uid,
      email: this.email,
      name: this.name,
      resumeUrl: this.resumeUrl,
      resumeData: this.resumeData,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastInterviewId: this.lastInterviewId
    };
  }
}

module.exports = User;