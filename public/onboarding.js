/* ============================================
   ONBOARDING FLOW - After Client Conversion
   3-step onboarding wizard for new active clients
   ============================================ */

const Onboarding = {
  currentStep: 1,
  totalSteps: 3,
  clientData: null,
  teamMembers: [],

  init(clientData) {
    this.clientData = clientData;
    this.currentStep = 1;
    this.teamMembers = [];
    this.render();
    this.show();
  },

  show() {
    if (typeof window.showModal === 'function') {
      window.showModal('onboarding-modal');
    } else {
      document.getElementById('onboarding-modal').style.display = 'flex';
    }
  },

  hide() {
    try {
      console.log('🚪 Hiding onboarding modal');

      if (typeof window.closeModal === 'function') {
        window.closeModal('onboarding-modal');
      } else if (typeof window.hideModal === 'function') {
        window.hideModal('onboarding-modal');
      } else if (typeof window.ModalManager !== 'undefined') {
        window.ModalManager.close('onboarding-modal');
      } else {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('active');
        }
      }

      // Reset onboarding state
      this.currentStep = 1;
      this.clientData = null;
      this.teamMembers = [];

      console.log('✅ Onboarding modal hidden');
    } catch (error) {
      console.error('❌ Error hiding onboarding:', error);
    }
  },

  render() {
    this.updateProgressBar();
    this.renderStepContent();
  },

  updateProgressBar() {
    const steps = document.querySelectorAll('.onboarding-step');
    const contents = document.querySelectorAll('.onboarding-content');

    steps.forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum < this.currentStep) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else if (stepNum === this.currentStep) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    });

    contents.forEach((content, index) => {
      content.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('onboarding-prev');
    const nextBtn = document.getElementById('onboarding-next');
    const finishBtn = document.getElementById('onboarding-finish');

    if (prevBtn) prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
    if (nextBtn) nextBtn.style.display = this.currentStep < this.totalSteps ? 'inline-flex' : 'none';
    if (finishBtn) finishBtn.style.display = this.currentStep === this.totalSteps ? 'inline-flex' : 'none';
  },

  renderStepContent() {
    switch (this.currentStep) {
      case 1:
        this.renderBasicInfo();
        break;
      case 2:
        this.renderTeamBuilder();
        break;
      case 3:
        this.renderFeatures();
        break;
    }
  },

  renderBasicInfo() {
    const container = document.getElementById('onboarding-client-info');
    if (!container || !this.clientData) return;

    container.innerHTML = `
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">
            <i class="fas fa-building"></i>
            Компанія
          </div>
          <div class="info-value">${this.escapeHtml(this.clientData.company || '—')}</div>
        </div>

        ${this.clientData.negotiator ? `
          <div class="info-row">
            <div class="info-label">
              <i class="fas fa-user"></i>
              Менеджер
            </div>
            <div class="info-value">${this.escapeHtml(this.clientData.negotiator)}</div>
          </div>
        ` : ''}

        ${this.clientData.sector ? `
          <div class="info-row">
            <div class="info-label">
              <i class="fas fa-briefcase"></i>
              Сфера
            </div>
            <div class="info-value">${this.escapeHtml(this.clientData.sector)}</div>
          </div>
        ` : ''}

        <div class="info-row">
          <div class="info-label">
            <i class="fas fa-calendar-plus"></i>
            Дата активації
          </div>
          <div class="info-value">${new Date().toLocaleDateString('uk-UA')}</div>
        </div>
      </div>

      <div class="success-message">
        <i class="fas fa-check-circle"></i>
        <p>Клієнт успішно переведений у статус <strong>Активний</strong></p>
      </div>
    `;
  },

  renderTeamBuilder() {
    const container = document.getElementById('onboarding-team-members');
    if (!container) return;

    if (this.teamMembers.length === 0) {
      container.innerHTML = `
        <div class="empty-team-state">
          <i class="fas fa-users"></i>
          <p>Поки що немає учасників команди</p>
          <small>Додайте першого учасника, щоб почати</small>
        </div>
      `;
      return;
    }

    container.innerHTML = this.teamMembers.map((member, index) => `
      <div class="team-member-item" data-index="${index}">
        <div class="member-avatar">${this.getInitials(member.name)}</div>
        <div class="member-info">
          <input type="text" class="member-name-input" placeholder="Ім'я учасника"
                 value="${this.escapeHtml(member.name)}"
                 onchange="Onboarding.updateMember(${index}, 'name', this.value)">
          <input type="text" class="member-role-input" placeholder="Роль"
                 value="${this.escapeHtml(member.role || '')}"
                 onchange="Onboarding.updateMember(${index}, 'role', this.value)">
        </div>
        <button type="button" class="btn-icon-danger" onclick="Onboarding.removeMember(${index})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  },

  renderFeatures() {
    // Features are already rendered in HTML, just ensure checkboxes work
  },

  addTeamMember() {
    this.teamMembers.push({
      name: '',
      role: ''
    });
    this.renderTeamBuilder();

    // Focus on first input of new member
    setTimeout(() => {
      const inputs = document.querySelectorAll('.member-name-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 100);
  },

  updateMember(index, field, value) {
    if (this.teamMembers[index]) {
      this.teamMembers[index][field] = value;
    }
  },

  removeMember(index) {
    this.teamMembers.splice(index, 1);
    this.renderTeamBuilder();
  },

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.render();
    }
  },

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  },

  skipStep() {
    this.nextStep();
  },

  async finish() {
    try {
      const tags = document.getElementById('onboarding-tags')?.value || '';
      const teamTitle = document.getElementById('onboarding-team-title')?.value || 'Основна команда';

      const features = {
        best_hire: document.getElementById('feature-best-hire')?.checked || false,
        salary_insights: document.getElementById('feature-salary-insights')?.checked || false,
        raci: document.getElementById('feature-raci')?.checked || false,
        analytics: document.getElementById('feature-analytics')?.checked || false
      };

      // Update client with tags and features
      if (this.clientData && this.clientData.id) {
        const notes = this.clientData.notes || {};
        notes.tags = tags.split(',').map(t => t.trim()).filter(t => t);
        notes.enabled_features = features;
        notes.onboarding_completed = true;
        notes.onboarding_date = new Date().toISOString();

        await window.apiCall(`/clients/${this.clientData.id}`, {
          method: 'PUT',
          body: JSON.stringify({ notes })
        });

        // Create team if members were added
        if (this.teamMembers.length > 0) {
          const validMembers = this.teamMembers.filter(m => m.name.trim());
          if (validMembers.length > 0) {
            await window.apiCall('/teams', {
              method: 'POST',
              body: JSON.stringify({
                client_id: this.clientData.id,
                title: teamTitle,
                members: validMembers.map(m => ({
                  name: m.name,
                  role: m.role || 'Team Member'
                }))
              })
            });
          }
        }
      }

      window.showToast('Налаштування завершено успішно!', 'success');
      this.hide();

      // Reload active clients
      if (window.TeamHub && typeof window.TeamHub.loadActiveClients === 'function') {
        await window.TeamHub.loadActiveClients();
        window.TeamHub.render();
      }

      // Switch to Active Clients tab
      const clientsTab = document.querySelector('[data-tab="clients"]');
      if (clientsTab) {
        clientsTab.click();
      }

    } catch (error) {
      console.error('Onboarding error:', error);
      window.showToast('Помилка при завершенні налаштування', 'error');
    }
  },

  // Utility functions
  getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  },

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
  }
};

// Expose globally
window.Onboarding = Onboarding;
