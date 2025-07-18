const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');

class AudioProcessor {
  constructor() {
    this.client = new speech.SpeechClient();
    this.streamingConfig = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: 'latest_long'
      },
      interimResults: true,
      singleUtterance: false
    };
  }

  async processAudioStream(audioStream) {
    return new Promise((resolve, reject) => {
      const recognizeStream = this.client
        .streamingRecognize(this.streamingConfig)
        .on('error', reject)
        .on('data', (data) => {
          const result = data.results[0];
          if (result && result.isFinal) {
            resolve({
              transcript: result.alternatives[0].transcript,
              confidence: result.alternatives[0].confidence,
              words: result.alternatives[0].words || []
            });
          }
        });

      audioStream.pipe(recognizeStream);
    });
  }

  async convertAudioToText(audioBuffer) {
    try {
      const tempFilePath = path.join(__dirname, '../temp', `audio_${Date.now()}.webm`);
      fs.writeFileSync(tempFilePath, audioBuffer);

      const audio = {
        content: fs.readFileSync(tempFilePath).toString('base64'),
      };

      const config = {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
      };

      const request = {
        audio: audio,
        config: config,
      };

      const [response] = await this.client.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      return {
        transcript: transcription,
        confidence: response.results[0]?.alternatives[0]?.confidence || 0,
        words: response.results[0]?.alternatives[0]?.words || []
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    }
  }

  analyzeFillerWords(transcript) {
    const fillerWords = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally'];
    const words = transcript.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    let fillerCount = 0;
    fillerWords.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = transcript.match(regex);
      if (matches) fillerCount += matches.length;
    });

    return {
      totalWords,
      fillerCount,
      fillerPercentage: (fillerCount / totalWords) * 100,
      score: Math.max(0, 100 - (fillerCount / totalWords) * 200)
    };
  }

  analyzeSpeechPace(words, duration) {
    const wordsPerMinute = (words.length / duration) * 60;
    const idealWPM = 150; // Ideal speaking pace
    const deviation = Math.abs(wordsPerMinute - idealWPM);
    
    return {
      wpm: wordsPerMinute,
      score: Math.max(0, 100 - (deviation / idealWPM) * 100),
      feedback: wordsPerMinute < 120 ? 'too_slow' : 
                wordsPerMinute > 180 ? 'too_fast' : 'good_pace'
    };
  }
}

module.exports = new AudioProcessor();