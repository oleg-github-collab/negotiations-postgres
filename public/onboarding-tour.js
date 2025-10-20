/* ============================================
   ONBOARDING TOURS & CONTEXTUAL TOOLTIPS
   Interactive guided tours and smart tooltips
   ============================================ */

const OnboardingTour = {
  currentTour: null,
  currentStep: 0,
  overlay: null,
  tooltip: null,
  completedTours: [],

  tours: {
    welcome: {
      id: 'welcome',
      name: 'Вітаємо в TeamPulse',
      steps: [
        {
          target: '[data-tab="prospects"]',
          title: 'Prospects - Потенційні клієнти',
          content: 'Тут ви управляєте потенційними клієнтами. Додавайте, аналізуйте та конвертуйте їх в активних.',
          position: 'bottom',
          highlightPadding: 10
        },
        {
          target: '[data-tab="clients"]',
          title: 'Active Clients - TeamHub',
          content: 'Робота з активними клієнтами: команди, аналітика, RACI матриця та інструменти управління.',
          position: 'bottom'
        },
        {
          target: '#prospects-search',
          title: 'Швидкий пошук',
          content: 'Миттєво знаходьте потрібних клієнтів по назві, сектору або будь-якому параметру.',
          position: 'bottom'
        },
        {
          target: '.view-toggle',
          title: 'Перемикання виглядів',
          content: 'Grid для карток, Kanban для pipeline. Обирайте зручний спосіб відображення.',
          position: 'left'
        },
        {
          target: null,
          title: 'Command Palette',
          content: 'Натисніть <kbd>Ctrl+K</kbd> щоб відкрити палітру команд - найшвидший спосіб виконати будь-яку дію!',
          position: 'center'
        }
      ]
    },

    prospects: {
      id: 'prospects',
      name: 'Робота з Prospects',
      steps: [
        {
          target: '#create-prospect-btn',
          title: 'Створення Prospect',
          content: 'Додайте нового потенційного клієнта з детальною інформацією.',
          position: 'bottom'
        },
        {
          target: '.kanban-column[data-status="new"]',
          title: 'Pipeline stages',
          content: 'Перетягуйте картки між етапами для відстеження прогресу.',
          position: 'right'
        },
        {
          target: '.prospect-card:first-child',
          title: 'Картка клієнта',
          content: 'Клікніть для перегляду деталей, історії та аналітики.',
          position: 'top'
        }
      ]
    },

    teamhub: {
      id: 'teamhub',
      name: 'TeamHub Features',
      steps: [
        {
          target: '#add-active-client-btn',
          title: 'Додати активного клієнта',
          content: 'Створюйте клієнтів напряму або конвертуйте з Prospects.',
          position: 'left'
        },
        {
          target: '#create-team-btn',
          title: 'Управління командами',
          content: 'Створюйте команди з учасниками, ролями та відповідальністю.',
          position: 'bottom'
        },
        {
          target: '.client-card:first-child',
          title: 'Картка клієнта',
          content: 'Переглядайте команди, аналітику та RACI матрицю для кожного клієнта.',
          position: 'top'
        }
      ]
    },

    raci: {
      id: 'raci',
      name: 'RACI Matrix - Ultra Edition',
      steps: [
        {
          target: '.raci-tab-btn',
          title: 'RACI Matrix',
          content: 'Чітко визначайте ролі та відповідальність для кожної задачі з інтерактивною матрицею.',
          position: 'bottom'
        },
        {
          target: '.raci-cell:first-child',
          title: 'Click-to-toggle інтерфейс',
          content: 'Клікайте на комірки для перемикання між R (Responsible), A (Accountable), C (Consulted), I (Informed).',
          position: 'top'
        },
        {
          target: '.raci-validation',
          title: 'Автоматична валідація',
          content: 'Система підсвічує помилки: кожна задача повинна мати рівно 1 Accountable та хоча б 1 Responsible.',
          position: 'bottom'
        },
        {
          target: '.raci-add-task',
          title: 'Додавання задач',
          content: 'Додайте нову задачу або учасника для розширення матриці.',
          position: 'left'
        },
        {
          target: null,
          title: 'Auto-save',
          content: 'Всі зміни автоматично зберігаються через 5 секунд. Працюйте без турбот про збереження!',
          position: 'center'
        }
      ]
    },

    salaryAnalytics: {
      id: 'salary-analytics',
      name: 'Salary Analytics Dashboard',
      steps: [
        {
          target: '.salary-analytics-tab',
          title: 'Salary Analytics',
          content: 'Комплексна аналітика зарплат з AI-insights та візуалізацією даних.',
          position: 'bottom'
        },
        {
          target: '.salary-chart',
          title: 'Інтерактивні графіки',
          content: 'Розподіл зарплат, порівняння по позиціях та тренди з Chart.js візуалізацією.',
          position: 'top'
        },
        {
          target: '.ai-insights-card',
          title: 'AI Insights',
          content: 'GPT-4o аналізує ваші дані та генерує рекомендації для оптимізації бюджету.',
          position: 'left'
        },
        {
          target: '.salary-stats-grid',
          title: 'Статистика',
          content: 'Медіана, середнє, міжквартильний розмах та інші метрики для кожної позиції.',
          position: 'top'
        },
        {
          target: '.export-salary-data',
          title: 'Експорт даних',
          content: 'Експортуйте аналітику в CSV або PDF для звітності.',
          position: 'left'
        }
      ]
    },

    bestHireKanban: {
      id: 'best-hire-kanban',
      name: 'Best Hire Kanban Pipeline',
      steps: [
        {
          target: '.position-card:first-child',
          title: 'Позиція клієнта',
          content: 'Клікніть на позицію щоб відкрити Kanban board з кандидатами.',
          position: 'top'
        },
        {
          target: null,
          title: '7-Stage Pipeline',
          content: 'Kanban board з 7 етапами: Applied → Screening → Interview → Assessment → Offer → Hired → Rejected.',
          position: 'center'
        },
        {
          target: null,
          title: 'AI Candidate Scoring',
          content: 'Кожен кандидат автоматично оцінюється AI на основі резюме, досвіду та вимог позиції.',
          position: 'center'
        },
        {
          target: null,
          title: 'Resume Parsing',
          content: 'Завантажте резюме (PDF/зображення) і GPT-4o Vision автоматично витягне всю інформацію.',
          position: 'center'
        },
        {
          target: null,
          title: 'Drag & Drop',
          content: 'Перетягуйте кандидатів між етапами. Зміни відразу синхронізуються з сервером.',
          position: 'center'
        },
        {
          target: null,
          title: 'Parallel AI Processing',
          content: 'Bulk scoring використовує паралельну обробку для миттєвої оцінки всіх кандидатів.',
          position: 'center'
        }
      ]
    }
  },

  init() {
    this.loadCompletedTours();
    this.createOverlay();
    this.setupTooltips();

    // Auto-start welcome tour for new users
    if (!this.isCompleted('welcome') && !localStorage.getItem('teampulse_tour_dismissed')) {
      setTimeout(() => this.askToStart('welcome'), 2000);
    }
  },

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'tour-overlay';
    this.overlay.className = 'tour-overlay';
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);

    this.tooltip = document.createElement('div');
    this.tooltip.id = 'tour-tooltip';
    this.tooltip.className = 'tour-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);
  },

  askToStart(tourId) {
    const tour = this.tours[tourId];
    if (!tour) return;

    const banner = document.createElement('div');
    banner.className = 'tour-banner';
    banner.innerHTML = `
      <div class="tour-banner-content">
        <i class="fas fa-route"></i>
        <div class="tour-banner-text">
          <strong>${tour.name}</strong>
          <span>Хочете пройти короткий тур по основних функціях?</span>
        </div>
      </div>
      <div class="tour-banner-actions">
        <button class="btn-secondary btn-sm" onclick="OnboardingTour.dismissTour('${tourId}')">
          Пізніше
        </button>
        <button class="btn-primary btn-sm" onclick="OnboardingTour.start('${tourId}')">
          <i class="fas fa-play"></i>
          Почати тур
        </button>
      </div>
      <button class="tour-banner-close" onclick="OnboardingTour.dismissTour('${tourId}')">
        <i class="fas fa-times"></i>
      </button>
    `;

    document.body.appendChild(banner);
    setTimeout(() => banner.classList.add('show'), 100);
  },

  dismissTour(tourId) {
    const banner = document.querySelector('.tour-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 300);
    }
    localStorage.setItem('teampulse_tour_dismissed', 'true');
  },

  start(tourId) {
    // Remove banner if exists
    this.dismissTour(tourId);

    const tour = this.tours[tourId];
    if (!tour) {
      console.error(`Tour ${tourId} not found`);
      return;
    }

    this.currentTour = tour;
    this.currentStep = 0;

    this.overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    this.showStep();
  },

  showStep() {
    const step = this.currentTour.steps[this.currentStep];
    if (!step) {
      this.complete();
      return;
    }

    // Highlight target element
    if (step.target) {
      const element = document.querySelector(step.target);
      if (!element) {
        console.warn(`Target ${step.target} not found, skipping step`);
        this.next();
        return;
      }

      this.highlightElement(element, step.highlightPadding || 8);
      this.positionTooltip(element, step);
    } else {
      // Center modal for steps without target
      this.overlay.className = 'tour-overlay tour-overlay-centered';
      this.showCenteredTooltip(step);
    }

    this.renderTooltip(step);
  },

  highlightElement(element, padding) {
    const rect = element.getBoundingClientRect();

    this.overlay.className = 'tour-overlay';
    this.overlay.innerHTML = `
      <div class="tour-highlight"
           style="top: ${rect.top - padding}px;
                  left: ${rect.left - padding}px;
                  width: ${rect.width + padding * 2}px;
                  height: ${rect.height + padding * 2}px;">
      </div>
    `;

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  positionTooltip(element, step) {
    const rect = element.getBoundingClientRect();
    const tooltip = this.tooltip;
    const padding = 16;

    tooltip.style.display = 'block';

    // Wait for tooltip to render to get its size
    setTimeout(() => {
      const tooltipRect = tooltip.getBoundingClientRect();

      let top, left;

      switch (step.position) {
        case 'top':
          top = rect.top - tooltipRect.height - padding;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;

        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
          break;

        case 'left':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.left - tooltipRect.width - padding;
          break;

        case 'right':
          top = rect.top + (rect.height - tooltipRect.height) / 2;
          left = rect.right + padding;
          break;

        default:
          top = rect.bottom + padding;
          left = rect.left + (rect.width - tooltipRect.width) / 2;
      }

      // Keep within viewport
      const margin = 16;
      top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      tooltip.classList.add('tour-tooltip-visible');
    }, 10);
  },

  showCenteredTooltip(step) {
    this.tooltip.style.display = 'block';
    this.tooltip.style.top = '50%';
    this.tooltip.style.left = '50%';
    this.tooltip.style.transform = 'translate(-50%, -50%)';
    this.tooltip.classList.add('tour-tooltip-visible', 'tour-tooltip-centered');
  },

  renderTooltip(step) {
    const { title, content } = step;
    const isLast = this.currentStep === this.currentTour.steps.length - 1;
    const stepNum = this.currentStep + 1;
    const totalSteps = this.currentTour.steps.length;

    this.tooltip.innerHTML = `
      <div class="tour-tooltip-header">
        <h3>${title}</h3>
        <button class="tour-tooltip-close" onclick="OnboardingTour.end()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="tour-tooltip-body">
        ${content}
      </div>
      <div class="tour-tooltip-footer">
        <div class="tour-tooltip-progress">
          <span>${stepNum} / ${totalSteps}</span>
          <div class="tour-progress-bar">
            <div class="tour-progress-fill" style="width: ${(stepNum / totalSteps) * 100}%"></div>
          </div>
        </div>
        <div class="tour-tooltip-actions">
          ${this.currentStep > 0 ? `
            <button class="btn-secondary btn-sm" onclick="OnboardingTour.previous()">
              <i class="fas fa-arrow-left"></i>
              Назад
            </button>
          ` : ''}
          <button class="btn-primary btn-sm" onclick="OnboardingTour.${isLast ? 'complete' : 'next'}()">
            ${isLast ? '<i class="fas fa-check"></i> Завершити' : 'Далі <i class="fas fa-arrow-right"></i>'}
          </button>
        </div>
      </div>
    `;
  },

  next() {
    this.currentStep++;
    if (this.currentStep >= this.currentTour.steps.length) {
      this.complete();
    } else {
      this.showStep();
    }
  },

  previous() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep();
    }
  },

  complete() {
    // Mark as completed
    this.markCompleted(this.currentTour.id);

    // Show completion message
    this.tooltip.innerHTML = `
      <div class="tour-tooltip-completion">
        <i class="fas fa-check-circle"></i>
        <h3>Вітаємо!</h3>
        <p>Ви завершили тур "${this.currentTour.name}"</p>
        <button class="btn-primary" onclick="OnboardingTour.end()">
          Почати працювати
        </button>
      </div>
    `;

    setTimeout(() => this.end(), 3000);
  },

  end() {
    this.overlay.style.display = 'none';
    this.tooltip.style.display = 'none';
    this.tooltip.classList.remove('tour-tooltip-visible', 'tour-tooltip-centered');
    this.currentTour = null;
    this.currentStep = 0;
    document.body.style.overflow = '';
  },

  markCompleted(tourId) {
    if (!this.completedTours.includes(tourId)) {
      this.completedTours.push(tourId);
      this.saveCompletedTours();
    }
  },

  isCompleted(tourId) {
    return this.completedTours.includes(tourId);
  },

  loadCompletedTours() {
    try {
      const saved = localStorage.getItem('teampulse_completed_tours');
      if (saved) {
        this.completedTours = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load completed tours:', e);
    }
  },

  saveCompletedTours() {
    try {
      localStorage.setItem('teampulse_completed_tours', JSON.stringify(this.completedTours));
    } catch (e) {
      console.error('Failed to save completed tours:', e);
    }
  },

  // ============================================
  // CONTEXTUAL TOOLTIPS
  // ============================================

  setupTooltips() {
    // Add tooltips to elements with data-tooltip
    document.addEventListener('mouseover', (e) => {
      const element = e.target.closest('[data-tooltip]');
      if (element && !element.dataset.tooltipShown) {
        this.showContextTooltip(element);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const element = e.target.closest('[data-tooltip]');
      if (element) {
        this.hideContextTooltip(element);
      }
    });
  },

  showContextTooltip(element) {
    const text = element.dataset.tooltip;
    const position = element.dataset.tooltipPosition || 'top';

    const tooltip = document.createElement('div');
    tooltip.className = 'context-tooltip';
    tooltip.textContent = text;
    tooltip.dataset.for = element.id || Math.random().toString(36);

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 8;

    let top, left;

    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - padding;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + padding;
        break;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    setTimeout(() => tooltip.classList.add('show'), 10);

    element.dataset.tooltipShown = 'true';
    element._tooltip = tooltip;
  },

  hideContextTooltip(element) {
    if (element._tooltip) {
      element._tooltip.classList.remove('show');
      setTimeout(() => element._tooltip.remove(), 200);
      delete element._tooltip;
      delete element.dataset.tooltipShown;
    }
  }
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OnboardingTour.init());
} else {
  OnboardingTour.init();
}

// Expose globally
window.OnboardingTour = OnboardingTour;
