module.exports = class Timer {
  constructor(onTick, onComplete) {
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.interval = null;
  }

  start(duration = 60) {
    this.timeLeft = duration;

    this.interval = setInterval(async () => {
      this.timeLeft--;

      if (this.onTick) this.onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.stop();
        if (this.onComplete) this.onComplete();
      }
    }, 1000);
  }

  stop() {

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};
