/* ============================================
   NEGOTIATION ANALYZER PRO
   Advanced AI-powered negotiation analysis engine
   ============================================ */

const NegotiationAnalyzerPro = {

  // Psychological manipulation patterns
  MANIPULATION_PATTERNS: {
    gaslighting: {
      indicators: [
        'That never happened',
        'You\'re being too sensitive',
        'You\'re overreacting',
        'You\'re misremembering',
        'Everyone agrees with me'
      ],
      severity: 'critical',
      counter: 'Document everything. Reference written communications.'
    },

    anchoring: {
      indicators: [
        'Originally we wanted',
        'The standard price is',
        'Everyone else pays',
        'The market rate is'
      ],
      severity: 'high',
      counter: 'Request market data. Get competing quotes.'
    },

    false_urgency: {
      indicators: [
        'This offer expires today',
        'Only available now',
        'We have other interested parties',
        'You need to decide immediately'
      ],
      severity: 'medium',
      counter: 'Take time to think. Request extension. Verify claims.'
    },

    good_cop_bad_cop: {
      indicators: [
        'My partner won\'t agree',
        'I\'m on your side but',
        'I can try to convince them',
        'Between you and me'
      ],
      severity: 'medium',
      counter: 'Recognize the tactic. Focus on facts, not personalities.'
    },

    lowballing: {
      indicators: [
        'We can only offer',
        'Budget constraints',
        'That\'s our final offer',
        'Take it or leave it'
      ],
      severity: 'low',
      counter: 'Know your worth. Have alternatives ready.'
    },

    emotional_manipulation: {
      indicators: [
        'After everything we\'ve done',
        'I thought we were partners',
        'You\'re letting us down',
        'We trusted you'
      ],
      severity: 'high',
      counter: 'Separate emotions from business. Focus on contracts.'
    }
  },

  // Cognitive biases detection
  COGNITIVE_BIASES: {
    confirmation_bias: {
      description: 'Seeking only information that confirms beliefs',
      indicators: ['as expected', 'proves my point', 'like I said'],
      impact: 'May miss critical information'
    },

    sunk_cost_fallacy: {
      description: 'Continuing because of past investment',
      indicators: ['already invested', 'come this far', 'can\'t stop now'],
      impact: 'May throw good money after bad'
    },

    availability_heuristic: {
      description: 'Overweighting recent or memorable events',
      indicators: ['last time', 'remember when', 'that one case'],
      impact: 'May make decisions based on exceptions'
    },

    bandwagon_effect: {
      description: 'Following the crowd',
      indicators: ['everyone is doing', 'industry standard', 'all our competitors'],
      impact: 'May miss unique opportunities'
    },

    status_quo_bias: {
      description: 'Preferring current state',
      indicators: ['why change', 'if it ain\'t broke', 'always done this way'],
      impact: 'May resist beneficial changes'
    }
  },

  // Power dynamics indicators
  POWER_DYNAMICS: {
    dominance: {
      verbal: ['interrupting', 'talking over', 'dismissive language'],
      nonverbal: ['taking up space', 'aggressive posture', 'no eye contact'],
      score_impact: -0.15
    },

    submission: {
      verbal: ['apologizing excessively', 'self-deprecating', 'uncertain language'],
      nonverbal: ['closed posture', 'avoiding eye contact', 'nervous habits'],
      score_impact: -0.10
    },

    collaboration: {
      verbal: ['we can', 'let\'s explore', 'what if we'],
      nonverbal: ['open posture', 'eye contact', 'nodding'],
      score_impact: 0.20
    },

    competition: {
      verbal: ['win-lose language', 'threats', 'ultimatums'],
      nonverbal: ['aggressive stance', 'pointing', 'raised voice'],
      score_impact: -0.20
    }
  },

  // Negotiation stages analysis
  NEGOTIATION_STAGES: {
    opening: {
      optimal_behaviors: ['establish rapport', 'set agenda', 'share interests'],
      red_flags: ['immediate demands', 'no small talk', 'aggressive opening']
    },

    exploration: {
      optimal_behaviors: ['ask questions', 'active listening', 'identify needs'],
      red_flags: ['one-sided talking', 'no questions', 'assumptions']
    },

    bargaining: {
      optimal_behaviors: ['trade-offs', 'creative solutions', 'value creation'],
      red_flags: ['zero-sum thinking', 'no flexibility', 'ultimatums']
    },

    closing: {
      optimal_behaviors: ['summarize agreements', 'next steps', 'timeline'],
      red_flags: ['vague commitments', 'no documentation', 'rushed closure']
    }
  },

  // Success probability calculation
  calculateSuccessProbability(analysis) {
    let score = 0.5; // Base 50%

    // Positive factors
    if (analysis.collaboration_level > 0.6) score += 0.15;
    if (analysis.trust_indicators > 3) score += 0.10;
    if (analysis.creative_solutions > 0) score += 0.10;
    if (analysis.mutual_gains) score += 0.15;

    // Negative factors
    if (analysis.manipulation_detected) score -= 0.20;
    if (analysis.high_pressure) score -= 0.15;
    if (analysis.trust_violations > 0) score -= 0.25;
    if (analysis.ultimatums > 0) score -= 0.10;

    // Stage-specific adjustments
    const stageScore = this.evaluateStageProgression(analysis.stages);
    score += stageScore;

    // Ensure between 0 and 1
    return Math.max(0, Math.min(1, score));
  },

  // Deep linguistic analysis
  analyzeLinguisticPatterns(text) {
    const patterns = {
      certainty: {
        high: /\b(definitely|certainly|absolutely|guaranteed|sure)\b/gi,
        low: /\b(maybe|perhaps|might|could|possibly)\b/gi
      },

      commitment: {
        strong: /\b(will|commit|promise|guarantee|ensure)\b/gi,
        weak: /\b(try|attempt|hope|wish|want)\b/gi
      },

      timeframe: {
        immediate: /\b(now|today|immediately|urgent|asap)\b/gi,
        vague: /\b(soon|later|eventually|someday|future)\b/gi
      },

      ownership: {
        personal: /\b(I|my|me)\b/gi,
        collective: /\b(we|our|us)\b/gi,
        deflective: /\b(they|them|their)\b/gi
      }
    };

    const analysis = {};

    Object.entries(patterns).forEach(([category, subpatterns]) => {
      analysis[category] = {};
      Object.entries(subpatterns).forEach(([level, pattern]) => {
        const matches = text.match(pattern) || [];
        analysis[category][level] = {
          count: matches.length,
          percentage: (matches.length / text.split(/\s+/).length) * 100
        };
      });
    });

    return analysis;
  },

  // Emotion detection
  detectEmotions(text) {
    const emotions = {
      anger: /\b(angry|furious|mad|pissed|outraged|frustrated)\b/gi,
      fear: /\b(afraid|scared|worried|anxious|concerned|nervous)\b/gi,
      sadness: /\b(sad|disappointed|unhappy|depressed|upset)\b/gi,
      joy: /\b(happy|excited|pleased|delighted|thrilled)\b/gi,
      trust: /\b(trust|believe|confident|faith|rely)\b/gi,
      disgust: /\b(disgusted|revolted|repulsed|sick)\b/gi,
      surprise: /\b(surprised|shocked|amazed|astonished)\b/gi
    };

    const detected = {};
    let totalEmotions = 0;

    Object.entries(emotions).forEach(([emotion, pattern]) => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0) {
        detected[emotion] = matches.length;
        totalEmotions += matches.length;
      }
    });

    // Calculate emotional tone
    const tone = this.calculateEmotionalTone(detected);

    return {
      emotions: detected,
      total: totalEmotions,
      tone,
      volatility: this.calculateEmotionalVolatility(detected)
    };
  },

  // Calculate emotional tone
  calculateEmotionalTone(emotions) {
    const positive = (emotions.joy || 0) + (emotions.trust || 0);
    const negative = (emotions.anger || 0) + (emotions.fear || 0) +
                    (emotions.sadness || 0) + (emotions.disgust || 0);

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  },

  // Risk assessment
  assessRisk(analysis) {
    const riskFactors = {
      manipulation: analysis.manipulation_count * 0.3,
      biases: analysis.bias_count * 0.2,
      emotional_volatility: analysis.emotions.volatility * 0.15,
      power_imbalance: Math.abs(analysis.power_dynamics.balance) * 0.2,
      commitment_weakness: analysis.linguistic.commitment.weak.percentage * 0.15
    };

    const totalRisk = Object.values(riskFactors).reduce((sum, risk) => sum + risk, 0);

    return {
      level: totalRisk > 0.7 ? 'critical' :
             totalRisk > 0.5 ? 'high' :
             totalRisk > 0.3 ? 'medium' : 'low',
      score: totalRisk,
      factors: riskFactors,
      mitigation: this.suggestMitigation(riskFactors)
    };
  },

  // Suggest mitigation strategies
  suggestMitigation(riskFactors) {
    const strategies = [];

    if (riskFactors.manipulation > 0.2) {
      strategies.push({
        risk: 'Manipulation detected',
        action: 'Document all conversations. Request written confirmations.',
        priority: 'high'
      });
    }

    if (riskFactors.power_imbalance > 0.15) {
      strategies.push({
        risk: 'Power imbalance',
        action: 'Bring in support. Consider BATNA. Set clear boundaries.',
        priority: 'medium'
      });
    }

    if (riskFactors.emotional_volatility > 0.1) {
      strategies.push({
        risk: 'High emotions',
        action: 'Take breaks. Focus on facts. Use cooling-off periods.',
        priority: 'medium'
      });
    }

    return strategies;
  },

  // Generate actionable recommendations
  generateRecommendations(analysis) {
    const recommendations = [];

    // Based on success probability
    if (analysis.success_probability < 0.3) {
      recommendations.push({
        type: 'critical',
        text: 'Consider walking away. Success probability is very low.',
        action: 'Evaluate your BATNA (Best Alternative to Negotiated Agreement)'
      });
    }

    // Based on manipulation
    if (analysis.manipulation_detected) {
      recommendations.push({
        type: 'warning',
        text: 'Manipulation tactics detected. Proceed with caution.',
        action: 'Counter with facts and documentation'
      });
    }

    // Based on stage
    if (analysis.current_stage === 'bargaining' && !analysis.value_creation) {
      recommendations.push({
        type: 'suggestion',
        text: 'Focus on creating value, not just claiming it.',
        action: 'Identify mutual gains and win-win solutions'
      });
    }

    // Based on emotions
    if (analysis.emotions.tone === 'negative') {
      recommendations.push({
        type: 'tactical',
        text: 'Negative emotional climate detected.',
        action: 'Build rapport. Find common ground. Use positive framing.'
      });
    }

    return recommendations;
  },

  // Comparative analysis with historical negotiations
  compareWithHistory(currentAnalysis, historicalData) {
    const comparison = {
      vs_successful: {},
      vs_failed: {},
      patterns_matched: [],
      prediction: null
    };

    // Compare with successful negotiations
    const successful = historicalData.filter(h => h.outcome === 'success');
    const failed = historicalData.filter(h => h.outcome === 'failure');

    // Pattern matching
    successful.forEach(negotiation => {
      const similarity = this.calculateSimilarity(currentAnalysis, negotiation);
      if (similarity > 0.7) {
        comparison.patterns_matched.push({
          type: 'success_pattern',
          similarity,
          key_factors: negotiation.key_success_factors
        });
      }
    });

    failed.forEach(negotiation => {
      const similarity = this.calculateSimilarity(currentAnalysis, negotiation);
      if (similarity > 0.7) {
        comparison.patterns_matched.push({
          type: 'failure_pattern',
          similarity,
          warning_signs: negotiation.failure_reasons
        });
      }
    });

    // Make prediction
    const successPatterns = comparison.patterns_matched.filter(p => p.type === 'success_pattern').length;
    const failurePatterns = comparison.patterns_matched.filter(p => p.type === 'failure_pattern').length;

    if (successPatterns > failurePatterns) {
      comparison.prediction = 'likely_success';
    } else if (failurePatterns > successPatterns) {
      comparison.prediction = 'likely_failure';
    } else {
      comparison.prediction = 'uncertain';
    }

    return comparison;
  },

  // Real-time analysis during negotiation
  analyzeInRealTime(transcript, previousState = null) {
    const currentAnalysis = {
      timestamp: Date.now(),
      segment: transcript,

      // Immediate flags
      red_flags: this.detectRedFlags(transcript),
      opportunities: this.detectOpportunities(transcript),

      // Tactical suggestions
      next_move: this.suggestNextMove(transcript, previousState),

      // Dynamic scoring
      current_position: this.evaluatePosition(transcript),
      momentum: previousState ?
        this.calculateMomentum(previousState, transcript) : 'neutral'
    };

    return currentAnalysis;
  },

  // Detect red flags in real-time
  detectRedFlags(text) {
    const redFlags = [];

    // Check for ultimatums
    if (/\b(or else|final offer|take it or leave it)\b/i.test(text)) {
      redFlags.push({
        type: 'ultimatum',
        severity: 'high',
        response: 'Request time to consider. Explore alternatives.'
      });
    }

    // Check for aggression
    if (/\b(stupid|idiotic|waste of time|ridiculous)\b/i.test(text)) {
      redFlags.push({
        type: 'aggression',
        severity: 'medium',
        response: 'Stay calm. Refocus on objectives.'
      });
    }

    // Check for deception indicators
    if (/\b(honestly|to be honest|trust me|believe me)\b/i.test(text)) {
      redFlags.push({
        type: 'possible_deception',
        severity: 'low',
        response: 'Verify claims independently.'
      });
    }

    return redFlags;
  },

  // Detect opportunities
  detectOpportunities(text) {
    const opportunities = [];

    // Check for flexibility
    if (/\b(open to|willing to consider|flexible|negotiate)\b/i.test(text)) {
      opportunities.push({
        type: 'flexibility',
        action: 'Explore win-win solutions'
      });
    }

    // Check for needs expression
    if (/\b(need|require|important to us|priority)\b/i.test(text)) {
      opportunities.push({
        type: 'needs_revealed',
        action: 'Address their needs while protecting your interests'
      });
    }

    // Check for agreement signals
    if (/\b(agree|yes|correct|right|exactly)\b/i.test(text)) {
      opportunities.push({
        type: 'agreement',
        action: 'Build on this consensus'
      });
    }

    return opportunities;
  },

  // Suggest next tactical move
  suggestNextMove(currentText, previousState) {
    const suggestions = [];

    // If they made an offer
    if (/\b(offer|propose|suggest)\b/i.test(currentText)) {
      suggestions.push({
        tactic: 'counter_offer',
        script: 'I appreciate your offer. Let me propose an alternative that addresses both our needs...'
      });
    }

    // If tension is high
    if (previousState && previousState.tension > 0.7) {
      suggestions.push({
        tactic: 'de_escalation',
        script: 'Let\'s take a step back and focus on our common goals...'
      });
    }

    // If stuck
    if (/\b(stuck|impasse|deadlock)\b/i.test(currentText)) {
      suggestions.push({
        tactic: 'reframe',
        script: 'What if we looked at this from a different angle...'
      });
    }

    return suggestions;
  },

  // Main analysis function
  async analyze(input) {
    const analysis = {
      timestamp: new Date().toISOString(),

      // Text analysis
      linguistic: this.analyzeLinguisticPatterns(input.text),
      emotions: this.detectEmotions(input.text),

      // Pattern detection
      manipulation: this.detectManipulation(input.text),
      biases: this.detectBiases(input.text),
      power_dynamics: this.analyzePowerDynamics(input.text),

      // Risk assessment
      risk: null, // Will be calculated after other analyses

      // Success prediction
      success_probability: 0,

      // Recommendations
      recommendations: [],

      // Comparative analysis
      historical_comparison: null
    };

    // Calculate risk based on all factors
    analysis.risk = this.assessRisk(analysis);

    // Calculate success probability
    analysis.success_probability = this.calculateSuccessProbability(analysis);

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Compare with historical data if available
    if (input.historicalData) {
      analysis.historical_comparison = this.compareWithHistory(analysis, input.historicalData);
    }

    return analysis;
  },

  // Helper functions
  detectManipulation(text) {
    const detected = [];

    Object.entries(this.MANIPULATION_PATTERNS).forEach(([type, pattern]) => {
      pattern.indicators.forEach(indicator => {
        if (text.toLowerCase().includes(indicator.toLowerCase())) {
          detected.push({
            type,
            indicator,
            severity: pattern.severity,
            counter_strategy: pattern.counter
          });
        }
      });
    });

    return detected;
  },

  detectBiases(text) {
    const detected = [];

    Object.entries(this.COGNITIVE_BIASES).forEach(([bias, info]) => {
      info.indicators.forEach(indicator => {
        if (text.toLowerCase().includes(indicator)) {
          detected.push({
            bias,
            description: info.description,
            impact: info.impact
          });
        }
      });
    });

    return detected;
  },

  analyzePowerDynamics(text) {
    const dynamics = {
      dominance: 0,
      submission: 0,
      collaboration: 0,
      competition: 0,
      balance: 0
    };

    // Count indicators
    Object.entries(this.POWER_DYNAMICS).forEach(([style, indicators]) => {
      indicators.verbal.forEach(indicator => {
        if (text.toLowerCase().includes(indicator)) {
          dynamics[style]++;
        }
      });
    });

    // Calculate balance
    dynamics.balance = (dynamics.collaboration - dynamics.competition) /
                      Math.max(1, dynamics.collaboration + dynamics.competition);

    return dynamics;
  },

  calculateSimilarity(analysis1, analysis2) {
    // Simple similarity calculation
    let similarity = 0;
    let factors = 0;

    // Compare emotions
    if (analysis1.emotions.tone === analysis2.emotions.tone) {
      similarity += 0.2;
    }
    factors++;

    // Compare risk levels
    if (analysis1.risk.level === analysis2.risk.level) {
      similarity += 0.3;
    }
    factors++;

    // Compare success probability (within 20%)
    if (Math.abs(analysis1.success_probability - analysis2.success_probability) < 0.2) {
      similarity += 0.3;
    }
    factors++;

    // Compare manipulation presence
    if ((analysis1.manipulation.length > 0) === (analysis2.manipulation.length > 0)) {
      similarity += 0.2;
    }
    factors++;

    return similarity;
  },

  calculateMomentum(previousState, currentText) {
    // Simple momentum calculation
    const previousPositivity = previousState.emotions?.tone === 'positive' ? 1 :
                              previousState.emotions?.tone === 'negative' ? -1 : 0;

    const currentEmotion = this.detectEmotions(currentText);
    const currentPositivity = currentEmotion.tone === 'positive' ? 1 :
                             currentEmotion.tone === 'negative' ? -1 : 0;

    const momentum = currentPositivity - previousPositivity;

    if (momentum > 0) return 'improving';
    if (momentum < 0) return 'deteriorating';
    return 'stable';
  },

  evaluatePosition(text) {
    const position = {
      strength: 0,
      leverage: 0,
      alternatives: 0
    };

    // Check for strength indicators
    if (/\b(strong position|advantage|leverage|upper hand)\b/i.test(text)) {
      position.strength = 0.7;
    }

    // Check for weakness indicators
    if (/\b(desperate|need this|no choice|must have)\b/i.test(text)) {
      position.strength = 0.3;
    }

    // Check for alternatives
    if (/\b(other options|alternatives|plan b|backup)\b/i.test(text)) {
      position.alternatives = 0.8;
    }

    return position;
  },

  evaluateStageProgression(stages) {
    // Evaluate how well negotiation is progressing through stages
    let score = 0;

    if (stages.opening?.completed) score += 0.1;
    if (stages.exploration?.quality > 0.6) score += 0.15;
    if (stages.bargaining?.creative_solutions) score += 0.2;
    if (stages.closing?.clear_agreements) score += 0.15;

    return score;
  },

  calculateEmotionalVolatility(emotions) {
    // Calculate how volatile emotions are
    const emotionCounts = Object.values(emotions);
    if (emotionCounts.length === 0) return 0;

    const mean = emotionCounts.reduce((a, b) => a + b, 0) / emotionCounts.length;
    const variance = emotionCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / emotionCounts.length;

    return Math.sqrt(variance) / Math.max(1, mean); // Coefficient of variation
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NegotiationAnalyzerPro;
}

// Global export
window.NegotiationAnalyzerPro = NegotiationAnalyzerPro;