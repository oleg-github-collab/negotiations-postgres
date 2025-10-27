/* ============================================
   RICH TEXT EDITOR WITH FILE SUPPORT
   Advanced text editing with formatting, mentions, files
   ============================================ */

const RichTextEditor = {
  editors: new Map(),
  currentEditorId: null,

  // Initialize editor in a container
  init(containerId, initialContent = '', options = {}) {
    // Check if containerId is valid
    if (!containerId || containerId === 'undefined') {
      console.warn('RichTextEditor: Invalid container ID provided');
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`RichTextEditor: Container ${containerId} not found in DOM`);
      return null;
    }

    const editorId = `editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const editor = {
      id: editorId,
      containerId,
      content: initialContent,
      options: {
        placeholder: options.placeholder || 'Почніть вводити текст...',
        minHeight: options.minHeight || '200px',
        maxHeight: options.maxHeight || '500px',
        allowFiles: options.allowFiles !== false,
        allowMentions: options.allowMentions !== false,
        allowFormatting: options.allowFormatting !== false,
        onChange: options.onChange || null,
        onFilesAdded: options.onFilesAdded || null
      },
      files: [],
      mentions: [],
      history: [],
      historyIndex: -1,
      selection: null
    };

    this.editors.set(editorId, editor);
    this.render(editorId);

    return editorId;
  },

  render(editorId) {
    const editor = this.editors.get(editorId);
    if (!editor) return;

    const container = document.getElementById(editor.containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="rich-editor" id="${editorId}">
        <!-- Toolbar -->
        <div class="rich-editor-toolbar" id="${editorId}-toolbar">
          ${editor.options.allowFormatting ? this.renderToolbar(editorId) : ''}
        </div>

        <!-- Editor Content -->
        <div class="rich-editor-content"
             id="${editorId}-content"
             contenteditable="true"
             data-placeholder="${editor.options.placeholder}"
             style="min-height: ${editor.options.minHeight}; max-height: ${editor.options.maxHeight};">
          ${editor.content}
        </div>

        <!-- File Attachments -->
        ${editor.options.allowFiles ? `
          <div class="rich-editor-files" id="${editorId}-files">
            <div class="files-dropzone" id="${editorId}-dropzone">
              <i class="fas fa-paperclip"></i>
              <span>Перетягніть файли або клікніть для вибору</span>
              <input type="file" id="${editorId}-file-input" multiple hidden>
            </div>
            <div class="files-list" id="${editorId}-files-list"></div>
          </div>
        ` : ''}

        <!-- Mentions Dropdown -->
        ${editor.options.allowMentions ? `
          <div class="mentions-dropdown" id="${editorId}-mentions" style="display: none;"></div>
        ` : ''}

        <!-- Character Count -->
        <div class="rich-editor-footer">
          <span class="char-count" id="${editorId}-char-count">0 символів</span>
          ${editor.options.allowFiles ? `
            <button class="btn-icon" onclick="RichTextEditor.triggerFileUpload('${editorId}')" title="Прикріпити файл">
              <i class="fas fa-paperclip"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.setupEditorEvents(editorId);
  },

  renderToolbar(editorId) {
    return `
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="RichTextEditor.execCommand('${editorId}', 'bold')" title="Жирний (Ctrl+B)">
          <i class="fas fa-bold"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.execCommand('${editorId}', 'italic')" title="Курсив (Ctrl+I)">
          <i class="fas fa-italic"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.execCommand('${editorId}', 'underline')" title="Підкреслений (Ctrl+U)">
          <i class="fas fa-underline"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.execCommand('${editorId}', 'strikeThrough')" title="Закреслений">
          <i class="fas fa-strikethrough"></i>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="RichTextEditor.execCommand('${editorId}', 'insertUnorderedList')" title="Маркований список">
          <i class="fas fa-list-ul"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.execCommand('${editorId}', 'insertOrderedList')" title="Нумерований список">
          <i class="fas fa-list-ol"></i>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="RichTextEditor.insertHeading('${editorId}', 2)" title="Заголовок">
          <i class="fas fa-heading"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.insertLink('${editorId}')" title="Посилання (Ctrl+K)">
          <i class="fas fa-link"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.insertCodeBlock('${editorId}')" title="Блок коду">
          <i class="fas fa-code"></i>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="RichTextEditor.undo('${editorId}')" title="Скасувати (Ctrl+Z)">
          <i class="fas fa-undo"></i>
        </button>
        <button class="toolbar-btn" onclick="RichTextEditor.redo('${editorId}')" title="Повторити (Ctrl+Y)">
          <i class="fas fa-redo"></i>
        </button>
      </div>

      <div class="toolbar-divider"></div>

      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="RichTextEditor.clear('${editorId}')" title="Очистити форматування">
          <i class="fas fa-remove-format"></i>
        </button>
      </div>
    `;
  },

  setupEditorEvents(editorId) {
    const editor = this.editors.get(editorId);
    if (!editor) return;

    const content = document.getElementById(`${editorId}-content`);
    const fileInput = document.getElementById(`${editorId}-file-input`);
    const dropzone = document.getElementById(`${editorId}-dropzone`);

    if (!content) return;

    // Content changes
    content.addEventListener('input', () => {
      this.handleInput(editorId);
    });

    content.addEventListener('keydown', (e) => {
      this.handleKeydown(editorId, e);
    });

    content.addEventListener('paste', (e) => {
      this.handlePaste(editorId, e);
    });

    // Selection change for mentions
    content.addEventListener('keyup', () => {
      if (editor.options.allowMentions) {
        this.checkForMentionTrigger(editorId);
      }
    });

    // File upload
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelect(editorId, e.target.files);
      });
    }

    // Drag & drop
    if (dropzone) {
      dropzone.addEventListener('click', () => {
        fileInput?.click();
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
        this.handleFileSelect(editorId, e.dataTransfer.files);
      });
    }
  },

  handleInput(editorId) {
    const editor = this.editors.get(editorId);
    if (!editor) return;

    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    editor.content = content.innerHTML;

    // Update character count
    const text = content.innerText || '';
    const charCount = document.getElementById(`${editorId}-char-count`);
    if (charCount) {
      charCount.textContent = `${text.length} символів`;
    }

    // Add to history for undo/redo
    if (editor.historyIndex < editor.history.length - 1) {
      editor.history = editor.history.slice(0, editor.historyIndex + 1);
    }
    editor.history.push(content.innerHTML);
    editor.historyIndex++;

    // Trigger onChange callback
    if (editor.options.onChange) {
      editor.options.onChange(editor.content, text);
    }
  },

  handleKeydown(editorId, e) {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          this.execCommand(editorId, 'bold');
          break;
        case 'i':
          e.preventDefault();
          this.execCommand(editorId, 'italic');
          break;
        case 'u':
          e.preventDefault();
          this.execCommand(editorId, 'underline');
          break;
        case 'k':
          e.preventDefault();
          this.insertLink(editorId);
          break;
        case 'z':
          e.preventDefault();
          this.undo(editorId);
          break;
        case 'y':
          e.preventDefault();
          this.redo(editorId);
          break;
      }
    }

    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  },

  handlePaste(editorId, e) {
    e.preventDefault();

    const editor = this.editors.get(editorId);
    if (!editor) return;

    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain');

    // Check for files in clipboard
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          this.handleFileSelect(editorId, [file]);
        }
      }
    }

    // Insert text at cursor
    document.execCommand('insertText', false, text);
  },

  handleFileSelect(editorId, files) {
    const editor = this.editors.get(editorId);
    if (!editor || !files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification(`Файл ${file.name} завеликий (макс 10MB)`, 'error');
        return;
      }

      const fileObj = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        preview: null
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileObj.preview = e.target.result;
          this.renderFilesList(editorId);
        };
        reader.readAsDataURL(file);
      }

      editor.files.push(fileObj);
    });

    this.renderFilesList(editorId);

    // Trigger callback
    if (editor.options.onFilesAdded) {
      editor.options.onFilesAdded(editor.files);
    }

    showNotification(`Додано ${files.length} ${files.length === 1 ? 'файл' : 'файлів'}`, 'success');
  },

  renderFilesList(editorId) {
    const editor = this.editors.get(editorId);
    if (!editor) return;

    const container = document.getElementById(`${editorId}-files-list`);
    if (!container) return;

    if (editor.files.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = editor.files.map(file => `
      <div class="file-item" data-file-id="${file.id}">
        ${file.preview ? `
          <div class="file-preview">
            <img src="${file.preview}" alt="${file.name}">
          </div>
        ` : `
          <div class="file-icon">
            <i class="${this.getFileIcon(file.type)}"></i>
          </div>
        `}
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
        </div>
        <button class="file-remove" onclick="RichTextEditor.removeFile('${editorId}', '${file.id}')" title="Видалити">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  },

  removeFile(editorId, fileId) {
    const editor = this.editors.get(editorId);
    if (!editor) return;

    editor.files = editor.files.filter(f => f.id !== fileId);
    this.renderFilesList(editorId);

    if (editor.options.onFilesAdded) {
      editor.options.onFilesAdded(editor.files);
    }
  },

  // ============================================
  // FORMATTING COMMANDS
  // ============================================

  execCommand(editorId, command) {
    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    content.focus();
    document.execCommand(command, false, null);
  },

  insertHeading(editorId, level) {
    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    content.focus();
    document.execCommand('formatBlock', false, `<h${level}>`);
  },

  insertLink(editorId) {
    const url = prompt('Введіть URL:');
    if (!url) return;

    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    content.focus();
    document.execCommand('createLink', false, url);
  },

  insertCodeBlock(editorId) {
    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    content.focus();
    const code = prompt('Введіть код:');
    if (!code) return;

    document.execCommand('insertHTML', false, `<pre><code>${this.escapeHtml(code)}</code></pre>`);
  },

  clear(editorId) {
    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    content.focus();
    document.execCommand('removeFormat', false, null);
  },

  undo(editorId) {
    const editor = this.editors.get(editorId);
    if (!editor || editor.historyIndex <= 0) return;

    editor.historyIndex--;
    const content = document.getElementById(`${editorId}-content`);
    if (content) {
      content.innerHTML = editor.history[editor.historyIndex];
    }
  },

  redo(editorId) {
    const editor = this.editors.get(editorId);
    if (!editor || editor.historyIndex >= editor.history.length - 1) return;

    editor.historyIndex++;
    const content = document.getElementById(`${editorId}-content`);
    if (content) {
      content.innerHTML = editor.history[editor.historyIndex];
    }
  },

  // ============================================
  // MENTIONS SYSTEM
  // ============================================

  checkForMentionTrigger(editorId) {
    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    const text = content.innerText || '';
    const cursorPos = this.getCursorPosition(content);

    // Check if @ was typed
    const lastChar = text.charAt(cursorPos - 1);
    if (lastChar === '@') {
      this.showMentionDropdown(editorId);
    }
  },

  showMentionDropdown(editorId) {
    const dropdown = document.getElementById(`${editorId}-mentions`);
    if (!dropdown) return;

    // In real app, fetch team members from API
    const mentions = [
      { id: 1, name: 'Олександр Петренко', role: 'Developer' },
      { id: 2, name: 'Марія Іваненко', role: 'Designer' },
      { id: 3, name: 'Андрій Коваль', role: 'Manager' }
    ];

    dropdown.innerHTML = mentions.map(m => `
      <div class="mention-item" onclick="RichTextEditor.insertMention('${editorId}', ${m.id}, '${m.name}')">
        <div class="mention-avatar">${this.getInitials(m.name)}</div>
        <div class="mention-info">
          <div class="mention-name">${m.name}</div>
          <div class="mention-role">${m.role}</div>
        </div>
      </div>
    `).join('');

    dropdown.style.display = 'block';
  },

  insertMention(editorId, userId, userName) {
    const content = document.getElementById(`${editorId}-content`);
    if (!content) return;

    // Remove @ and insert mention
    document.execCommand('insertHTML', false,
      `<span class="mention" data-user-id="${userId}">@${userName}</span>&nbsp;`
    );

    const dropdown = document.getElementById(`${editorId}-mentions`);
    if (dropdown) dropdown.style.display = 'none';
  },

  // ============================================
  // PUBLIC API
  // ============================================

  getContent(editorId) {
    const editor = this.editors.get(editorId);
    return editor ? editor.content : '';
  },

  getPlainText(editorId) {
    const content = document.getElementById(`${editorId}-content`);
    return content ? content.innerText : '';
  },

  getFiles(editorId) {
    const editor = this.editors.get(editorId);
    return editor ? editor.files : [];
  },

  setContent(editorId, html) {
    const editor = this.editors.get(editorId);
    if (!editor) return;

    const content = document.getElementById(`${editorId}-content`);
    if (content) {
      content.innerHTML = html;
      editor.content = html;
    }
  },

  clear(editorId) {
    this.setContent(editorId, '');
    const editor = this.editors.get(editorId);
    if (editor) {
      editor.files = [];
      this.renderFilesList(editorId);
    }
  },

  destroy(editorId) {
    this.editors.delete(editorId);
    const container = document.getElementById(editorId);
    if (container) container.remove();
  },

  triggerFileUpload(editorId) {
    const fileInput = document.getElementById(`${editorId}-file-input`);
    if (fileInput) fileInput.click();
  },

  // ============================================
  // UTILITIES
  // ============================================

  getCursorPosition(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    return preCaretRange.toString().length;
  },

  getFileIcon(mimeType) {
    if (!mimeType) return 'fas fa-file';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('image')) return 'fas fa-file-image';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('zip')) return 'fas fa-file-archive';
    return 'fas fa-file';
  },

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  escapeHtml(text) {
    const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }
};

// Expose globally
window.RichTextEditor = RichTextEditor;
