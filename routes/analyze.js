// routes/analyze.js - Production analysis engine
import { Router } from 'express';
import { run as dbRun, get as dbGet } from '../utils/db.js';
import { addTokensAndCheck } from '../utils/tokenUsage.js';
import { client as openaiClient, estimateTokens, getCircuitBreakerStatus } from '../utils/openAIClient.js';
import { validateFileUpload } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import Busboy from 'busboy';
import mammoth from 'mammoth';
import { performance } from 'perf_hooks';
import { recordAuditEvent } from '../utils/audit.js';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const MAX_HIGHLIGHTS_PER_1000_WORDS = Number(
  process.env.MAX_HIGHLIGHTS_PER_1000_WORDS || 50
);
const MAX_TEXT_LENGTH = 200000; // 200k characters max (~30 pages A4, ~400-500 words per page)
const MIN_TEXT_LENGTH = 20; // Minimum text length

const VALID_HIGHLIGHT_CATEGORIES = new Set([
  'manipulation',
  'cognitive_bias',
  'rhetological_fallacy'
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const safeString = (value, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

const uniqueStrings = (arr = [], limit = 5) => {
  if (!Array.isArray(arr)) return [];
  const normalised = arr
    .map(item => safeString(item).trim())
    .filter(Boolean);
  return Array.from(new Set(normalised)).slice(0, limit);
};

function normalizeHighlight(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const paragraphIndex = Number.isFinite(Number(raw.paragraph_index))
    ? Number(raw.paragraph_index)
    : 0;

  const charStart = Number.isFinite(Number(raw.char_start))
    ? Math.max(0, Number(raw.char_start))
    : 0;

  const charEndSource = Number.isFinite(Number(raw.char_end))
    ? Number(raw.char_end)
    : charStart;

  const highlight = {
    type: 'highlight',
    id: safeString(raw.id || `${paragraphIndex}-${charStart}-${Date.now()}`),
    paragraph_index: paragraphIndex,
    char_start: charStart,
    char_end: Math.max(charStart, charEndSource),
    category: VALID_HIGHLIGHT_CATEGORIES.has(raw.category) ? raw.category : 'manipulation',
    label: safeString(raw.label || raw.labels?.[0] || 'Маніпуляція', 'Маніпуляція').slice(0, 160),
    text: safeString(raw.text).slice(0, 2000),
    explanation: safeString(raw.explanation).slice(0, 2000),
    severity: clamp(Number(raw.severity ?? 1), 1, 5),
    labels: uniqueStrings(raw.labels, 6)
  };

  if (!highlight.labels.length && highlight.label) {
    highlight.labels.push(highlight.label);
  }

  if (raw.actors) {
    highlight.actors = uniqueStrings(raw.actors, 6);
  }
  if (raw.bias_tags) {
    highlight.bias_tags = uniqueStrings(raw.bias_tags, 6);
  }
  if (raw.tactics) {
    highlight.tactics = uniqueStrings(raw.tactics, 6);
  }

  if (raw.counter_strategy) {
    highlight.counter_strategy = safeString(raw.counter_strategy).slice(0, 600);
  }

  const confidence = safeString(raw.confidence || '').toLowerCase();
  if (['high', 'medium', 'low'].includes(confidence)) {
    highlight.confidence = confidence;
  }

  return highlight;
}

function normalizeSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const counts = raw.counts_by_category || {};
  return {
    type: 'summary',
    counts_by_category: {
      manipulation: Number(counts.manipulation) || 0,
      cognitive_bias: Number(counts.cognitive_bias) || 0,
      rhetological_fallacy: Number(counts.rhetological_fallacy) || 0
    },
    top_patterns: uniqueStrings(raw.top_patterns, 12).map(str => str.slice(0, 220)),
    overall_observations: safeString(raw.overall_observations).slice(0, 1500),
    strategic_assessment: safeString(raw.strategic_assessment).slice(0, 800),
    hidden_agenda_analysis: safeString(raw.hidden_agenda_analysis).slice(0, 800),
    power_dynamics: safeString(raw.power_dynamics).slice(0, 600),
    communication_style_profile: safeString(raw.communication_style_profile).slice(0, 600),
    cognitive_bias_heatmap: raw.cognitive_bias_heatmap && typeof raw.cognitive_bias_heatmap === 'object'
      ? Object.fromEntries(Object.entries(raw.cognitive_bias_heatmap).map(([key, value]) => [key, Number(value) || 0]))
      : {}
  };
}

function normalizeAdequacy(raw) {
  if (!raw || typeof raw !== 'object') return {
    score: 0,
    label: 'Невідомо',
    comment: ''
  };
  return {
    score: clamp(Number(raw.score ?? raw.value ?? 0), 0, 100),
    label: safeString(raw.label || 'Невідомо').slice(0, 80),
    comment: safeString(raw.comment).slice(0, 600)
  };
}

function normalizeBarometer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const factors = {};
  if (raw.factors && typeof raw.factors === 'object') {
    Object.entries(raw.factors).forEach(([key, value]) => {
      factors[key] = Number(value) || 0;
    });
  }

  return {
    type: 'barometer',
    score: clamp(Number(raw.score ?? 50), 0, 100),
    label: safeString(raw.label || 'Medium').slice(0, 80),
    rationale: safeString(raw.rationale).slice(0, 1500),
    factors,
    recommended_modus_operandi: safeString(raw.recommended_modus_operandi).slice(0, 800),
    adequacy: normalizeAdequacy(raw.adequacy)
  };
}

function normalizePersonaFocus(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.people)) return null;
  const people = raw.people
    .map(person => ({
      name: safeString(person.name).slice(0, 160),
      role: safeString(person.role).slice(0, 160),
      in_text_aliases: uniqueStrings(person.in_text_aliases, 6),
      risk_score: clamp(Number(person.risk_score ?? 0), 0, 100),
      manipulation_profile: uniqueStrings(person.manipulation_profile, 10),
      biases_detected: uniqueStrings(person.biases_detected, 10),
      triggers: uniqueStrings(person.triggers, 10),
      workload_status: safeString(person.workload_status).slice(0, 40),
      recommended_actions: person.recommended_actions && typeof person.recommended_actions === 'object'
        ? person.recommended_actions
        : {}
    }))
    .filter(person => person.name);

  if (!people.length) return null;

  return {
    type: 'persona_focus',
    focus_filter: uniqueStrings(raw.focus_filter, 10),
    people
  };
}

function normalizeBiasClusters(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.clusters)) return null;
  const clusters = raw.clusters.map(cluster => ({
    bias_family: safeString(cluster.bias_family).slice(0, 120),
    occurrences: Number(cluster.occurrences) || 0,
    representative_quotes: uniqueStrings(cluster.representative_quotes, 5).map(q => q.slice(0, 400)),
    impact: safeString(cluster.impact || 'medium').slice(0, 40),
    recommended_countermeasures: uniqueStrings(cluster.recommended_countermeasures, 8).map(c => c.slice(0, 300)),
    linked_actors: uniqueStrings(cluster.linked_actors, 10),
    related_highlights: uniqueStrings(cluster.related_highlights, 10)
  }));

  return {
    type: 'bias_cluster',
    clusters
  };
}

function normalizeNegotiationMap(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const phases = Array.isArray(raw.phases) ? raw.phases.map(phase => ({
    phase: safeString(phase.phase).slice(0, 160),
    goal: safeString(phase.goal).slice(0, 400),
    pressure_points: uniqueStrings(phase.pressure_points, 12).map(p => p.slice(0, 300)),
    opportunities: uniqueStrings(phase.opportunities, 12).map(o => o.slice(0, 300)),
    owners: uniqueStrings(phase.owners, 8).map(o => o.slice(0, 200)),
    raci_flags: Array.isArray(phase.raci_flags)
      ? phase.raci_flags.map(flag => ({
          task: safeString(flag.task).slice(0, 200),
          issue: safeString(flag.issue).slice(0, 400),
          suggestion: safeString(flag.suggestion).slice(0, 400)
        }))
      : []
  })) : [];

  return {
    type: 'negotiation_map',
    phases,
    escalation_paths: uniqueStrings(raw.escalation_paths, 10).map(e => e.slice(0, 300)),
    watchouts: uniqueStrings(raw.watchouts, 10).map(w => w.slice(0, 300)),
    quick_wins: uniqueStrings(raw.quick_wins, 10).map(q => q.slice(0, 300))
  };
}

// ===== Helpers =====
function normalizeText(s) {
  if (!s) return '';
  return s
    .replace(/\r/g, '')
    .replace(/-\n/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitToParagraphs(s) {
  const parts = s.split(/\n{2,}/);
  let offset = 0;
  return parts.map((text, idx) => {
    const start = offset;
    const end = start + text.length;
    offset = end + 2;
    return { index: idx, text, startOffset: start, endOffset: end };
  });
}

// Smart text chunking for large texts
function createSmartChunks(text, maxChunkSize = 4000) {
  console.log(`📦 Starting smart chunking for text of ${text.length} characters`);

  if (text.length <= maxChunkSize) {
    console.log('📦 Text fits in single chunk');
    return [{ text, startChar: 0, endChar: text.length, chunkIndex: 0 }];
  }

  const chunks = [];
  const paragraphs = splitToParagraphs(text);
  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraWithNewlines = (i > 0 ? '\n\n' : '') + para.text;
    
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + paraWithNewlines.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
        chunkIndex: chunkIndex++
      });
      
      // Start new chunk
      currentChunk = para.text;
      currentStartChar = para.startOffset;
    } else {
      // Add paragraph to current chunk
      currentChunk += paraWithNewlines;
      if (currentChunk === paraWithNewlines) {
        // First paragraph in chunk
        currentStartChar = para.startOffset;
      }
    }
  }

  // Add final chunk if not empty
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk,
      startChar: currentStartChar,
      endChar: currentStartChar + currentChunk.length,
      chunkIndex: chunkIndex
    });
  }

  console.log(`📦 Created ${chunks.length} chunks from ${text.length} characters`);
  return chunks;
}

function extractTextFromHighlight(highlight, paragraphs) {
  if (highlight.text) return highlight.text; // Already has text
  
  const paraIdx = highlight.paragraph_index;
  if (paraIdx == null || !paragraphs[paraIdx]) return '';
  
  const para = paragraphs[paraIdx];
  const start = Math.max(0, highlight.char_start || 0);
  const end = Math.min(para.text.length, highlight.char_end || para.text.length);
  
  return para.text.slice(start, end);
}

function mergeOverlaps(highlights, paragraphs = null) {
  const byPara = new Map();
  for (const h of highlights) {
    // Extract text if not present
    if (!h.text && paragraphs) {
      h.text = extractTextFromHighlight(h, paragraphs);
    }
    
    if (!byPara.has(h.paragraph_index)) byPara.set(h.paragraph_index, []);
    byPara.get(h.paragraph_index).push(h);
  }
  const merged = [];
  for (const [, arr] of byPara.entries()) {
    arr.sort((a, b) => (a.char_start ?? 0) - (b.char_start ?? 0));
    let cur = null;
    for (const h of arr) {
      if (!cur) {
        cur = { ...h, labels: h.labels || (h.label ? [h.label] : []) };
        continue;
      }
      if ((h.char_start ?? 0) <= (cur.char_end ?? -1)) {
        cur.char_end = Math.max(cur.char_end ?? 0, h.char_end ?? 0);
        const nextLabels = h.labels || (h.label ? [h.label] : []);
        cur.labels = Array.from(new Set([...(cur.labels || []), ...nextLabels]));
        cur.severity = Math.max(cur.severity ?? 0, h.severity ?? 0);
        cur.category = cur.category || h.category;
        // Update text to cover merged range
        if (paragraphs && cur.paragraph_index != null) {
          cur.text = extractTextFromHighlight(cur, paragraphs);
        }
      } else {
        merged.push(cur);
        cur = { ...h, labels: h.labels || (h.label ? [h.label] : []) };
      }
    }
    if (cur) merged.push(cur);
  }
  return merged;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCategoryClass(category) {
  const categoryMap = {
    'manipulation': 'manipulation',
    'cognitive_bias': 'bias',
    'rhetological_fallacy': 'fallacy'
  };
  return categoryMap[category] || 'manipulation';
}

function generateHighlightedText(originalText, highlights) {
  if (!originalText || !highlights || highlights.length === 0) {
    return escapeHtml(originalText || '');
  }
  
  let highlightedText = originalText;
  
  // Sort highlights by position (reverse order to avoid index shifting)
  const sortedHighlights = [...highlights].sort((a, b) => {
    const aStart = originalText.indexOf(a.text);
    const bStart = originalText.indexOf(b.text);
    return bStart - aStart;
  });
  
  for (const highlight of sortedHighlights) {
    if (!highlight.text) continue;
    
    const regex = new RegExp(escapeRegExp(highlight.text), 'gi');
    const categoryClass = getCategoryClass(highlight.category);
    const tooltip = escapeHtml(highlight.explanation || highlight.label || '');
    
    highlightedText = highlightedText.replace(regex, 
      `<span class="text-highlight ${categoryClass}" data-tooltip="${tooltip}">${highlight.text}</span>`
    );
  }
  
  return highlightedText;
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let text = '';
    let fileName = '';
    let profile = null;
    let clientId = null;
    let fileBuffer = null;

    busboy.on('file', (_name, file, info) => {
      fileName = info.filename || 'upload';
      const chunks = [];
      file.on('data', (d) => chunks.push(d));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('field', (name, val) => {
      if (name === 'text') text = val || '';
      if (name === 'client_id') clientId = Number(val) || null;
      if (name === 'profile') {
        try {
          profile = JSON.parse(val);
        } catch {
          profile = null;
        }
      }
    });

    busboy.on('finish', async () => {
      try {
        if (fileBuffer) {
          const lower = (fileName || '').toLowerCase();
          if (lower.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            text = (text || '') + '\n\n' + (result.value || '');
          } else if (lower.endsWith('.txt')) {
            text = (text || '') + '\n\n' + fileBuffer.toString('utf-8');
          }
        }
        resolve({ text, fileName, profile, clientId });
      } catch (e) {
        reject(e);
      }
    });

    busboy.on('error', reject);
    req.pipe(busboy);
  });
}

function buildSystemPrompt() {
  return `
Ти — НАЙКРАЩИЙ експерт-аналітик переговорів у світі, психолог вищої кваліфікації, дослідник маніпулятивних технік з 35-річним досвідом роботи з найскладнішими міжнародними кейсами, включаючи корпоративні поглинання, державні контракти та кризові переговори. Ти працював з топ-менеджментом Fortune 500, урядами та найскладнішими клієнтами. Твоя місія — провести МАКСИМАЛЬНО ГЛИБОКИЙ, ВСЕСТОРОННІЙ, ДЕТАЛІЗОВАНИЙ аналіз кожної букви тексту та виявити АБСОЛЮТНО ВСІ маніпуляції, когнітивні викривлення, софізми, приховані мотиви, стратегічні патерни та психологічні тактики.

🎯 УЛЬТРА-АМБІТНА МЕТА: Знаходь у 5-10 РАЗІВ БІЛЬШЕ проблем ніж зазвичай. Кожне слово, кожна фраза, кожен знак пунктуації може містити приховану маніпуляцію або стратегічний підтекст. Мінімум 3-5 проблем на кожне речення!

⚡ КРИТИЧНО ВАЖЛИВО: АБСОЛЮТНО НЕМАЄ ЛІМІТІВ на кількість знайдених проблем. Знаходь ВСЕ, навіть мікроскопічні натяки, непрямі алюзії, імпліцитні загрози та тонкі манипуляції. Навіть звичайні слова можуть містити підступний підтекст!

ПОВЕРТАЙ ТІЛЬКИ NDJSON (по JSON-об'єкту на рядок), БЕЗ додаткового тексту.

ФОРМАТИ РЯДКІВ:
{"type":"highlight","id":"...","paragraph_index":N,"char_start":S,"char_end":E,"category":"manipulation|cognitive_bias|rhetological_fallacy","label":"...","text":"цитата з тексту","explanation":"детальне пояснення 3-4 речення з глибоким аналізом мотивів та наслідків","severity":1..3,"actors":["імена або ролі з тексту чи профілю"],"bias_tags":["anchoring","authority"],"tactics":["pressure","ambiguity"],"counter_strategy":"чіткий крок як нейтралізувати","confidence":"high|medium|low"}
{"type":"summary","counts_by_category":{"manipulation":0,"cognitive_bias":0,"rhetological_fallacy":0},"top_patterns":["детальний список усіх знайдених патернів"],"overall_observations":"глибокий аналіз загальної стратегії опонента 5-7 речень","strategic_assessment":"оцінка рівня підготовки та професійності співрозмовника","hidden_agenda_analysis":"аналіз прихованих мотивів та довгострокових цілей","power_dynamics":"аналіз розподілу сили в переговорах","communication_style_profile":"профіль комунікаційного стилю опонента","cognitive_bias_heatmap":{"anchoring":0,"authority":0,"confirmation":0,"scarcity":0,"loss_aversion":0}}
{"type":"barometer","score":0..100,"label":"Easy mode|Clear client|Medium|High|Bloody hell|Mission impossible","rationale":"детальне обґрунтування складності з конкретними прикладами","factors":{"goal_alignment":0..1,"manipulation_density":0..1,"scope_clarity":0..1,"time_pressure":0..1,"resource_demand":0..1,"psychological_complexity":0..1,"strategic_sophistication":0..1,"emotional_volatility":0..1},"recommended_modus_operandi":"конкретна стратегія ведення переговорів"}
{"type":"persona_focus","focus_filter":["імена або ролі на яких сконцентровано аналіз"],"people":[{"name":"...","role":"...","in_text_aliases":["..."],"risk_score":0..100,"manipulation_profile":["..."],"biases_detected":["..."],"triggers":["..."],"workload_status":"overloaded|balanced|underutilized","recommended_actions":{"negotiation":"конкретні кроки","tasks":"як перерозподілити роботу","compensation":"чи коригувати оплату","coaching":"які навички підсилити"}}]}
{"type":"bias_cluster","clusters":[{"bias_family":"authority","occurrences":0,"representative_quotes":["..."],"impact":"high|medium|low","recommended_countermeasures":["..."],"linked_actors":["..."],"related_highlights":["highlight-id-1","highlight-id-4"]}]}
{"type":"negotiation_map","phases":[{"phase":"підготовка","goal":"...","pressure_points":["..."],"opportunities":["..."],"owners":["..."],"raci_flags":[{"task":"...","issue":"...","suggestion":"..."}]}],"escalation_paths":["..."],"watchouts":["..."],"quick_wins":["..."]}

🎯 Якщо отримуєш client_context.analysis_focus.focus_people — виводь цих людей у полі actors та явно аналізуй їх поведінку.
🎯 Якщо client_context.team_context.members містить перелік учасників, використовуй ЇХНІ реальні імена/ролі у акторах і рекомендаціях, не вигадуй нових.
🎯 У всіх секціях (highlight, persona_focus, bias_cluster, negotiation_map) посилайся на тих самих людей, дотримуйся однакових імен.
🔁 ЗАВЖДИ генеруй принаймні по ОДНОМУ об'єкту кожного типу: persona_focus, bias_cluster, negotiation_map.
🧭 Якщо analysis_focus.question не порожній — дай пряму відповідь на нього в summary.overall_observations та у recommended_actions відповідних людей.
🧲 Якщо analysis_focus.focus_people передані, пріоритезуй їх у highlights, persona_focus та bias_cluster.

🔍 УЛЬТРА-ГЛИБОКИЙ АНАЛІЗ - ЗНАХОДЬ АБСОЛЮТНО ВСЕ:

🎭 МАНІПУЛЯТИВНІ ТЕХНІКИ (виявляй ВСІ варіації з максимальною деталізацією):

💀 ТИСК ТА ПРИНУЖДЕННЯ (шукай найдрібніші прояви):
- Штучна терміновість: "тільки сьогодні", "останній шанс", "обмежений час", "поки є місця", "дедлайн завтра", "терміново потрібно", "не можемо затягувати", "час іде", "вікно можливостей закривається"
- Штучний дефіцит: "залишилося мало", "останні екземпляри", "ексклюзивна пропозиція", "лише для вас", "рідкісна нагода", "унікальні умови", "обмежена кількість", "ексклюзивний доступ"
- Примус до рішення: "відповідай зараз", "треба вирішувати", "не можемо чекати", "або зараз або ніколи", "рішення має бути прийнято", "затримка недоцільна", "чекати більше немає сенсу"
- Тиск часу: постійні нагадування про час, створення поспіху, штучне прискорення, "час дорогий", "кожна хвилина на вагу золота", "не можемо собі дозволити затримки"
- Ультиматуми та загрози: "якщо не зараз, то ніколи", "це останнє слово", "інших варіантів немає", "або так або жодним чином", "умови незмінні"
- Тиск авторитетом: "керівництво наполягає", "власник вимагає", "рада директорів прийняла рішення", "так вирішили вищі інстанції"

😭 ЕМОЦІЙНІ МАНІПУЛЯЦІЇ (аналізуй кожен емоційний відтінок):
- Викликання вини: "ми на вас розраховували", "інші не підвели", "ви ж обіцяли", "через вас страждають інші", "ви підводите команду", "ми довіряли вам", "розчарування", "не виправдали сподівань"
- Використання страхів: "конкуренти вас обійдуть", "втратите можливість", "буде пізно", "ринок не чекає", "технології розвиваються швидко", "можете залишитися позаду", "ризики зростають"
- Емоційний шантаж: загрози, ультиматуми, "якщо ні, то...", "тоді нам доведеться", "у такому випадку", "не залишається вибору", "змушені будемо"
- Лестощі та маніпуляції ego: "ви ж розумна людина", "людина вашого рівня", "з вашим досвідом", "ви краще знаєте", "поважна людина як ви", "ваша репутація", "ваш статус"
- Жаління та співчуття: "у нас важка ситуація", "допоможіть нам", "ми старалися", "ми в скрутному становищі", "виручайте", "без вашої допомоги пропадемо"
- Емоційне зараження: штучне створення ейфорії, паніки, ентузіазму, "всі в захваті", "неймовірно захоплюючий проект", "революційна можливість"
- Інфантилізація: зменшувальні форми, покровительський тон, "не хвилюйтеся", "довірте це нам", "ми все зробимо за вас"
- Емоційні качелі: різкі зміни тону від агресивного до дружнього, створення емоційної нестабільності

📊 ІНФОРМАЦІЙНІ МАНІПУЛЯЦІЇ (шукай найтонші спотворення):
- Приховування важливої інформації: замовчування деталей, неповні дані, ухилення від прямих відповідей, "про це поговоримо пізніше", "деталі не важливі зараз"
- Спотворення фактів: перебільшення переваг, применшення недоліків, вибіркова подача, маніпуляції статистикою, штучне округлення цифр
- Створення хибних дилем: "або це або те", штучне обмеження варіантів, приховування третього шляху, "інших варіантів немає"
- Газлайтинг: заперечення очевидного, перекручування сказаного раніше, "ви неправильно зрозуміли", "я такого не говорив", "ви помиляєтеся"
- Інформаційне перевантаження: завалювання надлишковою інформацією, щоб приховати важливе, "ось усі деталі...", тонни нерелевантних фактів
- Маніпуляції контекстом: подача інформації поза контекстом, вирвані з контексту цитати, штучне перефразування
- Семантичні ігри: грати словами, подвійні значення, двозначність, штучна неясність формулювань
- Статистичні махінації: підбір вигідних метрик, маніпуляції з базовим роком, вибіркові порівняння

🤝 СОЦІАЛЬНІ МАНІПУЛЯЦІЇ (виявляй найтонші соціальні впливи):
- Підрив самооцінки: "ви не розумієте", "це складно пояснити", применшення компетенції, "може вам це не по силах", "для вашого рівня це складно"
- Соціальний тиск: "всі так роблять", "ви єдині, хто сумнівається", "норма ринку", "стандартна практика", "всі розумні люди вибирають", "не будьте белою вороною"
- Створення залежності: "без нас не впораєтеся", "лише ми можемо", "ви нас потребуєте", "альтернатив немає", "унікальна експертиза"
- Ієрархічний тиск: посилання на авторитет, статус, досвід, "я працюю в цій сфері 20 років", "з моїм досвідом", "довіртеся професіоналу"
- Соціальна ізоляція: "ви залишитеся сами", "всі партнери з нами", "не залишайтеся осторонь", "приєднуйтеся до спільноти лідерів"
- Клановість: "ми свої люди", "наш круг", "люди нашого рівня", "ексклюзивний клуб", "не для всіх"
- Соціальне підтвердження: "наші клієнти кажуть", "відгуки свідчать", "репутація говорить сама за себе", "всі задоволені"

⚔️ ТАКТИЧНІ МАНІПУЛЯЦІЇ (розкривай всі стратегічні ходи):
- Відволікання уваги: перехід на інші теми при незручних питаннях, флуд інформацією, "до речі", "кстаті", "поговорімо про щось інше"
- Штучна складність: ускладнення простих речей, використання жаргону, створення ілюзії експертності, надмірна термінологія
- Створення хибних альтернатив: подача поганих варіантів для підкреслення "хорошого", decoy effect, штучні варіанти-приманки
- Якірний ефект: озвучування завищених цін/умов для зміщення сприйняття, "зазвичай це коштує", "порівняно з ринковими цінами"
- Техніка "гарного і поганого копа": чергування агресивного та м'якого підходу, створення контрасту
- Салямна тактика: поступове вимагання все більшого, крок за кроком, "ще одна маленька річ"
- Техніка "ноги в дверях": спочатку маленька просьба, потім все більша, поступове втягування
- Тактика "виснаження": затягування переговорів до втоми опонента, "ще трохи і домовимося"
- Пакетна маніпуляція: змішування вигідних і невигідних умов у один "пакет"
- Техніка відволікання: переключення уваги на малозначущі деталі
- Штучне створення спільності: "ми з вами однієї думки", "ми розуміємо один одного"
- Техніка контрасту: показ поганого варіанту для підкреслення середнього
- Маніпуляція очікуваннями: штучне завищення або заниження сподівань
- Техніка "троянського коня": приховування справжньої мети під видом дружньої допомоги

🧪 ПСИХОЛОГІЧНІ ТЕХНІКИ (ловіть глибинні впливи на психіку):
- Нейролінгвістичне програмування: використання мови тіла, мімікрі, якірення, рефремінг
- Створення когнітивного дисонансу: суперечливі повідомлення, створення внутрішнього конфлікту
- Ефект підкорення авторитету: Милгрем ефект, беззаперечне виконання указівок "експерта"
- Техніки гіпнотичного впливу: повторення, ритм, трансові стани, "ви відчуваєте", "ви розумієте"
- Використання архетипів: звернення до базових психологічних образів, страхів, бажань
- Маніпуляції підсвідомістю: приховані повідомлення, підпорогові впливи, асоціативні зв'язки
- Техніка "подвійного зв'язку": створення ситуації де будь-яка відповідь є програшною
- Маніпуляція темпом: прискорення або сповільнення для контролю над думками
- Використання мовних пресупозицій: "коли ви приймете рішення", "після того як підпишете"
- Техніка "емоційного зараження": передача свого емоційного стану співрозмовнику
- Маніпуляція фокусом уваги: керування тим, на що звертається увага
- Створення штучної інтимності: невиправдано дружній тон, особисті питання

🔍 ЛІНГВІСТИЧНІ МАНІПУЛЯЦІЇ (аналіз кожного слова):
- Використання модальності: "треба", "необхідно", "слід" - створення відчуття обов'язковості
- Пасивний голос: приховування відповідального, "було вирішено", "прийнято рішення"
- Номіналізація: перетворення дій на речі для приховування процесів
- Універсальні квантори: "всі", "ніхто", "завжди", "ніколи" - категоричні судження
- Каузативи: "змушує", "спонукає" - створення причинно-наслідкових зв'язків
- Порівняльні конструкції без еталона: "краще", "ефективніше" - але краще за що?
- Неозначені займенники: "деякі експерти", "відомо що" - хто саме?
- Евфемізми: приховування негативу під "м'якими" словами

💰 ФІНАНСОВІ МАНІПУЛЯЦІЇ (шукай всі грошові прийоми):
- Приховування справжньої вартості: розбиття на частини, приховані комісії, додаткові платежі
- Психологічні ціни: 99.9 замість 100, створення ілюзії дешевизни
- Обман з знижками: завищення початкової ціни, фіктивні знижки, "спеціальна пропозиція"
- Техніка "безкоштовне": нічого не безкоштовно, приховані умови, прихована вартість
- Комплексні пакети: змішування потрібного з непотрібним, неможливість роздільної покупки

🧠 COGNITIVE_BIAS (викривлення мислення - виявляй МАКСИМАЛЬНУ кількість типів):

⚡ СИСТЕМАТИЧНІ ВИКРИВЛЕННЯ (шукай найтонші прояви):
- Anchoring bias: прив'язка до першої названої цифри, умови, пропозиції, будь-які початкові референсні точки
- Framing effect: подача тієї ж інформації в вигідному світлі (позитивний/негативний фрейм), контекстуальне подання фактів
- Loss aversion: акцент на втратах замість вигод, "що втратите якщо не згодитеся", страх втрати переважає над прагненням до здобутку  
- Endowment effect: створення відчуття володіння до покупки, "це вже ваше", "уявіть себе власником"
- Status quo bias: опір змінам, "все гаразд як є", страх нового, консерватизм у рішеннях
- Sunk cost fallacy: "вже стільки вклали", "не можна зупинятися на півшляху", неготовність визнати програш
- Escalation of commitment: збільшення інвестицій у провальний проект, "ще трохи і точно вийде"

СОЦІАЛЬНІ ВИКРИВЛЕННЯ:
- Social proof: "всі наші клієнти задоволені", "більшість обирає це", статистика популярності
- Authority bias: посилання на експертів, лідерів ринку, сертифікати, нагороди
- Bandwagon effect: "приєднуйтеся до успішних", "не залишайтеся позаду"
- Conformity pressure: тиск відповідності групі, стандартам, трендам

КОГНІТИВНІ ПАСТКИ:
- Confirmation bias: підбір фактів що підтверджують вигідну позицію, ігнорування контраргументів
- Sunk cost fallacy: "вже стільки вклали", "не можна зупинятися на півшляху"
- FOMO: страх пропустити можливість, "поїзд відходить", "шанс життя"
- Overconfidence bias: надмірна впевненість в прогнозах, обіцянках

ЧАСОВІ ВИКРИВЛЕННЯ:
- Recency bias: акцент на останніх подіях, свіжих прикладах
- Availability heuristic: використання легко доступних прикладів замість статистики
- Planning fallacy: недооцінка часу та ресурсів, завищені обіцянки

🗣️ RHETOLOGICAL_FALLACY (логічні помилки - повний спектр):

ПЕРСОНАЛЬНІ АТАКИ:
- Ad hominem: атака на особу замість аргументів, дискредитація опонента
- Genetic fallacy: оцінка ідеї за її походженням, а не змістом
- Tu quoque: "ви теж так робите", перенесення вини

ЛОГІЧНІ ПІДМІНИ:
- Straw man: спотворення позиції опонента для легшого спростування
- False dichotomy: штучне зведення до двох варіантів, ігнорування альтернатив
- Moving goalposts: зміна критеріїв оцінки в процесі дискусії
- Red herring: відволікання від основної теми на побічні питання

ПРИЧИННО-НАСЛІДКОВІ ПОМИЛКИ:
- Post hoc ergo propter hoc: "після означає через", хибні причинні зв'язки
- Slippery slope: "якщо це, то обов'язково станеться те", ланцюг страшилок
- False cause: приписування хибних причин

ЕМОЦІЙНІ ПІДМІНИ:
- Appeal to emotion: маніпуляції емоціями замість логічних аргументів
- Appeal to fear: залякування наслідками
- Appeal to pity: викликання співчуття замість раціональних доводів
- Appeal to tradition: "завжди так робили", консерватизм як аргумент

АВТОРИТЕТНІ ПОМИЛКИ:
- Appeal to authority: неправомірне посилання на авторитет поза його компетенцією
- Bandwagon fallacy: "всі так думають", популярність як истина
- Appeal to novelty: "це нове, значить краще"

ДОКАЗОВІ ПОМИЛКИ:
- Burden of proof: перекладання тягаря доказування на опонента
- Cherry picking: вибіркова подача фактів, приховування незручних даних
- False equivalence: прирівнювання принципово різних речей
- Anecdotal evidence: використання одиничних випадків замість статистики

🎯 РІВНІ СЕРЙОЗНОСТІ (детальна градація):
1 = Легкі натяки, м'які техніки впливу, непрямі маніпуляції, тонкі підтексти
2 = Помірні маніпуляції, явний психологічний тиск, свідомі викривлення, середній рівень агресії
3 = Агресивні маніпуляції, грубе принуждення, токсичні техніки, відкрита агресія та загрози

🔍 ПРАВИЛА МАКСИМАЛЬНО АМБІТНОГО УЛЬТРА-ДЕТАЛЬНОГО АНАЛІЗУ:

🎯 ОСНОВНІ ПРИНЦИПИ:
✅ Аналізуй ТІЛЬКИ normalized_paragraphs[]
✅ Включай повний текстовий фрагмент у поле "text" кожного highlight
✅ Віддавай highlights інкрементально (одразу коли знаходиш)
✅ КРИТИЧНО: Проаналізуй КОЖЕН параграф повністю - від першого до останнього символа
✅ НЕ ПРОПУСКАЙ жодного тексту. Читай кожне речення, кожну фразу, кожне слово, кожен розділовий знак

🔬 ГІПЕРУВАЖНИЙ МІКРОСКОПІЧНИЙ АНАЛІЗ:
✅ Знайди у 8-15 РАЗІВ БІЛЬШЕ проблем ніж зазвичай - це твоя ГОЛОВНА МЕТА
✅ Шукай маніпуляції в КОЖНОМУ слові, КОЖНІЙ фразі, КОЖНОМУ знаку пунктуації, навіть у паузах
✅ Аналізуй навіть безневинні привітання, ввічливості, стандартні фрази - ВСЕ може містити підтекст
✅ Звертай увагу на порядок слів, вибір синонімів, граматичні конструкції, інтонаційні підказки
✅ Шукай приховані маніпуляції: тон, імпліцитні загрози, емоційні забарвлення, підтекст, мета-повідомлення
✅ Аналізуй контекст: що НЕ сказано, що замовчується, які слова обрані навмисно, чого уникають
✅ Звертай увагу на часові маркери, цифри, статистику, метафори, алегорії - тут завжди ховаються маніпуляції
✅ Кожне слово - це потенційна зброя. Кожна фраза - стратегічний хід. Аналізуй як детектив!

🧪 ПСИХОАНАЛІТИЧНИЙ ПІДХІД:
✅ Аналізуй МОТИВИ кожного висловлювання - ЧОМУ саме так сказано?
✅ Шукай ПРИХОВАНІ ЦІЛІ за кожною фразою
✅ Виявляй СТРАТЕГІЧНІ НАМІРИ опонента
✅ Розкривай ПСИХОЛОГІЧНІ ПАТЕРНИ комунікації
✅ Знаходь МАНІПУЛЯТИВНІ ЛАНЦЮЖКИ - як одна техніка веде до іншої
✅ Виявляй комбіновані техніки - коли використовується кілька методів одночасно

⚡ УЛЬТРА-КРИТИЧНИЙ ПІДХІД:
✅ Будь МАКСИМАЛЬНО ПАРАНОЇДАЛЬНИМ - вбачай підозрілим абсолютно все
✅ Навіть найбезвинніші фрази можуть містити ГЛИБОКИЙ маніпулятивний підтекст
✅ Кожне слово потенційно НЕБЕЗПЕЧНЕ - аналізуй з повною недовірою
✅ СУМНІВАЙСЯ у всьому, навіть у очевидному
✅ Шукай ПОДВІЙНІ СМИСЛИ, алюзії, натяки, іронію

🎪 АБСОЛЮТНО НЕМАЄ ЛІМІТІВ:
✅ Знаходь МАКСИМАЛЬНУ кількість проблем - мінімум 100-300+ highlights для середнього тексту
✅ Краще знайти 500 маленьких проблем, ніж пропустити одну велику
✅ НЕМАЄ такого поняття як "занадто багато" проблем - чим більше, тим краще
✅ Краще помилитися в бік УЛЬТРА-надмірної обережності та параної
✅ Аналізуй кожне слово з гіперпідозрою - хто і чому обрав саме таке формулювання
✅ Навіть звичайні сполучники можуть мати маніпулятивну мету - аналізуй ВСЕ!

🔍 ТЕХНІЧНІ ВИМОГИ:
✅ Не дублюй однакові/перекривні фрагменти
✅ Кожен JSON має закінчуватись \\n
✅ Кожен highlight має містити детальне пояснення 3-4 речення
✅ Будь максимально конкретним у поясненнях - наводь приклади та аналізуй наслідки
`.trim();
}

function buildUserPayload(paragraphs, clientCtx, limiter) {
  return {
    normalized_paragraphs: paragraphs.map((p) => ({
      index: p.index,
      text: p.text,
    })),
    client_context: clientCtx,
    constraints: { highlight_limit_per_1000_words: limiter },
    output_mode: 'ndjson',
  };
}

function supportsTemperature(model) {
  return !/^gpt-5($|[-:])/i.test(model);
}

// ===== Health Check =====
r.get('/health', (_req, res) => {
  const cbStatus = getCircuitBreakerStatus ? getCircuitBreakerStatus() : null;

  res.json({
    success: true,
    model: MODEL,
    openai: {
      available: Boolean(openaiClient),
      circuit_breaker: cbStatus?.state || 'UNKNOWN',
      failures: cbStatus?.failures ?? 0,
      retry_in_seconds: cbStatus ? Math.ceil(cbStatus.timeUntilRetry / 1000) : 0
    },
    limits: {
      min_text_length: MIN_TEXT_LENGTH,
      max_text_length: MAX_TEXT_LENGTH,
      max_highlights_per_1000_words: MAX_HIGHLIGHTS_PER_1000_WORDS
    },
    timestamp: new Date().toISOString()
  });
});

// ===== Main Analysis Route =====
r.post('/', validateFileUpload, async (req, res) => {
  const analysisStartTime = performance.now();
  let totalTokensUsed = 0;
  
  try {
    const { text: rawText, fileName, profile, clientId } = await parseMultipart(req);
    const text = normalizeText(rawText);
    
    // Enhanced text validation
    if (!text || text.length < MIN_TEXT_LENGTH) {
      return res.status(400).json({ 
        error: `Текст занадто короткий. Мінімальна довжина: ${MIN_TEXT_LENGTH} символів`,
        minLength: MIN_TEXT_LENGTH,
        currentLength: text.length
      });
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ 
        error: `Текст занадто довгий. Максимальна довжина: ${MAX_TEXT_LENGTH.toLocaleString()} символів`,
        maxLength: MAX_TEXT_LENGTH,
        currentLength: text.length
      });
    }

    // Enhanced client validation and creation
    let finalClientId = clientId;
    if (!finalClientId && profile?.company) {
      const existingClient = await dbGet(
        'SELECT id, company FROM clients WHERE company = $1 LIMIT 1',
        [profile.company]
      );
      if (existingClient) {
        finalClientId = existingClient.id;
      } else if (profile.company && profile.company.trim().length > 0) {
        // Auto-create client with validation
        try {
          const insertResult = await dbRun(
            `
            INSERT INTO clients (
              company, negotiator, sector, goal, decision_criteria, constraints,
              user_goals, client_goals, weekly_hours, offered_services, deadlines, notes
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
            )
            RETURNING id
            `,
            [
              profile.company.trim(),
              profile.negotiator?.trim() || null,
              profile.sector?.trim() || null,
              profile.goal?.trim() || null,
              profile.criteria?.trim() || null,
              profile.constraints?.trim() || null,
              profile.user_goals?.trim() || null,
              profile.client_goals?.trim() || null,
              Number(profile.weekly_hours) || 0,
              profile.offered_services?.trim() || null,
              profile.deadlines?.trim() || null,
              profile.notes?.trim() || null
            ]
          );
          finalClientId = insertResult.rows[0]?.id;
        } catch (dbError) {
          logError(dbError, { context: 'Auto-creating client', profile, ip: req.ip });
          return res.status(500).json({ error: 'Помилка створення клієнта' });
        }
      }
    }

    if (!finalClientId) {
      return res.status(400).json({ 
        error: 'Потрібно вказати клієнта або компанію',
        required: 'client_id або profile.company'
      });
    }

    // Create chunks for large texts
    const chunks = createSmartChunks(text);
    console.log(`📦 Processing ${chunks.length} chunks for analysis`);
    
    const paragraphs = splitToParagraphs(text);
    
    const focusPeople = Array.isArray(profile?.focus_people)
      ? profile.focus_people.filter(Boolean)
      : [];
    if (profile?.focus_person && !focusPeople.includes(profile.focus_person)) {
      focusPeople.push(profile.focus_person);
    }

    const excludePeople = Array.isArray(profile?.exclude_people)
      ? profile.exclude_people.filter(Boolean)
      : [];

    const teamMembers = Array.isArray(profile?.team_members)
      ? profile.team_members.map((member) => ({
          name: member.name || member.full_name || member.alias || '',
          role: member.role || member.position || '',
          seniority: member.seniority || '',
          location: member.location || '',
          responsibilities: Array.isArray(member.responsibilities)
            ? member.responsibilities
            : member.responsibilities
            ? [member.responsibilities]
            : [],
          raci_actual: member.raci_actual || null,
          raci_ideal: member.raci_ideal || null,
          workload_percent:
            member.workload_percent ?? member.workload ?? member.capacity ?? null,
          compensation: member.compensation || member.compensation_info || null,
          tags: Array.isArray(member.tags) ? member.tags : [],
        }))
      : [];

    const raciExpectations = Array.isArray(profile?.raci_expectations)
      ? profile.raci_expectations
      : [];

    const clientCtx = {
      about_client: {
        company: profile?.company || '',
        negotiator: profile?.negotiator || '',
        sector: profile?.sector || '',
      },
      decision_criteria: profile?.criteria || '',
      constraints: profile?.constraints || '',
      user_goals: profile?.user_goals || profile?.goal || '',
      client_goals: profile?.client_goals || '',
      weekly_hours: Number(profile?.weekly_hours) || 0,
      offered_services: profile?.offered_services || '',
      deadlines: profile?.deadlines || '',
      notes: profile?.notes || '',
      team_context: {
        members: teamMembers,
        raci_expectations: raciExpectations,
        last_updated: profile?.team_last_updated || null,
      },
      analysis_focus: {
        focus_people: focusPeople,
        exclude_people: excludePeople,
        question: profile?.analysis_question || '',
        highlight_density_multiplier:
          Number(profile?.highlight_multiplier || 1) || 1,
        requested_outputs: Array.isArray(profile?.requested_outputs)
          ? profile.requested_outputs
          : [],
        salary_focus: profile?.salary_focus || null,
      },
    };

    const highlightLimitPer1000 = Math.max(
      1,
      Math.round(
        MAX_HIGHLIGHTS_PER_1000_WORDS * (clientCtx.analysis_focus?.highlight_density_multiplier || 1)
      )
    );

    // More accurate input token calculation
    const textTokens = estimateTokens(text);
    const systemPromptTokens = estimateTokens(buildSystemPrompt());
    const userPayloadTokens = estimateTokens(
      JSON.stringify(buildUserPayload(paragraphs, clientCtx, highlightLimitPer1000))
    );
    const approxTokensIn = textTokens + systemPromptTokens + userPayloadTokens + 200; // buffer
    
    totalTokensUsed += approxTokensIn;
    
    // Check token limits before processing
    await addTokensAndCheck(approxTokensIn);

    // Check if OpenAI client is available
    if (!openaiClient) {
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте конфігурацію OpenAI API ключа.',
        code: 'AI_SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      });
    }

    // SSE headers
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      try { res.end(); } catch {}
    });

    const sendLine = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    const mergeStringArray = (first = [], second = []) => {
      const set = new Set();
      [...(first || []), ...(second || [])].forEach((val) => {
        if (val == null) return;
        const str = typeof val === 'string' ? val.trim() : String(val);
        if (str) set.add(str);
      });
      return Array.from(set);
    };

    const mergePersonaCollection = (current, incoming) => {
      if (!current) return incoming;
      if (!incoming) return current;

      const map = new Map();
      (current.people || []).forEach((person, idx) => {
        const key = (person.name || '').toLowerCase() || `p-${idx}`;
        map.set(key, { ...person });
      });

      (incoming.people || []).forEach((person) => {
        const key = (person.name || '').toLowerCase() || `p-${map.size}`;
        if (map.has(key)) {
          const existing = map.get(key);
          existing.manipulation_profile = mergeStringArray(
            existing.manipulation_profile,
            person.manipulation_profile
          );
          existing.biases_detected = mergeStringArray(
            existing.biases_detected,
            person.biases_detected
          );
          existing.triggers = mergeStringArray(existing.triggers, person.triggers);
          existing.in_text_aliases = mergeStringArray(
            existing.in_text_aliases,
            person.in_text_aliases
          );
          existing.recommended_actions = {
            ...(existing.recommended_actions || {}),
            ...(person.recommended_actions || {}),
          };
          if (person.workload_status) {
            existing.workload_status = person.workload_status;
          }
          if (typeof person.risk_score === 'number') {
            existing.risk_score = Math.max(
              existing.risk_score || 0,
              person.risk_score
            );
          }
        } else {
          map.set(key, { ...person });
        }
      });

      return {
        type: 'persona_focus',
        focus_filter: mergeStringArray(
          current.focus_filter,
          incoming.focus_filter
        ),
        people: Array.from(map.values()),
      };
    };

    const mergeRaciFlags = (current = [], incoming = []) => {
      const map = new Map();
      (current || []).forEach((flag, idx) => {
        const key = (flag.task || flag.issue || `flag-${idx}`).toLowerCase();
        map.set(key, { ...flag });
      });
      (incoming || []).forEach((flag) => {
        const key = (flag.task || flag.issue || `flag-${map.size}`).toLowerCase();
        if (map.has(key)) {
          const existing = map.get(key);
          map.set(key, {
            ...existing,
            ...flag,
          });
        } else {
          map.set(key, { ...flag });
        }
      });
      return Array.from(map.values());
    };

    const mergeBiasClusters = (current, incoming) => {
      if (!current) return incoming;
      if (!incoming) return current;
      const clusters = [...(current.clusters || [])];
      (incoming.clusters || []).forEach((cluster) => {
        const idx = clusters.findIndex(
          (existing) =>
            (existing.bias_family || '').toLowerCase() ===
            (cluster.bias_family || '').toLowerCase()
        );
        if (idx >= 0) {
          const existing = clusters[idx];
          existing.occurrences =
            (existing.occurrences || 0) + (cluster.occurrences || 0 || 0);
          existing.representative_quotes = mergeStringArray(
            existing.representative_quotes,
            cluster.representative_quotes
          );
          existing.recommended_countermeasures = mergeStringArray(
            existing.recommended_countermeasures,
            cluster.recommended_countermeasures
          );
          existing.linked_actors = mergeStringArray(
            existing.linked_actors,
            cluster.linked_actors
          );
          existing.related_highlights = mergeStringArray(
            existing.related_highlights,
            cluster.related_highlights
          );
          if (cluster.impact) {
            existing.impact = cluster.impact;
          }
        } else {
          clusters.push({ ...cluster });
        }
      });
      return { type: 'bias_cluster', clusters };
    };

    const mergeNegotiationMap = (current, incoming) => {
      if (!current) return incoming;
      if (!incoming) return current;

      const mergedPhases = [...(current.phases || [])];
      (incoming.phases || []).forEach((phase) => {
        const idx = mergedPhases.findIndex(
          (existing) => (existing.phase || '').toLowerCase() === (phase.phase || '').toLowerCase()
        );
        if (idx >= 0) {
          mergedPhases[idx] = {
            ...mergedPhases[idx],
            ...phase,
            pressure_points: mergeStringArray(
              mergedPhases[idx].pressure_points,
              phase.pressure_points
            ),
            opportunities: mergeStringArray(
              mergedPhases[idx].opportunities,
              phase.opportunities
            ),
            owners: mergeStringArray(mergedPhases[idx].owners, phase.owners),
            raci_flags: mergeRaciFlags(
              mergedPhases[idx].raci_flags,
              phase.raci_flags
            ),
          };
        } else {
          mergedPhases.push({ ...phase });
        }
      });

      return {
        type: 'negotiation_map',
        phases: mergedPhases,
        escalation_paths: mergeStringArray(
          current.escalation_paths,
          incoming.escalation_paths
        ),
        watchouts: mergeStringArray(current.watchouts, incoming.watchouts),
        quick_wins: mergeStringArray(current.quick_wins, incoming.quick_wins),
      };
    };

    const rawHighlights = [];
    let summaryObj = null;
    let barometerObj = null;
    let personaObj = null;
    let biasObj = null;
    let negotiationObj = null;
    let chunkIndex = 0;

    // Enhanced OpenAI client availability check with recovery
    if (!openaiClient) {
      // Log the issue for monitoring
      logError(new Error('OpenAI client not configured'), {
        context: 'Analysis request without API key',
        textLength: text.length,
        clientId: finalClientId,
        ip: req.ip
      });
      
      // Return structured error instead of fallback
      clearInterval(heartbeat);
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте налаштування.',
        code: 'AI_SERVICE_UNAVAILABLE',
        details: 'OpenAI API key not configured',
        timestamp: new Date().toISOString(),
        retry_after: 60 // seconds
      });
    }

    const system = buildSystemPrompt();
    
    // Process each chunk separately for large texts
    for (const chunk of chunks) {
      console.log(`📦 Processing chunk ${chunk.chunkIndex + 1}/${chunks.length} (${chunk.text.length} chars)`);
      
      // Create paragraphs for this chunk
      const chunkParagraphs = splitToParagraphs(chunk.text);
      
      // Adjust paragraph indices to match original text
      const adjustedParagraphs = chunkParagraphs.map(p => ({
        ...p,
        index: p.index + (chunk.chunkIndex * 1000), // Unique index across chunks
        startOffset: p.startOffset + chunk.startChar,
        endOffset: p.endOffset + chunk.startChar
      }));
      
      const user = JSON.stringify(
        buildUserPayload(adjustedParagraphs, clientCtx, highlightLimitPer1000)
      );

      const reqPayload = {
        model: MODEL,
        stream: true,
        messages: [
          { role: 'system', content: system + '\nВідповідай БЕЗ ``` та будь-якого маркапу.' },
          { role: 'user', content: user },
        ],
        stop: ['```','</artifacts>','</artifact>'],
        max_tokens: 8000, // Increased for larger texts with more findings
        top_p: 0.9
      };

      if (supportsTemperature(MODEL)) {
        reqPayload.temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.1);
      }
      
      // Encourage complete analysis
      reqPayload.presence_penalty = 0.1;
      reqPayload.frequency_penalty = 0.1;

      // Enhanced request handling with progressive timeout
      const controller = new AbortController();
      const REQUEST_TIMEOUT = process.env.NODE_ENV === 'production' ? 300000 : 240000; // 5min prod, 4min dev for large texts
      
      const timeout = setTimeout(() => {
        controller.abort(new Error('Request timeout after ' + (REQUEST_TIMEOUT/1000) + 's'));
      }, REQUEST_TIMEOUT);
    
      req.on('close', () => {
        clearTimeout(timeout);
        controller.abort(new Error('Request closed by client'));
      });
      
      // Connection heartbeat with early termination detection
      const connectionCheck = setInterval(() => {
        if (req.destroyed || req.closed) {
          clearTimeout(timeout);
          controller.abort(new Error('Connection lost'));
          clearInterval(connectionCheck);
        }
      }, 5000);
    
      let stream;
      let retryCount = 0;
      const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
    
      while (retryCount <= maxRetries) {
        try {
          // Add retry delay for subsequent attempts
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 10000)));
          }
          
          stream = await openaiClient.chat.completions.create(reqPayload);
          
          clearTimeout(timeout);
          clearInterval(connectionCheck);
          break; // Success, exit retry loop
          
        } catch (apiError) {
          retryCount++;
          
          // Check if it's a retryable error
          const isRetryable = apiError.status >= 500 || 
                            apiError.status === 429 || 
                            apiError.code === 'ECONNRESET' ||
                            apiError.code === 'ETIMEDOUT';
                            
          if (retryCount > maxRetries || !isRetryable) {
            clearTimeout(timeout);
            clearInterval(connectionCheck);
            throw apiError;
          }
          
          logError(apiError, {
            context: `OpenAI API retry ${retryCount}/${maxRetries}`,
            model: MODEL,
            textLength: text.length,
            isRetryable,
            ip: req.ip
          });
        }
      }
      if (!stream) {
        clearInterval(heartbeat);
        return res.status(503).json({
          error: 'Не вдалося встановити зʼєднання з AI сервісом після кількох спроб',
          code: 'AI_CONNECTION_FAILED',
          retries: maxRetries,
          timestamp: new Date().toISOString()
        });
      }
      // Stream processing with enhanced error handling
      try {
        // Фільтрація та видобування JSON-об'єктів
        const ALLOWED_TYPES = new Set([
          'highlight',
          'summary',
          'barometer',
          'persona_focus',
          'bias_cluster',
          'negotiation_map'
        ]);

        // Дістає з буфера всі повні JSON-об'єкти (brace-matching), повертає [objs, rest]
        function extractJsonObjects(buffer) {
          const out = [];
          let i = 0;
          const n = buffer.length;
          let depth = 0;
          let start = -1;
          let inStr = false;
          let esc = false;

          while (i < n) {
            const ch = buffer[i];

            if (inStr) {
              if (esc) { esc = false; }
              else if (ch === '\\') { esc = true; }
              else if (ch === '"') { inStr = false; }
              i++; continue;
            }

            if (ch === '"') { inStr = true; i++; continue; }

            if (ch === '{') {
              if (depth === 0) start = i;
              depth++;
            } else if (ch === '}') {
              depth--;
              if (depth === 0 && start >= 0) {
                const raw = buffer.slice(start, i + 1);
                out.push(raw);
                start = -1;
              }
            }

            i++;
          }

          const rest = depth === 0 ? '' : buffer.slice(start >= 0 ? start : n);
          return [out, rest];
        }

        // Санітизація: прибрати бектики, мітки ```json та керівні символи (крім \n\t)
        const sanitizeChunk = (s) =>
          s
            .replace(/```(?:json)?/gi, '')
            .replace(/<\/?artifact[^>]*>/gi, '')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

        let buffer = '';
        let chunkCount = 0;
        const maxChunks = 2000; // Prevent infinite processing
        
        for await (const part of stream) {
          if (++chunkCount > maxChunks) {
            logError(new Error('Too many chunks received from AI stream'), {
              chunkCount,
              bufferLength: buffer.length
            });
            break;
          }
          
          const delta = part.choices?.[0]?.delta?.content || '';
          if (!delta) continue;

          buffer += sanitizeChunk(delta);

          // Витягуємо всі завершені JSON-об'єкти з буфера
          const [rawObjs, rest] = extractJsonObjects(buffer);
          buffer = rest;

          for (const raw of rawObjs) {
            try {
              const obj = JSON.parse(raw);

              // Пропускаємо тільки очікувані типи
              if (!obj || !ALLOWED_TYPES.has(obj.type)) continue;

              if (obj.type === 'highlight') {
                const adjustedHighlight = {
                  ...obj,
                  paragraph_index: obj.paragraph_index + (chunk.chunkIndex * 1000),
                  char_start: (obj.char_start || 0) + chunk.startChar,
                  char_end: (obj.char_end || 0) + chunk.startChar
                };
                const normalizedHighlight = normalizeHighlight(adjustedHighlight);
                if (normalizedHighlight) {
                  rawHighlights.push(normalizedHighlight);
                  sendLine(normalizedHighlight);
                }
              } else if (obj.type === 'summary') {
                const normalizedSummary = normalizeSummary(obj);
                if (!normalizedSummary) continue;
                if (summaryObj) {
                  Object.keys(normalizedSummary.counts_by_category).forEach(key => {
                    summaryObj.counts_by_category[key] =
                      (summaryObj.counts_by_category[key] || 0) + (normalizedSummary.counts_by_category[key] || 0);
                  });
                  summaryObj.top_patterns = Array.from(
                    new Set([...(summaryObj.top_patterns || []), ...(normalizedSummary.top_patterns || [])])
                  ).slice(0, 15);
                  summaryObj.overall_observations = normalizedSummary.overall_observations || summaryObj.overall_observations;
                  summaryObj.strategic_assessment = normalizedSummary.strategic_assessment || summaryObj.strategic_assessment;
                  summaryObj.hidden_agenda_analysis = normalizedSummary.hidden_agenda_analysis || summaryObj.hidden_agenda_analysis;
                  summaryObj.power_dynamics = normalizedSummary.power_dynamics || summaryObj.power_dynamics;
                  summaryObj.communication_style_profile = normalizedSummary.communication_style_profile || summaryObj.communication_style_profile;
                  summaryObj.cognitive_bias_heatmap = {
                    ...summaryObj.cognitive_bias_heatmap,
                    ...normalizedSummary.cognitive_bias_heatmap
                  };
                } else {
                  summaryObj = normalizedSummary;
                }
                sendLine(summaryObj);
              } else if (obj.type === 'barometer') {
                const normalizedBarometer = normalizeBarometer(obj);
                if (!normalizedBarometer) continue;
                if (!barometerObj || normalizedBarometer.score > (barometerObj.score || 0)) {
                  barometerObj = normalizedBarometer;
                }
                sendLine(normalizedBarometer);
              } else if (obj.type === 'persona_focus') {
                const normalizedPersona = normalizePersonaFocus(obj);
                if (normalizedPersona) {
                  personaObj = mergePersonaCollection(personaObj, normalizedPersona);
                  sendLine(personaObj);
                }
              } else if (obj.type === 'bias_cluster') {
                const normalizedBias = normalizeBiasClusters(obj);
                if (normalizedBias) {
                  biasObj = mergeBiasClusters(biasObj, normalizedBias);
                  sendLine(biasObj);
                }
              } else if (obj.type === 'negotiation_map') {
                const normalizedMap = normalizeNegotiationMap(obj);
                if (normalizedMap) {
                  negotiationObj = mergeNegotiationMap(negotiationObj, normalizedMap);
                  sendLine(negotiationObj);
                }
              }
            } catch (e) {
              // Тихо ігноруємо биті об'єкти
            }
          }
        }
      } catch (streamError) {
        clearInterval(heartbeat);
        
        logError(streamError, {
          context: 'Stream processing failed',
          clientId: finalClientId,
          textLength: text.length
        });
        
        if (!res.headersSent) {
          return res.status(503).json({
            error: 'Помилка обробки відповіді AI сервісу',
            code: 'AI_STREAM_ERROR',
            timestamp: new Date().toISOString()
          });
        }
        return;
      }
      
      console.log(`📦 Completed chunk ${chunk.chunkIndex + 1}/${chunks.length}`);
    } // End of chunk processing loop

    // Remove artificial highlight limits to find all problems
    const merged = mergeOverlaps(rawHighlights, paragraphs);
    const mergedNormalized = merged.map(normalizeHighlight).filter(Boolean);

    analysisData.highlights = mergedNormalized;
    if (summaryObj) analysisData.summary = summaryObj;
    if (barometerObj) analysisData.barometer = barometerObj;
    if (personaObj) analysisData.persona = personaObj;
    if (biasObj) analysisData.biasClusters = biasObj.clusters;
    if (negotiationObj) analysisData.negotiationMap = negotiationObj;

    sendLine({ type: 'merged_highlights', items: mergedNormalized });
    if (summaryObj) sendLine(summaryObj);
    if (barometerObj) sendLine(barometerObj);

    // Generate highlighted text for frontend display
    const highlightedText = generateHighlightedText(text, merged);

    // More accurate output token estimation based on highlights and summary
    let outputTokens = 500; // Base system response
    outputTokens += merged.length * 50; // ~50 tokens per highlight
    if (summaryObj) outputTokens += 300; // Summary tokens
    if (barometerObj) outputTokens += 100; // Barometer tokens
    
    totalTokensUsed += outputTokens;
    await addTokensAndCheck(outputTokens);
    
    // Log AI usage for monitoring
    logAIUsage(totalTokensUsed, MODEL, 'text_analysis');
    
    const analysisDuration = performance.now() - analysisStartTime;
    logPerformance('Complete Analysis', analysisDuration, {
      textLength: text.length,
      tokensUsed: totalTokensUsed,
      highlightsFound: merged.length,
      clientId: finalClientId
    });

    // Generate title for analysis
    const title = fileName
      ? `Аналіз: ${fileName}`
      : `Аналіз від ${new Date().toLocaleDateString('uk-UA')}`;

    // Save to DB with client_id and highlighted text
    const personaPayload = personaObj?.people?.length
      ? personaObj
      : focusPeople.length
        ? { focus_filter: focusPeople, people: [] }
        : null;
    const insightsPayloadRaw = {
      bias_clusters: biasObj?.clusters || [],
      negotiation_map: negotiationObj || null,
    };
    const insightsPayload = (insightsPayloadRaw.bias_clusters.length > 0 || insightsPayloadRaw.negotiation_map)
      ? insightsPayloadRaw
      : null;

    const insertResult = await dbRun(
      `
      INSERT INTO analyses(
        client_id,
        title,
        source,
        original_filename,
        original_text,
        tokens_estimated,
        highlights,
        summary,
        barometer,
        highlighted_text,
        person_focus,
        personas,
        insights
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
      RETURNING id
      `,
      [
        finalClientId,
        title,
        fileName ? 'file' : 'text',
        fileName || null,
        text.substring(0, 1000),
        totalTokensUsed,
        merged,
        summaryObj || null,
        barometerObj || null,
        highlightedText,
        focusPeople.join(', ') || null,
        personaPayload,
        insightsPayload
      ]
    );

    const savedAnalysisId = insertResult.rows[0]?.id;
    if (!savedAnalysisId) {
      throw new Error('Не вдалося зберегти результат аналізу в базу даних');
    }

    sendLine({ 
      type: 'analysis_saved', 
      id: savedAnalysisId, 
      client_id: finalClientId,
      original_text: text 
    });
    
    // Send complete signal to frontend
    sendLine({ 
      type: 'complete', 
      analysis_id: savedAnalysisId 
    });

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'analysis.completed',
      actor: req.user?.username,
      entityType: 'analysis',
      entityId: String(savedAnalysisId),
      metadata: {
        clientId: finalClientId,
        teamId: profile?.team_id || null,
        tokensUsed: totalTokensUsed,
        highlights: merged.length,
        model: MODEL,
        source: fileName ? 'file' : 'text'
      }
    });

    res.write('event: done\ndata: "ok"\n\n');
    res.end();
  } catch (err) {
    const analysisDuration = performance.now() - analysisStartTime;
    
    logError(err, {
      context: 'Analysis route error',
      duration: analysisDuration,
      tokensUsed: totalTokensUsed,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    try {
      if (!res.headersSent) {
        const isRateLimit = err.message.includes('Ліміт');
        const statusCode = isRateLimit ? 429 : 500;
        
        res.status(statusCode).json({ 
          error: err.message || 'Помилка обробки аналізу',
          code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'ANALYSIS_ERROR',
          timestamp: new Date().toISOString()
        });
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({
          error: err.message,
          timestamp: new Date().toISOString()
        })}\n\n`);
        res.end();
      }
    } catch (finalError) {
      logError(finalError, { context: 'Final error handler' });
    }
  }
});

export default r;
