class InterviewTimer {
  constructor() {
    this.timers = new Map();
  }

  startTimer(interviewId, duration, callback) {
    const timer = setTimeout(() => {
      callback(interviewId);
      this.timers.delete(interviewId);
    }, duration);

    this.timers.set(interviewId, timer);
  }

  stopTimer(interviewId) {
    const timer = this.timers.get(interviewId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(interviewId);
    }
  }

  getTimeRemaining(interviewId, startTime, duration) {
    const elapsed = Date.now() - startTime;
    const remaining = duration - elapsed;
    return Math.max(0, remaining);
  }
}

module.exports = new InterviewTimer();
