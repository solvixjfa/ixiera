

$(function() {
  
  // Memuat komponen partials
  $("#sidebar-placeholder").load("_partials/_sidebar.html");
  $("#topbar-placeholder").load("_partials/_topbar.html");

  // Memuat footer dan MENJALANKAN kodenya setelah selesai
  $("#footer-placeholder").load("_partials/_footer.html", function(response, status, xhr) {
    
    // Kode ini dijamin hanya berjalan SETELAH _footer.html 100% selesai dimuat.
    // Inilah kunci mengapa ini tidak akan rusak.
    if (status == "success") {

      // --- SEMUA KODE DARI CUSTOM.JS SEKARANG ADA DI SINI ---

      // 1. Inisialisasi Bootstrap Tooltips untuk ikon sosial
      try {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new bootstrap.Tooltip(tooltipTriggerEl);
        });
      } catch (e) {
        console.error("Gagal menginisialisasi tooltips:", e);
      }

      // 2. Logika untuk Tombol "Back to Top"
      let mybutton = document.getElementById("btn-back-to-top");
      if (mybutton) {
        window.onscroll = function () {
          if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            mybutton.style.display = "block";
          } else {
            mybutton.style.display = "none";
          }
        };
        mybutton.addEventListener("click", function(e) {
          e.preventDefault();
          window.scrollTo({top: 0, behavior: 'smooth'});
        });
      }

      // 3. Update Tahun Copyright Secara Dinamis
      const yearSpan = document.getElementById("copyright-year");
      if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
      }

    } else {
      // Jika gagal memuat footer, tampilkan error di konsol
      console.error("KRITIS: Gagal memuat _footer.html:", xhr.status, xhr.statusText);
    }
  });

});


