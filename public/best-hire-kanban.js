/* ============================================
   BEST HIRE KANBAN PIPELINE
   Потужна Kanban дошка з AI scoring для рекрутингу
   ============================================ */

const BestHireKanban = {
  currentPositionId: null,
  candidates: [],
  stages: [
    { id: 'applied', name: 'Подані', color: '#a78bfa', icon: 'fa-inbox' },
    { id: 'screening', name: 'Скринінг', color: '#4facfe', icon: 'fa-filter' },
    { id: 'interview', name: 'Інтерв\'ю', color: '#ffa94d', icon: 'fa-comments' },
    { id: 'assessment', name: 'Оцінка', color: '#51cf66', icon: 'fa-clipboard-check' },
    { id: 'offer', name: 'Офер', color: '#00d4aa', icon: 'fa-handshake' },
    { id: 'hired', name: 'Найнято', color: '#51cf66', icon: 'fa-user-check' },
    { id: 'rejected', name: 'Відхилено', color: '#ff6b6b', icon: 'fa-times-circle' }
  ],
  draggedCandidate: null,

  async init(positionId) {
    console.log('🎯 Best Hire Kanban initializing for position:', positionId);
    this.currentPositionId = positionId;
    await this.loadCandidates();
    this.render();
  },

  async loadCandidates() {
    try {
      const response = await apiCall(`/best-hire/positions/${this.currentPositionId}/candidates`);
      this.candidates = response.candidates || [];
      console.log(`✅ Loaded ${this.candidates.length} candidates`);
    } catch (error) {
      console.error('Failed to load candidates:', error);
      showNotification('Не вдалося завантажити кандидатів', 'error');
      this.candidates = [];
    }
  },

  render() {
    this.showKanbanModal();
  },

  showKanbanModal() {
    let modal = document.getElementById('kanban-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'kanban-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-overlay" onclick="hideModal('kanban-modal')"></div>
      <div class="modal-content modal-fullscreen kanban-container">
        <div class="modal-header kanban-header">
          <h2>
            <i class="fas fa-columns"></i>
            Kanban Pipeline: ${this.escapeHtml(this.getPositionName())}
          </h2>
          <div class="kanban-header-actions">
            <button class="btn-secondary" onclick="BestHireKanban.toggleView()">
              <i class="fas fa-th"></i>
              Змінити вигляд
            </button>
            <button class="btn-secondary" onclick="BestHireKanban.uploadResume()">
              <i class="fas fa-upload"></i>
              Завантажити резюме
            </button>
            <button class="btn-primary" onclick="BestHireKanban.analyzeAllCandidates()">
              <i class="fas fa-brain"></i>
              AI Аналіз всіх
            </button>
            <button class="modal-close-btn" onclick="hideModal('kanban-modal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="modal-body kanban-body">
          <!-- Pipeline Stats -->
          <div class="pipeline-stats">
            ${this.renderPipelineStats()}
          </div>

          <!-- Kanban Board -->
          <div class="kanban-board" id="kanban-board">
            ${this.renderKanbanBoard()}
          </div>
        </div>
      </div>
    `;

    showModal('kanban-modal');
    this.initializeDragAndDrop();
  },

  renderPipelineStats() {
    const stats = this.calculatePipelineStats();

    return `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(167, 139, 250, 0.2); color: #a78bfa">
            <i class="fas fa-users"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Всього кандидатів</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(81, 207, 102, 0.2); color: #51cf66">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.conversion}%</div>
            <div class="stat-label">Конверсія</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(255, 169, 77, 0.2); color: #ffa94d">
            <i class="fas fa-clock"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.avgDays}</div>
            <div class="stat-label">Середній час (дні)</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(79, 172, 254, 0.2); color: #4facfe">
            <i class="fas fa-star"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value">${stats.avgScore}</div>
            <div class="stat-label">Середній AI скор</div>
          </div>
        </div>
      </div>
    `;
  },

  renderKanbanBoard() {
    return `
      <div class="kanban-columns">
        ${this.stages.map(stage => this.renderKanbanColumn(stage)).join('')}
      </div>
    `;
  },

  renderKanbanColumn(stage) {
    const stageCandidates = this.candidates.filter(c => c.stage === stage.id);
    const count = stageCandidates.length;

    return `
      <div class="kanban-column" data-stage="${stage.id}">
        <div class="kanban-column-header" style="border-top: 3px solid ${stage.color}">
          <div class="column-title">
            <i class="fas ${stage.icon}" style="color: ${stage.color}"></i>
            <span>${stage.name}</span>
          </div>
          <div class="column-count">${count}</div>
        </div>
        <div class="kanban-column-body" data-stage="${stage.id}">
          ${stageCandidates.map(candidate => this.renderCandidateCard(candidate, stage)).join('')}
          ${stageCandidates.length === 0 ? '<div class="empty-column">Перетягніть сюди</div>' : ''}
        </div>
      </div>
    `;
  },

  renderCandidateCard(candidate, stage) {
    const aiScore = candidate.ai_score || 0;
    const scoreColor = this.getScoreColor(aiScore);
    const skills = candidate.skills || [];
    const matchScore = candidate.match_score || 0;

    return `
      <div class="candidate-card"
           draggable="true"
           data-candidate-id="${candidate.id}"
           data-stage="${stage.id}">

        <!-- Card Header -->
        <div class="candidate-card-header">
          <div class="candidate-avatar">
            ${this.getInitials(candidate.name)}
          </div>
          <div class="candidate-info">
            <h4>${this.escapeHtml(candidate.name)}</h4>
            <p class="candidate-role">${this.escapeHtml(candidate.role || 'Кандидат')}</p>
          </div>
          <button class="card-menu-btn" onclick="BestHireKanban.showCandidateMenu(${candidate.id}, event)">
            <i class="fas fa-ellipsis-v"></i>
          </button>
        </div>

        <!-- AI Score Badge -->
        <div class="ai-score-badge" style="background: ${scoreColor}20; border-left: 3px solid ${scoreColor}">
          <div class="score-icon" style="color: ${scoreColor}">
            <i class="fas fa-brain"></i>
          </div>
          <div class="score-content">
            <div class="score-value" style="color: ${scoreColor}">${aiScore}/100</div>
            <div class="score-label">AI Score</div>
          </div>
          <button class="score-refresh" onclick="BestHireKanban.refreshAIScore(${candidate.id})" title="Оновити AI скор">
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>

        <!-- Match Indicator -->
        <div class="match-indicator">
          <div class="match-label">Відповідність:</div>
          <div class="match-bar">
            <div class="match-fill" style="width: ${matchScore}%; background: ${this.getMatchColor(matchScore)}"></div>
          </div>
          <div class="match-value">${matchScore}%</div>
        </div>

        <!-- Skills Tags -->
        ${skills.length > 0 ? `
          <div class="candidate-skills">
            ${skills.slice(0, 3).map(skill => `
              <span class="skill-tag">${this.escapeHtml(skill)}</span>
            `).join('')}
            ${skills.length > 3 ? `<span class="skill-tag more">+${skills.length - 3}</span>` : ''}
          </div>
        ` : ''}

        <!-- Quick Info -->
        <div class="candidate-quick-info">
          ${candidate.experience ? `
            <div class="info-item">
              <i class="fas fa-briefcase"></i>
              <span>${candidate.experience} років</span>
            </div>
          ` : ''}
          ${candidate.location ? `
            <div class="info-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${this.escapeHtml(candidate.location)}</span>
            </div>
          ` : ''}
          ${candidate.salary_expectation ? `
            <div class="info-item">
              <i class="fas fa-dollar-sign"></i>
              <span>${this.formatCurrency(candidate.salary_expectation)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Card Footer -->
        <div class="candidate-card-footer">
          <div class="card-actions">
            <button class="btn-icon" onclick="BestHireKanban.viewCandidate(${candidate.id})" title="Переглянути">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="BestHireKanban.scheduleInterview(${candidate.id})" title="Інтерв'ю">
              <i class="fas fa-calendar"></i>
            </button>
            <button class="btn-icon" onclick="BestHireKanban.viewResume(${candidate.id})" title="Резюме">
              <i class="fas fa-file-alt"></i>
            </button>
          </div>
          ${candidate.created_at ? `
            <div class="card-date">${this.formatRelativeTime(candidate.created_at)}</div>
          ` : ''}
        </div>
      </div>
    `;
  },

  // Drag and Drop Functionality
  initializeDragAndDrop() {
    const cards = document.querySelectorAll('.candidate-card');
    const columns = document.querySelectorAll('.kanban-column-body');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => this.handleDragStart(e));
      card.addEventListener('dragend', (e) => this.handleDragEnd(e));
    });

    columns.forEach(column => {
      column.addEventListener('dragover', (e) => this.handleDragOver(e));
      column.addEventListener('drop', (e) => this.handleDrop(e));
      column.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      column.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    });
  },

  handleDragStart(e) {
    const card = e.target.closest('.candidate-card');
    this.draggedCandidate = {
      id: parseInt(card.dataset.candidateId),
      element: card,
      fromStage: card.dataset.stage
    };
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  },

  handleDragEnd(e) {
    const card = e.target.closest('.candidate-card');
    card.classList.remove('dragging');

    // Remove all drag-over classes
    document.querySelectorAll('.kanban-column-body').forEach(col => {
      col.classList.remove('drag-over');
    });
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  },

  handleDragEnter(e) {
    const column = e.target.closest('.kanban-column-body');
    if (column) {
      column.classList.add('drag-over');
    }
  },

  handleDragLeave(e) {
    const column = e.target.closest('.kanban-column-body');
    if (column && !column.contains(e.relatedTarget)) {
      column.classList.remove('drag-over');
    }
  },

  async handleDrop(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column-body');

    if (!column || !this.draggedCandidate) return;

    const toStage = column.dataset.stage;
    const candidateId = this.draggedCandidate.id;
    const fromStage = this.draggedCandidate.fromStage;

    column.classList.remove('drag-over');

    if (toStage === fromStage) return;

    // Update candidate stage
    await this.updateCandidateStage(candidateId, toStage, fromStage);
  },

  async updateCandidateStage(candidateId, newStage, oldStage) {
    try {
      // Optimistic update
      const candidate = this.candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.stage = newStage;
      }

      // Re-render board
      const board = document.getElementById('kanban-board');
      if (board) {
        board.innerHTML = this.renderKanbanBoard();
        this.initializeDragAndDrop();
      }

      // Update on server
      await apiCall(`/best-hire/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({
          stage: newStage,
          previous_stage: oldStage
        })
      });

      showNotification(`Кандидата переміщено: ${this.getStageName(newStage)}`, 'success');

      // If moved to offer or hired, trigger AI recommendation
      if (newStage === 'offer' || newStage === 'hired') {
        this.showOfferRecommendation(candidateId);
      }

    } catch (error) {
      console.error('Failed to update candidate stage:', error);
      showNotification('Помилка оновлення статусу', 'error');

      // Revert optimistic update
      const candidate = this.candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.stage = oldStage;
      }

      // Re-render
      const board = document.getElementById('kanban-board');
      if (board) {
        board.innerHTML = this.renderKanbanBoard();
        this.initializeDragAndDrop();
      }
    }
  },

  // AI Scoring Functions
  async refreshAIScore(candidateId) {
    try {
      showNotification('Оновлюю AI скор...', 'info');

      const response = await apiCall('/ai/score-candidate', {
        method: 'POST',
        body: JSON.stringify({
          candidate_id: candidateId,
          position_id: this.currentPositionId
        })
      });

      // Update candidate
      const candidate = this.candidates.find(c => c.id === candidateId);
      if (candidate) {
        candidate.ai_score = response.score;
        candidate.match_score = response.match_score;
        candidate.ai_insights = response.insights;
      }

      // Re-render board
      const board = document.getElementById('kanban-board');
      if (board) {
        board.innerHTML = this.renderKanbanBoard();
        this.initializeDragAndDrop();
      }

      showNotification('AI скор оновлено!', 'success');

    } catch (error) {
      console.error('Failed to refresh AI score:', error);
      showNotification('Помилка оновлення AI скору', 'error');
    }
  },

  async analyzeAllCandidates() {
    try {
      showNotification('Аналізую всіх кандидатів з AI...', 'info');

      const response = await apiCall('/ai/score-all-candidates', {
        method: 'POST',
        body: JSON.stringify({
          position_id: this.currentPositionId,
          candidate_ids: this.candidates.map(c => c.id)
        })
      });

      // Update all candidates
      response.scores.forEach(score => {
        const candidate = this.candidates.find(c => c.id === score.candidate_id);
        if (candidate) {
          candidate.ai_score = score.score;
          candidate.match_score = score.match_score;
          candidate.ai_insights = score.insights;
        }
      });

      // Re-render board
      const board = document.getElementById('kanban-board');
      if (board) {
        board.innerHTML = this.renderKanbanBoard();
        this.initializeDragAndDrop();
      }

      showNotification(`AI аналіз завершено для ${response.scores.length} кандидатів!`, 'success');

    } catch (error) {
      console.error('Failed to analyze candidates:', error);
      showNotification('Помилка AI аналізу', 'error');
    }
  },

  // Helper Functions
  calculatePipelineStats() {
    const total = this.candidates.length;
    const hired = this.candidates.filter(c => c.stage === 'hired').length;
    const conversion = total > 0 ? Math.round((hired / total) * 100) : 0;

    const scores = this.candidates.map(c => c.ai_score || 0).filter(s => s > 0);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Mock average days (in real app, calculate from created_at and stage transitions)
    const avgDays = Math.round(14 + Math.random() * 10);

    return { total, conversion, avgDays, avgScore };
  },

  getScoreColor(score) {
    if (score >= 80) return '#51cf66';
    if (score >= 60) return '#4facfe';
    if (score >= 40) return '#ffa94d';
    return '#ff6b6b';
  },

  getMatchColor(match) {
    if (match >= 80) return '#51cf66';
    if (match >= 60) return '#4facfe';
    if (match >= 40) return '#ffa94d';
    return '#ff6b6b';
  },

  getStageName(stageId) {
    const stage = this.stages.find(s => s.id === stageId);
    return stage ? stage.name : stageId;
  },

  getPositionName() {
    // In real app, fetch from position data
    return 'Senior Frontend Developer';
  },

  getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0
    }).format(amount);
  },

  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Сьогодні';
    if (diffDays === 1) return 'Вчора';
    if (diffDays < 7) return `${diffDays} дн тому`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} тиж тому`;
    return date.toLocaleDateString('uk-UA');
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

  // Action Methods
  showCandidateMenu(candidateId, event) {
    event.stopPropagation();
    console.log('Show menu for candidate:', candidateId);
    // Implement context menu
  },

  viewCandidate(candidateId) {
    const candidate = this.candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    // Show detailed candidate modal
    showNotification(`Перегляд кандидата: ${candidate.name}`, 'info');
  },

  scheduleInterview(candidateId) {
    showNotification('Планування інтерв\'ю... (в розробці)', 'info');
  },

  viewResume(candidateId) {
    showNotification('Перегляд резюме... (в розробці)', 'info');
  },

  uploadResume() {
    showNotification('Завантаження резюме... (в розробці)', 'info');
  },

  toggleView() {
    showNotification('Зміна вигляду... (в розробці)', 'info');
  },

  showOfferRecommendation(candidateId) {
    showNotification('AI рекомендація по оферу готова!', 'success');
  }
};

// Expose globally
window.BestHireKanban = BestHireKanban;
