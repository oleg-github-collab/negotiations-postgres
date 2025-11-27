/* ============================================
   MODALS CONTROLLER - TeamPulse Turbo
   Управління всіма модальними вікнами
   ============================================ */

(function() {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // ============================================
  // MODAL MANAGER
  // ============================================

  const ModalManager = {
    activeModal: null,

    open(modalId, data = null) {
      console.log(`🚀 ModalManager.open called with modalId: ${modalId}`);

      const modal = $(`#${modalId}`);
      const backdrop = $('#modal-backdrop');

      if (!modal) {
        console.error(`❌ Modal ${modalId} not found in DOM`);
        return;
      }

      console.log(`✅ Modal ${modalId} found in DOM`);

      // Close any existing modal first
      if (this.activeModal && this.activeModal !== modalId) {
        console.log(`⚠️ Closing existing modal: ${this.activeModal}`);
        this.close(this.activeModal);
      }

      this.activeModal = modalId;

      // Show backdrop and modal
      if (backdrop) {
        backdrop.classList.add('active');
        backdrop.style.display = 'flex';
        backdrop.style.opacity = '1';
        console.log('✅ Backdrop shown');
      }

      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      console.log(`✅ Modal ${modalId} display set to flex`);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');

      // Initialize modal-specific data
      if (data) {
        this.initializeModalData(modalId, data);
      }

      // Ensure modal can receive focus for accessibility
      if (!modal.hasAttribute('tabindex')) {
        modal.setAttribute('tabindex', '-1');
      }

      // Focus first interactive element for accessibility
      const focusable = modal.querySelector('input, select, textarea, button');
      if (focusable) {
        setTimeout(() => focusable.focus(), 10);
      }

      // Add escape key listener
      document.addEventListener('keydown', this.handleEscape);

      console.log(`✅ Modal opened successfully: ${modalId}`);
    },

    close(modalId = null) {
      const id = modalId || this.activeModal;
      if (!id) {
        console.log('⚠️ ModalManager.close called but no modal is active');
        return;
      }

      console.log(`🚪 ModalManager.close called for: ${id}`);

      const modal = $(`#${id}`);
      const backdrop = $('#modal-backdrop');

      if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        console.log(`✅ Modal ${id} hidden`);
      }

      if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
        backdrop.style.opacity = '0';
        console.log('✅ Backdrop hidden');
      }

      // Restore body scroll
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');

      this.activeModal = null;

      // Remove escape listener
      document.removeEventListener('keydown', this.handleEscape);

      // Reset modal forms
      this.resetModal(id);

      console.log(`✅ Modal closed successfully: ${id}`);
    },

    handleEscape: (e) => {
      if (e.key === 'Escape') {
        ModalManager.close();
      }
    },

    resetModal(modalId) {
      const modal = $(`#${modalId}`);
      if (!modal) return;

      // Reset all forms in modal
      const forms = modal.querySelectorAll('form');
      forms.forEach(form => form.reset());

      // Clear file previews
      const filePreviews = modal.querySelectorAll('.upload-preview, .files-preview');
      filePreviews.forEach(preview => {
        preview.style.display = 'none';
        preview.innerHTML = '';
      });

      // Reset tabs
      const tabs = modal.querySelectorAll('.upload-tab');
      tabs.forEach((tab, index) => {
        tab.classList.toggle('active', index === 0);
      });

      const contents = modal.querySelectorAll('.upload-content');
      contents.forEach((content, index) => {
        content.classList.toggle('active', index === 0);
      });
    },

    initializeModalData(modalId, data) {
      switch (modalId) {
        case 'convert-modal':
          this.fillConvertModal(data);
          break;
        case 'analysis-detail-modal':
          this.loadAnalysisDetail(data);
          break;
      }
    },

    fillConvertModal(data) {
      const nameEl = $('#convert-company-name');
      const contactEl = $('#convert-contact');
      const emailEl = $('#convert-email');
      const countEl = $('#convert-analyses-count');

      if (nameEl) nameEl.textContent = data.name || '—';
      if (contactEl) contactEl.textContent = data.contact || '—';
      if (emailEl) emailEl.textContent = data.email || '—';
      if (countEl) countEl.textContent = data.analyses_count || 0;
    },

    async loadAnalysisDetail(analysisId) {
      const loading = $('#analysis-loading');
      const content = $('#analysis-detail-content');

      if (loading) loading.style.display = 'flex';
      if (content) content.style.display = 'none';

      try {
        const analysis = await apiCall(`/negotiations/analysis/${analysisId}`);

        if (content) {
          content.innerHTML = this.renderAnalysisDetail(analysis);
          content.style.display = 'block';
        }
      } catch (error) {
        console.error('Failed to load analysis:', error);
        if (content) {
          content.innerHTML = '<div class="error-state">Помилка завантаження аналізу</div>';
          content.style.display = 'block';
        }
      } finally {
        if (loading) loading.style.display = 'none';
      }
    },

    renderAnalysisDetail(analysis) {
      // Will be implemented with real data structure
      return `
        <div class="analysis-detail-content">
          <h3>Analysis ID: ${analysis.id}</h3>
          <p>Details will be rendered here...</p>
        </div>
      `;
    }
  };

  // ============================================
  // FILE UPLOAD HANDLER
  // ============================================

  const FileUploadHandler = {
    uploadedFiles: [],
    uploadedImages: [],

    init() {
      this.setupFileUpload();
      this.setupImageUpload();
      this.setupClientFileUpload();
      this.setupConvertFileUpload();
      this.setupTabSwitching();
    },

    setupTabSwitching() {
      $$('.upload-tab').forEach(tab => {
        tab.addEventListener('click', function() {
          const parent = this.closest('.upload-section, .form-group');
          if (!parent) return;

          const tabName = this.dataset.tab;

          // Update tabs
          parent.querySelectorAll('.upload-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
          });

          // Update content
          parent.querySelectorAll('.upload-content').forEach(c => {
            c.classList.toggle('active', c.id === `upload-${tabName}` || c.id === tabName);
          });
        });
      });
    },

    setupFileUpload() {
      const dropArea = $('#file-drop-area');
      const fileInput = $('#file-input');
      const browseBtn = $('#browse-file-btn');
      const removeBtn = $('#remove-file-btn');

      if (!dropArea || !fileInput) return;

      // Browse button
      if (browseBtn) {
        browseBtn.addEventListener('click', () => fileInput.click());
      }

      // File input change
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) this.handleFile(file);
      });

      // Drag and drop
      dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
      });

      dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
      });

      dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) this.handleFile(file);
      });

      // Remove file
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.clearFile();
        });
      }
    },

    async handleFile(file) {
      // Validate file
      if (!this.validateFile(file)) return;

      // Show preview
      const preview = $('#file-preview');
      const dropArea = $('#file-drop-area');

      if (dropArea) dropArea.style.display = 'none';
      if (preview) preview.style.display = 'block';

      // Update file info
      const nameEl = $('#file-name');
      const sizeEl = $('#file-size');

      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = this.formatFileSize(file.size);

      // Read file content
      try {
        const content = await this.readFileContent(file);
        const contentPreview = $('#file-content-preview');
        if (contentPreview) {
          contentPreview.textContent = content.substring(0, 1000) + (content.length > 1000 ? '...' : '');
        }

        this.uploadedFiles = [{ file, content }];
      } catch (error) {
        console.error('Error reading file:', error);
        showToast('Помилка читання файлу', 'error');
      }
    },

    setupImageUpload() {
      const dropArea = $('#image-drop-area');
      const imageInput = $('#image-input');
      const browseBtn = $('#browse-image-btn');
      const removeAllBtn = $('#remove-all-images-btn');

      if (!dropArea || !imageInput) return;

      // Browse button
      if (browseBtn) {
        browseBtn.addEventListener('click', () => imageInput.click());
      }

      // Image input change
      imageInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
          if (file.type.startsWith('image/')) {
            this.handleImage(file);
          }
        });
      });

      // Drag and drop
      dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
      });

      dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
      });

      dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        Array.from(e.dataTransfer.files).forEach(file => {
          if (file.type.startsWith('image/')) {
            this.handleImage(file);
          }
        });
      });

      // Remove all images
      if (removeAllBtn) {
        removeAllBtn.addEventListener('click', () => {
          this.clearImages();
        });
      }
    },

    async handleImage(file) {
      if (!this.validateImage(file)) return;

      const preview = $('#image-preview');
      const grid = $('#images-grid');
      const dropArea = $('#image-drop-area');

      if (dropArea) dropArea.style.display = 'none';
      if (preview) preview.style.display = 'block';

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const imgDiv = document.createElement('div');
        imgDiv.className = 'image-preview-item';
        imgDiv.dataset.imageId = imageId;
        imgDiv.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}">
          <button class="remove-image" data-image-id="${imageId}">
            <i class="fas fa-times"></i>
          </button>
        `;

        if (grid) grid.appendChild(imgDiv);

        // Add remove listener
        const removeBtn = imgDiv.querySelector('.remove-image');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            this.removeImage(imageId);
          });
        }

        this.uploadedImages.push({ id: imageId, file, dataUrl: e.target.result });
      };

      reader.readAsDataURL(file);
    },

    setupClientFileUpload() {
      const dropArea = $('#client-files-drop');
      const fileInput = $('#client-files-input');
      const browseBtn = $('#browse-client-files-btn');

      if (!dropArea || !fileInput) return;

      if (browseBtn) {
        browseBtn.addEventListener('click', () => fileInput.click());
      }

      fileInput.addEventListener('change', (e) => {
        Array.from(e.target.files).forEach(file => {
          this.addClientFile(file);
        });
      });

      dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
      });

      dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
      });

      dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        Array.from(e.dataTransfer.files).forEach(file => {
          this.addClientFile(file);
        });
      });
    },

    setupConvertFileUpload() {
      const fileInput = $('#convert-team-data');
      const uploadBtn = $('#upload-team-data-btn');

      if (!fileInput || !uploadBtn) return;

      uploadBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const preview = $('#team-files-preview');
        if (!preview) return;

        Array.from(e.target.files).forEach(file => {
          const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const fileDiv = document.createElement('div');
          fileDiv.className = 'file-preview-item';
          fileDiv.dataset.fileId = fileId;
          fileDiv.innerHTML = `
            <div class="file-info-mini">
              <i class="fas fa-file-alt"></i>
              <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
              </div>
            </div>
            <button class="remove-file" data-file-id="${fileId}">
              <i class="fas fa-times"></i>
            </button>
          `;

          preview.appendChild(fileDiv);

          // Add remove listener
          const removeBtn = fileDiv.querySelector('.remove-file');
          if (removeBtn) {
            removeBtn.addEventListener('click', () => {
              fileDiv.remove();
            });
          }
        });
      });
    },

    addClientFile(file) {
      const preview = $('#client-files-preview-area');
      const dropArea = $('#client-files-drop');

      if (!preview) return;

      if (dropArea) dropArea.style.display = 'none';

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const fileDiv = document.createElement('div');
      fileDiv.className = 'file-preview-item';
      fileDiv.dataset.fileId = fileId;
      fileDiv.innerHTML = `
        <div class="file-info-mini">
          <i class="fas ${this.getFileIcon(file.type)}"></i>
          <div class="file-details">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
        <button class="remove-file" data-file-id="${fileId}">
          <i class="fas fa-times"></i>
        </button>
      `;

      preview.appendChild(fileDiv);

      const removeBtn = fileDiv.querySelector('.remove-file');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          fileDiv.remove();
          if (preview.children.length === 0 && dropArea) {
            dropArea.style.display = 'block';
          }
        });
      }
    },

    validateFile(file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showToast('Файл занадто великий. Максимум 10 МБ', 'error');
        return false;
      }
      return true;
    },

    validateImage(file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showToast('Зображення занадто велике. Максимум 5 МБ', 'error');
        return false;
      }
      if (!file.type.startsWith('image/')) {
        showToast('Дозволені тільки зображення', 'error');
        return false;
      }
      return true;
    },

    async readFileContent(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },

    clearFile() {
      const preview = $('#file-preview');
      const dropArea = $('#file-drop-area');
      const fileInput = $('#file-input');

      if (preview) preview.style.display = 'none';
      if (dropArea) dropArea.style.display = 'block';
      if (fileInput) fileInput.value = '';

      this.uploadedFiles = [];
    },

    clearImages() {
      const preview = $('#image-preview');
      const grid = $('#images-grid');
      const dropArea = $('#image-drop-area');
      const imageInput = $('#image-input');

      if (grid) grid.innerHTML = '';
      if (preview) preview.style.display = 'none';
      if (dropArea) dropArea.style.display = 'block';
      if (imageInput) imageInput.value = '';

      this.uploadedImages = [];
    },

    removeImage(imageId) {
      const item = $(`.image-preview-item[data-image-id="${imageId}"]`);
      if (item) item.remove();

      this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);

      const grid = $('#images-grid');
      const preview = $('#image-preview');
      const dropArea = $('#image-drop-area');

      if (grid && grid.children.length === 0) {
        if (preview) preview.style.display = 'none';
        if (dropArea) dropArea.style.display = 'block';
      }
    },

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    getFileIcon(mimeType) {
      if (mimeType.includes('pdf')) return 'fa-file-pdf';
      if (mimeType.includes('image')) return 'fa-file-image';
      if (mimeType.includes('json')) return 'fa-file-code';
      if (mimeType.includes('csv') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-excel';
      return 'fa-file-alt';
    },

    getData() {
      return {
        files: this.uploadedFiles,
        images: this.uploadedImages
      };
    },

    reset() {
      this.clearFile();
      this.clearImages();
    }
  };

  // ============================================
  // NOTES MANAGER
  // ============================================

  const NotesManager = {
    currentClientId: null,
    notes: [],

    async open(clientId, clientName) {
      this.currentClientId = clientId;

      const nameEl = $('#notes-client-name');
      if (nameEl) nameEl.textContent = clientName;

      ModalManager.open('notes-modal');
      await this.loadNotes();
    },

    async loadNotes() {
      try {
        const notes = await apiCall(`/negotiations/${this.currentClientId}/notes`);
        this.notes = notes;
        this.renderNotes();
      } catch (error) {
        console.error('Failed to load notes:', error);
        this.notes = [];
        this.renderNotes();
      }
    },

    renderNotes() {
      const container = $('#notes-list');
      if (!container) return;

      if (this.notes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-sticky-note fa-3x"></i>
            <p>Немає заміток</p>
          </div>
        `;
        return;
      }

      container.innerHTML = this.notes.map(note => `
        <div class="note-item" data-note-id="${note.id}">
          <div class="note-header">
            <span class="note-date">${this.formatDate(note.created_at)}</span>
            <div class="note-actions">
              <button onclick="NotesManager.editNote(${note.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="NotesManager.deleteNote(${note.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="note-text">${this.escapeHtml(note.text)}</div>
        </div>
      `).join('');
    },

    showAddNoteForm() {
      const form = $('#new-note-form');
      if (form) form.style.display = 'block';
    },

    hideAddNoteForm() {
      const form = $('#new-note-form');
      const textarea = $('#new-note-text');
      if (form) form.style.display = 'none';
      if (textarea) textarea.value = '';
    },

    async addNote(text) {
      try {
        const note = await apiCall(`/negotiations/${this.currentClientId}/notes`, {
          method: 'POST',
          body: JSON.stringify({ text })
        });

        this.notes.unshift(note);
        this.renderNotes();
        this.hideAddNoteForm();
        showToast('Замітку додано', 'success');
      } catch (error) {
        console.error('Failed to add note:', error);
        showToast('Помилка додавання замітки', 'error');
      }
    },

    async deleteNote(noteId) {
      if (!confirm('Видалити цю замітку?')) return;

      try {
        await apiCall(`/negotiations/notes/${noteId}`, {
          method: 'DELETE'
        });

        this.notes = this.notes.filter(n => n.id !== noteId);
        this.renderNotes();
        showToast('Замітку видалено', 'success');
      } catch (error) {
        console.error('Failed to delete note:', error);
        showToast('Помилка видалення замітки', 'error');
      }
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // ============================================
  // FORM HANDLERS
  // ============================================

  const FormHandlers = {
    init() {
      this.setupProspectForm();
      this.setupAnalysisForm();
      this.setupConvertForm();
      this.setupClientForm();
      this.setupAddClientForm();
      this.setupNotesForm();
    },

    setupProspectForm() {
      const form = $('#create-prospect-form');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
          company: $('#prospect-name').value,
          negotiator: $('#prospect-contact').value,
          email: $('#prospect-email').value,
          phone: $('#prospect-phone').value,
          sector: $('#prospect-industry').value,
          company_size: $('#prospect-company-size')?.value,
          negotiation_type: $('#prospect-negotiation-type')?.value || 'sales',
          deal_value: $('#prospect-deal-value')?.value,
          goal: $('#prospect-goals')?.value,
          notes: $('#prospect-notes')?.value
        };

        try {
          const result = await apiCall('/prospects', {
            method: 'POST',
            body: JSON.stringify(data)
          });

          showToast('Потенційного клієнта створено', 'success');
          ModalManager.close('create-prospect-modal');
          form.reset();

          // Reload prospects list if function exists
          if (window.loadProspects) {
            window.loadProspects();
          }
        } catch (error) {
          console.error('Error creating prospect:', error);
          showToast('Помилка створення клієнта', 'error');
        }
      });
    },

    setupAnalysisForm() {
      const form = $('#create-analysis-form');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = $('#submit-analysis-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обробка...';
        }

        try {
          const data = await this.prepareAnalysisData();
          const analysis = await apiCall('/negotiations/analyze', {
            method: 'POST',
            body: JSON.stringify(data)
          });

          showToast('Аналіз створено успішно', 'success');
          ModalManager.close('create-analysis-modal');

          // Reload analyses
          if (window.NegotiationsModule && window.AppState.selectedProspect) {
            window.NegotiationsModule.loadAnalyses(window.AppState.selectedProspect.id);
          }
        } catch (error) {
          showToast('Помилка створення аналізу', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-magic"></i> Створити аналіз';
          }
        }
      });
    },

    async prepareAnalysisData() {
      const fileData = FileUploadHandler.getData();

      const data = {
        prospect_id: window.AppState.selectedProspect.id,
        title: $('#analysis-title').value,
        date: $('#analysis-date').value,
        participants: $('#analysis-participants').value.split(',').map(p => p.trim()),
        options: {
          detect_manipulation: $('#detect-manipulation').checked,
          detect_bias: $('#detect-bias').checked,
          detect_fallacies: $('#detect-fallacies').checked,
          detect_pressure: $('#detect-pressure').checked,
          sentiment_analysis: $('#sentiment-analysis').checked,
          generate_recommendations: $('#generate-recommendations').checked
        }
      };

      // Get text/file/image content
      const textContent = $('#negotiation-text').value;

      if (textContent) {
        data.text = textContent;
      } else if (fileData.files.length > 0) {
        data.file_content = fileData.files[0].content;
        data.file_name = fileData.files[0].file.name;
      } else if (fileData.images.length > 0) {
        data.images = fileData.images.map(img => ({
          data_url: img.dataUrl,
          name: img.file.name
        }));
      }

      return data;
    },

    setupConvertForm() {
      const form = $('#convert-form');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const prospectId = window.ProspectsManager?.selectedProspect?.id;
        if (!prospectId) {
          showToast('Оберіть потенційного клієнта', 'error');
          return;
        }

        const submitBtn = e.submitter;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Конвертація...';
        }

        const data = {
          type: 'teamhub',
          team_size: parseInt($('#convert-team-size').value) || 5,
          additional_data: {
            client_type: $('#convert-type').value
          }
        };

        try {
          const response = await apiCall(`/prospects/${prospectId}/convert`, {
            method: 'POST',
            body: JSON.stringify(data)
          });

          showToast('Клієнта успішно конвертовано в активного!', 'success');
          ModalManager.close('convert-modal');
          form.reset();

          // Reload prospects
          if (window.ProspectsManager) {
            window.ProspectsManager.loadProspects();
          }

          // Start onboarding flow
          if (window.Onboarding && response.client) {
            setTimeout(() => {
              window.Onboarding.init(response.client);
            }, 500);
          } else if (window.TeamHub) {
            // If no onboarding, just reload TeamHub
            await window.TeamHub.loadActiveClients();
            window.TeamHub.render();
          }

        } catch (error) {
          console.error('Error converting prospect:', error);
          showToast(error.message || 'Помилка конвертації', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Конвертувати клієнта';
          }
        }
      });
    },

    setupClientForm() {
      const form = $('#create-client-form');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        console.log('📝 Створення клієнта...');

        // Map old form fields to new API format
        const companyName = $('#client-name')?.value?.trim();
        const clientType = $('#client-type')?.value;
        const contact = $('#client-contact')?.value?.trim();
        const teamSize = $('#client-team-size')?.value;

        if (!companyName) {
          showToast('Введіть назву компанії', 'error');
          return;
        }

        // Map team size to company_size enum
        let companySize = 'medium';
        if (teamSize) {
          const size = parseInt(teamSize);
          if (size < 10) companySize = 'startup';
          else if (size < 50) companySize = 'small';
          else if (size < 200) companySize = 'medium';
          else companySize = 'large';
        }

        // Prepare data in new API format
        const data = {
          company: companyName,
          negotiator: contact || '',
          sector: 'Technology',
          company_size: companySize,
          negotiation_type: 'sales',
          deal_value: '$100K-$500K',
          timeline: '3-6 months',
          goal: 'New client acquisition',
          decision_criteria: 'Budget, Timeline, Team fit'
        };

        console.log('📤 Sending data:', data);

        try {
          const response = await fetch('/api/v1/clients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });

          const result = await response.json();
          console.log('📥 Response:', response.status, result);

          if (!response.ok) {
            const errorMsg = result.details
              ? result.details.map(d => d.message).join(', ')
              : result.error || 'Помилка створення клієнта';
            throw new Error(errorMsg);
          }

          showToast('Клієнта створено успішно!', 'success');
          ModalManager.close('create-client-modal');

          // Reload clients list
          if (window.TeamHubModule && window.TeamHubModule.loadClients) {
            setTimeout(() => window.TeamHubModule.loadClients(), 300);
          }
          if (window.AppInit && window.AppInit.loadInitialData) {
            setTimeout(() => window.AppInit.loadInitialData(), 300);
          }

          // Reset form
          form.reset();

        } catch (error) {
          console.error('❌ Помилка створення клієнта:', error);
          showToast(error.message || 'Помилка створення клієнта', 'error');
        }
      });
    },

    setupAddClientForm() {
      const form = $('#add-client-form');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = e.submitter;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Створення...';
        }

        const notes = {};
        const goalValue = $('#new-client-goal')?.value?.trim();
        const notesValue = $('#new-client-notes')?.value?.trim();
        if (goalValue) notes.goal = goalValue;
        if (notesValue) notes.additional_notes = notesValue;

        const data = {
          company: $('#new-client-company').value,
          negotiator: $('#new-client-negotiator').value || null,
          sector: $('#new-client-sector').value || null,
          weekly_hours: parseInt($('#new-client-team-size').value) || null,
          client_type: 'active',
          status: 'active',
          notes: Object.keys(notes).length > 0 ? notes : null
        };

        try {
          const response = await apiCall('/clients', {
            method: 'POST',
            body: JSON.stringify(data)
          });

          showToast('Активного клієнта успішно створено!', 'success');
          ModalManager.close('add-client-modal');
          form.reset();

          // Start onboarding for new client
          if (window.Onboarding && response.client) {
            setTimeout(() => {
              window.Onboarding.init(response.client);
            }, 500);
          } else if (window.TeamHub) {
            // If no onboarding, just reload TeamHub
            await window.TeamHub.loadActiveClients();
            window.TeamHub.render();
          }

        } catch (error) {
          console.error('Error creating client:', error);
          showToast(error.message || 'Помилка створення клієнта', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Додати клієнта';
          }
        }
      });
    },

    setupNotesForm() {
      const form = $('#new-note-form');
      if (!form) return;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = $('#new-note-text').value;
        if (text.trim()) {
          NotesManager.addNote(text);
        }
      });
    }
  };

  // ============================================
  // INITIALIZATION
  // ============================================

  let modalsInitialized = false;
  let modalInitAttempts = 0;
  const MAX_MODAL_INIT_ATTEMPTS = 20;
  const MODAL_INIT_RETRY_DELAY = 150;

  function initModals() {
    if (modalsInitialized) {
      console.log('⚠️ Modals already initialized, skipping');
      return;
    }

    const hasModalMarkup = document.querySelector('.modal');
    const backdrop = $('#modal-backdrop');

    if (!hasModalMarkup || !backdrop) {
      modalInitAttempts += 1;
      if (modalInitAttempts <= MAX_MODAL_INIT_ATTEMPTS) {
        console.warn('⏳ Modals HTML not ready, retrying initialization...');
        setTimeout(initModals, MODAL_INIT_RETRY_DELAY);
      } else {
        console.error('❌ Failed to initialize modals: markup not found');
      }
      return;
    }

    modalInitAttempts = 0;
    console.log('🔧 Initializing modals...');

    // Ensure initial modal state is consistent before binding events
    backdrop.classList.remove('active');
    backdrop.style.display = 'none';
    backdrop.style.opacity = '0';

    $$('.modal').forEach(modal => {
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
    });

    // Close buttons - use once:true to prevent duplicates
    $$('[id^="close-"][id$="-modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('❌ Close button clicked');
        ModalManager.close();
      }, { once: false }); // Changed to false but we track with flag
    });

    $$('[id^="cancel-"][id$="-btn"]').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('❌ Cancel button clicked');
        ModalManager.close();
      }, { once: false });
    });

    // Backdrop click - DISABLED to prevent accidental closes
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        // ONLY close if clicking directly on backdrop, not on modal content
        if (e.target === backdrop) {
          console.log('❌ Backdrop clicked, closing modal');
          ModalManager.close();
        }
      }, { once: false });
    }

    modalsInitialized = true;

    // Notes add button
    const addNoteBtn = $('#add-note-btn');
    if (addNoteBtn) {
      addNoteBtn.addEventListener('click', () => {
        NotesManager.showAddNoteForm();
      });
    }

    const cancelNoteBtn = $('#cancel-note-btn');
    if (cancelNoteBtn) {
      cancelNoteBtn.addEventListener('click', () => {
        NotesManager.hideAddNoteForm();
      });
    }

    // Initialize handlers
    FileUploadHandler.init();
    FormHandlers.init();

    console.log('✅ Modals initialized');
  }

  // Export to window
  window.ModalManager = ModalManager;
  window.NotesManager = NotesManager;
  window.FileUploadHandler = FileUploadHandler;
  window.initializeModals = initModals;

  // Export modal helper functions for backward compatibility
  window.showModal = (modalId) => ModalManager.open(modalId);
  window.hideModal = (modalId) => ModalManager.close(modalId);
  window.closeModal = (modalId) => ModalManager.close(modalId);

  // Helper functions
  window.apiCall = async function(endpoint, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies for auth
    };

    // Add /api/v1 prefix if not present
    const url = endpoint.startsWith('/api') ? endpoint : `/api/v1${endpoint}`;

    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API помилка');
    }

    return data;
  };

  window.showToast = function(message, type = 'info') {
    if (window.UltraSmooth && window.UltraSmooth.ToastManager) {
      window.UltraSmooth.ToastManager.show(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModals);
  } else {
    initModals();
  }

  // Re-initialize when modals HTML is injected dynamically
  document.addEventListener('modals:loaded', () => initModals());

  // ============================================
  // INTEGRATION WITH OLD APP-NEON.JS
  // ============================================

  // Override showClientForm to open modal
  window.showClientFormModal = function() {
    ModalManager.open('create-prospect-modal');
  };

  // Listen for new client button clicks
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for modals to load
    setTimeout(() => {
      const newClientBtns = [
        '#new-client-btn',
        '#empty-new-client-btn',
        '#create-first-client'
      ];

      newClientBtns.forEach(selector => {
        document.addEventListener('click', (e) => {
          if (e.target.closest(selector)) {
            e.preventDefault();
            e.stopPropagation();
            ModalManager.open('create-prospect-modal');
          }
        });
      });

      // New analysis button
      document.addEventListener('click', (e) => {
        if (e.target.closest('#new-analysis-btn') || e.target.closest('#create-analysis-btn')) {
          e.preventDefault();
          e.stopPropagation();
          ModalManager.open('create-analysis-modal');
        }
      });
    }, 500);
  });

})();
