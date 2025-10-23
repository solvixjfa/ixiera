/**
 * Enhanced Navigation Functionality
 */

(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top')) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Enhanced Mobile nav toggle with animations
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    const body = document.querySelector('body');
    const isActivating = !body.classList.contains('mobile-nav-active');
    
    body.classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
    
    // Add loading state during transition
    if (isActivating) {
      document.querySelector('.navmenu').classList.add('loading');
      setTimeout(() => {
        document.querySelector('.navmenu').classList.remove('loading');
      }, 500);
    }
  }

  mobileNavToggleBtn.addEventListener('click', mobileNavToogle);

  /**
   * Hide mobile nav on same-page/hash links with smooth transition
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', (e) => {
      if (document.querySelector('.mobile-nav-active')) {
        // Add closing animation
        document.querySelector('.navmenu').style.opacity = '0';
        setTimeout(() => {
          mobileNavToogle();
          document.querySelector('.navmenu').style.opacity = '1';
        }, 300);
      }
    });
  });

  /**
   * Enhanced dropdown functionality with animations
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const dropdown = this.closest('.dropdown');
      const allDropdowns = document.querySelectorAll('.navmenu .dropdown.active');
      
      // Close other dropdowns
      allDropdowns.forEach(otherDropdown => {
        if (otherDropdown !== dropdown) {
          otherDropdown.classList.remove('active');
        }
      });
      
      // Toggle current dropdown
      if (dropdown) {
        dropdown.classList.toggle('active');
      }
    });
  });

  // Enhanced close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.navmenu .dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

  // Close dropdowns on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.navmenu .dropdown.active').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
      
      // Also close mobile nav if open
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    }
  });

  /**
   * Enhanced hover effects for desktop dropdowns
   */
  function initDesktopDropdownHover() {
    if (window.innerWidth >= 1200) {
      document.querySelectorAll('.navmenu .dropdown').forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function() {
          this.classList.add('active');
        });
        
        dropdown.addEventListener('mouseleave', function() {
          this.classList.remove('active');
        });
      });
    }
  }

  // Initialize dropdown hover on load and resize
  window.addEventListener('load', initDesktopDropdownHover);
  window.addEventListener('resize', initDesktopDropdownHover);

  /**
   * Smooth scrolling for anchor links
   */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      
      if (href !== '#' && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      // Add fade out animation
      preloader.style.opacity = '0';
      preloader.style.transition = 'opacity 0.5s ease';
      
      setTimeout(() => {
        preloader.remove();
      }, 500);
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }

  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Init isotope layout and filters
   */
  document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
    let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
    let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
    let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

    let initIsotope;
    imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
      initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
        itemSelector: '.isotope-item',
        layoutMode: layout,
        filter: filter,
        sortBy: sort
      });
    });

    isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
      filters.addEventListener('click', function() {
        isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
        this.classList.add('filter-active');
        initIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        if (typeof aosInit === 'function') {
          aosInit();
        }
      }, false);
    });
  });

})();

/* ===== AI WIDGET FUNCTIONS ===== */
// AI Widget functionality - DI LUAR IIFE

let aiChatClickListener = null;

function toggleAIChat() {
  const widget = document.getElementById('aiWidget');
  if (!widget) return;
  
  const chatMini = widget.querySelector('.ai-chat-mini');
  
  if (chatMini.style.display === 'block') {
    chatMini.style.display = 'none';
    if (aiChatClickListener) {
      document.removeEventListener('click', aiChatClickListener);
      aiChatClickListener = null;
    }
  } else {
    chatMini.style.display = 'block';
    
    // Auto close ketika klik di luar
    aiChatClickListener = function(e) {
      if (!widget.contains(e.target)) {
        chatMini.style.display = 'none';
        document.removeEventListener('click', aiChatClickListener);
        aiChatClickListener = null;
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', aiChatClickListener);
    }, 100);
  }
}

function askAIMini(question) {
  // Redirect ke halaman AI Assistant dengan parameter
  window.location.href = `team.html?q=${encodeURIComponent(question)}`;
}

// Initialize AI Widget
document.addEventListener('DOMContentLoaded', function() {
  // Initialize AI Widget event listeners
  const aiWidgetBtn = document.getElementById('aiWidgetBtn');
  const aiCloseBtn = document.getElementById('aiCloseBtn');
  const aiQuickBtns = document.querySelectorAll('.ai-quick-btn');
  
  if (aiWidgetBtn) {
    aiWidgetBtn.addEventListener('click', toggleAIChat);
  }
  
  if (aiCloseBtn) {
    aiCloseBtn.addEventListener('click', toggleAIChat);
  }
  
  // Quick buttons
  aiQuickBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const question = this.getAttribute('data-question');
      if (question) {
        askAIMini(question);
      }
    });
  });
  
  // Auto close chat pada load
  const chatMini = document.querySelector('.ai-chat-mini');
  if (chatMini) {
    chatMini.style.display = 'none';
  }
  
  // Handle URL parameters untuk auto question
  const urlParams = new URLSearchParams(window.location.search);
  const aiQuestion = urlParams.get('q');
  
  if (aiQuestion && window.location.pathname.includes('team.html')) {
    setTimeout(() => {
      const userInput = document.getElementById('user-input');
      if (userInput && window.aiAssistant) {
        userInput.value = aiQuestion;
        window.aiAssistant.autoResizeTextarea();
        
        setTimeout(() => {
          window.aiAssistant.handleSendMessage();
        }, 1000);
      }
    }, 1500);
  }
});