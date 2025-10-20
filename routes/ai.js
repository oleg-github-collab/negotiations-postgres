/* ============================================
   AI ENDPOINTS - GPT-4o Integration
   Cognitive biases analysis and AI advice
   ============================================ */

import express from 'express';
import { client as openaiClient } from '../utils/openAIClient.js';
import logger from '../utils/logger.js';
import { getPool } from '../utils/db.js';

const pool = getPool();

const router = express.Router();

// ============================================
// MIDDLEWARE: AI API Key Validation
// ============================================

const validateAIAvailability = (req, res, next) => {
  if (!openaiClient) {
    return res.status(503).json({
      error: 'AI features unavailable',
      reason: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
      code: 'AI_NOT_CONFIGURED'
    });
  }
  next();
};

// Apply to all AI routes
router.use(validateAIAvailability);

// ============================================
// COGNITIVE BIASES ANALYSIS
// ============================================

router.post('/analyze-biases', async (req, res) => {
  try {
    const { transcript, analysis_id } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    logger.info(`Analyzing cognitive biases for analysis ${analysis_id}`);

    // Call GPT-4o to analyze cognitive biases
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ти експерт-психолог з когнітивної психології та переговорів. Твоє завдання - виявити когнітивні викривлення в переговорах.

Аналізуй транскрипт і визнач:
1. Які когнітивні викривлення присутні
2. Як вони впливають на переговори
3. Як їх нейтралізувати

Типи викривлень:
- confirmation_bias (підтверджувальна упередженість)
- anchoring (ефект якоря)
- availability_heuristic (евристика доступності)
- sunk_cost_fallacy (ілюзія невідновних витрат)
- framing_effect (ефект обрамлення)
- overconfidence (надмірна впевненість)
- groupthink (групове мислення)
- halo_effect (ефект ореолу)
- recency_bias (ефект новизни)
- status_quo_bias (упередженість статус-кво)

Відповідай ТІЛЬКИ в JSON форматі:
{
  "biases": [
    {
      "type": "тип_викривлення",
      "severity": "low|medium|high|critical",
      "description": "Детальний опис викривлення",
      "quote": "Цитата з транскрипту (опціонально)",
      "impact": "Як це впливає на переговори",
      "mitigation": "Як нейтралізувати"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Проаналізуй цей транскрипт переговорів на когнітивні викривлення:\n\n${transcript}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    let biasesData;
    try {
      biasesData = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      logger.error('Failed to parse biases JSON', { error: parseError });
      // Fallback
      biasesData = { biases: [] };
    }

    // Save to database (optional)
    if (analysis_id) {
      await pool.query(
        'UPDATE negotiations SET cognitive_biases = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(biasesData.biases), analysis_id]
      );
    }

    res.json({
      success: true,
      biases: biasesData.biases || []
    });

  } catch (error) {
    logger.error('Cognitive biases analysis failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to analyze cognitive biases',
      message: error.message
    });
  }
});

// ============================================
// AI ADVICE / ASK QUESTION
// ============================================

router.post('/ask-advice', async (req, res) => {
  try {
    const { question, analysis_id, transcript, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    logger.info(`AI advice requested: "${question.substring(0, 50)}..."`);

    // Build context message
    let contextInfo = '';
    if (context) {
      if (context.company) contextInfo += `Компанія: ${context.company}\n`;
      if (context.negotiator) contextInfo += `Переговорник: ${context.negotiator}\n`;
      if (context.barometer) {
        contextInfo += `\nБарометр адекватності клієнта:\n`;
        contextInfo += `- Комунікація: ${context.barometer.communication_clarity || 'невідомо'}\n`;
        contextInfo += `- Відгук: ${context.barometer.responsiveness || 'невідомо'}\n`;
        contextInfo += `- Ризик: ${context.barometer.risk_level || 'невідомо'}\n`;
      }
    }

    // Call GPT-4o for advice
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ти експерт-консультант з переговорів та продажу B2B. Допомагаєш аналізувати переговори та давати стратегічні поради.

Твої принципи:
- Конкретність: давай чіткі, дієві поради
- Емпатія: розумій позиції обох сторін
- Стратегічність: думай на 2-3 кроки вперед
- Чесність: вказуй на ризики та червоні прапорці
- Практичність: фокусуйся на тому, що можна зробити

Відповідай українською мовою, структуровано, з прикладами та конкретними діями.`
        },
        {
          role: 'user',
          content: `${contextInfo ? `Контекст:\n${contextInfo}\n\n` : ''}${transcript ? `Транскрипт переговорів:\n${transcript.substring(0, 4000)}\n\n` : ''}Питання: ${question}`
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    const advice = completion.choices[0].message.content;

    // Log conversation (optional - for analytics)
    if (analysis_id) {
      await pool.query(
        `INSERT INTO ai_conversations (analysis_id, question, answer, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [analysis_id, question, advice]
      );
    }

    res.json({
      success: true,
      advice,
      answer: advice
    });

  } catch (error) {
    logger.error('AI advice failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to get AI advice',
      message: error.message
    });
  }
});

// ============================================
// MULTIMODAL TEAM UPLOAD
// ============================================

router.post('/process-team-upload', async (req, res) => {
  try {
    const { type, data, client_id } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }

    logger.info(`Processing multimodal team upload: ${type}`);

    let extractedData = {};

    switch (type) {
      case 'audio':
        extractedData = await processAudioTeam(data);
        break;

      case 'image':
        extractedData = await processImageTeam(data);
        break;

      case 'pdf':
        extractedData = await processPDFTeam(data);
        break;

      case 'text':
        extractedData = await processTextTeam(data);
        break;

      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    // Save team to database
    const result = await pool.query(
      `INSERT INTO teams (client_id, name, description, members, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, description, members`,
      [
        client_id,
        extractedData.name || 'Нова команда',
        extractedData.description || '',
        JSON.stringify(extractedData.members || [])
      ]
    );

    res.json({
      success: true,
      team: result.rows[0],
      extracted_data: extractedData
    });

  } catch (error) {
    logger.error('Team upload processing failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to process team upload',
      message: error.message
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function processAudioTeam(audioBase64) {
  try {
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Use Whisper API to transcribe
    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
      language: 'uk'
    });

    const text = transcription.text;

    // Use GPT-4o to extract team structure from transcription
    return await extractTeamFromText(text);

  } catch (error) {
    logger.error('Audio processing failed', { error: error.message });
    throw error;
  }
}

async function processImageTeam(imageBase64) {
  try {
    // Use GPT-4o Vision to extract team structure from image
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ти експерт з розпізнавання організаційних структур. Витягни інформацію про команду з зображення.

Повертай JSON:
{
  "name": "назва команди",
  "description": "опис",
  "members": [
    {
      "name": "ім'я",
      "role": "роль",
      "email": "email (якщо є)",
      "phone": "телефон (якщо є)"
    }
  ]
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Витягни структуру команди з цього зображення'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return JSON.parse(completion.choices[0].message.content);

  } catch (error) {
    logger.error('Image processing failed', { error: error.message });
    throw error;
  }
}

async function processPDFTeam(pdfText) {
  // PDF already converted to text by frontend
  return await extractTeamFromText(pdfText);
}

async function processTextTeam(text) {
  return await extractTeamFromText(text);
}

async function extractTeamFromText(text) {
  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ти експерт з розпізнавання організаційних структур. Витягни інформацію про команду з тексту.

Шукай:
- Назву команди
- Учасників та їх ролі
- Контактну інформацію
- Опис команди

Повертай JSON:
{
  "name": "назва команди",
  "description": "опис",
  "members": [
    {
      "name": "ім'я",
      "role": "роль",
      "email": "email (якщо є)",
      "phone": "телефон (якщо є)"
    }
  ]
}

Якщо структура незрозуміла, створи логічну команду з наявної інформації.`
        },
        {
          role: 'user',
          content: `Витягни структуру команди з цього тексту:\n\n${text}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });

    return JSON.parse(completion.choices[0].message.content);

  } catch (error) {
    logger.error('Text extraction failed', { error: error.message });
    // Fallback
    return {
      name: 'Нова команда',
      description: text.substring(0, 200),
      members: []
    };
  }
}

// ============================================
// SALARY INSIGHTS - AI-powered salary analytics
// ============================================

router.post('/salary-insights', async (req, res) => {
  try {
    const { team_id, members, budget } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({ error: 'Members data is required' });
    }

    logger.info(`Generating AI salary insights for team ${team_id}`);

    const membersData = members.map(m => ({
      role: m.role,
      salary: m.salary,
      experience: m.experience || 'unknown',
      market_value: m.market_value || m.salary
    }));

    const prompt = `Проаналізуй зарплати команди та надай детальні інсайти:

Члени команди:
${JSON.stringify(membersData, null, 2)}

Бюджет:
${JSON.stringify(budget, null, 2)}

Надай JSON відповідь з такими секціями:
{
  "budget_optimization": {
    "summary": "короткий опис можливостей оптимізації (2-3 речення)",
    "recommendations": ["конкретна рекомендація 1", "конкретна рекомендація 2", "..."],
    "confidence": 85,
    "metrics": {
      "potential_savings": "сума економії в грн",
      "efficiency_score": "оцінка ефективності 0-100"
    }
  },
  "salary_fairness": {
    "summary": "оцінка справедливості розподілу зарплат",
    "recommendations": ["рекомендація по вирівнюванню", "..."],
    "confidence": 90,
    "metrics": {
      "fairness_index": "індекс справедливості 0-100",
      "compression_ratio": "співвідношення мін/макс"
    }
  },
  "market_position": {
    "summary": "як зарплати співвідносяться з ринком",
    "recommendations": ["рекомендації по коригуванню", "..."],
    "confidence": 80,
    "metrics": {
      "market_percentile": "перцентиль на ринку",
      "competitiveness": "конкурентоспроможність 0-100"
    }
  },
  "retention_risk": {
    "summary": "оцінка ризиків втрати кадрів через зарплати",
    "recommendations": ["заходи по утриманню", "..."],
    "confidence": 85,
    "metrics": {
      "high_risk_count": "кількість працівників з високим ризиком",
      "retention_score": "оцінка утримання 0-100"
    }
  },
  "growth_recommendations": {
    "summary": "рекомендації по зростанню зарплат",
    "recommendations": ["стратегія підвищення", "графік індексації", "..."],
    "confidence": 75,
    "metrics": {
      "suggested_growth_rate": "рекомендований % зростання",
      "budget_impact": "вплив на бюджет"
    }
  },
  "cost_efficiency": {
    "summary": "ефективність витрат на персонал",
    "recommendations": ["покращення ефективності", "..."],
    "confidence": 88,
    "metrics": {
      "cost_per_employee": "вартість на працівника",
      "roi_estimate": "оцінка ROI"
    }
  }
}

Відповідай ТІЛЬКИ валідним JSON, українською мовою. Будь конкретним та практичним у рекомендаціях.`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Ти експерт з HR-аналітики та компенсацій. Надаєш точні та практичні рекомендації щодо зарплат.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const insights = JSON.parse(completion.choices[0].message.content);

    logger.info('AI salary insights generated successfully');

    res.json({
      success: true,
      insights: insights
    });

  } catch (error) {
    logger.error('Salary insights generation failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate salary insights',
      details: error.message
    });
  }
});

// ============================================
// SALARY ADJUSTMENT SUGGESTION - Individual recommendations
// ============================================

router.post('/salary-adjustment', async (req, res) => {
  try {
    const { member_id, team_id } = req.body;

    if (!member_id) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    logger.info(`Generating salary adjustment for member ${member_id}`);

    // Fetch member data from database
    const memberQuery = await pool.query(
      'SELECT * FROM team_members WHERE id = $1',
      [member_id]
    );

    if (memberQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberQuery.rows[0];

    const prompt = `Надай персональну рекомендацію щодо зарплати для:

Працівник: ${member.name}
Роль: ${member.role}
Поточна зарплата: ${member.salary || 'не вказано'} грн
Досвід: ${member.experience || 'не вказано'}

Проаналізуй та надай:
1. Рекомендовану зарплату
2. Обґрунтування
3. Терміни впровадження
4. Альтернативні опції (бонуси, бенефіти)

Формат JSON:
{
  "recommended_salary": число,
  "current_salary": число,
  "adjustment_percent": число,
  "justification": "детальне обґрунтування",
  "timeline": "коли впроваджувати",
  "alternatives": ["альтернатива 1", "альтернатива 2"],
  "market_data": {
    "role_median": число,
    "role_range": "діапазон",
    "percentile": "поточна позиція"
  }
}`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Ти експерт з компенсацій та винагород. Надаєш точні рекомендації на основі ринкових даних.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const suggestion = JSON.parse(completion.choices[0].message.content);

    // Format the recommendation as text
    const recommendation = `Рекомендована зарплата: ${suggestion.recommended_salary} грн (${suggestion.adjustment_percent > 0 ? '+' : ''}${suggestion.adjustment_percent}%). ${suggestion.justification}`;

    logger.info('Salary adjustment generated successfully');

    res.json({
      success: true,
      recommendation: recommendation,
      details: suggestion
    });

  } catch (error) {
    logger.error('Salary adjustment failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate salary adjustment',
      details: error.message
    });
  }
});

// ============================================
// CANDIDATE AI SCORING - Best Hire
// ============================================

router.post('/score-candidate', async (req, res) => {
  try {
    const { candidate_id, position_id } = req.body;

    if (!candidate_id || !position_id) {
      return res.status(400).json({ error: 'Candidate ID and Position ID are required' });
    }

    logger.info(`Scoring candidate ${candidate_id} for position ${position_id}`);

    // Fetch candidate data
    const candidateQuery = await pool.query(
      'SELECT * FROM candidates WHERE id = $1',
      [candidate_id]
    );

    if (candidateQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = candidateQuery.rows[0];

    // Fetch position requirements
    const positionQuery = await pool.query(
      'SELECT * FROM positions WHERE id = $1',
      [position_id]
    );

    const position = positionQuery.rows.length > 0 ? positionQuery.rows[0] : null;

    const prompt = `Оціни кандидата для позиції на основі резюме та вимог:

КАНДИДАТ:
Ім'я: ${candidate.name}
Роль: ${candidate.role || 'не вказано'}
Досвід: ${candidate.experience || 'не вказано'} років
Навички: ${candidate.skills ? candidate.skills.join(', ') : 'не вказано'}
Освіта: ${candidate.education || 'не вказано'}
Локація: ${candidate.location || 'не вказано'}
Очікувана зарплата: ${candidate.salary_expectation || 'не вказано'}

ВИМОГИ ПОЗИЦІЇ:
${position ? `
Назва: ${position.title}
Опис: ${position.description || 'не вказано'}
Обов'язкові навички: ${position.required_skills ? position.required_skills.join(', ') : 'не вказано'}
Бажані навички: ${position.preferred_skills ? position.preferred_skills.join(', ') : 'не вказано'}
Досвід: ${position.years_experience || 'не вказано'} років
` : 'Вимоги не вказані'}

Надай оцінку у форматі JSON:
{
  "score": число від 0 до 100 (загальна оцінка кандидата),
  "match_score": число від 0 до 100 (відповідність вимогам),
  "insights": {
    "strengths": ["сильна сторона 1", "сильна сторона 2", "..."],
    "weaknesses": ["слабка сторона 1", "слабка сторона 2", "..."],
    "recommendations": ["рекомендація 1", "рекомендація 2", "..."],
    "skill_match": {
      "matched": ["навичка що співпала", "..."],
      "missing": ["навичка що відсутня", "..."]
    },
    "salary_assessment": "оцінка відповідності очікуваної зарплати",
    "culture_fit": "оцінка культурної відповідності (якщо є дані)",
    "interview_questions": ["питання 1 для інтерв'ю", "питання 2", "..."]
  }
}

Будь об'єктивним та конкретним. Оцінка має базуватися на фактах.`;

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Ти експерт HR-рекрутер та асесор. Об\'єктивно оцінюєш кандидатів на основі їх резюме та вимог позиції.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    logger.info('Candidate scored successfully');

    res.json({
      success: true,
      score: result.score,
      match_score: result.match_score,
      insights: result.insights
    });

  } catch (error) {
    logger.error('Candidate scoring failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to score candidate',
      details: error.message
    });
  }
});

// ============================================
// BULK CANDIDATE SCORING
// ============================================

router.post('/score-all-candidates', async (req, res) => {
  try {
    const { position_id, candidate_ids } = req.body;

    if (!position_id || !candidate_ids || candidate_ids.length === 0) {
      return res.status(400).json({ error: 'Position ID and candidate IDs are required' });
    }

    logger.info(`Scoring ${candidate_ids.length} candidates for position ${position_id}`);

    // Fetch position
    const positionQuery = await pool.query(
      'SELECT * FROM positions WHERE id = $1',
      [position_id]
    );

    const position = positionQuery.rows.length > 0 ? positionQuery.rows[0] : null;

    // Fetch all candidates
    const candidatesQuery = await pool.query(
      'SELECT * FROM candidates WHERE id = ANY($1)',
      [candidate_ids]
    );

    const candidates = candidatesQuery.rows;

    // Score candidates in PARALLEL for better performance
    const scoringPromises = candidates.map(async (candidate) => {
      try {
        const prompt = `Швидко оціни кандидата ${candidate.name} для позиції ${position?.title || 'не вказано'}.

Навички кандидата: ${candidate.skills ? candidate.skills.join(', ') : 'не вказано'}
Досвід: ${candidate.experience || 0} років
Вимоги: ${position?.required_skills ? position.required_skills.join(', ') : 'не вказано'}

Надай JSON:
{
  "score": число 0-100,
  "match_score": число 0-100,
  "top_strength": "головна сильна сторона",
  "top_weakness": "головна слабка сторона"
}`;

        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini', // Use faster model for bulk
          messages: [
            { role: 'system', content: 'Ти швидкий HR-асесор. Давай короткі, точні оцінки.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        return {
          candidate_id: candidate.id,
          score: result.score,
          match_score: result.match_score,
          insights: {
            strengths: [result.top_strength],
            weaknesses: [result.top_weakness]
          }
        };

      } catch (error) {
        logger.error(`Failed to score candidate ${candidate.id}`, { error: error.message });
        // Return default score on error
        return {
          candidate_id: candidate.id,
          score: 50,
          match_score: 50,
          insights: { strengths: [], weaknesses: [], error: error.message }
        };
      }
    });

    // Wait for all scoring to complete in parallel
    const scores = await Promise.all(scoringPromises);

    logger.info('Bulk scoring completed');

    res.json({
      success: true,
      scores: scores
    });

  } catch (error) {
    logger.error('Bulk scoring failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to score candidates',
      details: error.message
    });
  }
});

// ============================================
// RESUME PARSING with GPT-4o Vision
// ============================================

router.post('/parse-resume', async (req, res) => {
  try {
    const { image_url, pdf_url, text } = req.body;

    if (!image_url && !pdf_url && !text) {
      return res.status(400).json({ error: 'Resume data is required (image, PDF, or text)' });
    }

    logger.info('Parsing resume with GPT-4o');

    let messages = [
      {
        role: 'system',
        content: `Ти експерт з парсингу резюме. Витягуй структуровану інформацію про кандидатів.

Надай JSON:
{
  "name": "ПІБ",
  "role": "Позиція/роль",
  "email": "email@example.com",
  "phone": "телефон",
  "location": "локація",
  "experience": число років досвіду,
  "skills": ["навичка 1", "навичка 2", "..."],
  "education": "освіта",
  "languages": ["мова 1", "мова 2"],
  "work_history": [
    {"company": "компанія", "role": "роль", "duration": "тривалість", "description": "опис"}
  ],
  "salary_expectation": число або null,
  "summary": "короткий саммарі про кандидата (2-3 речення)"
}`
      }
    ];

    if (image_url) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: image_url }
          },
          {
            type: 'text',
            text: 'Проаналізуй це резюме та витягни всю інформацію.'
          }
        ]
      });
    } else if (text) {
      messages.push({
        role: 'user',
        content: `Проаналізуй це резюме:\n\n${text}`
      });
    }

    const completion = await openaiClient.chat.completions.create({
      model: image_url ? 'gpt-4o' : 'gpt-4o-mini',
      messages: messages,
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const parsedData = JSON.parse(completion.choices[0].message.content);

    logger.info('Resume parsed successfully');

    res.json({
      success: true,
      candidate: parsedData
    });

  } catch (error) {
    logger.error('Resume parsing failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to parse resume',
      details: error.message
    });
  }
});

export default router;
