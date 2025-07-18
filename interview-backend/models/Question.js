const admin = require('firebase-admin');

class Question {
  constructor(data) {
    this.id = data.id;
    this.text = data.text;
    this.category = data.category; // technical, behavioral, general
    this.difficulty = data.difficulty; // easy, medium, hard
    this.domain = data.domain; // software, marketing, finance, etc.
    this.keywords = data.keywords || [];
    this.expectedAnswerKeywords = data.expectedAnswerKeywords || [];
    this.timeLimit = data.timeLimit || 120; // seconds
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || admin.firestore.FieldValue.serverTimestamp();
  }

  static collection() {
    return admin.firestore().collection('questions');
  }

  static async create(questionData) {
    const question = new Question(questionData);
    const docRef = await this.collection().add(question.toObject());
    return new Question({ id: docRef.id, ...question.toObject() });
  }

  static async findById(id) {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return new Question({ id, ...doc.data() });
  }

  static async findByDomain(domain, limit = 10) {
    const snapshot = await this.collection()
      .where('domain', '==', domain)
      .where('isActive', '==', true)
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => new Question({ id: doc.id, ...doc.data() }));
  }

  static async findByKeywords(keywords, limit = 10) {
    const snapshot = await this.collection()
      .where('keywords', 'array-contains-any', keywords)
      .where('isActive', '==', true)
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => new Question({ id: doc.id, ...doc.data() }));
  }

  static async getRandomQuestions(count = 5) {
    const snapshot = await this.collection()
      .where('isActive', '==', true)
      .get();
    
    const allQuestions = snapshot.docs.map(doc => new Question({ id: doc.id, ...doc.data() }));
    
    // Shuffle and return random questions
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  static async generateQuestionsForResume(resumeData, count = 5) {
    const { skills, experience, education } = resumeData;
    
    // Extract keywords from resume
    const keywords = [
      ...skills.map(skill => skill.toLowerCase()),
      ...experience.map(exp => exp.company.toLowerCase()),
      ...education.map(edu => edu.degree.toLowerCase())
    ];

    // Find questions matching resume keywords
    const matchingQuestions = await this.findByKeywords(keywords, count * 2);
    
    if (matchingQuestions.length >= count) {
      return matchingQuestions.slice(0, count);
    } else {
      // If not enough matching questions, fill with random ones
      const randomQuestions = await this.getRandomQuestions(count - matchingQuestions.length);
      return [...matchingQuestions, ...randomQuestions];
    }
  }

  toObject() {
    return {
      id: this.id,
      text: this.text,
      category: this.category,
      difficulty: this.difficulty,
      domain: this.domain,
      keywords: this.keywords,
      expectedAnswerKeywords: this.expectedAnswerKeywords,
      timeLimit: this.timeLimit,
      isActive: this.isActive,
      createdAt: this.createdAt
    };
  }
}

module.exports = Question;