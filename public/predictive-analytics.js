/* ============================================
   PREDICTIVE ANALYTICS MODULE
   Machine learning-based predictions for negotiations
   ============================================ */

const PredictiveAnalytics = {

  // Historical patterns database
  historicalPatterns: {
    successful: {
      avg_duration: 5.2, // days
      avg_meetings: 3.4,
      avg_concessions: 2.1,
      common_tactics: ['value_creation', 'trade_offs', 'rapport_building'],
      emotional_progression: ['neutral', 'positive', 'collaborative'],
      power_balance: 0.15 // slightly positive
    },
    failed: {
      avg_duration: 8.7, // days
      avg_meetings: 5.2,
      avg_concessions: 0.8,
      common_issues: ['ultimatums', 'manipulation', 'no_value_creation'],
      emotional_progression: ['negative', 'confrontational', 'breakdown'],
      power_balance: -0.45 // negative imbalance
    }
  },

  // Prediction models
  models: {
    // Success probability model
    successProbability: {
      weights: {
        emotional_tone: 0.25,
        manipulation_absence: 0.20,
        collaboration_level: 0.20,
        value_creation: 0.15,
        trust_indicators: 0.10,
        clear_communication: 0.10
      },

      calculate(features) {
        let probability = 0.5; // Base probability

        Object.entries(this.weights).forEach(([feature, weight]) => {
          if (features[feature] !== undefined) {
            probability += features[feature] * weight;
          }
        });

        // Apply sigmoid to keep between 0 and 1
        return 1 / (1 + Math.exp(-probability));
      }
    },

    // Deal size predictor
    dealSizePredictor: {
      factors: {
        initial_anchor: 0.3,
        negotiation_skill: 0.2,
        market_conditions: 0.2,
        relationship_quality: 0.15,
        urgency_level: 0.15
      },

      predict(inputs) {
        const baseValue = inputs.initial_offer || 0;
        let adjustment = 1.0;

        // Skill adjustment
        if (inputs.negotiation_skill > 0.7) adjustment += 0.15;
        if (inputs.negotiation_skill < 0.3) adjustment -= 0.20;

        // Relationship adjustment
        if (inputs.relationship_quality > 0.8) adjustment += 0.10;

        // Urgency adjustment (inverse - high urgency = lower price)
        if (inputs.urgency_level > 0.7) adjustment -= 0.15;

        return {
          predicted: baseValue * adjustment,
          confidence: this.calculateConfidence(inputs),
          range: {
            min: baseValue * (adjustment - 0.2),
            max: baseValue * (adjustment + 0.2)
          }
        };
      },

      calculateConfidence(inputs) {
        // More data = higher confidence
        const dataCompleteness = Object.keys(inputs).length / Object.keys(this.factors).length;
        return Math.min(0.95, dataCompleteness * 0.8 + 0.15);
      }
    },

    // Timeline predictor
    timelinePredictor: {
      baseTimeline: 14, // days

      predict(negotiation) {
        let timeline = this.baseTimeline;

        // Complexity factors
        if (negotiation.num_stakeholders > 3) timeline += 7;
        if (negotiation.num_issues > 5) timeline += 5;
        if (negotiation.legal_review_required) timeline += 10;

        // Acceleration factors
        if (negotiation.urgency === 'high') timeline *= 0.6;
        if (negotiation.pre_existing_relationship) timeline *= 0.8;
        if (negotiation.clear_mandate) timeline *= 0.9;

        // Deceleration factors
        if (negotiation.cultural_differences) timeline *= 1.3;
        if (negotiation.multiple_decision_makers) timeline *= 1.4;

        return {
          days: Math.round(timeline),
          confidence: this.calculateTimelineConfidence(negotiation),
          milestones: this.generateMilestones(timeline)
        };
      },

      calculateTimelineConfidence(negotiation) {
        // Historical accuracy check
        const similarNegotiations = this.findSimilarNegotiations(negotiation);
        if (similarNegotiations.length > 10) return 0.85;
        if (similarNegotiations.length > 5) return 0.70;
        return 0.50;
      },

      generateMilestones(totalDays) {
        return [
          { day: Math.round(totalDays * 0.2), milestone: 'Initial proposals exchanged' },
          { day: Math.round(totalDays * 0.4), milestone: 'Key issues identified' },
          { day: Math.round(totalDays * 0.6), milestone: 'Major points agreed' },
          { day: Math.round(totalDays * 0.8), milestone: 'Final negotiations' },
          { day: totalDays, milestone: 'Deal closed' }
        ];
      },

      findSimilarNegotiations(negotiation) {
        // Placeholder - would query historical database
        return [];
      }
    },

    // Risk predictor
    riskPredictor: {
      riskFactors: {
        manipulation_detected: { weight: 0.3, threshold: 1 },
        emotional_volatility: { weight: 0.2, threshold: 0.6 },
        power_imbalance: { weight: 0.2, threshold: 0.5 },
        communication_breakdown: { weight: 0.15, threshold: 0.4 },
        trust_violations: { weight: 0.15, threshold: 1 }
      },

      assess(negotiation) {
        let totalRisk = 0;
        const detectedRisks = [];

        Object.entries(this.riskFactors).forEach(([factor, config]) => {
          const value = negotiation[factor] || 0;
          if (value >= config.threshold) {
            const risk = value * config.weight;
            totalRisk += risk;
            detectedRisks.push({
              factor,
              severity: risk,
              mitigation: this.getMitigation(factor)
            });
          }
        });

        return {
          level: this.categorizeRisk(totalRisk),
          score: totalRisk,
          factors: detectedRisks,
          trend: this.calculateTrend(negotiation),
          prediction: this.predictOutcome(totalRisk)
        };
      },

      categorizeRisk(score) {
        if (score > 0.7) return 'critical';
        if (score > 0.5) return 'high';
        if (score > 0.3) return 'medium';
        return 'low';
      },

      getMitigation(factor) {
        const mitigations = {
          manipulation_detected: 'Document everything, seek third-party mediation',
          emotional_volatility: 'Take breaks, focus on facts',
          power_imbalance: 'Build coalition, improve BATNA',
          communication_breakdown: 'Clarify understanding, use written summaries',
          trust_violations: 'Address directly, rebuild with small steps'
        };
        return mitigations[factor] || 'Monitor closely';
      },

      calculateTrend(negotiation) {
        // Compare with previous state
        if (!negotiation.previous_state) return 'stable';

        const currentRisk = this.assess(negotiation).score;
        const previousRisk = this.assess(negotiation.previous_state).score;

        if (currentRisk > previousRisk + 0.1) return 'worsening';
        if (currentRisk < previousRisk - 0.1) return 'improving';
        return 'stable';
      },

      predictOutcome(riskScore) {
        if (riskScore > 0.7) return { outcome: 'likely_failure', confidence: 0.8 };
        if (riskScore > 0.5) return { outcome: 'uncertain', confidence: 0.6 };
        return { outcome: 'likely_success', confidence: 0.75 };
      }
    }
  },

  // Pattern recognition
  recognizePattern(currentNegotiation, historicalData) {
    const patterns = [];

    // Stalemate pattern
    if (this.detectStalemate(currentNegotiation)) {
      patterns.push({
        type: 'stalemate',
        confidence: 0.8,
        description: 'Negotiation showing signs of deadlock',
        recommendation: 'Introduce new value dimensions or consider mediation',
        similar_cases: this.findStalemateResolutions(historicalData)
      });
    }

    // Escalation pattern
    if (this.detectEscalation(currentNegotiation)) {
      patterns.push({
        type: 'escalation',
        confidence: 0.85,
        description: 'Emotional escalation detected',
        recommendation: 'Immediate de-escalation required',
        intervention: 'Suggest a break or change negotiator'
      });
    }

    // Breakthrough pattern
    if (this.detectBreakthrough(currentNegotiation)) {
      patterns.push({
        type: 'breakthrough',
        confidence: 0.75,
        description: 'Conditions favorable for agreement',
        recommendation: 'Push for closure now',
        actions: ['Summarize agreements', 'Set timeline', 'Document commitments']
      });
    }

    // Manipulation pattern
    if (this.detectManipulationPattern(currentNegotiation)) {
      patterns.push({
        type: 'manipulation',
        confidence: 0.9,
        description: 'Systematic manipulation detected',
        recommendation: 'Consider walking away or bringing in support',
        evidence: currentNegotiation.manipulation_instances
      });
    }

    return patterns;
  },

  // Pattern detection functions
  detectStalemate(negotiation) {
    const indicators = [
      negotiation.rounds_without_progress > 2,
      negotiation.position_changes < 0.1,
      negotiation.repetitive_arguments > 3
    ];
    return indicators.filter(Boolean).length >= 2;
  },

  detectEscalation(negotiation) {
    return negotiation.emotional_intensity > 0.7 &&
           negotiation.emotional_trend === 'worsening' &&
           negotiation.confrontational_language > 0.5;
  },

  detectBreakthrough(negotiation) {
    return negotiation.recent_concessions > 0 &&
           negotiation.positive_signals > 3 &&
           negotiation.agreement_language > 0.6;
  },

  detectManipulationPattern(negotiation) {
    return negotiation.manipulation_instances > 3 &&
           negotiation.manipulation_variety > 2;
  },

  // Outcome prediction with confidence intervals
  predictOutcome(negotiation) {
    const features = this.extractFeatures(negotiation);
    const successProb = this.models.successProbability.calculate(features);

    // Calculate confidence based on data quality
    const confidence = this.calculatePredictionConfidence(negotiation);

    // Generate scenarios
    const scenarios = this.generateScenarios(negotiation, successProb);

    return {
      success_probability: successProb,
      confidence,
      likely_outcome: successProb > 0.6 ? 'success' : successProb > 0.4 ? 'uncertain' : 'failure',
      scenarios,
      key_factors: this.identifyKeyFactors(features),
      recommendation: this.generateStrategicRecommendation(successProb, features)
    };
  },

  // Extract features for prediction
  extractFeatures(negotiation) {
    return {
      emotional_tone: this.calculateEmotionalTone(negotiation),
      manipulation_absence: 1 - (negotiation.manipulation_count || 0) / 10,
      collaboration_level: negotiation.collaboration_score || 0,
      value_creation: negotiation.value_creation_attempts || 0,
      trust_indicators: negotiation.trust_score || 0,
      clear_communication: 1 - (negotiation.misunderstandings || 0) / 10
    };
  },

  calculateEmotionalTone(negotiation) {
    const emotions = negotiation.emotions || {};
    const positive = (emotions.positive || 0);
    const negative = (emotions.negative || 0);
    return (positive - negative) / Math.max(1, positive + negative);
  },

  // Calculate prediction confidence
  calculatePredictionConfidence(negotiation) {
    let confidence = 0.5; // Base confidence

    // More data points = higher confidence
    if (negotiation.data_points > 100) confidence += 0.2;
    else if (negotiation.data_points > 50) confidence += 0.1;

    // Historical similar cases
    if (negotiation.similar_historical_cases > 10) confidence += 0.15;

    // Recent data is more reliable
    if (negotiation.last_updated < 3600000) confidence += 0.1; // Within last hour

    return Math.min(0.95, confidence);
  },

  // Generate possible scenarios
  generateScenarios(negotiation, baseSuccessProb) {
    return [
      {
        name: 'Best Case',
        probability: baseSuccessProb * 1.3,
        description: 'If positive trends continue',
        outcome: 'Quick agreement with favorable terms',
        conditions: ['Maintain collaboration', 'Build on trust', 'Create value']
      },
      {
        name: 'Most Likely',
        probability: baseSuccessProb,
        description: 'Current trajectory',
        outcome: 'Agreement with compromise',
        conditions: ['Continue current approach', 'Address key concerns']
      },
      {
        name: 'Worst Case',
        probability: baseSuccessProb * 0.5,
        description: 'If negative factors dominate',
        outcome: 'No agreement or unfavorable terms',
        conditions: ['Escalation occurs', 'Trust breaks down', 'Positions harden']
      }
    ].map(s => ({ ...s, probability: Math.min(1, Math.max(0, s.probability)) }));
  },

  // Identify key success factors
  identifyKeyFactors(features) {
    const factors = Object.entries(features)
      .map(([key, value]) => ({
        factor: key,
        impact: value * this.models.successProbability.weights[key],
        current_value: value
      }))
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
      positive: factors.filter(f => f.impact > 0).slice(0, 3),
      negative: factors.filter(f => f.impact < 0).slice(0, 3),
      improvement_opportunities: factors
        .filter(f => f.current_value < 0.5 && this.models.successProbability.weights[f.factor] > 0.1)
        .map(f => ({
          factor: f.factor,
          potential_impact: (1 - f.current_value) * this.models.successProbability.weights[f.factor],
          action: this.getImprovementAction(f.factor)
        }))
    };
  },

  // Get improvement action for a factor
  getImprovementAction(factor) {
    const actions = {
      emotional_tone: 'Build rapport, use positive language',
      collaboration_level: 'Propose joint problem-solving',
      value_creation: 'Explore mutual gains',
      trust_indicators: 'Share information, follow through on commitments',
      clear_communication: 'Summarize understanding, ask clarifying questions'
    };
    return actions[factor] || 'Focus on improvement';
  },

  // Generate strategic recommendation
  generateStrategicRecommendation(successProb, features) {
    if (successProb > 0.7) {
      return {
        strategy: 'Push for closure',
        tactics: ['Summarize agreements', 'Set deadlines', 'Document commitments'],
        caution: 'Avoid introducing new issues'
      };
    } else if (successProb > 0.4) {
      return {
        strategy: 'Build momentum',
        tactics: ['Address concerns', 'Create value', 'Find common ground'],
        caution: 'Monitor for manipulation'
      };
    } else {
      return {
        strategy: 'Reassess approach',
        tactics: ['Consider alternatives', 'Strengthen BATNA', 'Seek mediation'],
        caution: 'Prepare to walk away'
      };
    }
  },

  // Anomaly detection
  detectAnomalies(negotiation, historicalBaseline) {
    const anomalies = [];

    // Duration anomaly
    if (negotiation.duration > historicalBaseline.avg_duration * 2) {
      anomalies.push({
        type: 'duration',
        severity: 'medium',
        description: 'Negotiation taking unusually long',
        action: 'Investigate blockers'
      });
    }

    // Behavior anomaly
    if (negotiation.behavior_change > 0.5) {
      anomalies.push({
        type: 'behavior',
        severity: 'high',
        description: 'Sudden behavior change detected',
        action: 'Verify authenticity, check for new stakeholders'
      });
    }

    // Pattern anomaly
    if (negotiation.unexpected_patterns > 2) {
      anomalies.push({
        type: 'pattern',
        severity: 'medium',
        description: 'Unusual negotiation patterns',
        action: 'Review strategy, consider external factors'
      });
    }

    return anomalies;
  },

  // Generate insights report
  generateInsightsReport(negotiation) {
    const prediction = this.predictOutcome(negotiation);
    const patterns = this.recognizePattern(negotiation, []);
    const risks = this.models.riskPredictor.assess(negotiation);
    const timeline = this.models.timelinePredictor.predict(negotiation);

    return {
      executive_summary: {
        success_probability: `${Math.round(prediction.success_probability * 100)}%`,
        risk_level: risks.level,
        expected_timeline: `${timeline.days} days`,
        key_recommendation: prediction.recommendation.strategy
      },
      detailed_analysis: {
        outcome_prediction: prediction,
        pattern_recognition: patterns,
        risk_assessment: risks,
        timeline_projection: timeline
      },
      action_items: this.prioritizeActions(prediction, patterns, risks),
      monitoring_points: this.identifyMonitoringPoints(negotiation)
    };
  },

  // Prioritize actions
  prioritizeActions(prediction, patterns, risks) {
    const actions = [];

    // High-priority actions based on risks
    if (risks.level === 'critical' || risks.level === 'high') {
      actions.push({
        priority: 'critical',
        action: risks.factors[0].mitigation,
        deadline: 'immediate'
      });
    }

    // Pattern-based actions
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        actions.push({
          priority: 'high',
          action: pattern.recommendation,
          deadline: '24 hours'
        });
      }
    });

    // Improvement opportunities
    prediction.key_factors.improvement_opportunities.forEach(opp => {
      if (opp.potential_impact > 0.1) {
        actions.push({
          priority: 'medium',
          action: opp.action,
          deadline: '48 hours'
        });
      }
    });

    return actions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  },

  // Identify monitoring points
  identifyMonitoringPoints(negotiation) {
    return [
      {
        metric: 'Emotional tone',
        current: negotiation.emotional_tone,
        threshold: -0.3,
        action_if_breached: 'De-escalation required'
      },
      {
        metric: 'Trust level',
        current: negotiation.trust_score,
        threshold: 0.3,
        action_if_breached: 'Trust rebuilding necessary'
      },
      {
        metric: 'Progress rate',
        current: negotiation.progress_rate,
        threshold: 0.1,
        action_if_breached: 'Strategy revision needed'
      }
    ];
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictiveAnalytics;
}

// Global export
window.PredictiveAnalytics = PredictiveAnalytics;