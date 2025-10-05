/* ============================================
   ULTRA SMOOTH INTERFACE CONTROLLER
   Оптимізований JavaScript для плавної роботи
   ============================================ */

(function() {
  'use strict';

  // ============================================
  // PERFORMANCE UTILITIES
  // ============================================

  // Debounce функція для оптимізації подій
  function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle функція для скролу та resize
  function throttle(func, wait = 100) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, wait);
      }
    };
  }

  // Request Animation Frame wrapper
  const rafThrottle = (callback) => {
    let requestId = null;
    let lastArgs;

    const later = (context) => () => {
      requestId = null;
      callback.apply(context, lastArgs);
    };

    return function(...args) {
      lastArgs = args;
      if (requestId === null) {
        requestId = requestAnimationFrame(later(this));
      }
    };
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const AppState = {
    language: localStorage.getItem('language') || 'de',
    cookiesAccepted: localStorage.getItem('cookiesAccepted'),
    isScrolling: false,
    scrollPosition: 0,
    isMobile: window.innerWidth < 768,

    update(key, value) {
      this[key] = value;
      if (['language', 'cookiesAccepted'].includes(key)) {
        localStorage.setItem(key, value);
      }
    }
  };

  // ============================================
  // LANGUAGE MANAGEMENT
  // ============================================

  const LanguageManager = {
    init() {
      this.updateLanguage();
      this.attachEvents();
    },

    updateLanguage() {
      const elements = document.querySelectorAll('[data-de]');
      elements.forEach(el => {
        const text = el.getAttribute(`data-${AppState.language}`);
        if (text) el.textContent = text;
      });

      document.documentElement.lang = AppState.language;
      this.updateActiveButton();
    },

    updateActiveButton() {
      const buttons = document.querySelectorAll('.lang-btn');
      buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === AppState.language);
        btn.setAttribute('aria-pressed', btn.dataset.lang === AppState.language);
      });
    },

    attachEvents() {
      const buttons = document.querySelectorAll('.lang-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          AppState.update('language', btn.dataset.lang);
          this.updateLanguage();
        });
      });
    }
  };

  // ============================================
  // SMOOTH SCROLL
  // ============================================

  const SmoothScroll = {
    init() {
      this.attachAnchorLinks();
      this.observeScrollPosition();
    },

    attachAnchorLinks() {
      const anchors = document.querySelectorAll('a[href^="#"]');
      anchors.forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href === '#') return;

          e.preventDefault();
          const target = document.querySelector(href);

          if (target) {
            const offset = 80; // Header offset
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        });
      });
    },

    observeScrollPosition: rafThrottle(function() {
      AppState.scrollPosition = window.pageYOffset;
      AppState.isScrolling = true;

      // Add/remove scroll class for header
      const header = document.querySelector('.header');
      if (header) {
        header.classList.toggle('scrolled', AppState.scrollPosition > 100);
      }
    })
  };

  // ============================================
  // INTERSECTION OBSERVER
  // ============================================

  const AnimationObserver = {
    init() {
      if (!('IntersectionObserver' in window)) return;

      const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');

            // Відключити спостереження після анімації
            if (entry.target.dataset.observeOnce !== 'false') {
              this.observer.unobserve(entry.target);
            }
          }
        });
      }, options);

      this.observeElements();
    },

    observeElements() {
      const elements = document.querySelectorAll('.card, .stat-card, .explanation-card, [data-animate]');
      elements.forEach(el => {
        el.classList.add('animate-in');
        this.observer.observe(el);
      });
    }
  };

  // ============================================
  // PRICING CALCULATOR
  // ============================================

  const PricingCalculator = {
    init() {
      this.participantsSlider = document.getElementById('participants-slider');
      this.criteriaSlider = document.getElementById('criteria-slider');
      this.participantsValue = document.getElementById('participants-value');
      this.criteriaValue = document.getElementById('criteria-value');
      this.totalPrice = document.getElementById('total-price');
      this.checkoutBtn = document.getElementById('checkout-btn');

      if (!this.participantsSlider || !this.criteriaSlider) return;

      this.attachEvents();
      this.calculate();
    },

    attachEvents() {
      const updatePrice = debounce(() => this.calculate(), 50);

      this.participantsSlider.addEventListener('input', updatePrice);
      this.criteriaSlider.addEventListener('input', updatePrice);

      if (this.checkoutBtn) {
        this.checkoutBtn.addEventListener('click', () => this.handleCheckout());
      }
    },

    calculate() {
      const participants = parseInt(this.participantsSlider.value);
      const criteria = parseInt(this.criteriaSlider.value);

      // Pricing formula
      const basePrice = 750;
      const additionalParticipants = Math.max(0, participants - 4);
      const additionalCriteria = Math.max(0, criteria - 2);
      const price = basePrice + (additionalParticipants * 75) + (additionalCriteria * 250);

      // Update display with animation
      this.animateValue(this.participantsValue, participants);
      this.animateValue(this.criteriaValue, criteria);
      this.animateValue(this.totalPrice, price, '€');

      return price;
    },

    animateValue(element, value, prefix = '') {
      if (!element) return;

      const current = parseInt(element.textContent.replace(/[^0-9]/g, '') || 0);
      if (current === value) return;

      element.style.transform = 'scale(1.1)';
      element.textContent = prefix + value.toLocaleString('de-DE');

      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    },

    async handleCheckout() {
      if (!window.Stripe) {
        ToastManager.show('Stripe не завантажено', 'error');
        return;
      }

      const btn = this.checkoutBtn;
      const originalContent = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Завантаження...';

      try {
        const participants = parseInt(this.participantsSlider.value);
        const criteria = parseInt(this.criteriaSlider.value);
        const price = this.calculate();

        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participants,
            criteria,
            price,
            language: AppState.language
          })
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.sessionId) {
          const stripe = Stripe(window.STRIPE_PUBLIC_KEY || 'pk_test_YOUR_KEY');
          const { error } = await stripe.redirectToCheckout({
            sessionId: data.sessionId
          });

          if (error) throw error;
        }

      } catch (err) {
        console.error('Checkout error:', err);
        ToastManager.show(
          AppState.language === 'de'
            ? 'Помилка при оплаті. Спробуйте пізніше.'
            : 'Payment error. Try again later.',
          'error'
        );
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  };

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================

  const ToastManager = {
    container: null,

    init() {
      this.container = document.querySelector('.toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
      }
    },

    show(message, type = 'info', duration = 5000) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const icon = this.getIcon(type);
      toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
      `;

      this.container.appendChild(toast);

      // Auto remove
      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
      }, duration);

      return toast;
    },

    getIcon(type) {
      const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        info: '<i class="fas fa-info-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>'
      };
      return icons[type] || icons.info;
    }
  };

  // ============================================
  // COOKIE BANNER
  // ============================================

  const CookieBanner = {
    init() {
      this.banner = document.getElementById('cookie-banner');
      if (!this.banner) return;

      if (!AppState.cookiesAccepted) {
        setTimeout(() => this.show(), 2000);
      }

      this.attachEvents();
    },

    show() {
      this.banner.classList.remove('hidden');
      this.banner.style.animation = 'slideUp 0.5s ease-out';
    },

    hide() {
      this.banner.style.animation = 'slideDown 0.3s ease-out';
      setTimeout(() => this.banner.classList.add('hidden'), 300);
    },

    attachEvents() {
      const acceptBtn = document.getElementById('accept-cookies');
      const rejectBtn = document.getElementById('reject-cookies');

      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          AppState.update('cookiesAccepted', 'true');
          this.hide();
          this.initializeAnalytics();
        });
      }

      if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
          AppState.update('cookiesAccepted', 'false');
          this.hide();
        });
      }
    },

    initializeAnalytics() {
      //Ініціалізація аналітики (Google Analytics, etc.)
      console.log('Analytics initialized');
    }
  };

  // ============================================
  // MODAL MANAGER
  // ============================================

  const ModalManager = {
    activeModal: null,

    open(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      this.activeModal = modal;
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';

      // Focus trap
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });

      // Close on Escape key
      document.addEventListener('keydown', this.handleEscape);
    },

    close() {
      if (!this.activeModal) return;

      this.activeModal.classList.remove('is-active');
      document.body.style.overflow = '';
      this.activeModal = null;

      document.removeEventListener('keydown', this.handleEscape);
    },

    handleEscape: (e) => {
      if (e.key === 'Escape') {
        ModalManager.close();
      }
    }
  };

  // ============================================
  // FORM VALIDATION
  // ============================================

  const FormValidator = {
    patterns: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\d\s\-\+\(\)]+$/,
      url: /^https?:\/\/.+/
    },

    validate(input, type) {
      const value = input.value.trim();

      if (!value) return false;

      return this.patterns[type] ? this.patterns[type].test(value) : true;
    },

    showError(input, message) {
      input.classList.add('error');

      let errorMsg = input.parentElement.querySelector('.error-message');
      if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        input.parentElement.appendChild(errorMsg);
      }
      errorMsg.textContent = message;
    },

    clearError(input) {
      input.classList.remove('error');
      const errorMsg = input.parentElement.querySelector('.error-message');
      if (errorMsg) errorMsg.remove();
    }
  };

  // ============================================
  // RESPONSIVE HANDLER
  // ============================================

  const ResponsiveHandler = {
    init() {
      this.checkViewport();
      window.addEventListener('resize', debounce(() => this.checkViewport(), 200));
    },

    checkViewport() {
      const wasMobile = AppState.isMobile;
      AppState.isMobile = window.innerWidth < 768;

      // Trigger events if breakpoint changed
      if (wasMobile !== AppState.isMobile) {
        this.onBreakpointChange();
      }

      document.body.classList.toggle('is-mobile', AppState.isMobile);
      document.body.classList.toggle('is-desktop', !AppState.isMobile);
    },

    onBreakpointChange() {
      // Повідомити компоненти про зміну breakpoint
      console.log('Breakpoint changed:', AppState.isMobile ? 'mobile' : 'desktop');
    }
  };

  // ============================================
  // PERFORMANCE MONITOR
  // ============================================

  const PerformanceMonitor = {
    init() {
      if (!window.performance) return;

      window.addEventListener('load', () => {
        setTimeout(() => this.logMetrics(), 0);
      });
    },

    logMetrics() {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;

      console.log('⚡ Performance Metrics:');
      console.log(`  Page Load: ${pageLoadTime}ms`);
      console.log(`  Connection: ${connectTime}ms`);
      console.log(`  Render: ${renderTime}ms`);
    }
  };

  // ============================================
  // APP INITIALIZATION
  // ============================================

  const App = {
    init() {
      // Перевірка готовності DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.start());
      } else {
        this.start();
      }
    },

    start() {
      console.log('🚀 Ultra Smooth Interface Initialized');

      // Ініціалізація всіх модулів
      LanguageManager.init();
      SmoothScroll.init();
      AnimationObserver.init();
      PricingCalculator.init();
      ToastManager.init();
      CookieBanner.init();
      ResponsiveHandler.init();
      PerformanceMonitor.init();

      // Обробка параметрів URL
      this.handleURLParams();

      // Відключити спінер завантаження
      this.hideLoader();
    },

    handleURLParams() {
      const params = new URLSearchParams(window.location.search);

      if (params.get('success') === 'true') {
        ToastManager.show(
          AppState.language === 'de'
            ? 'Дякуємо за замовлення!'
            : 'Thank you for your order!',
          'success'
        );
      }

      if (params.get('canceled') === 'true') {
        ToastManager.show(
          AppState.language === 'de'
            ? 'Замовлення скасовано'
            : 'Order cancelled',
          'info'
        );
      }
    },

    hideLoader() {
      const loader = document.querySelector('.page-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }
    }
  };

  // ============================================
  // EXPORT TO WINDOW
  // ============================================

  window.UltraSmooth = {
    App,
    LanguageManager,
    ToastManager,
    ModalManager,
    FormValidator,
    AppState
  };

  // Автоматична ініціалізація
  App.init();

})();

// ============================================
// ANIMATION KEYFRAMES (додати в CSS)
// ============================================

const animationStyles = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .animate-in {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }

  .animate-in.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .input-field.error {
    border-color: var(--neon-pink);
    animation: shake 0.3s ease;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  .error-message {
    color: var(--neon-pink);
    font-size: 0.75rem;
    margin-top: 4px;
    animation: slideUp 0.3s ease;
  }
`;

// Додати стилі до документа
if (!document.getElementById('ultra-smooth-animations')) {
  const style = document.createElement('style');
  style.id = 'ultra-smooth-animations';
  style.textContent = animationStyles;
  document.head.appendChild(style);
}
