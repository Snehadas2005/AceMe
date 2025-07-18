const cron = require('node-cron');
const { db } = require('../config/firebase');

// Check for interviews that should be auto-ended every minute
cron.schedule('* * * * *', async () => {
  try {
    console.log('Checking for interviews to auto-end...');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const activeInterviews = await db.collection('interviews')
      .where('status', '==', 'active')
      .where('startTime', '<=', thirtyMinutesAgo)
      .get();
    
    const batch = db.batch();
    
    activeInterviews.forEach(doc => {
      const interviewRef = db.collection('interviews').doc(doc.id);
      batch.update(interviewRef, {
        status: 'completed',
        endTime: new Date(),
        autoEnded: true
      });
    });
    
    if (!activeInterviews.empty) {
      await batch.commit();
      console.log(`Auto-ended ${activeInterviews.size} interviews`);
    }
  } catch (error) {
    console.error('Error in interview timer:', error);
  }
});