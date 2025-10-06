// custom-fields.js - Powerful Custom Fields System with AI Prompt Binding
(() => {
  'use strict';

  const CustomFields = {
    fields: [],
    fieldValues: {},
    prospectId: null,

    // Field type configurations
    fieldTypes: {
      text: {
        icon: 'fa-font',
        label: 'Текст',
        input: '<input type="text" class="custom-field-input" />',
        supportsAI: true
      },
      textarea: {
        icon: 'fa-align-left',
        label: 'Текстова область',
        input: '<textarea class="custom-field-textarea" rows="4"></textarea>',
        supportsAI: true
      },
      number: {
        icon: 'fa-hashtag',
        label: 'Число',
        input: '<input type="number" class="custom-field-input" />',
        supportsAI: false
      },
      select: {
        icon: 'fa-list',
        label: 'Вибір зі списку',
        input: '<select class="custom-field-select"></select>',
        supportsAI: true
      },
      multiselect: {
        icon: 'fa-check-square',
        label: 'Множинний вибір',
        input: '<div class="custom-field-multiselect"></div>',
        supportsAI: true
      },
      date: {
        icon: 'fa-calendar',
        label: 'Дата',
        input: '<input type="date" class="custom-field-input" />',
        supportsAI: false
      },
      checkbox: {
        icon: 'fa-check',
        label: 'Прапорець',
        input: '<input type="checkbox" class="custom-field-checkbox" />',
        supportsAI: false
      },
      rating: {
        icon: 'fa-star',
        label: 'Рейтинг',
        input: '<div class="custom-field-rating"></div>',
        supportsAI: true
      },
      ai_generated: {
        icon: 'fa-magic',
        label: 'AI-генероване поле',
        input: '<div class="custom-field-ai"></div>',
        supportsAI: true
      }
    },

    // Pre-built AI prompts templates
    promptTemplates: {
      summarize: {
        name: 'Summarize',
        icon: 'fa-compress-alt',
        prompt: 'Summarize the following information in 2-3 concise sentences:\n\n{value}'
      },
      analyze_sentiment: {
        name: 'Sentiment Analysis',
        icon: 'fa-smile',
        prompt: 'Analyze the sentiment of this text and provide:\n1. Overall sentiment (positive/neutral/negative)\n2. Confidence score\n3. Key phrases indicating sentiment\n\nText: {value}'
      },
      extract_key_points: {
        name: 'Extract Key Points',
        icon: 'fa-list-ul',
        prompt: 'Extract the key points from this text as a bulleted list:\n\n{value}'
      },
      generate_followup: {
        name: 'Generate Follow-up',
        icon: 'fa-comments',
        prompt: 'Based on this conversation/note, suggest 3-5 specific follow-up actions:\n\n{value}'
      },
      risk_assessment: {
        name: 'Risk Assessment',
        icon: 'fa-exclamation-triangle',
        prompt: 'Assess the risk level and potential issues in this negotiation context:\n\n{value}\n\nProvide:\n1. Risk level (low/medium/high/critical)\n2. Identified risks\n3. Mitigation suggestions'
      },
      competitor_analysis: {
        name: 'Competitor Analysis',
        icon: 'fa-chart-line',
        prompt: 'Analyze the competitive landscape mentioned:\n\n{value}\n\nProvide:\n1. Identified competitors\n2. Their strengths/weaknesses\n3. Our competitive advantages'
      },
      decision_criteria: {
        name: 'Decision Criteria Extraction',
        icon: 'fa-balance-scale',
        prompt: 'Extract and structure the decision criteria from this information:\n\n{value}\n\nFormat as:\n- Criterion 1 (Priority: High/Medium/Low)\n- Criterion 2...'
      },
      budget_analysis: {
        name: 'Budget Analysis',
        icon: 'fa-dollar-sign',
        prompt: 'Analyze budget-related information:\n\n{value}\n\nExtract:\n1. Budget range/amount\n2. Budget constraints\n3. Flexibility indicators\n4. Decision timeline'
      },
      stakeholder_mapping: {
        name: 'Stakeholder Mapping',
        icon: 'fa-users',
        prompt: 'Identify and map stakeholders from this context:\n\n{value}\n\nFor each stakeholder provide:\n- Name and role\n- Influence level\n- Position (champion/neutral/blocker)\n- Key concerns'
      },
      objection_handling: {
        name: 'Objection Handling',
        icon: 'fa-shield-alt',
        prompt: 'Identify objections and suggest responses:\n\n{value}\n\nFor each objection:\n1. The objection\n2. Root cause\n3. Recommended response\n4. Supporting evidence needed'
      },
      next_best_action: {
        name: 'Next Best Action',
        icon: 'fa-route',
        prompt: 'Based on the current situation, recommend the next best action:\n\n{value}\n\nProvide:\n1. Recommended action\n2. Rationale\n3. Expected outcome\n4. Timeline\n5. Resources needed'
      },
      custom: {
        name: 'Custom Prompt',
        icon: 'fa-cog',
        prompt: ''
      }
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
      await this.loadFieldDefinitions();
      this.render();
      this.attachEventListeners();
    },

    async loadFieldDefinitions() {
      try {
        const response = await apiCall('/custom-fields/definitions');
        if (response.success) {
          this.fields = response.fields || [];
        }
      } catch (error) {
        console.log('Using default field definitions');
        this.fields = this.getDefaultFields();
      }
    },

    getDefaultFields() {
      return [
        {
          id: 1,
          name: 'industry_vertical',
          label: 'Галузь бізнесу',
          type: 'select',
          options: ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Other'],
          required: false,
          ai_enabled: true,
          ai_prompt: this.promptTemplates.competitor_analysis.prompt
        },
        {
          id: 2,
          name: 'decision_maker_level',
          label: 'Рівень особи що приймає рішення',
          type: 'select',
          options: ['C-Level', 'VP', 'Director', 'Manager', 'Individual Contributor'],
          required: false,
          ai_enabled: false
        },
        {
          id: 3,
          name: 'budget_authority',
          label: 'Бюджетні повноваження',
          type: 'rating',
          max_rating: 5,
          required: false,
          ai_enabled: true,
          ai_prompt: this.promptTemplates.budget_analysis.prompt
        },
        {
          id: 4,
          name: 'pain_points',
          label: 'Болючі точки клієнта',
          type: 'textarea',
          required: false,
          ai_enabled: true,
          ai_prompt: this.promptTemplates.extract_key_points.prompt
        },
        {
          id: 5,
          name: 'competition',
          label: 'Конкуренти',
          type: 'textarea',
          required: false,
          ai_enabled: true,
          ai_prompt: this.promptTemplates.competitor_analysis.prompt
        }
      ];
    },

    // ============================================
    // CONFIGURATION UI
    // ============================================

    openConfiguration() {
      const modal = this.renderConfigModal();
      document.body.insertAdjacentHTML('beforeend', modal);

      // Attach modal listeners
      this.attachConfigListeners();
    },

    renderConfigModal() {
      return `
        <div class="modal-overlay" id="custom-fields-config-modal">
          <div class="modal-container modal-xl">
            <div class="modal-header">
              <h2>
                <i class="fas fa-cog"></i>
                Налаштування Custom Fields
              </h2>
              <button class="modal-close" onclick="CustomFields.closeConfig()">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="modal-body">
              <div class="config-toolbar">
                <button class="btn btn-primary" onclick="CustomFields.addNewField()">
                  <i class="fas fa-plus"></i>
                  Додати поле
                </button>
                <button class="btn btn-secondary" onclick="CustomFields.importFields()">
                  <i class="fas fa-file-import"></i>
                  Імпорт
                </button>
                <button class="btn btn-secondary" onclick="CustomFields.exportFields()">
                  <i class="fas fa-file-export"></i>
                  Експорт
                </button>
              </div>

              <div class="fields-config-list" id="fields-config-list">
                ${this.fields.map(field => this.renderFieldConfig(field)).join('')}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="CustomFields.closeConfig()">
                Скасувати
              </button>
              <button class="btn btn-primary" onclick="CustomFields.saveConfiguration()">
                <i class="fas fa-save"></i>
                Зберегти налаштування
              </button>
            </div>
          </div>
        </div>
      `;
    },

    renderFieldConfig(field) {
      const typeConfig = this.fieldTypes[field.type] || this.fieldTypes.text;

      return `
        <div class="field-config-item" data-field-id="${field.id}">
          <div class="field-config-header">
            <div class="field-config-icon">
              <i class="fas ${typeConfig.icon}"></i>
            </div>
            <div class="field-config-info">
              <h4>${field.label}</h4>
              <span class="field-config-type">${typeConfig.label}</span>
            </div>
            <div class="field-config-actions">
              <button class="icon-btn" onclick="CustomFields.editField(${field.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="icon-btn" onclick="CustomFields.deleteField(${field.id})">
                <i class="fas fa-trash"></i>
              </button>
              <button class="icon-btn drag-handle">
                <i class="fas fa-grip-vertical"></i>
              </button>
            </div>
          </div>

          ${field.ai_enabled ? `
            <div class="field-ai-config">
              <div class="ai-badge">
                <i class="fas fa-magic"></i>
                AI Enhanced
              </div>
              <div class="ai-prompt-preview">
                ${this.truncate(field.ai_prompt || 'No prompt configured', 100)}
              </div>
              <button class="btn btn-sm btn-ghost" onclick="CustomFields.configureAI(${field.id})">
                <i class="fas fa-cog"></i>
                Налаштувати AI
              </button>
            </div>
          ` : ''}
        </div>
      `;
    },

    // ============================================
    // FIELD EDITOR
    // ============================================

    editField(fieldId) {
      const field = this.fields.find(f => f.id === fieldId);
      if (!field) return;

      const editorHtml = `
        <div class="modal-overlay" id="field-editor-modal">
          <div class="modal-container modal-lg">
            <div class="modal-header">
              <h2>
                <i class="fas fa-edit"></i>
                Редагувати поле: ${field.label}
              </h2>
              <button class="modal-close" onclick="CustomFields.closeEditor()">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="modal-body">
              <form id="field-editor-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Назва поля</label>
                    <input type="text" id="field-label" value="${field.label}" required>
                  </div>

                  <div class="form-group">
                    <label>Внутрішня назва</label>
                    <input type="text" id="field-name" value="${field.name}" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Тип поля</label>
                    <select id="field-type">
                      ${Object.keys(this.fieldTypes).map(type => `
                        <option value="${type}" ${field.type === type ? 'selected' : ''}>
                          ${this.fieldTypes[type].label}
                        </option>
                      `).join('')}
                    </select>
                  </div>

                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="field-required" ${field.required ? 'checked' : ''}>
                      Обов'язкове поле
                    </label>
                  </div>
                </div>

                <div class="form-group" id="field-options-container" style="display: ${['select', 'multiselect'].includes(field.type) ? 'block' : 'none'}">
                  <label>Опції (кожна з нового рядка)</label>
                  <textarea id="field-options" rows="4">${(field.options || []).join('\n')}</textarea>
                </div>

                <div class="form-group">
                  <label>
                    <input type="checkbox" id="field-ai-enabled" ${field.ai_enabled ? 'checked' : ''}>
                    <i class="fas fa-magic"></i>
                    Використовувати AI для цього поля
                  </label>
                </div>

                <div id="ai-config-section" style="display: ${field.ai_enabled ? 'block' : 'none'}">
                  <div class="form-group">
                    <label>AI Prompt Template</label>
                    <select id="ai-prompt-template">
                      <option value="">Оберіть шаблон...</option>
                      ${Object.keys(this.promptTemplates).map(key => `
                        <option value="${key}">${this.promptTemplates[key].name}</option>
                      `).join('')}
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Custom AI Prompt</label>
                    <textarea id="field-ai-prompt" rows="6" placeholder="Введіть prompt для AI. Використовуйте {value} для підстановки значення поля.">${field.ai_prompt || ''}</textarea>
                    <small class="form-hint">
                      <i class="fas fa-info-circle"></i>
                      Використовуйте <code>{value}</code> щоб вставити значення поля в prompt
                    </small>
                  </div>

                  <div class="form-group">
                    <label>AI Model</label>
                    <select id="field-ai-model">
                      <option value="gpt-4o">GPT-4 Optimized</option>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="field-auto-run-ai">
                      Автоматично запускати AI при зміні значення
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="CustomFields.closeEditor()">
                Скасувати
              </button>
              <button class="btn btn-primary" onclick="CustomFields.saveField(${fieldId})">
                <i class="fas fa-save"></i>
                Зберегти
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', editorHtml);
      this.attachEditorListeners();
    },

    // ============================================
    // AI PROMPT CONFIGURATION
    // ============================================

    configureAI(fieldId) {
      this.editField(fieldId);
      // Auto-focus on AI section
      setTimeout(() => {
        document.getElementById('field-ai-enabled')?.click();
        document.getElementById('field-ai-prompt')?.focus();
      }, 100);
    },

    async runAIOnField(fieldId, value) {
      const field = this.fields.find(f => f.id === fieldId);
      if (!field || !field.ai_enabled || !field.ai_prompt) {
        return null;
      }

      try {
        // Replace {value} placeholder with actual value
        const prompt = field.ai_prompt.replace(/{value}/g, value);

        const response = await apiCall('/ai/analyze', {
          method: 'POST',
          body: JSON.stringify({
            prompt,
            model: field.ai_model || 'gpt-4o',
            max_tokens: 1000
          })
        });

        if (response.success) {
          return response.result;
        }
      } catch (error) {
        console.error('Error running AI on field:', error);
        showToast('Помилка AI обробки', 'error');
      }

      return null;
    },

    // ============================================
    // RENDER FIELDS FOR PROSPECT
    // ============================================

    async renderForProspect(prospectId) {
      this.prospectId = prospectId;
      await this.loadFieldValues(prospectId);

      const container = document.getElementById('custom-fields-container');
      if (!container) return;

      container.innerHTML = `
        <div class="custom-fields-header">
          <h3>
            <i class="fas fa-sliders-h"></i>
            Custom Fields
          </h3>
          <button class="btn btn-sm btn-secondary" onclick="CustomFields.openConfiguration()">
            <i class="fas fa-cog"></i>
            Налаштування
          </button>
        </div>

        <div class="custom-fields-list">
          ${this.fields.map(field => this.renderFieldInput(field)).join('')}
        </div>
      `;

      this.attachFieldListeners();
    },

    renderFieldInput(field) {
      const value = this.fieldValues[field.name] || '';
      const typeConfig = this.fieldTypes[field.type];

      return `
        <div class="custom-field-wrapper" data-field-name="${field.name}">
          <label class="custom-field-label">
            ${field.label}
            ${field.required ? '<span class="required">*</span>' : ''}
            ${field.ai_enabled ? '<span class="ai-badge"><i class="fas fa-magic"></i></span>' : ''}
          </label>

          <div class="custom-field-input-group">
            ${this.renderFieldByType(field, value)}

            ${field.ai_enabled ? `
              <button class="field-ai-btn" onclick="CustomFields.runAIForField('${field.name}')">
                <i class="fas fa-magic"></i>
                AI
              </button>
            ` : ''}
          </div>

          <div class="field-ai-result" id="ai-result-${field.name}" style="display: none;"></div>
        </div>
      `;
    },

    renderFieldByType(field, value) {
      switch (field.type) {
        case 'text':
          return `<input type="text" id="field-${field.name}" value="${value}" class="custom-field-input">`;

        case 'textarea':
          return `<textarea id="field-${field.name}" rows="4" class="custom-field-textarea">${value}</textarea>`;

        case 'number':
          return `<input type="number" id="field-${field.name}" value="${value}" class="custom-field-input">`;

        case 'select':
          return `
            <select id="field-${field.name}" class="custom-field-select">
              <option value="">Оберіть...</option>
              ${(field.options || []).map(opt => `
                <option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
              `).join('')}
            </select>
          `;

        case 'date':
          return `<input type="date" id="field-${field.name}" value="${value}" class="custom-field-input">`;

        case 'checkbox':
          return `<input type="checkbox" id="field-${field.name}" ${value ? 'checked' : ''} class="custom-field-checkbox">`;

        case 'rating':
          const maxRating = field.max_rating || 5;
          return `
            <div class="rating-input" id="field-${field.name}">
              ${Array(maxRating).fill(0).map((_, i) => `
                <i class="fas fa-star rating-star ${i < value ? 'active' : ''}" data-rating="${i + 1}"></i>
              `).join('')}
            </div>
          `;

        default:
          return `<input type="text" id="field-${field.name}" value="${value}" class="custom-field-input">`;
      }
    },

    async runAIForField(fieldName) {
      const field = this.fields.find(f => f.name === fieldName);
      if (!field) return;

      const input = document.getElementById(`field-${fieldName}`);
      const value = input?.value || input?.innerText || '';

      if (!value) {
        showToast('Спочатку введіть значення', 'warning');
        return;
      }

      const resultContainer = document.getElementById(`ai-result-${fieldName}`);
      if (resultContainer) {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI обробляє...';
      }

      const aiResult = await this.runAIOnField(field.id, value);

      if (aiResult && resultContainer) {
        resultContainer.innerHTML = `
          <div class="ai-result-content">
            <div class="ai-result-header">
              <i class="fas fa-magic"></i>
              AI Result
            </div>
            <div class="ai-result-body">${this.formatAIResult(aiResult)}</div>
          </div>
        `;
      }
    },

    formatAIResult(result) {
      // Convert markdown-like formatting to HTML
      return result
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/^- /gm, '• ');
    },

    // ============================================
    // SAVE/LOAD
    // ============================================

    async loadFieldValues(prospectId) {
      try {
        const response = await apiCall(`/prospects/${prospectId}/custom-fields`);
        if (response.success) {
          this.fieldValues = response.values || {};
        }
      } catch (error) {
        console.log('No custom field values found');
        this.fieldValues = {};
      }
    },

    async saveFieldValues() {
      if (!this.prospectId) return;

      const values = {};
      this.fields.forEach(field => {
        const input = document.getElementById(`field-${field.name}`);
        if (input) {
          values[field.name] = input.value || input.checked || '';
        }
      });

      try {
        await apiCall(`/prospects/${this.prospectId}/custom-fields`, {
          method: 'PUT',
          body: JSON.stringify({ values })
        });

        showToast('Custom fields збережено', 'success');
      } catch (error) {
        console.error('Error saving custom fields:', error);
        showToast('Помилка збереження', 'error');
      }
    },

    // ============================================
    // LISTENERS
    // ============================================

    attachEditorListeners() {
      // Type change handler
      const typeSelect = document.getElementById('field-type');
      typeSelect?.addEventListener('change', (e) => {
        const optionsContainer = document.getElementById('field-options-container');
        if (['select', 'multiselect'].includes(e.target.value)) {
          optionsContainer.style.display = 'block';
        } else {
          optionsContainer.style.display = 'none';
        }
      });

      // AI enabled toggle
      const aiCheckbox = document.getElementById('field-ai-enabled');
      aiCheckbox?.addEventListener('change', (e) => {
        const aiSection = document.getElementById('ai-config-section');
        aiSection.style.display = e.target.checked ? 'block' : 'none';
      });

      // Template selector
      const templateSelect = document.getElementById('ai-prompt-template');
      templateSelect?.addEventListener('change', (e) => {
        const template = this.promptTemplates[e.target.value];
        if (template) {
          document.getElementById('field-ai-prompt').value = template.prompt;
        }
      });
    },

    attachFieldListeners() {
      // Auto-save on change
      document.querySelectorAll('.custom-field-input, .custom-field-textarea, .custom-field-select').forEach(input => {
        input.addEventListener('change', () => this.saveFieldValues());
      });

      // Rating stars
      document.querySelectorAll('.rating-star').forEach(star => {
        star.addEventListener('click', (e) => {
          const rating = parseInt(e.target.dataset.rating);
          const container = e.target.closest('.rating-input');
          container.querySelectorAll('.rating-star').forEach((s, i) => {
            s.classList.toggle('active', i < rating);
          });
          this.saveFieldValues();
        });
      });
    },

    attachConfigListeners() {
      // Implement listeners for config modal
    },

    // ============================================
    // UTILITY
    // ============================================

    truncate(text, length) {
      if (text.length <= length) return text;
      return text.substring(0, length) + '...';
    },

    closeConfig() {
      document.getElementById('custom-fields-config-modal')?.remove();
    },

    closeEditor() {
      document.getElementById('field-editor-modal')?.remove();
    }
  };

  // Export to window
  window.CustomFields = CustomFields;

})();
