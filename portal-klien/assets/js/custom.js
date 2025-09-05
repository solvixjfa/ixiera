// Pastikan kode berjalan setelah seluruh halaman dimuat
document.addEventListener("DOMContentLoaded", function () {
  
  // 1. Inisialisasi semua tooltip Bootstrap
  // Ini memungkinkan tooltip muncul saat ikon sosial di-hover
  try {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  } catch (e) {
    console.error("Bootstrap Tooltip initialization failed:", e);
  }

  // 2. Logika untuk Tombol "Kembali ke Atas" (Back to Top)
  const backToTopButton = document.getElementById("back-to-top-btn");

  if (backToTopButton) {
    // Fungsi untuk menampilkan atau menyembunyikan tombol
    const handleScroll = function () {
      if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        backToTopButton.style.display = "block";
      } else {
        backToTopButton.style.display = "none";
      }
    };

    // Tambahkan event listener saat pengguna melakukan scroll
    window.addEventListener("scroll", handleScroll);

    // Fungsi untuk kembali ke atas dengan mulus saat tombol diklik
    backToTopButton.addEventListener("click", function (e) {
      e.preventDefault(); // Mencegah pindah ke URL '#'
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  // 3. Logika untuk Tahun Hak Cipta Dinamis
  const copyrightYearSpan = document.getElementById("copyright-year");
  if (copyrightYearSpan) {
    // Secara otomatis mengatur tahun ke tahun saat ini
    copyrightYearSpan.textContent = new Date().getFullYear();
  }

});


