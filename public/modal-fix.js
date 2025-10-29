/**
 * EMERGENCY MODAL FIX
 * Простий, надійний механізм модалок БЕЗ конфліктів
 */

(function() {
  'use strict';

  console.log('🔧 Emergency Modal Fix loaded');

  // Простий селектор
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // Простий ModalController без складнощів
  window.SimpleModalController = {
    currentModal: null,

    open(modalId) {
      console.log(`🔵 SimpleModalController.open(${modalId})`);

      // Закрити попередню модалку
      if (this.currentModal) {
        this.close();
      }

      const modal = $(`#${modalId}`);
      if (!modal) {
        console.error(`❌ Modal not found: ${modalId}`);
        return false;
      }

      // Показати backdrop
      let backdrop = $('#simple-modal-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'simple-modal-backdrop';
        backdrop.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          z-index: 99998;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
        document.body.appendChild(backdrop);

        // Закриття по backdrop (тільки якщо клік саме по backdrop)
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) {
            console.log('🔴 Backdrop clicked');
            this.close();
          }
        });
      }
      backdrop.style.display = 'flex';

      // Показати модалку
      modal.style.position = 'fixed';
      modal.style.zIndex = '99999';
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';

      this.currentModal = modalId;

      // Блокувати scroll
      document.body.style.overflow = 'hidden';

      console.log(`✅ Modal opened: ${modalId}`);
      return true;
    },

    close() {
      if (!this.currentModal) {
        console.log('⚠️ No modal to close');
        return;
      }

      console.log(`🔴 SimpleModalController.close(${this.currentModal})`);

      const modal = $(`#${this.currentModal}`);
      if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
      }

      const backdrop = $('#simple-modal-backdrop');
      if (backdrop) {
        backdrop.style.display = 'none';
      }

      // Відновити scroll
      document.body.style.overflow = '';

      console.log(`✅ Modal closed: ${this.currentModal}`);
      this.currentModal = null;
    },

    isOpen() {
      return this.currentModal !== null;
    }
  };

  // Override старих функцій
  window.showModal = (modalId) => window.SimpleModalController.open(modalId);
  window.hideModal = () => window.SimpleModalController.close();
  window.closeModal = () => window.SimpleModalController.close();

  // Override ModalManager якщо існує
  if (window.ModalManager) {
    const oldOpen = window.ModalManager.open.bind(window.ModalManager);
    const oldClose = window.ModalManager.close.bind(window.ModalManager);

    window.ModalManager.open = function(modalId, data) {
      console.log('⚡ ModalManager.open intercepted, using SimpleModalController');
      return window.SimpleModalController.open(modalId);
    };

    window.ModalManager.close = function(modalId) {
      console.log('⚡ ModalManager.close intercepted, using SimpleModalController');
      return window.SimpleModalController.close();
    };
  }

  // Глобальний escape handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.SimpleModalController.isOpen()) {
      console.log('⌨️ Escape pressed, closing modal');
      window.SimpleModalController.close();
    }
  });

  // Прив'язати всі close кнопки
  setTimeout(() => {
    $$('[id^="close-"][id$="-modal"], [id^="cancel-"][id$="-btn"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Close button clicked via modal-fix');
        window.SimpleModalController.close();
      });
    });
    console.log('✅ Modal close buttons bound');
  }, 1000);

  console.log('✅ Emergency Modal Fix initialized');

})();
