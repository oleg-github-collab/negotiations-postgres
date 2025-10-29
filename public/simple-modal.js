/**
 * ============================================
 * УЛЬТРА-ПРОСТИЙ І НАДІЙНИЙ МЕХАНІЗМ МОДАЛОК
 * ============================================
 * Версія: 1.0
 * Без конфліктів, без глюків, без помилок
 */

(function() {
  'use strict';

  console.log('🔷 Simple Modal System loaded');

  // Глобальні змінні
  let currentModal = null;
  let backdrop = null;

  /**
   * Створити backdrop (темний фон)
   */
  function createBackdrop() {
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'simple-modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Клік по backdrop = закрити модалку
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) {
        console.log('🔴 Backdrop clicked - closing modal');
        closeCurrentModal();
      }
    });

    document.body.appendChild(backdrop);
    console.log('✅ Backdrop created');
    return backdrop;
  }

  /**
   * Відкрити модалку
   */
  function openModal(modalId) {
    try {
      console.log(`🔵 openModal("${modalId}") called`);

      // Знайти модалку в DOM
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(`❌ Modal "${modalId}" not found in DOM`);
        alert(`Модальне вікно "${modalId}" не знайдено`);
        return false;
      }

      console.log(`✅ Modal "${modalId}" found in DOM`);

      // Закрити попередню модалку якщо є
      if (currentModal && currentModal !== modalId) {
        console.log(`⚠️ Closing previous modal: ${currentModal}`);
        closeCurrentModal();
      }

      // Створити backdrop якщо його немає
      const bd = createBackdrop();

      // Показати backdrop
      bd.style.display = 'flex';
      setTimeout(() => {
        bd.style.opacity = '1';
      }, 10);

      // Показати модалку
      modal.style.display = 'block';
      modal.style.position = 'fixed';
      modal.style.zIndex = '100001';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';

      // Заборонити скрол body
      document.body.style.overflow = 'hidden';

      currentModal = modalId;

      console.log(`✅ Modal "${modalId}" opened successfully`);
      return true;

    } catch (error) {
      console.error('❌ Error in openModal:', error);
      alert('Помилка відкриття модального вікна: ' + error.message);
      return false;
    }
  }

  /**
   * Закрити поточну модалку
   */
  function closeCurrentModal() {
    try {
      if (!currentModal) {
        console.log('⚠️ No modal to close');
        return;
      }

      console.log(`🔴 Closing modal: ${currentModal}`);

      const modal = document.getElementById(currentModal);
      if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
      }

      // Сховати backdrop
      if (backdrop) {
        backdrop.style.opacity = '0';
        setTimeout(() => {
          backdrop.style.display = 'none';
        }, 300);
      }

      // Дозволити скрол body
      document.body.style.overflow = '';

      console.log(`✅ Modal "${currentModal}" closed`);
      currentModal = null;

    } catch (error) {
      console.error('❌ Error in closeCurrentModal:', error);
    }
  }

  /**
   * Обробник Escape
   */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentModal) {
      console.log('⌨️ Escape pressed - closing modal');
      closeCurrentModal();
    }
  });

  /**
   * Прив'язати кнопки закриття
   */
  function bindCloseButtons() {
    // Знайти всі кнопки закриття
    const closeButtons = document.querySelectorAll(
      '.modal-close, [id^="close-"], [id$="-modal-close"], [id^="cancel-"][id$="-btn"]'
    );

    closeButtons.forEach(btn => {
      // Видалити старі слухачі (якщо є)
      btn.replaceWith(btn.cloneNode(true));

      // Знайти кнопку знову після заміни
      const newBtn = document.querySelector(`#${btn.id}`) || btn;

      newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🔴 Close button clicked:', btn.id);
        closeCurrentModal();
      });
    });

    console.log(`✅ Bound ${closeButtons.length} close buttons`);
  }

  // Прив'язати кнопки після завантаження DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCloseButtons);
  } else {
    bindCloseButtons();
  }

  // Прив'язати кнопки повторно через 2 секунди (коли modals.html завантажиться)
  setTimeout(bindCloseButtons, 2000);

  /**
   * ЕКСПОРТ ГЛОБАЛЬНИХ ФУНКЦІЙ
   */
  window.SimpleModal = {
    open: openModal,
    close: closeCurrentModal,
    isOpen: () => currentModal !== null,
    getCurrent: () => currentModal
  };

  // Для зворотної сумісності
  window.showModal = openModal;
  window.hideModal = closeCurrentModal;
  window.closeModal = closeCurrentModal;

  // Перехопити ModalManager якщо він існує
  setTimeout(() => {
    if (window.ModalManager) {
      console.log('⚡ Intercepting ModalManager');
      window.ModalManager.open = function(modalId) {
        console.log('⚡ ModalManager.open() redirected to SimpleModal');
        return openModal(modalId);
      };
      window.ModalManager.close = function() {
        console.log('⚡ ModalManager.close() redirected to SimpleModal');
        return closeCurrentModal();
      };
    }
  }, 500);

  console.log('✅ Simple Modal System initialized');

})();
