/* ============================================
   AI ENDPOINTS - GPT-4o Integration
   Cognitive biases analysis and AI advice
   ============================================ */

import express from 'express';
import { openaiClient } from '../utils/openai-client.js';
import logger from '../utils/logger.js';
import { pool } from '../utils/db.js';

const router = express.Router();

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

export default router;
