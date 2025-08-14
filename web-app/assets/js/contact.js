// assets/js/contact.js
document.addEventListener("DOMContentLoaded", function () {
  const checkTallyLoaded = setInterval(() => {
    if (typeof Tally !== "undefined" && Tally.loadEmbeds) {
      Tally.loadEmbeds(); // Memuat ulang embed jika belum tampil
      clearInterval(checkTallyLoaded);
    }
  }, 100); // cek tiap 100ms
});