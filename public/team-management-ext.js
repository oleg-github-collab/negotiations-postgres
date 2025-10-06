/* ============================================
   TEAM MANAGEMENT EXTENSIONS
   Additional methods for team management
   ============================================ */

// Extend TeamManagement with missing methods
Object.assign(TeamManagement, {
  // Rich text editor integration
  richTextEditorId: null,

  initializeRichTextEditor(containerId, initialContent) {
    if (typeof RichTextEditor === 'undefined') {
      console.warn('RichTextEditor not loaded');
      return;
    }

    this.richTextEditorId = RichTextEditor.init(containerId, initialContent, {
      placeholder: 'Опишіть команду, її цілі та завдання...',
      minHeight: '150px',
      maxHeight: '300px',
      allowFiles: false,
      allowMentions: true,
      allowFormatting: true,
      onChange: (html, text) => {
        if (this.currentTeam) {
          this.currentTeam.description = html;
          this.unsavedChanges = true;
          this.updateSaveButtonState();
        }
      }
    });
  },

  // File upload
  setupFileUpload() {
    const dropzone = document.getElementById('team-file-dropzone');
    const fileInput = document.getElementById('team-file-input');

    if (!fileInput || !dropzone) return;

    fileInput.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files);
    });

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this.handleFileUpload(e.dataTransfer.files);
    });
  },

  handleFileUpload(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        showNotification(`Файл ${file.name} завеликий (макс 10MB)`, 'error');
        return;
      }

      if (!this.currentTeam.files) {
        this.currentTeam.files = [];
      }

      this.currentTeam.files.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      });

      this.unsavedChanges = true;
    });

    // Re-render files list
    const container = document.getElementById('team-files-list');
    if (container) {
      container.innerHTML = this.renderFilesList(this.currentTeam.files);
    }

    showNotification(`Додано ${files.length} ${files.length === 1 ? 'файл' : 'файлів'}`, 'success');
  },

  removeFile(index) {
    if (!this.currentTeam.files) return;

    this.currentTeam.files.splice(index, 1);
    this.unsavedChanges = true;

    const container = document.getElementById('team-files-list');
    if (container) {
      container.innerHTML = this.renderFilesList(this.currentTeam.files);
    }
  },

  // Auto-save integration
  setupAutoSave() {
    if (typeof AutoSave === 'undefined' || !this.currentTeam) return;

    const teamId = this.currentTeam.id;
    if (!teamId) return; // Only auto-save existing teams

    AutoSave.register(
      `team-${teamId}`,

      // getData function
      () => {
        return {
          title: document.getElementById('team-title')?.value || '',
          description: this.richTextEditorId ?
            RichTextEditor.getContent(this.richTextEditorId) :
            document.getElementById('team-description')?.value || '',
          status: document.getElementById('team-status')?.value || 'active',
          members: this.currentTeam.members || [],
          notes: {
            start_date: document.getElementById('team-start-date')?.value || null,
            tags: document.getElementById('team-tags')?.value.split(',').map(t => t.trim()).filter(t => t) || [],
            additional_notes: document.getElementById('team-notes')?.value || ''
          }
        };
      },

      // saveFunction
      async (data) => {
        const response = await apiCall(`/teams/${teamId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        return response;
      },

      // options
      {
        delay: 3000,
        immediate: false
      }
    );

    // Trigger auto-save on any input change
    const inputs = ['team-title', 'team-status', 'team-start-date', 'team-tags', 'team-notes'];
    inputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('input', () => {
          AutoSave.trigger(`team-${teamId}`);
        });
      }
    });
  },

  // Save button state
  updateSaveButtonState() {
    const saveBtn = document.getElementById('save-team-btn');
    if (!saveBtn) return;

    if (this.unsavedChanges) {
      saveBtn.classList.add('has-changes');
      saveBtn.disabled = false;
    } else {
      saveBtn.classList.remove('has-changes');
    }
  },

  // Save team
  async saveTeam() {
    if (!this.currentTeam) return;

    const teamData = {
      title: document.getElementById('team-title')?.value || '',
      description: this.richTextEditorId ?
        RichTextEditor.getContent(this.richTextEditorId) :
        '',
      client_id: this.currentClientId || this.currentTeam.client_id,
      status: document.getElementById('team-status')?.value || 'active',
      members: this.currentTeam.members || [],
      notes: {
        start_date: document.getElementById('team-start-date')?.value || null,
        tags: document.getElementById('team-tags')?.value.split(',').map(t => t.trim()).filter(t => t) || [],
        additional_notes: document.getElementById('team-notes')?.value || ''
      }
    };

    // Validate
    if (!teamData.title || teamData.title.trim().length === 0) {
      showNotification('Введіть назву команди', 'error');
      return;
    }

    try {
      let response;

      if (this.currentTeam.id) {
        // Update existing team
        response = await apiCall(`/teams/${this.currentTeam.id}`, {
          method: 'PUT',
          body: JSON.stringify(teamData)
        });
        showNotification('Команду оновлено', 'success');
      } else {
        // Create new team
        response = await apiCall('/teams', {
          method: 'POST',
          body: JSON.stringify(teamData)
        });
        showNotification('Команду створено', 'success');
        this.currentTeam.id = response.team.id;
      }

      this.unsavedChanges = false;
      this.updateSaveButtonState();

      // Unregister auto-save for old ID and register for new
      if (this.currentTeam.id) {
        AutoSave.unregister(`team-${this.currentTeam.id}`);
        this.setupAutoSave();
      }

      // Reload teams list
      if (this.currentClientId) {
        await this.loadTeamsByClient(this.currentClientId);
      } else {
        await this.loadAllTeams();
      }

    } catch (error) {
      console.error('Failed to save team:', error);
      showNotification('Помилка збереження команди', 'error');
    }
  },

  async saveTeamSilently() {
    // Auto-save without notifications
    try {
      if (!this.currentTeam || !this.currentTeam.id) return;

      const teamData = {
        title: document.getElementById('team-title')?.value || '',
        description: this.richTextEditorId ?
          RichTextEditor.getContent(this.richTextEditorId) :
          '',
        status: document.getElementById('team-status')?.value || 'active',
        members: this.currentTeam.members || [],
        notes: {
          start_date: document.getElementById('team-start-date')?.value || null,
          tags: document.getElementById('team-tags')?.value.split(',').map(t => t.trim()).filter(t => t) || [],
          additional_notes: document.getElementById('team-notes')?.value || ''
        }
      };

      await apiCall(`/teams/${this.currentTeam.id}`, {
        method: 'PUT',
        body: JSON.stringify(teamData)
      });

      this.unsavedChanges = false;
    } catch (error) {
      console.error('Silent save failed:', error);
    }
  },

  // Team actions
  async deleteTeam(teamId) {
    const confirmed = await ErrorHandler.confirm({
      title: 'Видалити команду?',
      message: 'Цю дію неможливо скасувати. Всі дані команди будуть втрачені.',
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
      danger: true
    });

    if (!confirmed) return;

    try {
      await apiCall(`/teams/${teamId}`, {
        method: 'DELETE'
      });

      showNotification('Команду видалено', 'success');

      // Reload teams
      if (this.currentClientId) {
        await this.loadTeamsByClient(this.currentClientId);
      } else {
        await this.loadAllTeams();
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      showNotification('Помилка видалення команди', 'error');
    }
  },

  async duplicateTeam(teamId) {
    try {
      const team = await apiCall(`/teams/${teamId}`);

      const newTeam = {
        ...team,
        id: null,
        title: `${team.title} (копія)`,
        created_at: null,
        updated_at: null
      };

      this.currentTeam = newTeam;
      this.renderTeamEditor();
      showModal('team-editor-modal');

      showNotification('Команда дубльована', 'info');
    } catch (error) {
      console.error('Failed to duplicate team:', error);
      showNotification('Помилка дублювання команди', 'error');
    }
  },

  async viewTeamDetails(teamId) {
    try {
      const team = await apiCall(`/teams/${teamId}`);
      // Show details modal (would need to implement)
      console.log('View team details:', team);
    } catch (error) {
      console.error('Failed to load team details:', error);
    }
  },

  async openRACIMatrix(teamId) {
    try {
      const team = await apiCall(`/teams/${teamId}`);
      // Open RACI matrix editor (would need to implement)
      console.log('Open RACI matrix for:', team);
    } catch (error) {
      console.error('Failed to open RACI matrix:', error);
    }
  },

  switchView(view) {
    this.currentView = view;

    document.querySelectorAll('.teams-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Re-render with new view
    this.renderTeamsList();
  },

  attachTeamCardListeners() {
    // Add click listeners to cards
    document.querySelectorAll('.team-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const teamId = parseInt(card.dataset.teamId);
          this.viewTeamDetails(teamId);
        }
      });
    });
  },

  openCommandPalette() {
    // Quick actions command palette
    console.log('Command palette opened');
    // Would implement searchable command palette
  },

  closeActiveModal() {
    // Close any active modal
    if (typeof closeModal === 'function') {
      closeModal('team-editor-modal');
    }
  }
});

// Ensure it's exposed
window.TeamManagement = TeamManagement;
