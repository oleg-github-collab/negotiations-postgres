// routes/advice.js - Production AI advice engine
import { Router } from 'express';
import { client as openaiClient, estimateTokens } from '../utils/openAIClient.js';
import { validateAdviceRequest, validatePersonAdvice } from '../middleware/validators.js';
import { logError, logAIUsage, logPerformance } from '../utils/logger.js';
import { addTokensAndCheck } from '../utils/tokenUsage.js';
import { recordAuditEvent } from '../utils/audit.js';
import { performance } from 'perf_hooks';

const r = Router();
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const buildPersonAdvicePrompt = () => `
Ти — Chief People Strategist Kaminskyi AI. На основі даних про співробітника дай чіткі поради залежно від режиму (mode).
mode=hiring — відповідай чи потрібен додатковий найм/бекфіл, як перекрити розриви.
mode=compensation — оцінюй справедливість оплати, бонуси, ринкове позиціонування.
mode=tasks — оптимізуй завантаження, делегування, пріоритизацію.

Поверни СТРОГО JSON:
{
  "summary":"3-4 речення з головними висновками під mode",
  "key_signals":{
    "strengths":["..."],
    "risks":["..."],
    "opportunities":["..."],
    "misalignments":["..."]
  },
  "recommendations":{
    "hiring":["..."],
    "compensation":["..."],
    "tasks":["..."],
    "coaching":["..."],
    "communication":["..."]
  },
  "urgency":"act_now|monitor|inform",
  "urgent_actions":["..."],
  "supporting_arguments":["..."],
  "next_check_in":"рекомендований період повторної оцінки"
}

Використовуй ІМЕНА так, як надано. Ніяких вигаданих людей. Будь різким і практичним.`.trim();
r.post('/', validateAdviceRequest, async (req, res) => {
  const adviceStartTime = performance.now();
  let totalTokensUsed = 0;
  
  try {
    const { items, profile } = req.body || {};
    
    // Enhanced input validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Немає фрагментів для поради',
        required: 'items array with at least 1 fragment'
      });
    }
    
    if (items.length > 50) {
      return res.status(400).json({
        error: 'Занадто багато фрагментів. Максимум: 50',
        maxItems: 50,
        receivedItems: items.length
      });
    }
    
    const approxIn = estimateTokens(JSON.stringify(items)) + 400;
    totalTokensUsed += approxIn;
    await addTokensAndCheck(approxIn);

    // Production mode requires OpenAI API - Enhanced error handling
    if (!openaiClient) {
      logError(new Error('OpenAI client not configured for advice'), {
        context: 'Advice request without API key',
        itemsCount: items.length,
        ip: req.ip
      });
      
      return res.status(503).json({
        error: 'AI сервіс тимчасово недоступний. Перевірте налаштування API.',
        code: 'AI_SERVICE_UNAVAILABLE',
        details: 'OpenAI API key not configured',
        timestamp: new Date().toISOString(),
        retry_after: 60 // seconds
      });
    }

    const sys = `
Ти — експерт зі стратегій відповідей у переговорах.
На вхід подаються вибрані фрагменти тексту з виявленими маніпуляціями та контекст клієнта.
Сформуй:

recommended_replies: 3-4 варіанти професійних відповідей (конкретні формулювання)
risks: 3-4 ключові ризики в цих переговорах
notes: детальні поради та рекомендації щодо подальших дій

Поверни СТРОГО JSON:
{"recommended_replies":["..."],"risks":["..."],"notes":"..."}
`.trim();

    const usr = `
Фрагменти з маніпуляціями:
${items
  .map(
    (it, i) =>
      `[${i + 1}] (${it.category || 'neutral'} | ${it.label || '—'}) "${it.text || ''}"`
  )
  .join('\n')}
Контекст клієнта:
${JSON.stringify(
  {
    company: profile?.company || '',
    negotiator: profile?.negotiator || '',
    sector: profile?.sector || '',
    user_goals: profile?.user_goals || profile?.goal || '',
    client_goals: profile?.client_goals || '',
    weekly_hours: profile?.weekly_hours || 0,
    offered_services: profile?.offered_services || '',
    deadlines: profile?.deadlines || '',
    constraints: profile?.constraints || '',
    decision_criteria:
      profile?.criteria || profile?.decision_criteria || '',
    notes: profile?.notes || '',
  },
  null,
  2
)}
`.trim();

    const reqPayload = {
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      max_tokens: 1500,
      top_p: 0.9
    };

    // Only add temperature if supported
    if (!/^gpt-5($|[-:])/i.test(MODEL)) {
      reqPayload.temperature = 0.2;
    }

    // Enhanced API call with retry logic and timeout
    let resp;
    let retryCount = 0;
    const maxRetries = process.env.NODE_ENV === 'production' ? 3 : 1;
    const API_TIMEOUT = 45000; // 45 seconds
    
    while (retryCount <= maxRetries) {
      try {
        // Add retry delay for subsequent attempts
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)));
        }
        
        // Create request with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort(new Error('API request timeout'));
        }, API_TIMEOUT);
        
        try {
          resp = await openaiClient.chat.completions.create(reqPayload);
          clearTimeout(timeout);
          break; // Success, exit retry loop
          
        } catch (timeoutError) {
          clearTimeout(timeout);
          throw timeoutError;
        }
        
      } catch (apiError) {
        retryCount++;
        
        // Check if it's a retryable error
        const isRetryable = apiError.status >= 500 || 
                          apiError.status === 429 || 
                          apiError.code === 'ECONNRESET' ||
                          apiError.code === 'ETIMEDOUT' ||
                          apiError.name === 'AbortError';
                          
        if (retryCount > maxRetries || !isRetryable) {
          logError(apiError, {
            context: 'OpenAI advice API call failed after retries',
            model: MODEL,
            itemsCount: items.length,
            retries: retryCount - 1,
            isRetryable,
            ip: req.ip
          });
          
          return res.status(503).json({
            error: 'Помилка AI сервісу після кількох спроб. Спробуйте пізніше.',
            code: 'AI_API_ERROR',
            retries: retryCount - 1,
            timestamp: new Date().toISOString()
          });
        }
        
        logError(apiError, {
          context: `OpenAI advice API retry ${retryCount}/${maxRetries}`,
          model: MODEL,
          itemsCount: items.length,
          isRetryable,
          ip: req.ip
        });
      }
    }
    
    const content = resp.choices?.[0]?.message?.content || '{}';
    const outputTokens = 600;
    totalTokensUsed += outputTokens;
    await addTokensAndCheck(outputTokens);
    
    // Log AI usage
    logAIUsage(totalTokensUsed, MODEL, 'advice_generation');
    
    const adviceDuration = performance.now() - adviceStartTime;
    logPerformance('Advice Generation', adviceDuration, {
      itemsCount: items.length,
      tokensUsed: totalTokensUsed
    });
    
    // Enhanced response validation and parsing
    if (!resp || !resp.choices || !resp.choices[0]?.message?.content) {
      logError(new Error('Invalid API response structure'), {
        context: 'AI advice API returned invalid response',
        response: JSON.stringify(resp).substring(0, 500)
      });
      
      return res.status(503).json({
        error: 'Некоректна відповідь від AI сервісу',
        code: 'AI_INVALID_RESPONSE',
        timestamp: new Date().toISOString()
      });
    }
    
    let parsedAdvice;
    try {
      parsedAdvice = JSON.parse(content);
      
      // Validate response structure
      if (!parsedAdvice || typeof parsedAdvice !== 'object') {
        throw new Error('Response is not a valid object');
      }
      
      // Ensure required fields are present with defaults
      parsedAdvice = {
        recommended_replies: parsedAdvice.recommended_replies || [],
        risks: parsedAdvice.risks || [],
        notes: parsedAdvice.notes || 'Рекомендації не згенеровано'
      };
      
    } catch (parseError) {
      logError(parseError, {
        context: 'Failed to parse AI advice response',
        content: content.substring(0, 500),
        contentLength: content.length
      });
      
      // Fallback advice if parsing fails
      parsedAdvice = {
        recommended_replies: [
          'Дякую за детальну пропозицію. Дайте нам час її розглянути.',
          'Це цікава ідея, але нам потрібно обговорити деталі з командою.',
          'Ми цінуємо вашу пропозицію і повернемося з відповіддю найближчим часом.'
        ],
        risks: [
          'Можлива спроба тиску з боку контрагента',
          'Недостатньо інформації для прийняття рішення',
          'Потреба в додатковому аналізі умов'
        ],
        notes: 'Автоматично згенерована порада через помилку парсингу AI відповіді. Рекомендується детальний аналіз вручну.'
      };
    }

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'advice.fragments',
      actor: req.user?.username,
      entityType: 'client',
      entityId: req.body?.profile?.id ? String(req.body.profile.id) : null,
      metadata: {
        items: items.length,
        tokensUsed: totalTokensUsed,
        model: MODEL
      }
    });

    return res.json({ 
      success: true, 
      advice: parsedAdvice,
      meta: {
        itemsProcessed: items.length,
        tokensUsed: totalTokensUsed,
        responseTime: Math.round(adviceDuration),
        model: MODEL,
        retries: resp ? (retryCount || 0) : maxRetries,
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    const adviceDuration = performance.now() - adviceStartTime;
    
    logError(e, {
      context: 'Advice route error',
      duration: adviceDuration,
      tokensUsed: totalTokensUsed,
      itemsCount: req.body?.items?.length || 0,
      ip: req.ip
    });
    
    const isRateLimit = e.message.includes('Ліміт');
    const statusCode = isRateLimit ? 429 : 500;
    
    res.status(statusCode).json({ 
      error: e.message || 'Помилка генерації порад',
      code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'ADVICE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

r.post('/person', validatePersonAdvice, async (req, res) => {
  const startTime = performance.now();
  let tokensUsed = 0;

  try {
    if (!openaiClient) {
      return res.status(503).json({
        success: false,
        error: 'AI сервіс тимчасово недоступний. Перевірте конфігурацію OpenAI API ключа.',
        code: 'AI_SERVICE_UNAVAILABLE'
      });
    }

    const { mode, member, team = {}, concern = '' } = req.body;

    const payload = {
      mode,
      member,
      team,
      concern,
      timestamp: new Date().toISOString()
    };

    const system = buildPersonAdvicePrompt();
    const tokensIn =
      estimateTokens(system) + estimateTokens(JSON.stringify(payload)) + 120;
    tokensUsed += tokensIn;
    await addTokensAndCheck(tokensIn);

    const response = await openaiClient.chat.completions.create({
      model: MODEL,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(payload) }
      ],
      max_tokens: 1200
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    const tokensOut = estimateTokens(content);
    tokensUsed += tokensOut;
    await addTokensAndCheck(tokensOut);
    logAIUsage(tokensUsed, MODEL, 'person_advice');

    let parsed;
    try {
      parsed = JSON.parse(content.replace(/```json/gi, '').replace(/```/g, '').trim());
    } catch (parseError) {
      logError(parseError, {
        context: 'Failed to parse person advice response',
        content: content.substring(0, 500)
      });
      parsed = {
        summary: 'AI не зміг побудувати структуровану пораду. Проведіть швидку синхронізацію з керівником.',
        key_signals: {
          strengths: [],
          risks: [],
          opportunities: [],
          misalignments: []
        },
        recommendations: {
          hiring: [],
          compensation: [],
          tasks: [],
          coaching: [],
          communication: []
        },
        urgency: 'monitor',
        urgent_actions: [],
        supporting_arguments: [],
        next_check_in: '2-4 weeks'
      };
    }

    const duration = performance.now() - startTime;
    logPerformance('Person Advice', duration, {
      mode,
      memberId: member?.id,
      tokensUsed
    });

    const teamIdValue = team?.id ?? team?.team_id ?? null;

    await recordAuditEvent({
      requestId: req.context?.requestId,
      eventType: 'advice.person',
      actor: req.user?.username,
      entityType: 'team_member',
      entityId: member?.id ? String(member.id) : null,
      metadata: {
        mode,
        teamId: teamIdValue,
        tokensUsed,
        memberName: member?.full_name || member?.name || null
      }
    });

    res.json({
      success: true,
      advice: parsed,
      meta: {
        tokensUsed,
        responseTime: Math.round(duration),
        mode
      }
    });
  } catch (error) {
    logError(error, {
      endpoint: 'POST /api/advice/person',
      ip: req.ip,
      body: req.body
    });

    const statusCode = error.message?.includes('Ліміт') ? 429 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Не вдалося згенерувати персональну пораду',
      code: statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'PERSON_ADVICE_ERROR'
    });
  }
});

export default r;
