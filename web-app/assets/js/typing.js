class TypingEffect {
  constructor() {
    this.titleElement = document.getElementById('typed-title');
    this.quoteElement = document.getElementById('typed-quote');
    this.cursorElement = document.querySelector('.typed-cursor');
    
    this.titleText = "Bisnis Lebih Lancar dengan Sistem Digital yang Tepat";
    this.quoteText = "Kami memahami kebutuhan bisnis karena sudah menjalankannya sendiri. Sekarang kami bantu Anda membangun sistem yang benar-benar berguna.";
    
    this.init();
  }

  async init() {
    await this.typeTitle();
    await this.delay(500);
    await this.typeQuote();
    await this.delay(1000);
    this.hideCursor();
  }

  typeTitle() {
    return new Promise(resolve => {
      let i = 0;
      const speed = 50;
      
      const typeWriter = () => {
        if (i < this.titleText.length) {
          this.titleElement.innerHTML += this.titleText.charAt(i);
          i++;
          setTimeout(typeWriter, speed);
        } else {
          resolve();
        }
      };
      
      typeWriter();
    });
  }

  typeQuote() {
    return new Promise(resolve => {
      let i = 0;
      const speed = 30;
      
      const typeWriter = () => {
        if (i < this.quoteText.length) {
          this.quoteElement.innerHTML += this.quoteText.charAt(i);
          i++;
          setTimeout(typeWriter, speed);
        } else {
          resolve();
        }
      };
      
      typeWriter();
    });
  }

  hideCursor() {
    this.cursorElement.style.display = 'none';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when Three.js is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for Three.js to load
  setTimeout(() => {
    new TypingEffect();
  }, 1000);
});