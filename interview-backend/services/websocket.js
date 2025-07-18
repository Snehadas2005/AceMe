const audioProcessor = require('./audioProcessor');
const { adminDB } = require('../config/firebase');

const activeInterviews = new Map();

function initializeWebSocket(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Start interview session
    socket.on('start_interview', async (data) => {
      try {
        const { userId, interviewId } = data;
        
        // Initialize interview session
        activeInterviews.set(socket.id, {
          userId,
          interviewId,
          startTime: new Date(),
          answers: [],
          audioData: []
        });

        socket.emit('interview_started', {
          success: true,
          sessionId: socket.id,
          startTime: new Date()
        });

        console.log(`Interview started for user ${userId}`);
      } catch (error) {
        socket.emit('interview_error', { error: error.message });
      }
    });

    // Handle audio data
    socket.on('audio_data', async (audioData) => {
      try {
        const session = activeInterviews.get(socket.id);
        if (!session) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        // Process audio to text
        const transcription = await audioProcessor.convertAudioToText(audioData);
        
        // Store in session
        session.audioData.push({
          timestamp: new Date(),
          transcript: transcription.transcript,
          confidence: transcription.confidence
        });

        // Send real-time transcription back
        socket.emit('transcription', {
          text: transcription.transcript,
          confidence: transcription.confidence,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Audio processing error:', error);
        socket.emit('audio_error', { error: error.message });
      }
    });

    // Handle answer submission
    socket.on('submit_answer', async (data) => {
      try {
        const session = activeInterviews.get(socket.id);
        if (!session) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        const { questionId, answerText, duration } = data;
        
        session.answers.push({
          questionId,
          answerText,
          duration,
          timestamp: new Date()
        });

        socket.emit('answer_saved', {
          success: true,
          questionId,
          totalAnswers: session.answers.length
        });

      } catch (error) {
        socket.emit('answer_error', { error: error.message });
      }
    });

    // End interview
    socket.on('end_interview', async (data) => {
      try {
        const session = activeInterviews.get(socket.id);
        if (!session) {
          socket.emit('error', { message: 'No active interview session' });
          return;
        }

        // Save interview data
        await adminDB.collection('interviews').doc(session.interviewId).set({
          userId: session.userId,
          startTime: session.startTime,
          endTime: new Date(),
          answers: session.answers,
          audioData: session.audioData,
          status: 'completed'
        });

        // Clean up session
        activeInterviews.delete(socket.id);

        socket.emit('interview_ended', {
          success: true,
          interviewId: session.interviewId,
          totalAnswers: session.answers.length
        });

      } catch (error) {
        socket.emit('interview_error', { error: error.message });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      activeInterviews.delete(socket.id);
    });
  });
}

module.exports = { initializeWebSocket };