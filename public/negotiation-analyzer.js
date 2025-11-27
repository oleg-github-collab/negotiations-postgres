/* ============================================
   NEGOTIATION ANALYZER
   GPT-powered аналіз переговорів з виявленням маніпуляцій
   ============================================ */

const NegotiationAnalyzer = {

  // Бібліотека патернів маніпуляцій
  MANIPULATION_PATTERNS: {
    gaslighting: {
      name: 'Газлайтінг',
      indicators: [
        'Цього ніколи не було',
        'Ти занадто чутливий',
        'Ви все неправильно зрозуміли',
        'Я такого не казав',
        'Ви перебільшуєте'
      ],
      severity: 'critical',
      color: '#ff0000'
    },

    anchoring: {
      name: 'Якоріння',
      indicators: [
        'Зазвичай це коштує',
        'Нормальна ціна',
        'Всі платять',
        'Стандартна ставка',
        'Ринкова ціна'
      ],
      severity: 'high',
      color: '#ff4444'
    },

    false_urgency: {
      name: 'Фальшива терміновість',
      indicators: [
        'Тільки сьогодні',
        'Обмежена пропозиція',
        'Залишилось мало',
        'Треба вирішувати зараз',
        'Час закінчується'
      ],
      severity: 'high',
      color: '#ff6600'
    },

    emotional_manipulation: {
      name: 'Емоційна маніпуляція',
      indicators: [
        'Розчарований',
        'Ображений',
        'Після всього що я для вас',
        'Ви мені не довіряєте',
        'Я думав ми партнери'
      ],
      severity: 'high',
      color: '#ff8800'
    },

    bait_and_switch: {
      name: 'Приманка і підміна',
      indicators: [
        'На жаль це недоступно',
        'Але у нас є краще',
        'Замість цього пропоную',
        'Це вже не актуально',
        'Умови змінились'
      ],
      severity: 'high',
      color: '#ff9900'
    },

    false_dilemma: {
      name: 'Фальшива дилема',
      indicators: [
        'Або це або',
        'У вас тільки два варіанти',
        'Інших опцій немає',
        'Треба вибрати',
        'Або так або ніяк'
      ],
      severity: 'medium',
      color: '#ffaa00'
    },

    social_proof: {
      name: 'Соціальний доказ',
      indicators: [
        'Всі так роблять',
        'Ваші конкуренти',
        'Інші клієнти',
        'Більшість обирає',
        'Популярний вибір'
      ],
      severity: 'medium',
      color: '#ffbb00'
    },

    authority_bias: {
      name: 'Апеляція до авторитету',
      indicators: [
        'Експерти кажуть',
        'Дослідження показують',
        'Згідно з',
        'Відомий факт',
        'Наука доводить'
      ],
      severity: 'low',
      color: '#ffcc00'
    }
  },

  // Когнітивні викривлення
  COGNITIVE_BIASES: {
    confirmation_bias: {
      name: 'Підтвердження упереджень',
      indicators: [
        'Як я і казав',
        'Це підтверджує',
        'Бачите',
        'Я ж говорив',
        'Точно як я думав'
      ],
      color: '#ff8800'
    },

    sunk_cost_fallacy: {
      name: 'Помилка невповоротних витрат',
      indicators: [
        'Вже вклали стільки',
        'Після всіх зусиль',
        'Не можемо зупинитись',
        'Стільки часу потратили',
        'Занадто пізно відступати'
      ],
      color: '#ff9900'
    },

    availability_heuristic: {
      name: 'Евристика доступності',
      indicators: [
        'Нещодавно був випадок',
        'Я чув що',
        'Пам\'ятаю як',
        'Був приклад коли',
        'Знаю історію'
      ],
      color: '#ffaa00'
    },

    halo_effect: {
      name: 'Ефект ореолу',
      indicators: [
        'Раз це добре то',
        'Якщо вони успішні',
        'Така компанія не може',
        'З їх репутацією',
        'Вони ж відомі'
      ],
      color: '#ffbb00'
    }
  },

  // Софізми
  SOPHISMS: {
    ad_hominem: {
      name: 'Ad hominem',
      indicators: [
        'Ви не розумієте',
        'Вам не вистачає досвіду',
        'Ви новачок',
        'З вашою освітою',
        'Ви не кваліфіковані'
      ],
      color: '#ffaa00'
    },

    straw_man: {
      name: 'Солом\'яне опудало',
      indicators: [
        'Так ви кажете що',
        'Тобто ви хочете',
        'Ви пропонуєте щоб',
        'З ваших слів виходить',
        'Ви маєте на увазі'
      ],
      color: '#ffbb00'
    },

    slippery_slope: {
      name: 'Слизький схил',
      indicators: [
        'Це призведе до',
        'Потім буде',
        'В результаті',
        'Наступним кроком',
        'Закінчиться тим що'
      ],
      color: '#ffcc00'
    },

    circular_reasoning: {
      name: 'Кругова аргументація',
      indicators: [
        'Це так тому що',
        'Правильно бо правильно',
        'Очевидно що',
        'Зрозуміло чому',
        'Не потребує доказів'
      ],
      color: '#ffdd00'
    }
  },

  // Позитивні патерни
  POSITIVE_PATTERNS: {
    transparency: {
      name: 'Прозорість',
      indicators: [
        'Чесно кажучи',
        'Відверто',
        'Без прикрас',
        'Прямо скажу',
        'Реальна ситуація'
      ],
      color: '#44ff44'
    },

    collaboration: {
      name: 'Співпраця',
      indicators: [
        'Давайте разом',
        'Спільно вирішимо',
        'Знайдемо компроміс',
        'Взаємовигідно',
        'Win-win'
      ],
      color: '#66ff66'
    },

    empathy: {
      name: 'Емпатія',
      indicators: [
        'Розумію вашу позицію',
        'Бачу вашу точку зору',
        'Це важливо для вас',
        'Відчуваю що',
        'Усвідомлюю ваші потреби'
      ],
      color: '#88ff88'
    },

    clarity: {
      name: 'Ясність',
      indicators: [
        'Конкретно',
        'Точні цифри',
        'Детально',
        'Пункт за пунктом',
        'Чітко визначено'
      ],
      color: '#aaff'
    }
  },

  // Основний метод аналізу
  async analyze(text, speakers) {
    const analysis = {
      manipulations: [],
      cognitive_biases: [],
      sophisms: [],
      positive_patterns: [],
      overall_score: 0,
      risk_level: 'low',
      cooperation_level: 0,
      aggression_level: 0,
      clarity_score: 0,
      consistency_score: 0,
      recommendations: [],
      speaker_analysis: {}
    };

    // Розділяємо текст на сегменти по спікерах
    const segments = this.parseTextBySpeekers(text, speakers);

    // Аналізуємо кожен сегмент
    for (const segment of segments) {
      await this.analyzeSegment(segment, analysis);
    }

    // Розраховуємо загальні метрики
    this.calculateMetrics(analysis);

    // Генеруємо рекомендації
    analysis.recommendations = this.generateRecommendations(analysis);

    // Якщо є API ключ, робимо поглиблений аналіз через GPT
    if (window.OPENAI_API_KEY) {
      const gptAnalysis = await this.getGPTAnalysis(text, analysis);
      Object.assign(analysis, gptAnalysis);
    }

    return analysis;
  },

  // Парсинг тексту по спікерах
  parseTextBySpeekers(text, speakers) {
    const segments = [];
    const lines = text.split('\n');
    let currentSpeaker = null;
    let currentText = '';

    lines.forEach(line => {
      // Шукаємо маркери спікерів
      let speakerFound = false;
      for (const speaker of speakers) {
        const speakerName = speaker.name || speaker;
        const patterns = [
          new RegExp(`^${speakerName}:`, 'i'),
          new RegExp(`^\\[${speakerName}\\]`, 'i'),
          new RegExp(`^<${speakerName}>`, 'i')
        ];

        for (const pattern of patterns) {
          if (pattern.test(line)) {
            // Зберігаємо попередній сегмент
            if (currentSpeaker && currentText) {
              segments.push({
                speaker: currentSpeaker,
                text: currentText.trim(),
                role: speakers.find(s => (s.name || s) === currentSpeaker)?.role || 'unknown'
              });
            }

            currentSpeaker = speakerName;
            currentText = line.replace(pattern, '').trim();
            speakerFound = true;
            break;
          }
        }
        if (speakerFound) break;
      }

      if (!speakerFound && currentSpeaker) {
        currentText += '\n' + line;
      }
    });

    // Додаємо останній сегмент
    if (currentSpeaker && currentText) {
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        role: speakers.find(s => (s.name || s) === currentSpeaker)?.role || 'unknown'
      });
    }

    return segments;
  },

  // Аналіз сегменту
  async analyzeSegment(segment, analysis) {
    const text = segment.text.toLowerCase();

    // Перевіряємо маніпуляції
    for (const [key, pattern] of Object.entries(this.MANIPULATION_PATTERNS)) {
      for (const indicator of pattern.indicators) {
        if (text.includes(indicator.toLowerCase())) {
          analysis.manipulations.push({
            type: pattern.name,
            text: this.extractContext(segment.text, indicator),
            speaker: segment.speaker,
            severity: pattern.severity,
            explanation: `${segment.speaker} використовує техніку "${pattern.name}" для психологічного впливу`
          });
        }
      }
    }

    // Перевіряємо когнітивні викривлення
    for (const [key, bias] of Object.entries(this.COGNITIVE_BIASES)) {
      for (const indicator of bias.indicators) {
        if (text.includes(indicator.toLowerCase())) {
          analysis.cognitive_biases.push({
            type: bias.name,
            text: this.extractContext(segment.text, indicator),
            speaker: segment.speaker,
            explanation: `Когнітивне викривлення "${bias.name}" може спотворити сприйняття ситуації`
          });
        }
      }
    }

    // Перевіряємо софізми
    for (const [key, sophism] of Object.entries(this.SOPHISMS)) {
      for (const indicator of sophism.indicators) {
        if (text.includes(indicator.toLowerCase())) {
          analysis.sophisms.push({
            type: sophism.name,
            text: this.extractContext(segment.text, indicator),
            speaker: segment.speaker,
            explanation: `Логічна помилка "${sophism.name}" підриває аргументацію`
          });
        }
      }
    }

    // Перевіряємо позитивні патерни
    for (const [key, pattern] of Object.entries(this.POSITIVE_PATTERNS)) {
      for (const indicator of pattern.indicators) {
        if (text.includes(indicator.toLowerCase())) {
          analysis.positive_patterns.push({
            type: pattern.name,
            text: this.extractContext(segment.text, indicator),
            speaker: segment.speaker
          });
        }
      }
    }

    // Аналіз по спікерах
    if (!analysis.speaker_analysis[segment.speaker]) {
      analysis.speaker_analysis[segment.speaker] = {
        manipulations: 0,
        biases: 0,
        sophisms: 0,
        positive: 0,
        aggression: 0,
        cooperation: 0
      };
    }

    // Оновлюємо статистику спікера
    const speakerStats = analysis.speaker_analysis[segment.speaker];
    speakerStats.manipulations = analysis.manipulations.filter(m => m.speaker === segment.speaker).length;
    speakerStats.biases = analysis.cognitive_biases.filter(b => b.speaker === segment.speaker).length;
    speakerStats.sophisms = analysis.sophisms.filter(s => s.speaker === segment.speaker).length;
    speakerStats.positive = analysis.positive_patterns.filter(p => p.speaker === segment.speaker).length;
  },

  // Витягнення контексту навколо знайденого патерну
  extractContext(text, indicator) {
    const index = text.toLowerCase().indexOf(indicator.toLowerCase());
    if (index === -1) return text.substring(0, 100);

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + indicator.length + 50);

    return text.substring(start, end);
  },

  // Розрахунок метрик
  calculateMetrics(analysis) {
    const totalNegative = analysis.manipulations.length +
                         analysis.cognitive_biases.length +
                         analysis.sophisms.length;

    const totalPositive = analysis.positive_patterns.length;

    // Розраховуємо загальний бал (0-100)
    analysis.overall_score = Math.max(0, Math.min(100,
      50 + (totalPositive * 5) - (totalNegative * 10)
    ));

    // Визначаємо рівень ризику
    if (totalNegative > 10) {
      analysis.risk_level = 'critical';
    } else if (totalNegative > 5) {
      analysis.risk_level = 'high';
    } else if (totalNegative > 2) {
      analysis.risk_level = 'medium';
    } else {
      analysis.risk_level = 'low';
    }

    // Рівень співпраці
    analysis.cooperation_level = Math.min(100, totalPositive * 10);

    // Рівень агресії
    analysis.aggression_level = Math.min(100,
      analysis.manipulations.filter(m => m.severity === 'critical').length * 20 +
      analysis.manipulations.filter(m => m.severity === 'high').length * 10
    );

    // Оцінка ясності
    const clarityPatterns = analysis.positive_patterns.filter(p => p.type === 'Ясність');
    analysis.clarity_score = Math.min(100, clarityPatterns.length * 20);

    // Оцінка послідовності
    analysis.consistency_score = Math.max(0, 100 - (totalNegative * 10));
  },

  // Генерація рекомендацій
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.risk_level === 'critical') {
      recommendations.push({
        priority: 'critical',
        text: 'Виявлено критичний рівень маніпуляцій. Рекомендується залучити юриста або досвідченого переговорника.'
      });
    }

    if (analysis.manipulations.length > 3) {
      recommendations.push({
        priority: 'high',
        text: 'Документуйте всі домовленості письмово. Опонент систематично використовує маніпулятивні техніки.'
      });
    }

    if (analysis.cognitive_biases.length > 2) {
      recommendations.push({
        priority: 'medium',
        text: 'Використовуйте факти та дані для підкріплення аргументів. Виявлено когнітивні викривлення.'
      });
    }

    if (analysis.cooperation_level < 30) {
      recommendations.push({
        priority: 'medium',
        text: 'Спробуйте знайти спільні інтереси та вигоди. Рівень співпраці низький.'
      });
    }

    if (analysis.clarity_score < 50) {
      recommendations.push({
        priority: 'medium',
        text: 'Вимагайте конкретики та чітких формулювань. Багато неясностей в комунікації.'
      });
    }

    return recommendations;
  },

  // Поглиблений аналіз через GPT API
  async getGPTAnalysis(text, preliminaryAnalysis) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Ти експерт з аналізу переговорів. Проаналізуй текст та виявиу:
                1. Маніпулятивні техніки
                2. Когнітивні викривлення
                3. Софізми та логічні помилки
                4. Психологічні прийоми впливу
                5. Приховані наміри
                6. Емоційний стан учасників
                7. Силу позицій сторін

                Поверни детальний JSON з такою структурою:
                {
                  "advanced_manipulations": [{"type": "", "text": "", "explanation": "", "counter": ""}],
                  "psychological_insights": "",
                  "hidden_agenda": "",
                  "power_dynamics": "",
                  "emotional_analysis": {},
                  "negotiation_stage": "",
                  "predicted_outcome": "",
                  "key_moments": [],
                  "tactical_recommendations": []
                }`
            },
            {
              role: 'user',
              content: `Проаналізуй цей текст переговорів:\n\n${text}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error('GPT API error: ' + response.statusText);
      }

      const data = await response.json();
      const gptAnalysis = JSON.parse(data.choices[0].message.content);

      // Об'єднуємо з попереднім аналізом
      return {
        ...preliminaryAnalysis,
        ...gptAnalysis,
        gpt_enhanced: true
      };

    } catch (error) {
      console.error('GPT analysis error:', error);
      return preliminaryAnalysis;
    }
  }
};

// Експорт
window.NegotiationAnalyzer = NegotiationAnalyzer;