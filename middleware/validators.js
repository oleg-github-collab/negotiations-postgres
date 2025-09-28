// middleware/validators.js - Input validation for production security
import { body, param, query, validationResult } from 'express-validator';
import { logSecurity } from '../utils/logger.js';

// Helper to handle validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logSecurity('Validation failed', {
      ip: req.ip,
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query
    });
    
    return res.status(400).json({
      error: 'Помилка валідації даних',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Login validation
export const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Ім\'я користувача має містити від 3 до 50 символів')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Ім\'я користувача може містити тільки букви, цифри та знак підкреслення'),
  
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Пароль має містити від 6 до 100 символів'),
  
  handleValidationErrors
];

// Client validation
export const validateClient = [
  body('company')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Назва компанії обов\'язкова (до 200 символів)')
    .escape(),
  
  body('negotiator')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ім\'я переговорника не може перевищувати 100 символів')
    .escape(),
  
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Сфера діяльності не може перевищувати 50 символів')
    .escape(),
  
  body('weekly_hours')
    .optional()
    .isInt({ min: 0, max: 168 })
    .withMessage('Кількість годин на тиждень має бути від 0 до 168'),
  
  body('goal')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Опис цілі не може перевищувати 1000 символів')
    .escape(),
  
  body('decision_criteria')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Критерії рішення не можуть перевищувати 1000 символів')
    .escape(),
  
  body('constraints')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Обмеження не можуть перевищувати 1000 символів')
    .escape(),
  
  // New fields validation
  body('company_size')
    .optional()
    .isIn(['startup', 'small', 'medium', 'large'])
    .withMessage('Розмір компанії має бути одним з: startup, small, medium, large'),
  
  body('negotiation_type')
    .optional()
    .isIn(['sales', 'partnership', 'contract', 'investment', 'acquisition', 'licensing', 'other'])
    .withMessage('Тип переговорів має бути одним з: sales, partnership, contract, investment, acquisition, licensing, other'),
  
  body('deal_value')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Вартість угоди не може перевищувати 50 символів')
    .escape(),
  
  body('goals')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Цілі не можуть перевищувати 1000 символів')
    .escape(),
  
  handleValidationErrors
];

// Analysis text validation
export const validateAnalysisText = [
  body('text')
    .optional()
    .trim()
    .isLength({ min: 20, max: 100000 })
    .withMessage('Текст має містити від 20 до 100,000 символів'),
  
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('ID клієнта має бути додатнім цілим числом'),
  
  handleValidationErrors
];

// Client ID parameter validation
export const validateClientId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID клієнта має бути додатнім цілим числом'),
  
  handleValidationErrors
];

// Analysis ID parameter validation
export const validateAnalysisId = [
  param('analysisId')
    .isInt({ min: 1 })
    .withMessage('ID аналізу має бути додатнім цілим числом'),
  
  handleValidationErrors
];

// Advice request validation
export const validateAdviceRequest = [
  body('items')
    .isArray({ min: 1, max: 50 })
    .withMessage('Має бути передано від 1 до 50 фрагментів для аналізу'),
  
  body('items.*.text')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Кожен фрагмент має містити від 10 до 1000 символів')
    .escape(),
  
  body('items.*.category')
    .optional()
    .isIn(['manipulation', 'cognitive_bias', 'rhetological_fallacy'])
    .withMessage('Категорія має бути одною з: manipulation, cognitive_bias, rhetological_fallacy'),
  
  body('items.*.label')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Мітка не може перевищувати 100 символів')
    .escape(),
  
  handleValidationErrors
];

export const validateTeamCreate = [
  body('client_id')
    .isInt({ min: 1 })
    .withMessage('client_id має бути додатнім цілим числом'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Назва команди має містити від 1 до 200 символів')
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Опис команди не може перевищувати 2000 символів'),

  body('members')
    .isArray({ min: 1, max: 100 })
    .withMessage('Передайте від 1 до 100 учасників команди'),

  body('members.*.name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Ім\'я учасника обов\'язкове (до 200 символів)'),

  body('members.*.role')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Роль не може перевищувати 200 символів'),

  body('members.*.responsibilities')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every((item) => typeof item === 'string');
      }
      return typeof value === 'string';
    })
    .withMessage('Обов\'язки мають бути рядком або масивом рядків'),

  body('members.*.compensation')
    .optional()
    .isObject()
    .withMessage('Компенсація має бути об\'єктом'),

  body('members.*.compensation.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Сума компенсації має бути невід\'ємною'),

  body('members.*.compensation.currency')
    .optional()
    .trim()
    .isLength({ min: 2, max: 6 })
    .withMessage('Валюта компенсації має містити від 2 до 6 символів'),

  body('members.*.workload_percent')
    .optional()
    .isFloat({ min: 0, max: 200 })
    .withMessage('Зайнятість у % має бути в межах 0-200'),

  handleValidationErrors
];

export const validateTeamIdParam = [
  param('teamId')
    .isInt({ min: 1 })
    .withMessage('ID команди має бути додатнім цілим числом'),
  handleValidationErrors
];

export const validateTeamMemberIdParam = [
  param('memberId')
    .isInt({ min: 1 })
    .withMessage('ID учасника має бути додатнім цілим числом'),
  handleValidationErrors
];

export const validateRaciGenerate = [
  body('focus')
    .optional()
    .isObject()
    .withMessage('focus має бути об\'єктом'),

  body('focus.tasks')
    .optional()
    .isArray({ max: 50 })
    .withMessage('focus.tasks має бути масивом (до 50 елементів)'),

  handleValidationErrors
];

export const validateSalaryInsight = [
  body('salary.amount')
    .isFloat({ min: 0 })
    .withMessage('Сума зарплати має бути невід\'ємною'),

  body('salary.currency')
    .trim()
    .isLength({ min: 2, max: 6 })
    .withMessage('Валюта має містити від 2 до 6 символів'),

  body('job_description')
    .optional()
    .isLength({ min: 20, max: 8000 })
    .withMessage('Опис обов\'язків має містити від 20 до 8000 символів'),

  body('workload.hours_per_week')
    .optional()
    .isFloat({ min: 0, max: 168 })
    .withMessage('Години на тиждень мають бути в межах 0-168'),

  body('timeframe')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Період аналізу не може перевищувати 200 символів'),

  handleValidationErrors
];

export const validatePersonAdvice = [
  body('mode')
    .trim()
    .isIn(['hiring', 'compensation', 'tasks'])
    .withMessage('mode має бути одним з: hiring, compensation, tasks'),

  body('member')
    .isObject()
    .withMessage('member обов\'язковий'),

  body('member.name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Ім\'я співробітника обов\'язкове (до 200 символів)'),

  body('member.role')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Роль співробітника не може перевищувати 200 символів'),

  body('member.responsibilities')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.every((item) => typeof item === 'string');
      }
      return typeof value === 'string';
    })
    .withMessage('Відповідальності мають бути рядком або масивом рядків'),

  body('team')
    .optional()
    .isObject()
    .withMessage('team має бути об\'єктом'),

  body('concern')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Деталізація запиту не може перевищувати 2000 символів'),

  handleValidationErrors
];

// File upload validation
export const validateFileUpload = (req, res, next) => {
  // Skip validation for multipart requests - will be handled in parseMultipart
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  
  if (!req.file && !req.body.text) {
    return res.status(400).json({
      error: 'Потрібно завантажити файл або ввести текст'
    });
  }
  
  if (req.file) {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '.txt,.docx,.doc').split(',');
    const fileExt = '.' + req.file.originalname.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      logSecurity('Invalid file type uploaded', {
        ip: req.ip,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      return res.status(400).json({
        error: `Непідтримуваний тип файлу. Дозволені: ${allowedTypes.join(', ')}`
      });
    }
    
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: `Файл занадто великий. Максимальний розмір: ${Math.round(maxSize / 1024 / 1024)}MB`
      });
    }
  }
  
  next();
};

// Security headers validation
export const validateSecurityHeaders = (req, res, next) => {
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
  const suspiciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
  
  for (const header in req.headers) {
    const value = req.headers[header];
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          logSecurity('Suspicious header detected', {
            ip: req.ip,
            header,
            value,
            userAgent: req.get('User-Agent')
          });
          return res.status(400).json({ error: 'Підозрілі дані в заголовках' });
        }
      }
    }
  }
  
  next();
};
