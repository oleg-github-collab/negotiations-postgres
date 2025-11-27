/* ============================================
   PROSPECT MANAGER
   Управління проспектами та їх переговорами
   ============================================ */

const ProspectManager = {
  prospects: [],
  currentProspect: null,
  negotiations: {},

  // Ініціалізація
  init() {
    this.loadProspects();
    this.createUI();
    this.bindEvents();
  },

  // Створення UI
  createUI() {
    // Головний контейнер проспектів
    const container = document.getElementById('prospects-container');
    if (!container) return;

    container.innerHTML = `
      <div class="prospects-header">
        <h2>Проспекти</h2>
        <button id="add-prospect-btn" class="btn btn-primary">
          <i class="fas fa-plus"></i> Додати проспекта
        </button>
      </div>

      <div class="prospects-filters">
        <input type="text" id="prospect-search" placeholder="Пошук проспекта...">
        <select id="prospect-status-filter">
          <option value="all">Всі статуси</option>
          <option value="new">Новий</option>
          <option value="in_negotiation">В переговорах</option>
          <option value="analyzing">Аналізується</option>
          <option value="qualified">Кваліфікований</option>
          <option value="rejected">Відхилений</option>
        </select>
      </div>

      <div id="prospects-list" class="prospects-list"></div>

      <!-- Зона аналізу -->
      <div id="analysis-zone" class="analysis-zone">
        <div class="zone-header">
          <h3>Зона розширеного аналізу</h3>
          <span class="hint">Перетягніть сюди виявлені патерни для детального аналізу</span>
        </div>
        <div id="extended-analysis-content"></div>
      </div>
    `;

    this.renderProspects();
  },

  // Відображення списку проспектів
  renderProspects() {
    const list = document.getElementById('prospects-list');
    if (!list) return;

    if (this.prospects.length === 0) {
      list.innerHTML = '<div class="empty-state">Немає проспектів. Додайте першого!</div>';
      return;
    }

    list.innerHTML = this.prospects.map(prospect => `
      <div class="prospect-card" data-id="${prospect.id}">
        <div class="prospect-header">
          <h4>${prospect.name}</h4>
          <span class="status-badge status-${prospect.status}">${this.getStatusLabel(prospect.status)}</span>
        </div>

        <div class="prospect-info">
          <div class="info-row">
            <span class="label">Компанія:</span>
            <span>${prospect.company || 'Не вказано'}</span>
          </div>
          <div class="info-row">
            <span class="label">Email:</span>
            <span>${prospect.email || 'Не вказано'}</span>
          </div>
          <div class="info-row">
            <span class="label">Переговорів:</span>
            <span>${this.negotiations[prospect.id]?.length || 0}</span>
          </div>
        </div>

        <div class="prospect-adequacy">
          <div class="adequacy-label">Барометр адекватності:</div>
          <div class="adequacy-bar">
            <div class="adequacy-fill" style="width: ${prospect.adequacyScore || 0}%; background: ${this.getAdequacyColor(prospect.adequacyScore)}"></div>
          </div>
          <span class="adequacy-score">${prospect.adequacyScore || 0}%</span>
        </div>

        <div class="prospect-actions">
          <button class="btn btn-sm" onclick="ProspectManager.uploadNegotiation('${prospect.id}')">
            <i class="fas fa-upload"></i> Завантажити переговори
          </button>
          <button class="btn btn-sm" onclick="ProspectManager.viewAnalysis('${prospect.id}')">
            <i class="fas fa-chart-line"></i> Переглянути аналіз
          </button>
          <button class="btn btn-sm btn-success" onclick="ProspectManager.promoteToActive('${prospect.id}')">
            <i class="fas fa-star"></i> В актуальні
          </button>
        </div>
      </div>
    `).join('');
  },

  // Додавання нового проспекта
  addProspect() {
    // Створюємо просту форму для додавання проспекта
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
        <h3 style="margin-bottom: 20px; color: #333;">Додати нового проспекта</h3>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Ім'я</label>
          <input type="text" id="prospect-name" style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px;" required>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Компанія</label>
          <input type="text" id="prospect-company" style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px;">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Email</label>
          <input type="email" id="prospect-email" style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px;">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancel-prospect-btn" style="padding: 10px 20px; border: 1px solid #e0e0e0; background: white; border-radius: 6px; cursor: pointer;">
            Скасувати
          </button>
          <button id="save-prospect-btn" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; cursor: pointer;">
            Зберегти
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Обробники
    modal.querySelector('#cancel-prospect-btn').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#save-prospect-btn').addEventListener('click', () => {
      const name = modal.querySelector('#prospect-name').value.trim();
      const company = modal.querySelector('#prospect-company').value.trim();
      const email = modal.querySelector('#prospect-email').value.trim();

      if (!name) {
        alert('Введіть ім\'я проспекта');
        return;
      }

      this.saveProspect({ name, company, email });
      modal.remove();
    });

    // Закриття по кліку на backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  },

  // Збереження проспекта
  saveProspect(data) {
    const prospect = {
      id: `prospect_${Date.now()}`,
      ...data,
      status: 'new',
      createdAt: new Date().toISOString(),
      adequacyScore: null
    };

    this.prospects.push(prospect);
    this.negotiations[prospect.id] = [];
    this.saveToStorage();
    this.renderProspects();
  },

  // Завантаження переговорів
  uploadNegotiation(prospectId) {
    this.currentProspect = this.prospects.find(p => p.id === prospectId);

    // Створюємо модалку для завантаження тексту
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    modal.innerHTML = `
      <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 700px; width: 90%;">
        <h3 style="margin-bottom: 10px; color: #333;">Завантажити переговори</h3>
        <p style="margin-bottom: 20px; color: #666;">Проспект: <strong>${this.currentProspect.name}</strong></p>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: #666; font-weight: 500;">Текст переговорів</label>
          <textarea id="negotiation-text"
                    style="width: 100%; height: 300px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-family: monospace; resize: vertical;"
                    placeholder="Вставте текст переговорів...&#10;&#10;Формат:&#10;Ім'я Спікера: текст&#10;або&#10;[Ім'я]: текст"></textarea>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancel-upload-btn" style="padding: 10px 20px; border: 1px solid #e0e0e0; background: white; border-radius: 6px; cursor: pointer;">
            Скасувати
          </button>
          <button id="analyze-btn" style="padding: 10px 20px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; cursor: pointer;">
            Проаналізувати
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Обробники
    modal.querySelector('#cancel-upload-btn').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#analyze-btn').addEventListener('click', () => {
      const text = modal.querySelector('#negotiation-text').value.trim();

      if (!text) {
        alert('Введіть текст переговорів');
        return;
      }

      modal.remove();
      this.processNegotiationText(prospectId, text);
    });

    // Закриття по кліку на backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  },

  // Обробка завантаженого тексту
  async processNegotiationText(prospectId, text) {
    // Спочатку парсимо текст для виявлення спікерів
    const speakers = this.detectSpeakers(text);

    if (speakers.length > 1) {
      // Показуємо модалку вибору спікерів
      this.showSpeakerSelection(prospectId, text, speakers);
    } else {
      // Одразу аналізуємо
      await this.analyzeNegotiation(prospectId, text, speakers);
    }
  },

  // Виявлення спікерів у тексті
  detectSpeakers(text) {
    const speakers = new Set();
    const patterns = [
      /^([A-Z][a-z]+ ?[A-Z]?[a-z]*):/, // Name: text
      /^\[([^\]]+)\]/, // [Name] text
      /^<([^>]+)>/, // <Name> text
    ];

    const lines = text.split('\n');
    lines.forEach(line => {
      patterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match) {
          speakers.add(match[1].trim());
        }
      });
    });

    // Якщо не знайдено спікерів, шукаємо інші патерни
    if (speakers.size === 0) {
      // Можливо текст без явних маркерів
      speakers.add('Клієнт');
      speakers.add('Наша команда');
    }

    return Array.from(speakers);
  },

  // Показ модалки вибору спікерів
  showSpeakerSelection(prospectId, text, speakers) {
    const modal = document.createElement('div');
    modal.className = 'modal active speaker-selection-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Виберіть учасників для аналізу</h3>
        <p>Знайдено ${speakers.length} учасників переговорів. Виберіть кого включити в аналіз:</p>

        <div class="speakers-list">
          ${speakers.map(speaker => `
            <label class="speaker-option">
              <input type="checkbox" value="${speaker}" checked>
              <span>${speaker}</span>
              <select class="role-select">
                <option value="prospect">Проспект</option>
                <option value="our_team">Наша команда</option>
                <option value="third_party">Третя сторона</option>
              </select>
            </label>
          `).join('')}
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary" onclick="ProspectManager.startAnalysis('${prospectId}', '${btoa(text)}')">
            Почати аналіз
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
            Скасувати
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // Початок аналізу з вибраними спікерами
  async startAnalysis(prospectId, encodedText) {
    const text = atob(encodedText);
    const modal = document.querySelector('.speaker-selection-modal');
    const selectedSpeakers = [];

    modal.querySelectorAll('.speaker-option input:checked').forEach(checkbox => {
      const speaker = checkbox.value;
      const role = checkbox.parentElement.querySelector('.role-select').value;
      selectedSpeakers.push({ name: speaker, role });
    });

    modal.remove();
    await this.analyzeNegotiation(prospectId, text, selectedSpeakers);
  },

  // Аналіз переговорів через GPT
  async analyzeNegotiation(prospectId, text, speakers) {
    // Показуємо індикатор завантаження
    this.showLoadingIndicator('Аналізуємо переговори...');

    try {
      const analysis = await NegotiationAnalyzer.analyze(text, speakers);

      // Зберігаємо результат
      if (!this.negotiations[prospectId]) {
        this.negotiations[prospectId] = [];
      }

      this.negotiations[prospectId].push({
        id: `neg_${Date.now()}`,
        text,
        speakers,
        analysis,
        timestamp: new Date().toISOString()
      });

      // Оновлюємо барометр адекватності
      this.updateAdequacyScore(prospectId);

      // Показуємо результат
      this.displayAnalysis(prospectId, analysis, text);

      // Зберігаємо
      this.saveToStorage();

    } catch (error) {
      console.error('Analysis error:', error);
      alert('Помилка аналізу: ' + error.message);
    } finally {
      this.hideLoadingIndicator();
    }
  },

  // Оновлення барометра адекватності
  updateAdequacyScore(prospectId) {
    const negotiations = this.negotiations[prospectId] || [];
    if (negotiations.length === 0) return;

    let totalScore = 0;
    let factors = {
      manipulation: 0,
      aggression: 0,
      cooperation: 0,
      clarity: 0,
      consistency: 0
    };

    negotiations.forEach(neg => {
      const analysis = neg.analysis;

      // Рахуємо негативні фактори
      factors.manipulation += (analysis.manipulations?.length || 0) * -10;
      factors.aggression += (analysis.aggressionLevel || 0) * -5;

      // Рахуємо позитивні фактори
      factors.cooperation += (analysis.cooperationLevel || 0) * 10;
      factors.clarity += (analysis.clarityScore || 0) * 5;
      factors.consistency += (analysis.consistencyScore || 0) * 5;
    });

    // Розраховуємо загальний бал (0-100)
    totalScore = Math.max(0, Math.min(100,
      50 + // Базовий бал
      factors.cooperation +
      factors.clarity +
      factors.consistency +
      factors.manipulation +
      factors.aggression
    ));

    // Оновлюємо проспекта
    const prospect = this.prospects.find(p => p.id === prospectId);
    if (prospect) {
      prospect.adequacyScore = Math.round(totalScore);
      prospect.adequacyFactors = factors;
      this.renderProspects();
    }
  },

  // Відображення результатів аналізу
  displayAnalysis(prospectId, analysis, originalText) {
    const container = document.createElement('div');
    container.className = 'analysis-results-container';
    container.innerHTML = `
      <div class="analysis-header">
        <h2>Результати аналізу переговорів</h2>
        <button class="close-btn" onclick="this.closest('.analysis-results-container').remove()">✕</button>
      </div>

      <div class="analysis-content">
        <div class="highlighted-text" id="highlighted-negotiation-text"></div>

        <div class="findings-sidebar">
          <h3>Виявлені патерни</h3>
          <div id="findings-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Підсвічуємо текст
    this.highlightText(originalText, analysis);

    // Показуємо список знахідок
    this.displayFindings(analysis);
  },

  // Підсвічування тексту з маніпуляціями
  highlightText(text, analysis) {
    const container = document.getElementById('highlighted-negotiation-text');
    if (!container) return;

    let highlightedText = text;
    const highlights = [];

    // Збираємо всі виділення
    if (analysis.manipulations) {
      analysis.manipulations.forEach(m => {
        highlights.push({
          text: m.text,
          type: 'manipulation',
          color: '#ff4444',
          tooltip: `Маніпуляція: ${m.type}\n${m.explanation}`
        });
      });
    }

    if (analysis.cognitive_biases) {
      analysis.cognitive_biases.forEach(b => {
        highlights.push({
          text: b.text,
          type: 'bias',
          color: '#ff8800',
          tooltip: `Когнітивне викривлення: ${b.type}\n${b.explanation}`
        });
      });
    }

    if (analysis.sophisms) {
      analysis.sophisms.forEach(s => {
        highlights.push({
          text: s.text,
          type: 'sophism',
          color: '#ffaa00',
          tooltip: `Софізм: ${s.type}\n${s.explanation}`
        });
      });
    }

    if (analysis.positive_patterns) {
      analysis.positive_patterns.forEach(p => {
        highlights.push({
          text: p.text,
          type: 'positive',
          color: '#44ff44',
          tooltip: `Позитивний патерн: ${p.type}`
        });
      });
    }

    // Сортуємо за позицією в тексті
    highlights.sort((a, b) => text.indexOf(b.text) - text.indexOf(a.text));

    // Застосовуємо виділення
    highlights.forEach(highlight => {
      const regex = new RegExp(highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      highlightedText = highlightedText.replace(regex,
        `<span class="highlight highlight-${highlight.type}"
               style="background-color: ${highlight.color}33; border-bottom: 2px solid ${highlight.color}"
               data-tooltip="${highlight.tooltip}"
               draggable="true"
               ondragstart="ProspectManager.dragFinding(event, '${btoa(JSON.stringify(highlight))}')">${highlight.text}</span>`
      );
    });

    container.innerHTML = `<pre>${highlightedText}</pre>`;

    // Додаємо обробники для тултіпів
    container.querySelectorAll('.highlight').forEach(span => {
      span.addEventListener('mouseenter', (e) => {
        this.showTooltip(e.target, e.target.dataset.tooltip);
      });
      span.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  },

  // Показ тултіпа
  showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'analysis-tooltip';
    tooltip.textContent = text;

    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 5) + 'px';

    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;
  },

  hideTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.remove();
      this.currentTooltip = null;
    }
  },

  // Відображення списку знахідок
  displayFindings(analysis) {
    const container = document.getElementById('findings-list');
    if (!container) return;

    const findings = [];

    // Збираємо всі знахідки
    ['manipulations', 'cognitive_biases', 'sophisms', 'positive_patterns'].forEach(category => {
      if (analysis[category]) {
        analysis[category].forEach(item => {
          findings.push({
            ...item,
            category
          });
        });
      }
    });

    container.innerHTML = findings.map(finding => `
      <div class="finding-card finding-${finding.category}"
           draggable="true"
           ondragstart="ProspectManager.dragFinding(event, '${btoa(JSON.stringify(finding))}')">
        <div class="finding-type">${this.getFindingLabel(finding.category)}: ${finding.type}</div>
        <div class="finding-text">"${finding.text.substring(0, 100)}..."</div>
        <div class="finding-severity severity-${finding.severity || 'medium'}">
          ${this.getSeverityLabel(finding.severity)}
        </div>
        <div class="drag-hint">⋮⋮ Перетягніть для детального аналізу</div>
      </div>
    `).join('');
  },

  // Перетягування знахідки
  dragFinding(event, encodedFinding) {
    event.dataTransfer.setData('finding', encodedFinding);
  },

  // Обробка drop в зону розширеного аналізу
  handleDrop(event) {
    event.preventDefault();
    const encodedFinding = event.dataTransfer.getData('finding');
    if (!encodedFinding) return;

    const finding = JSON.parse(atob(encodedFinding));
    this.showExtendedAnalysis(finding);
  },

  // Показ розширеного аналізу
  async showExtendedAnalysis(finding) {
    const container = document.getElementById('extended-analysis-content');
    if (!container) return;

    container.innerHTML = '<div class="loading">Генеруємо розширений аналіз...</div>';

    try {
      const extendedAnalysis = await this.getExtendedAnalysis(finding);

      container.innerHTML = `
        <div class="extended-analysis">
          <h3>${this.getFindingLabel(finding.category)}: ${finding.type}</h3>

          <div class="original-text">
            <h4>Оригінальний текст:</h4>
            <blockquote>${finding.text}</blockquote>
          </div>

          <div class="detailed-explanation">
            <h4>Детальне пояснення:</h4>
            <p>${extendedAnalysis.explanation}</p>
          </div>

          <div class="psychological-impact">
            <h4>Психологічний вплив:</h4>
            <p>${extendedAnalysis.psychologicalImpact}</p>
          </div>

          <div class="recommended-responses">
            <h4>Рекомендовані відповіді:</h4>
            <ul>
              ${extendedAnalysis.responses.map(r => `
                <li>
                  <strong>${r.approach}:</strong> "${r.text}"
                  <span class="effectiveness">Ефективність: ${r.effectiveness}/10</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="tactical-advice">
            <h4>Тактичні поради:</h4>
            <ul>
              ${extendedAnalysis.tactics.map(t => `<li>${t}</li>`).join('')}
            </ul>
          </div>

          <div class="counter-strategies">
            <h4>Контрстратегії:</h4>
            ${extendedAnalysis.counterStrategies.map(s => `
              <div class="strategy-card">
                <h5>${s.name}</h5>
                <p>${s.description}</p>
                <div class="example">Приклад: "${s.example}"</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (error) {
      container.innerHTML = `<div class="error">Помилка аналізу: ${error.message}</div>`;
    }
  },

  // Отримання розширеного аналізу через GPT
  async getExtendedAnalysis(finding) {
    // Тут буде виклик до GPT API
    // Поки що повертаємо мокові дані
    return {
      explanation: 'Це класичний приклад ' + finding.type + ', який використовується для психологічного впливу на опонента.',
      psychologicalImpact: 'Створює відчуття невпевненості та сумніву в власній позиції.',
      responses: [
        {
          approach: 'Пряма конфронтація',
          text: 'Давайте повернемося до фактів і конкретних даних.',
          effectiveness: 8
        },
        {
          approach: 'Переформулювання',
          text: 'Якщо я правильно розумію, ви маєте на увазі що...',
          effectiveness: 7
        },
        {
          approach: 'Ігнорування з перенаправленням',
          text: 'Це цікава думка. А що ви думаєте про...',
          effectiveness: 6
        }
      ],
      tactics: [
        'Завжди залишайтеся спокійними',
        'Документуйте всі домовленості',
        'Використовуйте конкретні приклади',
        'Не дозволяйте збити себе з теми'
      ],
      counterStrategies: [
        {
          name: 'Метод розбитого запису',
          description: 'Повторюйте свою позицію спокійно і впевнено',
          example: 'Як я вже казав, наша пропозиція базується на...'
        },
        {
          name: 'Метод дзеркала',
          description: 'Відображайте маніпулятивну тактику назад',
          example: 'Цікаво, що ви це кажете, бо саме це я хотів запитати у вас...'
        }
      ]
    };
  },

  // Переведення проспекта в актуальні
  promoteToActive(prospectId) {
    const prospect = this.prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    if (prospect.adequacyScore < 60) {
      if (!confirm('Барометр адекватності нижче 60%. Все одно перевести в актуальні?')) {
        return;
      }
    }

    prospect.status = 'qualified';

    // Додаємо до активних клієнтів в TeamHub
    if (window.TeamHub) {
      window.TeamHub.addActiveClient(prospect);
    }

    this.saveToStorage();
    this.renderProspects();

    alert(`${prospect.name} переведено в актуальні клієнти!`);
  },

  // Перегляд аналізу
  viewAnalysis(prospectId) {
    const negotiations = this.negotiations[prospectId];
    if (!negotiations || negotiations.length === 0) {
      alert('Немає проведених аналізів для цього проспекта');
      return;
    }

    // Показуємо останній аналіз
    const latest = negotiations[negotiations.length - 1];
    this.displayAnalysis(prospectId, latest.analysis, latest.text);
  },

  // Допоміжні методи
  getStatusLabel(status) {
    const labels = {
      new: 'Новий',
      in_negotiation: 'В переговорах',
      analyzing: 'Аналізується',
      qualified: 'Кваліфікований',
      rejected: 'Відхилений'
    };
    return labels[status] || status;
  },

  getFindingLabel(category) {
    const labels = {
      manipulations: 'Маніпуляція',
      cognitive_biases: 'Когнітивне викривлення',
      sophisms: 'Софізм',
      positive_patterns: 'Позитивний патерн'
    };
    return labels[category] || category;
  },

  getSeverityLabel(severity) {
    const labels = {
      low: 'Низька',
      medium: 'Середня',
      high: 'Висока',
      critical: 'Критична'
    };
    return labels[severity] || 'Середня';
  },

  getAdequacyColor(score) {
    if (score >= 80) return '#44ff44';
    if (score >= 60) return '#ffaa00';
    if (score >= 40) return '#ff8800';
    return '#ff4444';
  },

  showLoadingIndicator(message) {
    const loader = document.createElement('div');
    loader.id = 'analysis-loader';
    loader.className = 'loading-overlay';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(loader);
  },

  hideLoadingIndicator() {
    const loader = document.getElementById('analysis-loader');
    if (loader) loader.remove();
  },

  // Збереження даних
  saveToStorage() {
    localStorage.setItem('prospects', JSON.stringify(this.prospects));
    localStorage.setItem('negotiations', JSON.stringify(this.negotiations));
  },

  loadProspects() {
    const saved = localStorage.getItem('prospects');
    if (saved) {
      this.prospects = JSON.parse(saved);
    }

    const negotiations = localStorage.getItem('negotiations');
    if (negotiations) {
      this.negotiations = JSON.parse(negotiations);
    }
  },

  // Прив'язка подій
  bindEvents() {
    // Кнопка додавання проспекта
    const addBtn = document.getElementById('add-prospect-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addProspect());
    }

    // Зона розширеного аналізу
    const analysisZone = document.getElementById('analysis-zone');
    if (analysisZone) {
      analysisZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        analysisZone.classList.add('drag-over');
      });

      analysisZone.addEventListener('dragleave', () => {
        analysisZone.classList.remove('drag-over');
      });

      analysisZone.addEventListener('drop', (e) => {
        analysisZone.classList.remove('drag-over');
        this.handleDrop(e);
      });
    }

    // Пошук
    const searchInput = document.getElementById('prospect-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterProspects(e.target.value);
      });
    }

    // Фільтр статусу
    const statusFilter = document.getElementById('prospect-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filterByStatus(e.target.value);
      });
    }
  },

  // Фільтрація проспектів
  filterProspects(query) {
    const cards = document.querySelectorAll('.prospect-card');
    const lowerQuery = query.toLowerCase();

    cards.forEach(card => {
      const name = card.querySelector('h4').textContent.toLowerCase();
      const company = card.querySelector('.info-row:nth-child(1) span:last-child').textContent.toLowerCase();

      if (name.includes(lowerQuery) || company.includes(lowerQuery)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  },

  filterByStatus(status) {
    const cards = document.querySelectorAll('.prospect-card');

    cards.forEach(card => {
      const prospectId = card.dataset.id;
      const prospect = this.prospects.find(p => p.id === prospectId);

      if (status === 'all' || prospect?.status === status) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }
};

// Експорт
window.ProspectManager = ProspectManager;