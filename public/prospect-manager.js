/* ============================================
   PROSPECT MANAGER - ПОВНІСТЮ ПЕРЕРОБЛЕНА ВЕРСІЯ
   Простий, зрозумілий, працюючий
   ============================================ */

const ProspectManager = {
  prospects: [],
  negotiations: {},
  currentProspect: null,

  // Ініціалізація
  init() {
    console.log('🚀 ProspectManager initializing...');
    this.loadFromStorage();
    this.render();
    console.log('✅ ProspectManager initialized');
  },

  // Головний рендер
  render() {
    const container = document.getElementById('prospects-container');
    if (!container) {
      console.error('❌ prospects-container not found');
      return;
    }

    container.innerHTML = `
      <div class="prospects-page">
        <!-- Заголовок -->
        <div class="page-header">
          <h1>Проспекти та Аналіз Переговорів</h1>
          <button class="btn-add-prospect" id="btn-add-prospect">
            <i class="fas fa-plus"></i> Додати проспекта
          </button>
        </div>

        <!-- Інструкція -->
        <div class="instruction-box">
          <h3>📋 Як працювати з системою:</h3>
          <ol>
            <li>Натисніть "Додати проспекта" і введіть дані</li>
            <li>У картці проспекта натисніть "Завантажити переговори"</li>
            <li>Вставте текст переговорів (формат: "Ім'я: текст")</li>
            <li>Оберіть учасників для аналізу</li>
            <li>GPT проаналізує та підсвітить маніпуляції, софізми, викривлення</li>
            <li>Наведіть курсор на підсвічений текст для пояснення</li>
            <li>Перетягніть патерни в зону аналізу для детальних рекомендацій</li>
          </ol>
        </div>

        <!-- Список проспектів -->
        <div class="prospects-grid" id="prospects-grid">
          ${this.renderProspectsList()}
        </div>

        <!-- Зона розширеного аналізу -->
        <div class="extended-analysis-zone" id="extended-analysis-zone">
          <div class="zone-placeholder">
            <i class="fas fa-hand-pointer" style="font-size: 48px; opacity: 0.3; margin-bottom: 20px;"></i>
            <h3>Зона Розширеного Аналізу</h3>
            <p>Перетягніть сюди виявлені патерни (маніпуляції, софізми, викривлення)<br>для отримання детальних рекомендацій та контрстратегій</p>
          </div>
          <div class="zone-content" id="zone-content" style="display: none;"></div>
        </div>
      </div>
    `;

    this.attachEventHandlers();
  },

  // Рендер списку проспектів
  renderProspectsList() {
    if (this.prospects.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-users" style="font-size: 64px; opacity: 0.3; margin-bottom: 20px;"></i>
          <h3>Немає проспектів</h3>
          <p>Натисніть кнопку "Додати проспекта" щоб почати</p>
        </div>
      `;
    }

    return this.prospects.map(prospect => `
      <div class="prospect-card" data-id="${prospect.id}">
        <div class="card-header">
          <div>
            <h3>${prospect.name}</h3>
            <p class="company">${prospect.company || 'Компанія не вказана'}</p>
          </div>
          <div class="status-badge status-${prospect.status || 'new'}">
            ${this.getStatusLabel(prospect.status)}
          </div>
        </div>

        <div class="card-body">
          <div class="info-item">
            <i class="fas fa-envelope"></i>
            <span>${prospect.email || 'Email не вказаний'}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-comments"></i>
            <span>Переговорів: ${this.negotiations[prospect.id]?.length || 0}</span>
          </div>
        </div>

        ${prospect.adequacyScore !== null ? `
          <div class="adequacy-meter">
            <div class="meter-label">
              <span>Барометр адекватності</span>
              <strong>${prospect.adequacyScore}%</strong>
            </div>
            <div class="meter-bar">
              <div class="meter-fill" style="width: ${prospect.adequacyScore}%; background: ${this.getAdequacyColor(prospect.adequacyScore)}"></div>
            </div>
          </div>
        ` : ''}

        <div class="card-actions">
          <button class="btn-secondary" onclick="ProspectManager.uploadNegotiation('${prospect.id}')">
            <i class="fas fa-upload"></i> Завантажити переговори
          </button>
          ${this.negotiations[prospect.id]?.length > 0 ? `
            <button class="btn-secondary" onclick="ProspectManager.viewAnalysis('${prospect.id}')">
              <i class="fas fa-chart-line"></i> Переглянути аналіз
            </button>
          ` : ''}
          ${prospect.adequacyScore !== null && prospect.adequacyScore >= 60 ? `
            <button class="btn-success" onclick="ProspectManager.promoteToActive('${prospect.id}')">
              <i class="fas fa-star"></i> В актуальні клієнти
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  // Прив'язка обробників подій
  attachEventHandlers() {
    // Кнопка додавання проспекта
    const addBtn = document.getElementById('btn-add-prospect');
    if (addBtn) {
      addBtn.onclick = () => this.showAddProspectModal();
    }

    // Зона для drag and drop
    const zone = document.getElementById('extended-analysis-zone');
    if (zone) {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        const data = e.dataTransfer.getData('text/plain');
        if (data) {
          try {
            const finding = JSON.parse(data);
            this.showExtendedAnalysis(finding);
          } catch (err) {
            console.error('Invalid drop data:', err);
          }
        }
      });
    }
  },

  // Показати модалку додавання проспекта
  showAddProspectModal() {
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>Додати нового проспекта</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Ім'я проспекта *</label>
            <input type="text" id="prospect-name" class="form-input" placeholder="Введіть ім'я" autofocus>
          </div>
          <div class="form-group">
            <label>Компанія</label>
            <input type="text" id="prospect-company" class="form-input" placeholder="Назва компанії">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="prospect-email" class="form-input" placeholder="email@example.com">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Скасувати</button>
          <button class="btn-primary" id="btn-save-prospect">Зберегти</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelector('.modal-close').onclick = () => this.closeModal(modal);
    modal.querySelector('.btn-cancel').onclick = () => this.closeModal(modal);
    modal.querySelector('.modal-backdrop').onclick = () => this.closeModal(modal);

    modal.querySelector('#btn-save-prospect').onclick = () => {
      const name = modal.querySelector('#prospect-name').value.trim();
      const company = modal.querySelector('#prospect-company').value.trim();
      const email = modal.querySelector('#prospect-email').value.trim();

      if (!name) {
        alert('Будь ласка, введіть ім\'я проспекта');
        modal.querySelector('#prospect-name').focus();
        return;
      }

      this.saveProspect({ name, company, email });
      this.closeModal(modal);
    };

    modal.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        modal.querySelector('#btn-save-prospect').click();
      }
    });
  },

  // Зберегти проспекта
  saveProspect(data) {
    const prospect = {
      id: `prospect_${Date.now()}`,
      name: data.name,
      company: data.company,
      email: data.email,
      status: 'new',
      createdAt: new Date().toISOString(),
      adequacyScore: null
    };

    this.prospects.push(prospect);
    this.negotiations[prospect.id] = [];
    this.saveToStorage();
    this.render();

    console.log('✅ Prospect saved:', prospect.name);
  },

  // Завантажити переговори
  uploadNegotiation(prospectId) {
    const prospect = this.prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    this.currentProspect = prospect;

    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-dialog modal-large">
        <div class="modal-header">
          <h2>Завантажити переговори</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="info-box">
            <strong>Проспект:</strong> ${prospect.name}
          </div>

          <div class="form-group">
            <label>Текст переговорів *</label>
            <textarea id="negotiation-text" class="form-textarea" rows="15" placeholder="Вставте текст переговорів тут...

Приклад формату:

Джон Доу: Доброго дня! Хочу обговорити умови співпраці.
Менеджер: Привіт! Звичайно, давайте обговоримо.
Джон Доу: Яка у вас ціна?

або

[Клієнт]: Мені здається це занадто дорого
[Наша команда]: Давайте розглянемо вартість детальніше"></textarea>
          </div>

          <div class="hint-box">
            <i class="fas fa-info-circle"></i>
            <span>Система автоматично визначить учасників розмови та запропонує вибрати кого аналізувати</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Скасувати</button>
          <button class="btn-primary" id="btn-analyze">
            <i class="fas fa-brain"></i> Проаналізувати
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelector('.modal-close').onclick = () => this.closeModal(modal);
    modal.querySelector('.btn-cancel').onclick = () => this.closeModal(modal);
    modal.querySelector('.modal-backdrop').onclick = () => this.closeModal(modal);

    modal.querySelector('#btn-analyze').onclick = () => {
      const text = modal.querySelector('#negotiation-text').value.trim();

      if (!text) {
        alert('Будь ласка, вставте текст переговорів');
        return;
      }

      this.closeModal(modal);
      this.processNegotiationText(prospectId, text);
    };
  },

  // Обробка тексту переговорів
  async processNegotiationText(prospectId, text) {
    console.log('📝 Processing negotiation text...');

    const speakers = this.detectSpeakers(text);
    console.log('👥 Detected speakers:', speakers);

    if (speakers.length === 0) {
      alert('Не вдалося визначити учасників розмови. Перевірте формат тексту.');
      return;
    }

    if (speakers.length > 1) {
      this.showSpeakerSelectionModal(prospectId, text, speakers);
    } else {
      await this.analyzeNegotiation(prospectId, text, speakers);
    }
  },

  detectSpeakers(text) {
    const speakersSet = new Set();
    const lines = text.split('\n');
    const patterns = [
      /^([A-ZА-ЯІЇЄ][a-zа-яіїє''\s]+):/,
      /^\[([^\]]+)\]/,
      /^<([^>]+)>/
    ];

    lines.forEach(line => {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          speakersSet.add(match[1].trim());
          break;
        }
      }
    });

    return Array.from(speakersSet);
  },

  showSpeakerSelectionModal(prospectId, text, speakers) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>Виберіть учасників для аналізу</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>Знайдено ${speakers.length} учасників розмови. Виберіть кого включити в аналіз:</p>
          <div class="speakers-list">
            ${speakers.map(speaker => `
              <label class="speaker-checkbox">
                <input type="checkbox" value="${speaker}" checked>
                <span class="speaker-name">${speaker}</span>
                <select class="speaker-role">
                  <option value="prospect">Проспект</option>
                  <option value="our_team">Наша команда</option>
                  <option value="third_party">Третя сторона</option>
                </select>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">Скасувати</button>
          <button class="btn-primary" id="btn-start-analysis">
            <i class="fas fa-play"></i> Почати аналіз
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelector('.modal-close').onclick = () => this.closeModal(modal);
    modal.querySelector('.btn-cancel').onclick = () => this.closeModal(modal);
    modal.querySelector('.modal-backdrop').onclick = () => this.closeModal(modal);

    modal.querySelector('#btn-start-analysis').onclick = () => {
      const selectedSpeakers = [];
      modal.querySelectorAll('.speaker-checkbox input:checked').forEach(checkbox => {
        const speaker = checkbox.value;
        const role = checkbox.parentElement.querySelector('.speaker-role').value;
        selectedSpeakers.push({ name: speaker, role });
      });

      if (selectedSpeakers.length === 0) {
        alert('Виберіть хоча б одного учасника');
        return;
      }

      this.closeModal(modal);
      this.analyzeNegotiation(prospectId, text, selectedSpeakers);
    };
  },

  async analyzeNegotiation(prospectId, text, speakers) {
    console.log('🧠 Starting analysis...');
    this.showLoader('Аналізуємо переговори...');

    try {
      const analysis = await NegotiationAnalyzer.analyze(text, speakers);
      console.log('✅ Analysis complete:', analysis);

      const negotiation = {
        id: `neg_${Date.now()}`,
        text: text,
        speakers: speakers,
        analysis: analysis,
        timestamp: new Date().toISOString()
      };

      if (!this.negotiations[prospectId]) {
        this.negotiations[prospectId] = [];
      }
      this.negotiations[prospectId].push(negotiation);

      this.updateAdequacyScore(prospectId);
      this.saveToStorage();
      this.hideLoader();
      this.showAnalysisResults(prospectId, negotiation);

    } catch (error) {
      console.error('❌ Analysis error:', error);
      this.hideLoader();
      alert('Помилка аналізу: ' + error.message);
    }
  },

  updateAdequacyScore(prospectId) {
    const prospect = this.prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    const negotiations = this.negotiations[prospectId] || [];
    if (negotiations.length === 0) return;

    let totalScore = 100;
    negotiations.forEach(neg => {
      const analysis = neg.analysis;
      totalScore -= (analysis.manipulations?.length || 0) * 8;
      totalScore -= (analysis.cognitive_biases?.length || 0) * 5;
      totalScore -= (analysis.sophisms?.length || 0) * 4;
      totalScore += (analysis.positive_patterns?.length || 0) * 3;
    });

    prospect.adequacyScore = Math.max(0, Math.min(100, Math.round(totalScore)));
    console.log(`📊 Adequacy score for ${prospect.name}: ${prospect.adequacyScore}%`);
  },

  showAnalysisResults(prospectId, negotiation) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal analysis-modal';
    const { text, analysis } = negotiation;
    const highlightedText = this.highlightText(text, analysis);

    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-header">
          <h2>Результати аналізу переговорів</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="analysis-container">
            <div class="analysis-text-panel">
              <h3>Текст переговорів</h3>
              <div class="highlighted-text" id="highlighted-text">${highlightedText}</div>
            </div>
            <div class="findings-panel">
              <h3>Виявлені патерни (${this.getTotalFindings(analysis)})</h3>
              ${this.renderFindings(analysis)}
            </div>
          </div>
          <div class="analysis-summary">
            <div class="summary-card">
              <h4>Маніпуляції</h4>
              <div class="count critical">${analysis.manipulations?.length || 0}</div>
            </div>
            <div class="summary-card">
              <h4>Когнітивні викривлення</h4>
              <div class="count warning">${analysis.cognitive_biases?.length || 0}</div>
            </div>
            <div class="summary-card">
              <h4>Софізми</h4>
              <div class="count info">${analysis.sophisms?.length || 0}</div>
            </div>
            <div class="summary-card">
              <h4>Позитивні патерни</h4>
              <div class="count success">${analysis.positive_patterns?.length || 0}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary">Закрити</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);

    modal.querySelectorAll('.highlight').forEach(el => {
      el.addEventListener('mouseenter', () => this.showTooltip(el));
      el.addEventListener('mouseleave', () => this.hideTooltip());
    });

    modal.querySelector('.modal-close').onclick = () => {
      this.closeModal(modal);
      this.render();
    };
    modal.querySelector('.btn-primary').onclick = () => {
      this.closeModal(modal);
      this.render();
    };
    modal.querySelector('.modal-backdrop').onclick = () => {
      this.closeModal(modal);
      this.render();
    };
  },

  highlightText(text, analysis) {
    let html = text;
    const highlights = [];

    ['manipulations', 'cognitive_biases', 'sophisms', 'positive_patterns'].forEach(category => {
      if (analysis[category]) {
        analysis[category].forEach(item => {
          highlights.push({
            text: item.text,
            category: category,
            type: item.type,
            explanation: item.explanation || '',
            severity: item.severity || 'medium'
          });
        });
      }
    });

    highlights.sort((a, b) => b.text.length - a.text.length);

    highlights.forEach(highlight => {
      const escapedText = highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedText})`, 'gi');
      const replacement = `<span class="highlight highlight-${highlight.category}" data-category="${highlight.category}" data-type="${highlight.type}" data-explanation="${highlight.explanation}" data-severity="${highlight.severity}" draggable="true">$1</span>`;
      html = html.replace(regex, replacement);
    });

    return `<pre>${html}</pre>`;
  },

  renderFindings(analysis) {
    const categories = [
      { key: 'manipulations', label: 'Маніпуляції', icon: 'exclamation-triangle', color: 'critical' },
      { key: 'cognitive_biases', label: 'Когнітивні викривлення', icon: 'brain', color: 'warning' },
      { key: 'sophisms', label: 'Софізми', icon: 'balance-scale', color: 'info' },
      { key: 'positive_patterns', label: 'Позитивні патерни', icon: 'check-circle', color: 'success' }
    ];

    let html = '';
    categories.forEach(cat => {
      const items = analysis[cat.key] || [];
      if (items.length > 0) {
        html += `<div class="findings-category"><h4><i class="fas fa-${cat.icon}"></i> ${cat.label} (${items.length})</h4>`;
        html += items.map(item => `
          <div class="finding-item finding-${cat.color}" draggable="true" data-finding='${JSON.stringify(item)}'>
            <div class="finding-header">
              <strong>${item.type}</strong>
              ${item.severity ? `<span class="severity severity-${item.severity}">${item.severity}</span>` : ''}
            </div>
            <div class="finding-text">"${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}"</div>
            <div class="finding-hint"><i class="fas fa-hand-pointer"></i> Перетягніть для детального аналізу</div>
          </div>
        `).join('');
        html += '</div>';
      }
    });

    return html || '<p class="no-findings">Патернів не знайдено</p>';
  },

  showExtendedAnalysis(finding) {
    const zoneContent = document.getElementById('zone-content');
    const zonePlaceholder = document.querySelector('.zone-placeholder');

    if (zonePlaceholder) zonePlaceholder.style.display = 'none';
    if (zoneContent) {
      zoneContent.style.display = 'block';
      zoneContent.innerHTML = `
        <div class="extended-analysis-content">
          <div class="analysis-header">
            <h3>${finding.type}</h3>
            <button class="btn-clear" onclick="ProspectManager.clearExtendedAnalysis()"><i class="fas fa-times"></i></button>
          </div>
          <div class="analysis-section">
            <h4>Оригінальний текст</h4>
            <blockquote>${finding.text}</blockquote>
          </div>
          <div class="analysis-section">
            <h4>Пояснення</h4>
            <p>${finding.explanation || 'Це патерн типу "' + finding.type + '"'}</p>
          </div>
          <div class="analysis-section">
            <h4>Рекомендовані відповіді</h4>
            <div class="responses-list">
              <div class="response-item">
                <strong>Пряма конфронтація:</strong>
                <p>"Давайте повернемося до фактів."</p>
                <span class="effectiveness">Ефективність: 8/10</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById('extended-analysis-zone').scrollIntoView({ behavior: 'smooth' });
  },

  clearExtendedAnalysis() {
    const zoneContent = document.getElementById('zone-content');
    const zonePlaceholder = document.querySelector('.zone-placeholder');
    if (zoneContent) zoneContent.style.display = 'none';
    if (zonePlaceholder) zonePlaceholder.style.display = 'block';
  },

  viewAnalysis(prospectId) {
    const negotiations = this.negotiations[prospectId];
    if (!negotiations || negotiations.length === 0) {
      alert('Немає збережених аналізів');
      return;
    }
    this.showAnalysisResults(prospectId, negotiations[negotiations.length - 1]);
  },

  promoteToActive(prospectId) {
    const prospect = this.prospects.find(p => p.id === prospectId);
    if (!prospect) return;
    if (confirm(`Перевести ${prospect.name} в актуальні клієнти?`)) {
      prospect.status = 'active';
      this.saveToStorage();
      this.render();
      alert(`✅ ${prospect.name} переведено в актуальні клієнти!`);
    }
  },

  getTotalFindings(analysis) {
    return (analysis.manipulations?.length || 0) +
           (analysis.cognitive_biases?.length || 0) +
           (analysis.sophisms?.length || 0) +
           (analysis.positive_patterns?.length || 0);
  },

  getStatusLabel(status) {
    const labels = { new: 'Новий', active: 'Активний', qualified: 'Кваліфікований', rejected: 'Відхилений' };
    return labels[status] || 'Новий';
  },

  getAdequacyColor(score) {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#ff5722';
    return '#f44336';
  },

  showLoader(message) {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'global-loader';
    loader.innerHTML = `<div class="loader-content"><div class="spinner"></div><p>${message}</p></div>`;
    document.body.appendChild(loader);
  },

  hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.remove();
  },

  showTooltip(element) {
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.id = 'custom-tooltip';
    tooltip.innerHTML = `<strong>${element.dataset.type}</strong><p>${element.dataset.explanation}</p><span class="tooltip-category">${element.dataset.category}</span>`;
    document.body.appendChild(tooltip);
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 10) + 'px';
  },

  hideTooltip() {
    const tooltip = document.getElementById('custom-tooltip');
    if (tooltip) tooltip.remove();
  },

  closeModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  },

  saveToStorage() {
    localStorage.setItem('prospects', JSON.stringify(this.prospects));
    localStorage.setItem('negotiations', JSON.stringify(this.negotiations));
    console.log('💾 Data saved');
  },

  loadFromStorage() {
    try {
      const prospects = localStorage.getItem('prospects');
      const negotiations = localStorage.getItem('negotiations');
      if (prospects) this.prospects = JSON.parse(prospects);
      if (negotiations) this.negotiations = JSON.parse(negotiations);
      console.log(`📂 Loaded ${this.prospects.length} prospects`);
    } catch (err) {
      console.error('Error loading:', err);
    }
  }
};

window.ProspectManager = ProspectManager;

document.addEventListener('dragstart', (e) => {
  if (e.target.classList.contains('finding-item') || e.target.classList.contains('highlight')) {
    const finding = e.target.dataset.finding;
    if (finding) {
      e.dataTransfer.setData('text/plain', finding);
    } else {
      const data = {
        type: e.target.dataset.type,
        text: e.target.textContent,
        explanation: e.target.dataset.explanation,
        category: e.target.dataset.category,
        severity: e.target.dataset.severity
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(data));
    }
  }
});

console.log('✅ ProspectManager module loaded');