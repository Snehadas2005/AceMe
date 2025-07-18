const axios = require('axios');
const FormData = require('form-data');

const processAudioResponse = async (audioFile) => {
  try {
    // Option 1: Using Web Speech API (Browser-based)
    // This would be handled on the frontend and sent as text
    
    // Option 2: Using Google Speech-to-Text API
    if (process.env.GOOGLE_SPEECH_API_KEY) {
      return await processWithGoogleSpeech(audioFile);
    }
    
    // Option 3: Using OpenAI Whisper API
    if (process.env.OPENAI_API_KEY) {
      return await processWithWhisper(audioFile);
    }
    
    // Fallback: Mock implementation for development
    return await mockAudioProcessing(audioFile);
    
  } catch (error) {
    console.error('Audio processing error:', error);
    throw new Error('Failed to process audio');
  }
};

const processWithGoogleSpeech = async (audioFile) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioFile.buffer, {
      filename: 'audio.wav',
      contentType: audioFile.mimetype
    });
    
    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_SPEECH_API_KEY}`,
      {
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
        audio: {
          content: audioFile.buffer.toString('base64')
        }
      }
    );
    
    return response.data.results[0]?.alternatives[0]?.transcript || '';
  } catch (error) {
    console.error('Google Speech API error:', error);
    throw error;
  }
};

const processWithWhisper = async (audioFile) => {
  try {
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
      filename: 'audio.wav',
      contentType: audioFile.mimetype
    });
    formData.append('model', 'whisper-1');
    
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        }
      }
    );
    
    return response.data.text;
  } catch (error) {
    console.error('Whisper API error:', error);
    throw error;
  }
};

const mockAudioProcessing = async (audioFile) => {
  // Mock implementation for development
  const mockResponses = [
    "I have three years of experience in software development, primarily working with JavaScript and React. In my previous role, I led a team of four developers and successfully delivered multiple projects on time.",
    "My greatest strength is problem-solving. I enjoy breaking down complex issues into manageable parts and finding efficient solutions. I'm also very collaborative and work well in team environments.",
    "I'm passionate about continuous learning and staying updated with the latest technologies. I believe this position would allow me to grow my skills while contributing to meaningful projects.",
    "In my previous role, I faced a challenging deadline where we had to deliver a critical feature. I organized daily standups, broke down tasks efficiently, and we delivered the project two days ahead of schedule."
  ];
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
};

const analyzeAudioMetrics = (audioFile) => {
  // Mock audio analysis for development
  return {
    duration: Math.random() * 60 + 30, // 30-90 seconds
    volume: Math.random() * 0.5 + 0.5, // 0.5-1.0
    pace: Math.random() * 0.4 + 0.8, // 0.8-1.2 (words per second)
    clarity: Math.random() * 0.3 + 0.7 // 0.7-1.0
  };
};

module.exports = {
  processAudioResponse,
  analyzeAudioMetrics
};
