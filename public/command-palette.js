/* ============================================
   COMMAND PALETTE - UNIVERSAL SEARCH & ACTIONS
   Cmd+K interface for instant access to everything
   ============================================ */

const CommandPalette = {
  isOpen: false,
  query: '',
  results: [],
  selectedIndex: 0,
  recentCommands: [],
  maxRecent: 10,

  commands: [
    // Navigation
    { id: 'nav-prospects', title: 'Перейти до Prospects', icon: 'fa-briefcase', action: () => switchTab('prospects'), keywords: ['потенційні', 'клієнти', 'prospects'] },
    { id: 'nav-clients', title: 'Перейти до Active Clients', icon: 'fa-users-cog', action: () => switchTab('clients'), keywords: ['активні', 'teamhub'] },

    // Quick Actions
    { id: 'create-prospect', title: 'Створити Prospect', icon: 'fa-plus', action: () => showModal('create-prospect-modal'), keywords: ['новий', 'додати', 'потенційний'] },
    { id: 'create-client', title: 'Створити Active Client', icon: 'fa-user-plus', action: () => showModal('add-client-modal'), keywords: ['новий', 'активний'] },
    { id: 'create-team', title: 'Створити команду', icon: 'fa-users', action: () => TeamManagement.showCreateTeamModal(), keywords: ['team', 'група'] },

    // Views
    { id: 'view-grid', title: 'Grid View', icon: 'fa-th', action: () => ProspectsManager?.toggleView('grid'), keywords: ['сітка', 'плитка'] },
    { id: 'view-kanban', title: 'Kanban View', icon: 'fa-columns', action: () => ProspectsManager?.toggleView('kanban'), keywords: ['канбан', 'дошка'] },
    { id: 'view-list', title: 'List View', icon: 'fa-list', action: () => TeamHub?.switchView('list'), keywords: ['список'] },

    // Settings
    { id: 'settings', title: 'Налаштування', icon: 'fa-cog', action: () => openSettings(), keywords: ['settings', 'preferences'] },
    { id: 'theme', title: 'Змінити тему', icon: 'fa-palette', action: () => ThemeManager.toggleTheme(), keywords: ['колір', 'дизайн'] },
    { id: 'shortcuts', title: 'Показати shortcuts', icon: 'fa-keyboard', action: () => CommandPalette.showShortcuts(), keywords: ['клавіші', 'hotkeys'] },

    // Data
    { id: 'export-data', title: 'Експорт даних', icon: 'fa-download', action: () => exportData(), keywords: ['завантажити', 'backup'] },
    { id: 'import-data', title: 'Імпорт даних', icon: 'fa-upload', action: () => importData(), keywords: ['загрузити'] },

    // Help
    { id: 'help', title: 'Допомога', icon: 'fa-question-circle', action: () => openHelp(), keywords: ['help', 'довідка'] },
    { id: 'docs', title: 'Документація', icon: 'fa-book', action: () => window.open('/ADVANCED-FEATURES.md'), keywords: ['documentation'] },
    { id: 'tour', title: 'Почати тур по системі', icon: 'fa-route', action: () => OnboardingTour.start(), keywords: ['навчання', 'tutorial'] },

    // System
    { id: 'logout', title: 'Вийти', icon: 'fa-sign-out-alt', action: () => logout(), keywords: ['exit', 'logout'] },
    { id: 'reload', title: 'Перезавантажити сторінку', icon: 'fa-sync', action: () => window.location.reload(), keywords: ['refresh'] },
    { id: 'clear-cache', title: 'Очистити кеш', icon: 'fa-trash', action: () => clearCache(), keywords: ['cache'] }
  ],

  init() {
    this.loadRecentCommands();
    this.setupEventListeners();
    this.render();
  },

  setupEventListeners() {
    // Cmd+K or Ctrl+K to open
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }

      // Arrow keys for navigation
      if (this.isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectPrevious();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      }
    });
  },

  render() {
    // Create palette HTML if not exists
    if (!document.getElementById('command-palette')) {
      const palette = document.createElement('div');
      palette.id = 'command-palette';
      palette.className = 'command-palette';
      palette.innerHTML = `
        <div class="command-palette-backdrop"></div>
        <div class="command-palette-container">
          <div class="command-palette-header">
            <i class="fas fa-search command-palette-icon"></i>
            <input type="text"
                   id="command-palette-input"
                   class="command-palette-input"
                   placeholder="Шукати дії, команди, сторінки..."
                   autocomplete="off"
                   spellcheck="false">
            <kbd class="command-palette-kbd">ESC</kbd>
          </div>
          <div class="command-palette-results" id="command-palette-results"></div>
          <div class="command-palette-footer">
            <div class="command-palette-hints">
              <span><kbd>↑</kbd><kbd>↓</kbd> навігація</span>
              <span><kbd>Enter</kbd> виконати</span>
              <span><kbd>ESC</kbd> закрити</span>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(palette);

      // Setup input listener
      const input = document.getElementById('command-palette-input');
      input.addEventListener('input', (e) => {
        this.query = e.target.value;
        this.search();
      });

      // Close on backdrop click
      palette.querySelector('.command-palette-backdrop').addEventListener('click', () => {
        this.close();
      });
    }
  },

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  },

  open() {
    this.isOpen = true;
    this.query = '';
    this.selectedIndex = 0;

    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-palette-input');

    palette.classList.add('command-palette-open');
    document.body.style.overflow = 'hidden';

    // Focus input
    setTimeout(() => {
      input.value = '';
      input.focus();
    }, 100);

    // Show recent commands
    this.showRecent();
  },

  close() {
    this.isOpen = false;
    const palette = document.getElementById('command-palette');
    palette.classList.remove('command-palette-open');
    document.body.style.overflow = '';
  },

  search() {
    if (!this.query.trim()) {
      this.showRecent();
      return;
    }

    const query = this.query.toLowerCase();
    this.results = this.commands
      .map(cmd => ({
        ...cmd,
        score: this.calculateScore(cmd, query)
      }))
      .filter(cmd => cmd.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    this.selectedIndex = 0;
    this.renderResults();
  },

  calculateScore(command, query) {
    let score = 0;
    const title = command.title.toLowerCase();
    const keywords = (command.keywords || []).join(' ').toLowerCase();

    // Exact match
    if (title === query) {
      score += 100;
    }

    // Starts with query
    if (title.startsWith(query)) {
      score += 50;
    }

    // Contains query
    if (title.includes(query)) {
      score += 30;
    }

    // Keyword match
    if (keywords.includes(query)) {
      score += 20;
    }

    // Fuzzy match
    if (this.fuzzyMatch(title, query)) {
      score += 10;
    }

    // Recent command bonus
    if (this.recentCommands.includes(command.id)) {
      score += 5;
    }

    return score;
  },

  fuzzyMatch(text, pattern) {
    let patternIdx = 0;
    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === pattern.length;
  },

  showRecent() {
    const recentIds = this.recentCommands;
    this.results = this.commands
      .filter(cmd => recentIds.includes(cmd.id))
      .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id))
      .slice(0, 5);

    this.renderResults(true);
  },

  renderResults(isRecent = false) {
    const container = document.getElementById('command-palette-results');

    if (this.results.length === 0) {
      container.innerHTML = `
        <div class="command-palette-empty">
          <i class="fas fa-search"></i>
          <p>Нічого не знайдено</p>
          <small>Спробуйте інший запит</small>
        </div>
      `;
      return;
    }

    const title = isRecent ? 'Нещодавні команди' : 'Результати';

    container.innerHTML = `
      ${isRecent ? `<div class="command-palette-section">${title}</div>` : ''}
      ${this.results.map((cmd, index) => `
        <div class="command-palette-item ${index === this.selectedIndex ? 'selected' : ''}"
             data-index="${index}"
             onclick="CommandPalette.execute('${cmd.id}')">
          <div class="command-item-icon">
            <i class="fas ${cmd.icon}"></i>
          </div>
          <div class="command-item-content">
            <div class="command-item-title">${this.highlightMatch(cmd.title, this.query)}</div>
            ${cmd.description ? `<div class="command-item-description">${cmd.description}</div>` : ''}
          </div>
          ${cmd.shortcut ? `<kbd class="command-item-shortcut">${cmd.shortcut}</kbd>` : ''}
        </div>
      `).join('')}
    `;

    // Scroll selected into view
    this.scrollToSelected();
  },

  highlightMatch(text, query) {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
    this.updateSelected();
  },

  selectPrevious() {
    this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
    this.updateSelected();
  },

  updateSelected() {
    const items = document.querySelectorAll('.command-palette-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
    this.scrollToSelected();
  },

  scrollToSelected() {
    const selected = document.querySelector('.command-palette-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  },

  executeSelected() {
    if (this.results.length > 0) {
      const cmd = this.results[this.selectedIndex];
      this.execute(cmd.id);
    }
  },

  execute(commandId) {
    const cmd = this.commands.find(c => c.id === commandId);
    if (!cmd) return;

    // Add to recent
    this.addToRecent(commandId);

    // Close palette
    this.close();

    // Execute command
    try {
      cmd.action();

      // Show feedback
      const toast = document.createElement('div');
      toast.className = 'command-toast';
      toast.innerHTML = `
        <i class="fas ${cmd.icon}"></i>
        <span>${cmd.title}</span>
      `;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);

    } catch (error) {
      console.error('Command execution failed:', error);
      showNotification('Помилка виконання команди', 'error');
    }
  },

  addToRecent(commandId) {
    // Remove if exists
    this.recentCommands = this.recentCommands.filter(id => id !== commandId);

    // Add to front
    this.recentCommands.unshift(commandId);

    // Keep only maxRecent
    this.recentCommands = this.recentCommands.slice(0, this.maxRecent);

    // Save to localStorage
    this.saveRecentCommands();
  },

  loadRecentCommands() {
    try {
      const saved = localStorage.getItem('teampulse_recent_commands');
      if (saved) {
        this.recentCommands = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load recent commands:', e);
    }
  },

  saveRecentCommands() {
    try {
      localStorage.setItem('teampulse_recent_commands', JSON.stringify(this.recentCommands));
    } catch (e) {
      console.error('Failed to save recent commands:', e);
    }
  },

  showShortcuts() {
    const shortcuts = [
      { keys: 'Ctrl+K', description: 'Відкрити Command Palette' },
      { keys: 'Ctrl+S', description: 'Зберегти поточну форму' },
      { keys: 'Ctrl+B', description: 'Жирний текст (в редакторі)' },
      { keys: 'Ctrl+I', description: 'Курсив (в редакторі)' },
      { keys: 'Ctrl+Z', description: 'Скасувати' },
      { keys: 'Ctrl+Y', description: 'Повторити' },
      { keys: 'Escape', description: 'Закрити модальне вікно' },
      { keys: '↑ ↓', description: 'Навігація по списку' },
      { keys: 'Enter', description: 'Підтвердити / Виконати' },
      { keys: 'Tab', description: 'Наступне поле' }
    ];

    const modal = `
      <div class="shortcuts-modal" id="shortcuts-modal">
        <div class="shortcuts-backdrop" onclick="document.getElementById('shortcuts-modal').remove()"></div>
        <div class="shortcuts-content">
          <div class="shortcuts-header">
            <h2>Keyboard Shortcuts</h2>
            <button class="shortcuts-close" onclick="document.getElementById('shortcuts-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="shortcuts-body">
            ${shortcuts.map(s => `
              <div class="shortcut-item">
                <kbd class="shortcut-keys">${s.keys}</kbd>
                <span class="shortcut-description">${s.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  }
};

// Helper functions
function switchTab(tabName) {
  const tab = document.querySelector(`[data-tab="${tabName}"]`);
  if (tab) tab.click();
}

function openSettings() {
  console.log('Open settings');
  // Would implement settings modal
}

function openHelp() {
  window.open('/ADVANCED-FEATURES.md', '_blank');
}

function exportData() {
  console.log('Export data');
  // Would implement export functionality
}

function importData() {
  console.log('Import data');
  // Would implement import functionality
}

function logout() {
  if (confirm('Ви впевнені, що хочете вийти?')) {
    window.location.href = '/login.html';
  }
}

function clearCache() {
  if (confirm('Очистити весь кеш? Незбережені дані можуть бути втрачені.')) {
    localStorage.clear();
    window.location.reload();
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CommandPalette.init());
} else {
  CommandPalette.init();
}

// Expose globally
window.CommandPalette = CommandPalette;
