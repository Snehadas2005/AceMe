const admin = require('firebase-admin');

class Interview {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.startTime = data.startTime || admin.firestore.FieldValue.serverTimestamp();
    this.endTime = data.endTime || null;
    this.duration = data.duration || 0; // in minutes
    this.status = data.status || 'in_progress'; // in_progress, completed, cancelled
    this.questions = data.questions || [];
    this.responses = data.responses || [];
    this.audioRecordings = data.audioRecordings || [];
    this.videoRecordings = data.videoRecordings || [];
    this.scores = data.scores || {};
    this.overallScore = data.overallScore || 0;
    this.feedback = data.feedback || {};
    this.createdAt = data.createdAt || admin.firestore.FieldValue.serverTimestamp();
  }

  static collection() {
    return admin.firestore().collection('interviews');
  }

  static async create(interviewData) {
    const docRef = await this.collection().add(interviewData);
    return new Interview({ id: docRef.id, ...interviewData });
  }

  static async findById(id) {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return new Interview({ id, ...doc.data() });
  }

  static async findByUserId(userId) {
    const snapshot = await this.collection()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => new Interview({ id: doc.id, ...doc.data() }));
  }

  static async updateStatus(id, status) {
    await this.collection().doc(id).update({
      status,
      endTime: status === 'completed' ? admin.firestore.FieldValue.serverTimestamp() : null
    });
  }

  static async addResponse(id, questionId, response) {
    const interview = await this.findById(id);
    if (!interview) throw new Error('Interview not found');

    const responses = interview.responses || [];
    responses.push({
      questionId,
      response,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await this.collection().doc(id).update({ responses });
  }

  static async addAudioRecording(id, audioUrl) {
    const interview = await this.findById(id);
    if (!interview) throw new Error('Interview not found');

    const audioRecordings = interview.audioRecordings || [];
    audioRecordings.push({
      url: audioUrl,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await this.collection().doc(id).update({ audioRecordings });
  }

  static async updateScores(id, scores, overallScore, feedback) {
    await this.collection().doc(id).update({
      scores,
      overallScore,
      feedback,
      status: 'completed',
      endTime: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  toObject() {
    return {
      id: this.id,
      userId: this.userId,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      questions: this.questions,
      responses: this.responses,
      audioRecordings: this.audioRecordings,
      videoRecordings: this.videoRecordings,
      scores: this.scores,
      overallScore: this.overallScore,
      feedback: this.feedback,
      createdAt: this.createdAt
    };
  }
}

module.exports = Interview;