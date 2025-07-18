const { Server } = require('socket.io');
const { authenticateToken } = require('../middleware/auth');

let io;

const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decodedToken = await admin.auth().verifyIdToken(token);
      socket.user = decodedToken;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.uid);
    
    socket.on('join-interview', (interviewId) => {
      socket.join(interviewId);
      console.log(`User ${socket.user.uid} joined interview ${interviewId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.uid);
    });
  });
};

const sendInterviewUpdate = (interviewId, data) => {
  if (io) {
    io.to(interviewId).emit('interview-update', data);
  }
};

const sendQuestionTimer = (interviewId, timeRemaining) => {
  if (io) {
    io.to(interviewId).emit('question-timer', { timeRemaining });
  }
};

module.exports = { 
  initializeWebSocket, 
  sendInterviewUpdate, 
  sendQuestionTimer 
};
