// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDNa4tmSIK26we17vT7Qb8uenLY5QVRYPI",
  authDomain: "ixiera-core.firebaseapp.com",
  projectId: "ixiera-core",
  storageBucket: "ixiera-core.firebasestorage.app",
  messagingSenderId: "637819618265",
  appId: "1:637819618265:web:c056d7fe5bcfa481734fc8",
  measurementId: "G-YM6VE79GGG"
};

// Inisialisasi Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Cek status login
auth.onAuthStateChanged(user => {
  if (user) {
    // Pengguna berhasil login (baik anonim atau lainnya)
    loadDashboardData(user);
  } else {
    // Jika tidak ada sesi login, tendang ke halaman login
    window.location.href = 'login.html';
  }
});

function loadDashboardData(user) {
  const welcomeName = document.getElementById('welcome-name');
  if (welcomeName) {
    // =======================================================
    // === INI BAGIAN YANG SAYA UBAH UNTUK ANDA ===
    // =======================================================
    // Karena user anonim tidak punya email, kita tampilkan ID unik mereka
    // atau pesan selamat datang generik.
    if (user.isAnonymous) {
        welcomeName.textContent = 'Pengguna Tamu'; // Atau tampilkan user.uid
    } else {
        welcomeName.textContent = user.displayName || user.email;
    }
    // =======================================================
  }
  setupLogoutButtons();
  // Panggil fungsi lain untuk memuat data dashboard di sini
  // Anda bisa menggunakan user.uid untuk mengambil data spesifik pengguna
  // contoh: loadMyStats(user.uid);
}

function setupLogoutButtons() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut();
        });
    }
}

