/* ============================================
   TEAMHUB - ACTIVE CLIENTS MANAGEMENT
   Потужний модуль для управління активними клієнтами
   ============================================ */

const TeamHub = {
  activeClients: [],
  selectedClient: null,
  view: 'grid', // grid, list, detailed
  filters: {
    search: '',
    sector: 'all',
    teamSize: 'all',
    sortBy: 'updated_desc'
  },

  async init() {
    console.log('🚀 TeamHub initializing...');
    this.setupEventListeners();
    await this.loadActiveClients();
    this.render();
  },

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('teamhub-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.filters.search = e.target.value;
        this.filterAndRender();
      }, 300));
    }

    // View toggle
    document.querySelectorAll('.teamhub-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        document.querySelectorAll('.teamhub-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });

    // Add client button
    const addBtn = document.getElementById('add-active-client-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddClientModal());
    }
  },

  async loadActiveClients() {
    try {
      const response = await apiCall('/clients?client_type=active');
      this.activeClients = response.clients || [];
      console.log(`✅ Loaded ${this.activeClients.length} active clients`);
    } catch (error) {
      console.error('❌ Failed to load active clients:', error);
      showNotification('Не вдалося завантажити активних клієнтів', 'error');
    }
  },

  filterAndRender() {
    let filtered = [...this.activeClients];

    // Search filter
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(client =>
        client.company?.toLowerCase().includes(search) ||
        client.negotiator?.toLowerCase().includes(search) ||
        client.sector?.toLowerCase().includes(search)
      );
    }

    // Sector filter
    if (this.filters.sector !== 'all') {
      filtered = filtered.filter(client => client.sector === this.filters.sector);
    }

    // Team size filter
    if (this.filters.teamSize !== 'all') {
      filtered = filtered.filter(client => {
        const teamCount = client.teams_count || 0;
        switch (this.filters.teamSize) {
          case 'small': return teamCount <= 5;
          case 'medium': return teamCount > 5 && teamCount <= 15;
          case 'large': return teamCount > 15;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.filters.sortBy) {
        case 'name_asc': return (a.company || '').localeCompare(b.company || '');
        case 'name_desc': return (b.company || '').localeCompare(a.company || '');
        case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'created_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'updated_desc': return new Date(b.updated_at) - new Date(a.updated_at);
        case 'updated_asc': return new Date(a.updated_at) - new Date(b.updated_at);
        default: return 0;
      }
    });

    this.render(filtered);
  },

  render(clientsToRender = null) {
    const clients = clientsToRender || this.activeClients;
    const container = document.getElementById('teamhub-container');

    if (!container) {
      console.warn('TeamHub container not found');
      return;
    }

    if (clients.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    switch (this.view) {
      case 'grid':
        container.innerHTML = this.renderGridView(clients);
        break;
      case 'list':
        container.innerHTML = this.renderListView(clients);
        break;
      case 'detailed':
        container.innerHTML = this.renderDetailedView(clients);
        break;
    }

    this.attachCardEventListeners();
  },

  renderGridView(clients) {
    return `
      <div class="teamhub-grid">
        ${clients.map(client => this.renderClientCard(client)).join('')}
      </div>
    `;
  },

  renderClientCard(client) {
    const teamsCount = client.teams_count || 0;
    const analysesCount = client.analyses_count || 0;
    const lastActivity = client.updated_at ? this.formatRelativeTime(client.updated_at) : 'Немає даних';

    return `
      <div class="client-card" data-client-id="${client.id}">
        <div class="client-card-header">
          <div class="client-avatar">
            ${this.getCompanyInitials(client.company)}
          </div>
          <div class="client-header-info">
            <h3 class="client-company">${this.escapeHtml(client.company)}</h3>
            ${client.sector ? `<span class="client-sector">${this.escapeHtml(client.sector)}</span>` : ''}
          </div>
          <div class="client-card-actions">
            <button class="icon-btn" onclick="TeamHub.openClientDetails(${client.id})" title="Детальніше">
              <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn" onclick="TeamHub.editClient(${client.id})" title="Редагувати">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>

        <div class="client-card-body">
          ${client.negotiator ? `
            <div class="client-info-item">
              <i class="fas fa-user"></i>
              <span>${this.escapeHtml(client.negotiator)}</span>
            </div>
          ` : ''}

          <div class="client-metrics">
            <div class="client-metric">
              <i class="fas fa-users"></i>
              <span>${teamsCount} ${this.pluralize(teamsCount, 'команда', 'команди', 'команд')}</span>
            </div>
            <div class="client-metric">
              <i class="fas fa-chart-line"></i>
              <span>${analysesCount} ${this.pluralize(analysesCount, 'аналіз', 'аналізи', 'аналізів')}</span>
            </div>
          </div>

          <div class="client-last-activity">
            <i class="fas fa-clock"></i>
            <span>Оновлено ${lastActivity}</span>
          </div>
        </div>

        <div class="client-card-footer">
          <button class="btn-secondary btn-sm" onclick="TeamHub.manageTeams(${client.id})">
            <i class="fas fa-users-cog"></i>
            Команди
          </button>
          <button class="btn-secondary btn-sm" onclick="TeamHub.viewAnalytics(${client.id})">
            <i class="fas fa-chart-bar"></i>
            Аналітика
          </button>
        </div>
      </div>
    `;
  },

  renderListView(clients) {
    return `
      <div class="teamhub-list">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Компанія</th>
              <th>Переговорник</th>
              <th>Сфера</th>
              <th>Команди</th>
              <th>Аналізи</th>
              <th>Оновлено</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(client => this.renderClientRow(client)).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderClientRow(client) {
    const teamsCount = client.teams_count || 0;
    const analysesCount = client.analyses_count || 0;
    const lastActivity = client.updated_at ? this.formatRelativeTime(client.updated_at) : '—';

    return `
      <tr class="client-row" data-client-id="${client.id}">
        <td>
          <div class="client-name-cell">
            <div class="client-avatar-sm">${this.getCompanyInitials(client.company)}</div>
            <strong>${this.escapeHtml(client.company)}</strong>
          </div>
        </td>
        <td>${client.negotiator ? this.escapeHtml(client.negotiator) : '—'}</td>
        <td>${client.sector ? this.escapeHtml(client.sector) : '—'}</td>
        <td>${teamsCount}</td>
        <td>${analysesCount}</td>
        <td>${lastActivity}</td>
        <td>
          <div class="table-actions">
            <button class="icon-btn" onclick="TeamHub.openClientDetails(${client.id})" title="Детальніше">
              <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn" onclick="TeamHub.manageTeams(${client.id})" title="Команди">
              <i class="fas fa-users-cog"></i>
            </button>
            <button class="icon-btn" onclick="TeamHub.editClient(${client.id})" title="Редагувати">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-users-cog"></i>
        </div>
        <h2>Немає активних клієнтів</h2>
        <p>Додайте нового клієнта або конвертуйте потенційного клієнта з розділу Prospects</p>
        <div class="empty-state-actions">
          <button class="btn-primary" onclick="TeamHub.showAddClientModal()">
            <i class="fas fa-plus"></i>
            Додати клієнта
          </button>
          <button class="btn-secondary" onclick="TeamHub.goToProspects()">
            <i class="fas fa-briefcase"></i>
            Переглянути Prospects
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // CLIENT ACTIONS
  // ============================================

  showAddClientModal() {
    const modal = document.getElementById('add-client-modal');
    if (modal && typeof window.showModal === 'function') {
      window.showModal('add-client-modal');
    }
  },

  async openClientDetails(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      this.selectedClient = client;
      this.showClientDetailsModal(client);
    } catch (error) {
      console.error('Failed to load client details:', error);
      showNotification('Не вдалося завантажити деталі клієнта', 'error');
    }
  },

  showClientDetailsModal(client) {
    // This will integrate with modals.js
    if (typeof window.showClientDetails === 'function') {
      window.showClientDetails(client);
    }
  },

  async editClient(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      this.selectedClient = client;

      // Populate edit modal with client data
      document.getElementById('edit-client-id').value = client.id;
      document.getElementById('edit-company').value = client.company || '';
      document.getElementById('edit-negotiator').value = client.negotiator || '';
      document.getElementById('edit-sector').value = client.sector || '';
      document.getElementById('edit-weekly-hours').value = client.weekly_hours || '';

      if (typeof window.showModal === 'function') {
        window.showModal('edit-client-modal');
      }
    } catch (error) {
      console.error('Failed to load client for editing:', error);
      showNotification('Не вдалося завантажити клієнта', 'error');
    }
  },

  async manageTeams(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      const teams = await apiCall(`/teams?client_id=${clientId}`);

      this.selectedClient = client.data || client;
      const teamsData = teams.data || teams.teams || [];

      this.showTeamsManagementModal(this.selectedClient, teamsData);
    } catch (error) {
      console.error('Failed to load teams:', error);
      showNotification('Не вдалося завантажити команди', 'error');
    }
  },

  showTeamsManagementModal(client, teams) {
    let modal = document.getElementById('teams-management-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'teams-management-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-overlay" onclick="hideModal('teams-management-modal')"></div>
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h2>
            <i class="fas fa-users-cog"></i>
            Управління командами: ${this.escapeHtml(client.company)}
          </h2>
          <button class="modal-close-btn" onclick="hideModal('teams-management-modal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="teams-toolbar">
            <input type="text" class="search-input" id="teams-search" placeholder="Пошук команди...">
            <button class="btn btn-primary" onclick="TeamHub.createNewTeam(${client.id})">
              <i class="fas fa-plus"></i>
              Додати команду
            </button>
          </div>

          <div class="teams-grid" id="teams-grid">
            ${teams.length > 0 ? this.renderTeamsGrid(teams) : this.renderNoTeams()}
          </div>
        </div>
      </div>
    `;

    showModal('teams-management-modal');
  },

  renderTeamsGrid(teams) {
    return teams.map(team => {
      const membersCount = team.members?.length || team.members_count || 0;
      const raciComplete = team.raci_complete || false;

      return `
        <div class="team-card" data-team-id="${team.id}">
          <div class="team-card-header">
            <h4>${this.escapeHtml(team.name || 'Без назви')}</h4>
            ${raciComplete ? '<span class="badge badge-success"><i class="fas fa-check"></i> RACI готова</span>' : '<span class="badge badge-warning">RACI не завершена</span>'}
          </div>
          <div class="team-card-body">
            <div class="team-stat">
              <i class="fas fa-users"></i>
              <span>${membersCount} ${this.pluralize(membersCount, 'учасник', 'учасника', 'учасників')}</span>
            </div>
            ${team.description ? `<p class="team-description">${this.escapeHtml(team.description)}</p>` : ''}
          </div>
          <div class="team-card-footer">
            <button class="btn-secondary btn-sm" onclick="TeamHub.editTeam(${team.id})">
              <i class="fas fa-edit"></i>
              Редагувати
            </button>
            <button class="btn-primary btn-sm" onclick="TeamHub.manageRACI(${team.id})">
              <i class="fas fa-table"></i>
              RACI матриця
            </button>
            <button class="btn-success btn-sm" onclick="TeamHub.viewSalaryAnalytics(${team.id})">
              <i class="fas fa-chart-pie"></i>
              Зарплати
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderNoTeams() {
    return `
      <div class="empty-state">
        <i class="fas fa-users fa-3x"></i>
        <p>Команди ще не створені</p>
        <button class="btn btn-primary" onclick="TeamHub.createNewTeam(${this.selectedClient.id})">
          <i class="fas fa-plus"></i>
          Створити першу команду
        </button>
      </div>
    `;
  },

  async createNewTeam(clientId) {
    // Trigger team management module
    if (window.TeamManagement && typeof TeamManagement.showCreateTeamModal === 'function') {
      TeamManagement.currentClientId = clientId;
      TeamManagement.showCreateTeamModal();
    } else {
      showNotification('Модуль створення команд недоступний', 'error');
    }
  },

  async editTeam(teamId) {
    if (window.TeamManagement && typeof TeamManagement.editTeam === 'function') {
      TeamManagement.editTeam(teamId);
    } else {
      showNotification('Модуль редагування команд недоступний', 'error');
    }
  },

  async manageRACI(teamId) {
    try {
      const team = await apiCall(`/teams/${teamId}`);
      const teamData = team.data || team;

      this.showRACIMatrix(teamData);
    } catch (error) {
      console.error('Failed to load RACI matrix:', error);
      showNotification('Не вдалося завантажити RACI матрицю', 'error');
    }
  },

  showRACIMatrix(team) {
    // Track current team ID for auto-save
    if (!this.selectedClient) {
      this.selectedClient = {};
    }
    this.selectedClient.currentTeamId = team.id;

    let modal = document.getElementById('raci-matrix-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'raci-matrix-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const members = team.members || [];
    const tasks = team.tasks || [];

    modal.innerHTML = `
      <div class="modal-overlay" onclick="hideModal('raci-matrix-modal')"></div>
      <div class="modal-content modal-fullscreen">
        <div class="modal-header">
          <h2>
            <i class="fas fa-table"></i>
            RACI матриця: ${this.escapeHtml(team.name)}
          </h2>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="raci-save-indicator"></span>
            <button class="modal-close-btn" onclick="hideModal('raci-matrix-modal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="modal-body">
          <div class="raci-toolbar">
            <button class="btn btn-secondary" onclick="TeamHub.addRACITask(${team.id})">
              <i class="fas fa-plus"></i>
              Додати задачу
            </button>
            <button class="btn btn-secondary" onclick="TeamHub.exportRACI(${team.id})">
              <i class="fas fa-download"></i>
              Експорт
            </button>
            <button class="btn btn-primary" onclick="TeamHub.saveRACI(${team.id})">
              <i class="fas fa-save"></i>
              Зберегти зміни
            </button>
          </div>

          <div class="raci-matrix-container">
            ${this.renderRACIMatrixTable(team, members, tasks)}
          </div>

          <div class="raci-legend">
            <h4>Легенда RACI:</h4>
            <div class="legend-items">
              <span class="legend-item"><strong>R</strong> - Responsible (Відповідальний за виконання)</span>
              <span class="legend-item"><strong>A</strong> - Accountable (Підзвітний, приймає рішення, має бути ОДИН)</span>
              <span class="legend-item"><strong>C</strong> - Consulted (Консультант, радник)</span>
              <span class="legend-item"><strong>I</strong> - Informed (Інформований)</span>
            </div>
          </div>
        </div>
      </div>
    `;

    showModal('raci-matrix-modal');
  },

  renderRACIMatrixTable(team, members, tasks) {
    if (members.length === 0) {
      return '<p class="text-muted">Спочатку додайте учасників команди</p>';
    }

    if (tasks.length === 0) {
      return '<p class="text-muted">Додайте задачі для побудови RACI матриці</p>';
    }

    // Calculate workload for each member
    const workload = this.calculateWorkload(tasks, members);
    const validation = this.validateAllTasks(tasks, members);

    return `
      <!-- Validation Summary -->
      ${this.renderValidationSummary(validation, tasks.length)}

      <!-- Workload Heatmap -->
      <div class="raci-workload-heatmap">
        <h4><i class="fas fa-chart-bar"></i> Навантаження команди</h4>
        <div class="workload-grid">
          ${members.map(member => {
            const load = workload.get(member.id) || { responsible: 0, accountable: 0, total: 0 };
            const color = this.getWorkloadColor(load.total);
            return `
              <div class="workload-card" style="border-left: 4px solid ${color}">
                <div class="workload-member">
                  <div class="member-avatar">${this.getInitials(member.name)}</div>
                  <div class="member-info">
                    <strong>${this.escapeHtml(member.name)}</strong>
                    <small>${this.escapeHtml(member.role || '')}</small>
                  </div>
                </div>
                <div class="workload-stats">
                  <div class="workload-stat">
                    <span class="stat-label">R:</span>
                    <span class="stat-value">${load.responsible}</span>
                  </div>
                  <div class="workload-stat">
                    <span class="stat-label">A:</span>
                    <span class="stat-value">${load.accountable}</span>
                  </div>
                  <div class="workload-stat total">
                    <span class="stat-label">Всього:</span>
                    <span class="stat-value">${load.total}</span>
                  </div>
                </div>
                <div class="workload-bar">
                  <div class="workload-fill" style="width: ${Math.min(100, (load.total / tasks.length) * 100)}%; background: ${color}"></div>
                </div>
                <span class="workload-label ${this.getWorkloadSeverity(load.total, tasks.length)}">${this.getWorkloadLabel(load.total, tasks.length)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- RACI Matrix Table -->
      <table class="raci-table ultra">
        <thead>
          <tr>
            <th class="task-column">
              <div class="column-header">
                <i class="fas fa-tasks"></i>
                <span>Задача / Рішення</span>
              </div>
            </th>
            ${members.map(m => `
              <th class="member-column">
                <div class="member-header">
                  <div class="member-avatar">${this.getInitials(m.name)}</div>
                  <div class="member-info">
                    <span class="member-name">${this.escapeHtml(m.name)}</span>
                    <small class="member-role">${this.escapeHtml(m.role || '')}</small>
                  </div>
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody id="raci-matrix-body">
          ${tasks.map(task => {
            const taskValidation = this.validateTaskRaci(task, members);
            return `
              <tr class="raci-row ${taskValidation.isValid ? 'valid' : 'invalid'}" data-task-id="${task.id}">
                <td class="task-name">
                  <div class="task-info">
                    <span>${this.escapeHtml(task.name)}</span>
                    ${!taskValidation.isValid ? `
                      <span class="validation-icon" title="${taskValidation.errors.join(', ')}">
                        <i class="fas fa-exclamation-triangle"></i>
                      </span>
                    ` : `
                      <span class="validation-icon valid" title="Валідація пройдена">
                        <i class="fas fa-check-circle"></i>
                      </span>
                    `}
                  </div>
                </td>
                ${members.map(member => {
                  const raciValue = this.getRACIValue(task, member);
                  const roles = raciValue ? raciValue.split('') : [];
                  return `
                    <td class="raci-cell" data-task-id="${task.id}" data-member-id="${member.id}">
                      <div class="raci-badges">
                        ${['R', 'A', 'C', 'I'].map(role => `
                          <button
                            class="raci-badge ${roles.includes(role) ? 'active' : ''}"
                            data-role="${role}"
                            onclick="TeamHub.toggleRACIBadge(${task.id}, ${member.id}, '${role}')"
                            title="${this.getRACITitle(role)}">
                            ${role}
                          </button>
                        `).join('')}
                      </div>
                    </td>
                  `;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  // RACI Helper: Calculate workload per member
  calculateWorkload(tasks, members) {
    const workload = new Map();

    members.forEach(member => {
      workload.set(member.id, { responsible: 0, accountable: 0, consulted: 0, informed: 0, total: 0 });
    });

    tasks.forEach(task => {
      if (!task.raci) return;

      task.raci.forEach(assignment => {
        const load = workload.get(assignment.member_id);
        if (!load) return;

        const roles = assignment.role ? assignment.role.split('') : [];
        roles.forEach(role => {
          if (role === 'R') load.responsible++;
          if (role === 'A') load.accountable++;
          if (role === 'C') load.consulted++;
          if (role === 'I') load.informed++;
        });

        load.total = load.responsible + load.accountable + load.consulted + load.informed;
      });
    });

    return workload;
  },

  // RACI Helper: Get workload color
  getWorkloadColor(totalLoad) {
    if (totalLoad === 0) return '#6c757d'; // Gray - no load
    if (totalLoad <= 3) return '#51cf66'; // Green - light
    if (totalLoad <= 6) return '#4facfe'; // Blue - moderate
    if (totalLoad <= 10) return '#ffa94d'; // Orange - heavy
    return '#ff6b6b'; // Red - overloaded
  },

  // RACI Helper: Get workload label
  getWorkloadLabel(totalLoad, taskCount) {
    const percentage = (totalLoad / taskCount) * 100;
    if (totalLoad === 0) return 'Немає навантаження';
    if (percentage <= 30) return 'Легке навантаження';
    if (percentage <= 60) return 'Помірне навантаження';
    if (percentage <= 85) return 'Високе навантаження';
    return 'Перевантажений';
  },

  // RACI Helper: Get workload severity class
  getWorkloadSeverity(totalLoad, taskCount) {
    const percentage = (totalLoad / taskCount) * 100;
    if (totalLoad === 0) return 'none';
    if (percentage <= 30) return 'light';
    if (percentage <= 60) return 'moderate';
    if (percentage <= 85) return 'heavy';
    return 'overloaded';
  },

  // RACI Helper: Validate single task
  validateTaskRaci(task, members) {
    const errors = [];
    const accountableCount = (task.raci || []).filter(r => r.role && r.role.includes('A')).length;
    const responsibleCount = (task.raci || []).filter(r => r.role && r.role.includes('R')).length;

    if (accountableCount === 0) {
      errors.push('Відсутній Accountable (A)');
    } else if (accountableCount > 1) {
      errors.push('Забагато Accountable (має бути 1)');
    }

    if (responsibleCount === 0) {
      errors.push('Відсутній Responsible (R)');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      accountableCount: accountableCount,
      responsibleCount: responsibleCount
    };
  },

  // RACI Helper: Validate all tasks
  validateAllTasks(tasks, members) {
    let validCount = 0;
    let invalidCount = 0;
    const issues = [];

    tasks.forEach(task => {
      const validation = this.validateTaskRaci(task, members);
      if (validation.isValid) {
        validCount++;
      } else {
        invalidCount++;
        issues.push({
          taskName: task.name,
          errors: validation.errors
        });
      }
    });

    return {
      validCount: validCount,
      invalidCount: invalidCount,
      totalCount: tasks.length,
      percentage: tasks.length > 0 ? Math.round((validCount / tasks.length) * 100) : 0,
      issues: issues
    };
  },

  // RACI Helper: Render validation summary
  renderValidationSummary(validation, totalTasks) {
    const isAllValid = validation.invalidCount === 0;
    const statusClass = isAllValid ? 'success' : validation.percentage >= 50 ? 'warning' : 'danger';

    return `
      <div class="raci-validation-summary ${statusClass}">
        <div class="validation-header">
          <div class="validation-icon">
            <i class="fas fa-${isAllValid ? 'check-circle' : 'exclamation-triangle'}"></i>
          </div>
          <div class="validation-info">
            <h4>Валідація RACI матриці</h4>
            <p>${validation.validCount} з ${validation.totalCount} задач пройшли валідацію (${validation.percentage}%)</p>
          </div>
          <div class="validation-progress">
            <div class="circular-progress" data-progress="${validation.percentage}">
              <svg width="80" height="80">
                <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"></circle>
                <circle cx="40" cy="40" r="35" fill="none" stroke="${isAllValid ? '#51cf66' : validation.percentage >= 50 ? '#ffa94d' : '#ff6b6b'}"
                        stroke-width="6" stroke-dasharray="${2 * Math.PI * 35}"
                        stroke-dashoffset="${2 * Math.PI * 35 * (1 - validation.percentage / 100)}"
                        transform="rotate(-90 40 40)"></circle>
              </svg>
              <span class="progress-text">${validation.percentage}%</span>
            </div>
          </div>
        </div>
        ${validation.issues.length > 0 ? `
          <div class="validation-issues">
            <button class="toggle-issues-btn" onclick="this.parentElement.querySelector('.issues-list').classList.toggle('show')">
              <i class="fas fa-chevron-down"></i>
              Показати проблеми (${validation.issues.length})
            </button>
            <div class="issues-list">
              ${validation.issues.map(issue => `
                <div class="issue-item">
                  <i class="fas fa-exclamation-circle"></i>
                  <strong>${this.escapeHtml(issue.taskName)}:</strong>
                  <span>${issue.errors.join(', ')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // RACI Helper: Get role title
  getRACITitle(role) {
    const titles = {
      'R': 'Responsible - Відповідальний за виконання',
      'A': 'Accountable - Підзвітний, приймає рішення (має бути 1)',
      'C': 'Consulted - Консультант, радник',
      'I': 'Informed - Інформований'
    };
    return titles[role] || '';
  },

  // RACI Action: Toggle badge
  async toggleRACIBadge(taskId, memberId, role) {
    const cell = document.querySelector(`.raci-cell[data-task-id="${taskId}"][data-member-id="${memberId}"]`);
    if (!cell) return;

    const badge = cell.querySelector(`.raci-badge[data-role="${role}"]`);
    if (!badge) return;

    const isActive = badge.classList.contains('active');

    // Get current RACI value
    const currentKey = `${taskId}-${memberId}`;
    const currentChange = this.raciChanges.get(currentKey);
    let currentRoles = currentChange ? currentChange.role.split('') : [];

    // Find original value if no changes yet
    if (!currentChange) {
      const task = this.selectedClient?.teams?.find(t => t.tasks?.find(tk => tk.id === taskId))?.tasks?.find(tk => tk.id === taskId);
      if (task && task.raci) {
        const assignment = task.raci.find(r => r.member_id === memberId);
        if (assignment && assignment.role) {
          currentRoles = assignment.role.split('');
        }
      }
    }

    // Toggle role
    if (isActive) {
      currentRoles = currentRoles.filter(r => r !== role);
      badge.classList.remove('active');
    } else {
      // Special validation for 'A' - only one per task
      if (role === 'A') {
        const allCells = document.querySelectorAll(`.raci-cell[data-task-id="${taskId}"]`);
        allCells.forEach(c => {
          const aBadge = c.querySelector('.raci-badge[data-role="A"]');
          if (aBadge && aBadge !== badge) {
            aBadge.classList.remove('active');
            // Also update other members' RACI values
            const otherMemberId = parseInt(c.dataset.memberId);
            const otherKey = `${taskId}-${otherMemberId}`;
            const otherChange = this.raciChanges.get(otherKey);
            if (otherChange) {
              otherChange.role = otherChange.role.split('').filter(r => r !== 'A').join('');
              this.raciChanges.set(otherKey, otherChange);
            }
          }
        });
      }

      if (!currentRoles.includes(role)) {
        currentRoles.push(role);
      }
      badge.classList.add('active');
    }

    // Sort roles: R, A, C, I
    const roleOrder = { 'R': 0, 'A': 1, 'C': 2, 'I': 3 };
    currentRoles.sort((a, b) => roleOrder[a] - roleOrder[b]);

    // Update changes map
    const newValue = currentRoles.join('');
    this.raciChanges.set(currentKey, { taskId, memberId, role: newValue });

    // Auto-save after 5 seconds (debounced for better performance)
    clearTimeout(this.raciAutoSaveTimeout);
    this.raciAutoSaveTimeout = setTimeout(() => {
      this.updateValidationDisplay(taskId);
      this.autoSaveRACI();
    }, 5000);

    console.log('RACI toggled:', { taskId, memberId, role, newValue });
  },

  // RACI Action: Update validation display
  updateValidationDisplay(taskId) {
    const row = document.querySelector(`.raci-row[data-task-id="${taskId}"]`);
    if (!row) return;

    // Get all members and rebuild task RACI from current state
    const cells = row.querySelectorAll('.raci-cell');
    const taskRaci = [];

    cells.forEach(cell => {
      const memberId = parseInt(cell.dataset.memberId);
      const activeBadges = cell.querySelectorAll('.raci-badge.active');
      const roles = Array.from(activeBadges).map(b => b.dataset.role).join('');
      if (roles) {
        taskRaci.push({ member_id: memberId, role: roles });
      }
    });

    const mockTask = { id: taskId, raci: taskRaci };
    const validation = this.validateTaskRaci(mockTask, []);

    // Update row class
    row.classList.toggle('valid', validation.isValid);
    row.classList.toggle('invalid', !validation.isValid);

    // Update validation icon
    const validationIcon = row.querySelector('.validation-icon');
    if (validationIcon) {
      if (validation.isValid) {
        validationIcon.className = 'validation-icon valid';
        validationIcon.title = 'Валідація пройдена';
        validationIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
      } else {
        validationIcon.className = 'validation-icon';
        validationIcon.title = validation.errors.join(', ');
        validationIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
      }
    }
  },

  // RACI Action: Auto-save
  async autoSaveRACI() {
    if (this.raciChanges.size === 0) return;

    try {
      const teamId = this.selectedClient?.currentTeamId; // You'll need to track this
      if (!teamId) {
        console.warn('Cannot auto-save: no team ID');
        return;
      }

      const changes = Array.from(this.raciChanges.values());
      await apiCall(`/teams/${teamId}/raci`, {
        method: 'POST',
        body: JSON.stringify({ assignments: changes })
      });

      // Show subtle notification
      const saveIndicator = document.querySelector('.raci-save-indicator');
      if (saveIndicator) {
        saveIndicator.textContent = '✓ Збережено ' + new Date().toLocaleTimeString('uk-UA');
        saveIndicator.classList.add('show');
        setTimeout(() => saveIndicator.classList.remove('show'), 2000);
      }

      console.log('✅ RACI auto-saved');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  },

  getRACIValue(task, member) {
    if (!task.raci) return '';
    const assignment = task.raci.find(r => r.member_id === member.id);
    return assignment?.role || '';
  },

  getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  },

  raciChanges: new Map(),

  updateRACIValue(taskId, memberId, value) {
    const key = `${taskId}-${memberId}`;
    this.raciChanges.set(key, { taskId, memberId, role: value });
    console.log('RACI updated:', { taskId, memberId, value });
  },

  async saveRACI(teamId) {
    try {
      const changes = Array.from(this.raciChanges.values());

      if (changes.length === 0) {
        showNotification('Немає змін для збереження', 'info');
        return;
      }

      await apiCall(`/teams/${teamId}/raci`, {
        method: 'POST',
        body: JSON.stringify({ assignments: changes })
      });

      this.raciChanges.clear();
      showNotification('RACI матриця збережена', 'success');
    } catch (error) {
      console.error('Failed to save RACI:', error);
      showNotification('Помилка збереження RACI матриці', 'error');
    }
  },

  async viewAnalytics(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      const analytics = await apiCall(`/clients/${clientId}/analytics`);

      this.selectedClient = client.data || client;
      const analyticsData = analytics.data || analytics;

      this.showAnalyticsModal(this.selectedClient, analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      showNotification('Не вдалося завантажити аналітику', 'error');
    }
  },

  showAnalyticsModal(client, analytics) {
    let modal = document.getElementById('client-analytics-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'client-analytics-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const teamMetrics = analytics.team_metrics || {};
    const performanceData = analytics.performance || {};

    modal.innerHTML = `
      <div class="modal-overlay" onclick="hideModal('client-analytics-modal')"></div>
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h2>
            <i class="fas fa-chart-bar"></i>
            Аналітика: ${this.escapeHtml(client.company)}
          </h2>
          <button class="modal-close-btn" onclick="hideModal('client-analytics-modal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Ключові метрики -->
          <div class="analytics-metrics">
            <div class="metric-card">
              <div class="metric-icon"><i class="fas fa-users"></i></div>
              <div class="metric-info">
                <h4>Команди</h4>
                <span class="metric-value">${teamMetrics.teams_count || 0}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon"><i class="fas fa-user-friends"></i></div>
              <div class="metric-info">
                <h4>Учасники</h4>
                <span class="metric-value">${teamMetrics.total_members || 0}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon"><i class="fas fa-tasks"></i></div>
              <div class="metric-info">
                <h4>Задачі</h4>
                <span class="metric-value">${teamMetrics.total_tasks || 0}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon"><i class="fas fa-chart-line"></i></div>
              <div class="metric-info">
                <h4>Аналізи</h4>
                <span class="metric-value">${analytics.analyses_count || 0}</span>
              </div>
            </div>
          </div>

          <!-- Performance overview -->
          <div class="analytics-section">
            <h3><i class="fas fa-tachometer-alt"></i> Ефективність співпраці</h3>
            <div class="performance-score">
              <div class="score-gauge">
                <div class="gauge-value">${performanceData.collaboration_score || 'N/A'}</div>
                <div class="gauge-label">Загальний бал</div>
              </div>
              <div class="performance-breakdown">
                ${this.renderPerformanceMetrics(performanceData)}
              </div>
            </div>
          </div>

          <!-- Team distribution -->
          <div class="analytics-section">
            <h3><i class="fas fa-pie-chart"></i> Розподіл команд</h3>
            <div id="team-distribution-chart">
              ${this.renderTeamDistribution(teamMetrics)}
            </div>
          </div>

          <!-- RACI completion -->
          <div class="analytics-section">
            <h3><i class="fas fa-table"></i> Стан RACI матриць</h3>
            ${this.renderRACIStatus(teamMetrics)}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="hideModal('client-analytics-modal')">
            Закрити
          </button>
          <button class="btn btn-primary" onclick="TeamHub.exportAnalytics(${client.id})">
            <i class="fas fa-download"></i>
            Експорт звіту
          </button>
        </div>
      </div>
    `;

    showModal('client-analytics-modal');
  },

  renderPerformanceMetrics(performance) {
    const metrics = [
      { label: 'Комунікація', value: performance.communication || 0 },
      { label: 'Чіткість ролей', value: performance.role_clarity || 0 },
      { label: 'Прийняття рішень', value: performance.decision_making || 0 },
      { label: 'Виконання задач', value: performance.task_completion || 0 }
    ];

    return metrics.map(m => `
      <div class="performance-metric">
        <label>${m.label}</label>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${m.value}%"></div>
        </div>
        <span class="metric-percent">${m.value}%</span>
      </div>
    `).join('');
  },

  renderTeamDistribution(teamMetrics) {
    if (!teamMetrics.teams_by_type) {
      return '<p class="text-muted">Немає даних для відображення</p>';
    }

    return `
      <div class="distribution-list">
        ${Object.entries(teamMetrics.teams_by_type).map(([type, count]) => `
          <div class="distribution-item">
            <span class="dist-label">${type}</span>
            <div class="dist-bar">
              <div class="dist-fill" style="width: ${(count / teamMetrics.teams_count) * 100}%"></div>
            </div>
            <span class="dist-value">${count}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderRACIStatus(teamMetrics) {
    const completed = teamMetrics.raci_completed || 0;
    const total = teamMetrics.teams_count || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return `
      <div class="raci-status">
        <div class="raci-progress">
          <div class="raci-progress-bar">
            <div class="raci-progress-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="raci-progress-text">${completed} з ${total} команд (${percentage}%)</span>
        </div>
      </div>
    `;
  },

  async exportAnalytics(clientId) {
    try {
      const response = await apiCall(`/clients/${clientId}/analytics/export`, {
        method: 'POST'
      });
      showNotification('Аналітика експортована', 'success');
    } catch (error) {
      showNotification('Помилка експорту', 'error');
    }
  },

  goToProspects() {
    // Switch to Prospects tab
    const prospectsTab = document.querySelector('[data-tab="prospects"]');
    if (prospectsTab) {
      prospectsTab.click();
    }
  },

  attachCardEventListeners() {
    // Add click handlers for client cards
    document.querySelectorAll('.client-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const clientId = parseInt(card.dataset.clientId);
          this.openClientDetails(clientId);
        }
      });
    });
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  getCompanyInitials(company) {
    if (!company) return '?';
    const words = company.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  },

  formatRelativeTime(dateString) {
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
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} тиж тому`;

    return date.toLocaleDateString('uk-UA');
  },

  pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  },

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  },

  // Salary Analytics Integration
  async viewSalaryAnalytics(teamId) {
    try {
      if (window.SalaryAnalytics && typeof SalaryAnalytics.init === 'function') {
        await SalaryAnalytics.init(teamId);
      } else {
        showNotification('Модуль аналітики зарплат недоступний', 'error');
      }
    } catch (error) {
      console.error('Failed to load salary analytics:', error);
      showNotification('Не вдалося завантажити аналітику зарплат', 'error');
    }
  }
};

// Helper functions
function debounce(func, wait) {
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('teamhub-container')) {
      TeamHub.init();
    }
  });
} else {
  if (document.getElementById('teamhub-container')) {
    TeamHub.init();
  }
}

// Expose globally
window.TeamHub = TeamHub;
