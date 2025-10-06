# 🚀 Advanced Features Documentation

## Overview

TeamPulse тепер включає потужні системи для глибокого управління клієнтами, командами та даними з акцентом на надійність, зручність та продуктивність.

---

## 📊 Table of Contents

1. [Error Handling & Validation](#error-handling--validation)
2. [Auto-Save System](#auto-save-system)
3. [Rich Text Editor](#rich-text-editor)
4. [Team Management](#team-management)
5. [User Flows](#user-flows)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Offline Support](#offline-support)

---

## 🛡️ Error Handling & Validation

### Features

- **Global Error Catching**: Перехоплення всіх помилок (unhandled promises, runtime errors)
- **Network Monitoring**: Автоматичне відстеження статусу підключення
- **API Error Recovery**: Розумна обробка помилок API з retry механізмом
- **User-Friendly Notifications**: Зрозумілі повідомлення про помилки
- **Form Validation**: Комплексна валідація форм

### Usage

```javascript
// Validate single field
const result = ErrorHandler.validate(email, ['required', 'email']);
if (!result.valid) {
  console.log(result.errors); // ['Введіть коректну email адресу']
}

// Validate entire form
const formResult = ErrorHandler.validateForm('my-form');
if (!formResult.valid) {
  // Errors automatically shown on fields
  console.log(formResult.errors);
}

// Custom validation rules
ErrorHandler.validate(value, [
  'required',
  ErrorHandler.validationRules.minLength(5),
  ErrorHandler.validationRules.maxLength(100)
]);
```

### Built-in Validation Rules

- `required` - Обов'язкове поле
- `email` - Email адреса
- `phone` - Номер телефону
- `url` - URL адреса
- `integer` - Ціле число
- `positive` - Додатнє число
- `minLength(n)` - Мінімальна довжина
- `maxLength(n)` - Максимальна довжина
- `min(n)` - Мінімальне значення
- `max(n)` - Максимальне значення

### Error Notifications

```javascript
// Success notification
ErrorHandler.showSuccessNotification('Операція виконана', 'Дані збережено');

// Error notification
ErrorHandler.showErrorNotification('Помилка', 'Не вдалося зберегти');

// Warning
ErrorHandler.showWarningNotification('Увага', 'Перевірте дані');

// Info
ErrorHandler.showInfoNotification('Інформація', 'Нові дані доступні');
```

### Confirmation Dialogs

```javascript
const confirmed = await ErrorHandler.confirm({
  title: 'Видалити команду?',
  message: 'Цю дію неможливо скасувати',
  confirmText: 'Видалити',
  cancelText: 'Скасувати',
  danger: true
});

if (confirmed) {
  // User confirmed
}
```

---

## 💾 Auto-Save System

### Features

- **Automatic Saving**: Автоматичне збереження з debounce
- **Offline Queue**: Черга збереження при відсутності інтернету
- **Local Storage Backup**: Локальне резервне копіювання
- **Sync on Reconnect**: Автоматична синхронізація при підключенні
- **Visual Indicators**: Індикатори статусу збереження

### Usage

```javascript
// Register auto-save for a form
AutoSave.register(
  'unique-key',

  // getData - function that returns current data
  () => {
    return {
      title: document.getElementById('title').value,
      content: document.getElementById('content').value
    };
  },

  // saveFunction - async function that saves to server
  async (data) => {
    return await apiCall('/endpoint', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // options
  {
    delay: 2000,        // Debounce delay in ms
    immediate: false    // Save immediately without debounce
  }
);

// Trigger save (will be debounced)
AutoSave.trigger('unique-key');

// Save immediately
await AutoSave.saveNow('unique-key');

// Unregister when done
AutoSave.unregister('unique-key');

// Check status
const status = AutoSave.getStatus('unique-key');
console.log(status.saving, status.lastSaveTime);
```

### Auto-Save Indicators

Auto-save status is displayed in the top-right corner:

- 🔵 **Saving...** - Currently saving
- ✅ **Saved** - Successfully saved
- 📤 **Offline** - Queued for sync (offline)
- ❌ **Error** - Failed to save

---

## ✍️ Rich Text Editor

### Features

- **Rich Formatting**: Bold, italic, underline, strikethrough
- **Lists**: Bullet points and numbered lists
- **Headings**: H2, H3 headings
- **Links**: Insert hyperlinks
- **Code Blocks**: Code formatting
- **File Attachments**: Drag & drop files
- **Image Preview**: Preview for uploaded images
- **Mentions**: @mention team members
- **Undo/Redo**: Full history support
- **Keyboard Shortcuts**: Ctrl+B, Ctrl+I, etc.

### Usage

```javascript
// Initialize editor
const editorId = RichTextEditor.init('container-id', initialContent, {
  placeholder: 'Start typing...',
  minHeight: '200px',
  maxHeight: '500px',
  allowFiles: true,
  allowMentions: true,
  allowFormatting: true,

  // Callbacks
  onChange: (html, plainText) => {
    console.log('Content changed:', plainText.length, 'characters');
  },

  onFilesAdded: (files) => {
    console.log('Files added:', files.length);
  }
});

// Get content
const html = RichTextEditor.getContent(editorId);
const text = RichTextEditor.getPlainText(editorId);
const files = RichTextEditor.getFiles(editorId);

// Set content
RichTextEditor.setContent(editorId, '<p>New content</p>');

// Clear
RichTextEditor.clear(editorId);

// Destroy
RichTextEditor.destroy(editorId);
```

### Keyboard Shortcuts

- **Ctrl+B** - Bold
- **Ctrl+I** - Italic
- **Ctrl+U** - Underline
- **Ctrl+K** - Insert link
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **Tab** - Insert 4 spaces

### File Upload

Files can be:
- Dragged and dropped into the editor
- Selected via file picker
- Pasted from clipboard (images)

Maximum file size: 10MB per file

---

## 👥 Team Management

### Features

- **Rich Team Editor**: Complete team creation and editing
- **Member Management**: Add, edit, remove team members
- **RACI Matrix**: Assign responsibilities (Responsible, Accountable, Consulted, Informed)
- **File Attachments**: Attach documents to teams
- **Tags & Notes**: Organize with tags and notes
- **Auto-Save**: Automatic saving while editing
- **Drag & Drop**: Reorder members
- **Duplication**: Duplicate existing teams
- **Search & Filter**: Find teams quickly

### Usage

```javascript
// Initialize for a client
TeamManagement.init(clientId);

// Load teams
await TeamManagement.loadTeamsByClient(clientId);

// Create new team
TeamManagement.showCreateTeamModal();

// Edit team
await TeamManagement.editTeam(teamId);

// Delete team
await TeamManagement.deleteTeam(teamId);

// Duplicate team
await TeamManagement.duplicateTeam(teamId);
```

### Team Structure

```javascript
{
  id: 1,
  title: 'Development Team',
  description: 'HTML formatted description',
  client_id: 123,
  status: 'active', // active, planning, on-hold, completed
  members: [
    {
      name: 'John Doe',
      role: 'Developer',
      email: 'john@example.com',
      responsibility: 'responsible' // R, A, C, I
    }
  ],
  files: [
    {
      id: 'file-123',
      name: 'document.pdf',
      size: 1024000,
      type: 'application/pdf'
    }
  ],
  notes: {
    start_date: '2025-01-15',
    tags: ['urgent', 'backend'],
    additional_notes: 'Important notes...'
  }
}
```

### RACI Matrix

- **R** - Responsible: Виконує роботу
- **A** - Accountable: Відповідальний за результат
- **C** - Consulted: Консультується
- **I** - Informed: Інформується

---

## 🔄 User Flows

### Prospect → Active Client Flow

1. **Browse Prospects** (Grid or Kanban view)
2. **Create/Edit Prospect** (Modal with file upload)
3. **Analyze Prospect** (Add timeline events)
4. **Convert to Active** (Conversion modal)
5. **Onboarding** (3-step wizard)
   - Step 1: Basic info & tags
   - Step 2: Create team
   - Step 3: Enable features
6. **Active Client** (TeamHub management)

### Team Creation Flow

1. **Open TeamHub** (Active Clients tab)
2. **Click "Create Team"** or add during onboarding
3. **Fill Basic Info** (Title, description with rich text)
4. **Add Members** (Name, role, email, RACI)
5. **Upload Files** (Drag & drop documents)
6. **Add Tags & Notes**
7. **Save** (Auto-save active throughout)

### Error Recovery Flow

1. **Error Occurs** (Network, validation, server)
2. **Error Handler Catches** (Logged automatically)
3. **User Notification** (Clear, actionable message)
4. **Retry Mechanism** (Exponential backoff)
5. **Local Storage Backup** (Data preserved)
6. **Sync on Recovery** (Automatic when online)

---

## ⌨️ Keyboard Shortcuts

### Global Shortcuts

- **Ctrl+S** - Save current form
- **Ctrl+K** - Open command palette
- **Escape** - Close active modal

### Rich Text Editor

- **Ctrl+B** - Bold
- **Ctrl+I** - Italic
- **Ctrl+U** - Underline
- **Ctrl+K** - Insert link
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **Tab** - Indent

### Navigation

- **Tab** - Next field
- **Shift+Tab** - Previous field
- **Enter** - Submit form (when focused on button)

---

## 📡 Offline Support

### Features

- **Offline Detection**: Automatic detection of connectivity status
- **Local Storage**: All data backed up locally
- **Queue System**: Failed requests queued for retry
- **Sync on Reconnect**: Automatic sync when back online
- **Visual Indicators**: Clear offline status indicators

### How It Works

1. **You're Offline**: System detects lost connection
2. **Work Continues**: You can continue editing
3. **Local Save**: Changes saved to localStorage
4. **Queue Created**: API calls added to pending queue
5. **Back Online**: System detects connection restored
6. **Auto-Sync**: Pending changes synced automatically
7. **Notification**: "Синхронізовано N змін"

### Data Persistence

- **Forms**: All form data saved locally every 2-3 seconds
- **Teams**: Team edits saved with 30-second sync
- **Files**: File references cached (files uploaded on sync)
- **Duration**: Data kept for 7 days max

---

## 🎨 Best Practices

### Error Handling

```javascript
try {
  const result = await apiCall('/endpoint', {...});
  showNotification('Успіх!', 'success');
} catch (error) {
  // Error handler automatically catches and shows notification
  // Just log if needed
  console.error('Operation failed:', error);
}
```

### Form Validation

```html
<input
  type="email"
  data-validate="required,email"
  data-label="Email адреса"
>
```

### Auto-Save

Always register auto-save for long forms:

```javascript
// Register on form open
AutoSave.register(key, getData, saveFunc);

// Unregister on form close
AutoSave.unregister(key);
```

### Rich Text

Use rich text for:
- Team descriptions
- Notes
- Comments
- Long-form content

Avoid for:
- Short fields (names, titles)
- Structured data
- Search fields

---

## 🔧 Configuration

### Error Handler

```javascript
// Customize retry attempts
ErrorHandler.maxRetries = 3;

// Add custom validation rules
ErrorHandler.validationRules.customRule = {
  test: (value) => value.length > 10,
  message: 'Must be longer than 10 characters'
};
```

### Auto-Save

```javascript
// Change default delay
AutoSave.saveDelay = 3000;

// Change sync interval
AutoSave.syncInterval = 60000; // 1 minute
```

---

## 📈 Performance

### Optimizations

- **Debouncing**: Input changes debounced (300ms search, 2000ms save)
- **Lazy Loading**: Components loaded on demand
- **Local Caching**: Frequent data cached in localStorage
- **Batch Operations**: Multiple API calls batched when possible
- **Virtual Scrolling**: Large lists use virtual scrolling

### Memory Management

- **History Limits**: Undo history limited to last 50 actions
- **Error Logs**: Only last 100 errors kept
- **Cache Expiration**: Local storage data expires after 7 days

---

## 🐛 Troubleshooting

### Auto-Save Not Working

1. Check console for errors
2. Verify `AutoSave.register()` was called
3. Check `AutoSave.getStatus(key)` for details
4. Ensure `getData()` function returns valid data

### Rich Text Editor Issues

1. Verify `RichTextEditor` is loaded before use
2. Check container ID exists in DOM
3. Ensure no conflicting CSS
4. Check browser console for errors

### Validation Not Showing

1. Ensure input has `data-validate` attribute
2. Check validation rule is registered
3. Call `ErrorHandler.validateForm(formId)`
4. Verify form ID is correct

---

## 🎯 Future Enhancements

- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced RACI matrix editor
- [ ] Team analytics dashboard
- [ ] Export to PDF/Excel
- [ ] Mobile app integration
- [ ] Voice-to-text for rich editor
- [ ] AI-powered suggestions
- [ ] Advanced search with filters
- [ ] Custom dashboard widgets
- [ ] Integration with external tools

---

## 📞 Support

For issues or questions:
- Check this documentation
- Review browser console for errors
- Check network tab in DevTools
- Contact: [your-email@example.com]

---

**Last Updated**: January 2025
**Version**: 2.0.0
