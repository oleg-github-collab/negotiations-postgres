/* ============================================
   ADVANCED TEAM MANAGEMENT SYSTEM
   Complete team creation, editing, role management
   with drag & drop, file uploads, rich text
   ============================================ */

const TeamManagement = {
  teams: [],
  currentTeam: null,
  currentClientId: null,
  unsavedChanges: false,
  autoSaveTimer: null,

  // Initialize
  async init(clientId = null) {
    this.currentClientId = clientId;
    this.setupEventListeners();
    this.setupAutoSave();
    this.setupKeyboardShortcuts();

    if (clientId) {
      await this.loadTeamsByClient(clientId);
    }
  },

  setupEventListeners() {
    // Team creation button
    const createBtn = document.getElementById('create-team-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showCreateTeamModal());
    }

    // Search teams
    const searchInput = document.getElementById('teams-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.filterTeams(e.target.value);
      }, 300));
    }

    // View toggle
    document.querySelectorAll('.teams-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchView(e.currentTarget.dataset.view);
      });
    });

    // Prevent accidental navigation
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'У вас є незбережені зміни. Ви впевнені?';
        return e.returnValue;
      }
    });
  },

  setupAutoSave() {
    // Auto-save every 30 seconds if there are changes
    this.autoSaveTimer = setInterval(() => {
      if (this.unsavedChanges && this.currentTeam) {
        this.saveTeamSilently();
      }
    }, 30000);
  },

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (this.currentTeam) {
          this.saveTeam();
        }
      }

      // Ctrl/Cmd + K to open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.openCommandPalette();
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeActiveModal();
      }
    });
  },

  // ============================================
  // TEAM LOADING & FILTERING
  // ============================================

  async loadTeamsByClient(clientId) {
    try {
      showLoadingIndicator('teams-container');

      const response = await apiCall(`/clients/${clientId}/teams`);
      this.teams = response.teams || [];
      this.renderTeamsList();

      hideLoadingIndicator('teams-container');
    } catch (error) {
      console.error('Failed to load teams:', error);
      showNotification('Не вдалося завантажити команди', 'error');
      hideLoadingIndicator('teams-container');
    }
  },

  async loadAllTeams() {
    try {
      const response = await apiCall('/teams');
      this.teams = response.teams || [];
      this.renderTeamsList();
    } catch (error) {
      console.error('Failed to load all teams:', error);
      showNotification('Не вдалося завантажити команди', 'error');
    }
  },

  filterTeams(searchQuery) {
    const query = searchQuery.toLowerCase();
    const filtered = this.teams.filter(team =>
      team.title?.toLowerCase().includes(query) ||
      team.description?.toLowerCase().includes(query) ||
      team.members?.some(m => m.name?.toLowerCase().includes(query))
    );
    this.renderTeamsList(filtered);
  },

  // ============================================
  // RENDERING
  // ============================================

  renderTeamsList(teamsToRender = null) {
    const teams = teamsToRender || this.teams;
    const container = document.getElementById('teams-container');

    if (!container) return;

    if (teams.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    container.innerHTML = `
      <div class="teams-grid">
        ${teams.map(team => this.renderTeamCard(team)).join('')}
      </div>
    `;

    this.attachTeamCardListeners();
  },

  renderTeamCard(team) {
    const memberCount = team.members?.length || 0;
    const lastUpdated = this.formatRelativeTime(team.updated_at);
    const completionRate = this.calculateTeamCompletion(team);

    return `
      <div class="team-card" data-team-id="${team.id}">
        <div class="team-card-header">
          <div class="team-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="team-header-info">
            <h3 class="team-title">${this.escapeHtml(team.title)}</h3>
            <span class="team-client">${this.escapeHtml(team.client_name || 'Без клієнта')}</span>
          </div>
          <div class="team-card-actions">
            <button class="icon-btn" onclick="TeamManagement.editTeam(${team.id})" title="Редагувати">
              <i class="fas fa-edit"></i>
            </button>
            <button class="icon-btn" onclick="TeamManagement.duplicateTeam(${team.id})" title="Дублювати">
              <i class="fas fa-copy"></i>
            </button>
            <button class="icon-btn icon-btn-danger" onclick="TeamManagement.deleteTeam(${team.id})" title="Видалити">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        ${team.description ? `
          <div class="team-description">
            ${this.truncateText(team.description, 120)}
          </div>
        ` : ''}

        <div class="team-metrics">
          <div class="team-metric">
            <i class="fas fa-user"></i>
            <span>${memberCount} ${this.pluralize(memberCount, 'учасник', 'учасники', 'учасників')}</span>
          </div>
          <div class="team-metric">
            <i class="fas fa-tasks"></i>
            <span>${completionRate}% завершено</span>
          </div>
          <div class="team-metric">
            <i class="fas fa-clock"></i>
            <span>${lastUpdated}</span>
          </div>
        </div>

        ${memberCount > 0 ? `
          <div class="team-members-preview">
            ${this.renderMembersPreview(team.members)}
          </div>
        ` : ''}

        <div class="team-card-footer">
          <button class="btn-secondary btn-sm" onclick="TeamManagement.viewTeamDetails(${team.id})">
            <i class="fas fa-eye"></i>
            Детальніше
          </button>
          <button class="btn-secondary btn-sm" onclick="TeamManagement.openRACIMatrix(${team.id})">
            <i class="fas fa-sitemap"></i>
            RACI
          </button>
        </div>
      </div>
    `;
  },

  renderMembersPreview(members) {
    const maxVisible = 5;
    const visible = members.slice(0, maxVisible);
    const remaining = members.length - maxVisible;

    return `
      <div class="members-avatars">
        ${visible.map(member => `
          <div class="member-avatar" title="${this.escapeHtml(member.name)} - ${this.escapeHtml(member.role || 'Member')}">
            ${this.getInitials(member.name)}
          </div>
        `).join('')}
        ${remaining > 0 ? `
          <div class="member-avatar member-avatar-more">
            +${remaining}
          </div>
        ` : ''}
      </div>
    `;
  },

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-users-slash"></i>
        </div>
        <h2>Немає команд</h2>
        <p>Створіть першу команду для вашого клієнта</p>
        <button class="btn-primary" onclick="TeamManagement.showCreateTeamModal()">
          <i class="fas fa-plus"></i>
          Створити команду
        </button>
      </div>
    `;
  },

  // ============================================
  // TEAM CREATION & EDITING
  // ============================================

  showCreateTeamModal() {
    this.currentTeam = {
      id: null,
      title: '',
      description: '',
      client_id: this.currentClientId,
      members: [],
      files: [],
      notes: {}
    };

    this.renderTeamEditor();
    showModal('team-editor-modal');
  },

  async editTeam(teamId) {
    try {
      showLoadingIndicator('team-editor-content');

      const team = await apiCall(`/teams/${teamId}`);
      this.currentTeam = team;

      this.renderTeamEditor();
      showModal('team-editor-modal');

      hideLoadingIndicator('team-editor-content');
    } catch (error) {
      console.error('Failed to load team:', error);
      showNotification('Не вдалося завантажити команду', 'error');
    }
  },

  renderTeamEditor() {
    const container = document.getElementById('team-editor-content');
    if (!container) return;

    const team = this.currentTeam;

    container.innerHTML = `
      <div class="team-editor">
        <!-- Basic Info -->
        <div class="editor-section">
          <h3 class="editor-section-title">
            <i class="fas fa-info-circle"></i>
            Основна інформація
          </h3>

          <div class="form-group">
            <label for="team-title">
              Назва команди *
            </label>
            <input type="text" id="team-title" value="${this.escapeHtml(team.title || '')}"
                   placeholder="Наприклад: Development Team" required>
          </div>

          <div class="form-group">
            <label for="team-description">
              Опис команди
            </label>
            <div id="team-description-editor" class="rich-text-editor"></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="team-start-date">
                Дата початку
              </label>
              <input type="date" id="team-start-date" value="${team.notes?.start_date || ''}">
            </div>

            <div class="form-group">
              <label for="team-status">
                Статус
              </label>
              <select id="team-status">
                <option value="active" ${team.status === 'active' ? 'selected' : ''}>Активна</option>
                <option value="planning" ${team.status === 'planning' ? 'selected' : ''}>В плануванні</option>
                <option value="on-hold" ${team.status === 'on-hold' ? 'selected' : ''}>Призупинена</option>
                <option value="completed" ${team.status === 'completed' ? 'selected' : ''}>Завершена</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Team Members -->
        <div class="editor-section">
          <div class="section-header">
            <h3 class="editor-section-title">
              <i class="fas fa-users"></i>
              Учасники команди
            </h3>
            <button class="btn-secondary btn-sm" onclick="TeamManagement.addMember()">
              <i class="fas fa-user-plus"></i>
              Додати учасника
            </button>
          </div>

          <div id="team-members-list" class="members-list">
            ${this.renderMembersList(team.members || [])}
          </div>
        </div>

        <!-- Files & Attachments -->
        <div class="editor-section">
          <div class="section-header">
            <h3 class="editor-section-title">
              <i class="fas fa-paperclip"></i>
              Файли та документи
            </h3>
          </div>

          <div class="file-upload-zone" id="team-file-dropzone">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Перетягніть файли сюди або клікніть для вибору</p>
            <input type="file" id="team-file-input" multiple hidden>
            <button class="btn-secondary btn-sm" onclick="document.getElementById('team-file-input').click()">
              <i class="fas fa-upload"></i>
              Вибрати файли
            </button>
          </div>

          <div id="team-files-list" class="files-list">
            ${this.renderFilesList(team.files || [])}
          </div>
        </div>

        <!-- Notes & Tags -->
        <div class="editor-section">
          <h3 class="editor-section-title">
            <i class="fas fa-tags"></i>
            Теги та примітки
          </h3>

          <div class="form-group">
            <label for="team-tags">
              Теги
            </label>
            <input type="text" id="team-tags"
                   value="${(team.notes?.tags || []).join(', ')}"
                   placeholder="Розділіть комами: urgent, backend, frontend">
          </div>

          <div class="form-group">
            <label for="team-notes">
              Додаткові примітки
            </label>
            <textarea id="team-notes" rows="4"
                      placeholder="Будь-які важливі деталі...">${this.escapeHtml(team.notes?.additional_notes || '')}</textarea>
          </div>
        </div>
      </div>
    `;

    // Initialize rich text editor
    this.initializeRichTextEditor('team-description-editor', team.description || '');

    // Setup file upload
    this.setupFileUpload();

    // Mark as changed on any input
    container.querySelectorAll('input, textarea, select').forEach(el => {
      el.addEventListener('input', () => {
        this.unsavedChanges = true;
        this.updateSaveButtonState();
      });
    });
  },

  renderMembersList(members) {
    if (!members || members.length === 0) {
      return `
        <div class="empty-members-state">
          <i class="fas fa-user-plus"></i>
          <p>Поки що немає учасників</p>
        </div>
      `;
    }

    return members.map((member, index) => `
      <div class="member-item" data-index="${index}" draggable="true">
        <div class="member-drag-handle">
          <i class="fas fa-grip-vertical"></i>
        </div>
        <div class="member-avatar-large">
          ${this.getInitials(member.name)}
        </div>
        <div class="member-details">
          <input type="text" class="member-name-input"
                 value="${this.escapeHtml(member.name)}"
                 placeholder="Ім'я учасника"
                 onchange="TeamManagement.updateMember(${index}, 'name', this.value)">
          <input type="text" class="member-role-input"
                 value="${this.escapeHtml(member.role || '')}"
                 placeholder="Роль (Developer, Designer...)"
                 onchange="TeamManagement.updateMember(${index}, 'role', this.value)">
        </div>
        <div class="member-advanced">
          <select class="member-responsibility"
                  onchange="TeamManagement.updateMember(${index}, 'responsibility', this.value)">
            <option value="">Відповідальність</option>
            <option value="responsible" ${member.responsibility === 'responsible' ? 'selected' : ''}>Responsible (R)</option>
            <option value="accountable" ${member.responsibility === 'accountable' ? 'selected' : ''}>Accountable (A)</option>
            <option value="consulted" ${member.responsibility === 'consulted' ? 'selected' : ''}>Consulted (C)</option>
            <option value="informed" ${member.responsibility === 'informed' ? 'selected' : ''}>Informed (I)</option>
          </select>
          <input type="email" class="member-email-input"
                 value="${this.escapeHtml(member.email || '')}"
                 placeholder="email@example.com"
                 onchange="TeamManagement.updateMember(${index}, 'email', this.value)">
        </div>
        <div class="member-actions">
          <button class="icon-btn" onclick="TeamManagement.duplicateMember(${index})" title="Дублювати">
            <i class="fas fa-copy"></i>
          </button>
          <button class="icon-btn icon-btn-danger" onclick="TeamManagement.removeMember(${index})" title="Видалити">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  renderFilesList(files) {
    if (!files || files.length === 0) {
      return '';
    }

    return `
      <div class="uploaded-files">
        ${files.map((file, index) => `
          <div class="file-item" data-index="${index}">
            <div class="file-icon">
              <i class="${this.getFileIcon(file.type)}"></i>
            </div>
            <div class="file-info">
              <div class="file-name">${this.escapeHtml(file.name)}</div>
              <div class="file-meta">${this.formatFileSize(file.size)}</div>
            </div>
            <button class="icon-btn icon-btn-danger" onclick="TeamManagement.removeFile(${index})">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  addMember() {
    if (!this.currentTeam.members) {
      this.currentTeam.members = [];
    }

    this.currentTeam.members.push({
      name: '',
      role: '',
      email: '',
      responsibility: ''
    });

    this.unsavedChanges = true;
    this.renderMembersList(this.currentTeam.members);

    // Re-render members list
    const container = document.getElementById('team-members-list');
    if (container) {
      container.innerHTML = this.renderMembersList(this.currentTeam.members);
    }

    // Focus on new member input
    setTimeout(() => {
      const inputs = document.querySelectorAll('.member-name-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 100);
  },

  updateMember(index, field, value) {
    if (this.currentTeam.members && this.currentTeam.members[index]) {
      this.currentTeam.members[index][field] = value;
      this.unsavedChanges = true;
      this.updateSaveButtonState();
    }
  },

  removeMember(index) {
    if (!confirm('Видалити цього учасника?')) return;

    this.currentTeam.members.splice(index, 1);
    this.unsavedChanges = true;

    const container = document.getElementById('team-members-list');
    if (container) {
      container.innerHTML = this.renderMembersList(this.currentTeam.members);
    }
  },

  duplicateMember(index) {
    const member = { ...this.currentTeam.members[index] };
    member.name = `${member.name} (копія)`;
    this.currentTeam.members.splice(index + 1, 0, member);
    this.unsavedChanges = true;

    const container = document.getElementById('team-members-list');
    if (container) {
      container.innerHTML = this.renderMembersList(this.currentTeam.members);
    }
  },

  // Continue in next part...

  // Utility functions
  escapeHtml(text) {
    const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
    return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
  },

  getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  },

  formatRelativeTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'щойно';
    if (diffMins < 60) return `${diffMins} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    if (diffDays < 7) return `${diffDays} дн тому`;
    return date.toLocaleDateString('uk-UA');
  },

  pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  },

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  calculateTeamCompletion(team) {
    // Simple completion based on filled fields
    let filled = 0;
    let total = 5;

    if (team.title) filled++;
    if (team.description) filled++;
    if (team.members && team.members.length > 0) filled++;
    if (team.notes?.start_date) filled++;
    if (team.status) filled++;

    return Math.round((filled / total) * 100);
  },

  getFileIcon(mimeType) {
    if (!mimeType) return 'fas fa-file';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('image')) return 'fas fa-file-image';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fas fa-file-archive';
    return 'fas fa-file';
  },

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
};

// Helper functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function showLoadingIndicator(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
  }
}

function hideLoadingIndicator(containerId) {
  // Will be replaced by actual content
}

// Expose globally
window.TeamManagement = TeamManagement;
