/* ============================================
   RECOMMENDATION ENGINE
   AI-powered tactical recommendations
   ============================================ */

const RecommendationEngine = {

  // Negotiation tactics database
  TACTICS: {
    opening: {
      build_rapport: {
        description: 'Establish personal connection',
        when_to_use: 'At the beginning, when tension is high, or after conflicts',
        scripts: [
          'Before we dive in, I wanted to acknowledge...',
          'I appreciate you taking the time to...',
          'We both share the goal of...'
        ],
        effectiveness: 0.8
      },

      anchor_high: {
        description: 'Start with ambitious position',
        when_to_use: 'When you have leverage, early in negotiation',
        scripts: [
          'Based on market research, the value is...',
          'Our initial position is...',
          'We typically see this at...'
        ],
        effectiveness: 0.7
      },

      information_gathering: {
        description: 'Ask strategic questions',
        when_to_use: 'Early stages, when unclear about their position',
        scripts: [
          'Help me understand your priorities...',
          'What would success look like for you?',
          'What are your main concerns?'
        ],
        effectiveness: 0.9
      }
    },

    middle_game: {
      trade_offs: {
        description: 'Exchange concessions strategically',
        when_to_use: 'During bargaining phase',
        scripts: [
          'If we can move on X, would you consider Y?',
          'I can work with that if you can help me with...',
          'Let\'s find a middle ground on...'
        ],
        effectiveness: 0.85
      },

      reframing: {
        description: 'Change perspective on issues',
        when_to_use: 'When stuck or facing resistance',
        scripts: [
          'Let\'s look at this differently...',
          'What if we approached it as...',
          'Instead of competing, what if we...'
        ],
        effectiveness: 0.75
      },

      value_creation: {
        description: 'Expand the pie before dividing',
        when_to_use: 'When both sides are entrenched',
        scripts: [
          'What if we could create more value by...',
          'There might be an opportunity to...',
          'Both of us could benefit if...'
        ],
        effectiveness: 0.9
      }
    },

    closing: {
      urgency_creation: {
        description: 'Motivate decision-making',
        when_to_use: 'When close to agreement but stalling',
        scripts: [
          'This offer is valid until...',
          'We have other opportunities that...',
          'The market conditions are changing...'
        ],
        effectiveness: 0.6,
        ethical_warning: 'Use genuinely, not as false pressure'
      },

      trial_close: {
        description: 'Test readiness to commit',
        when_to_use: 'When sensing agreement is near',
        scripts: [
          'How does this sound so far?',
          'Are we moving in the right direction?',
          'What would need to change for this to work?'
        ],
        effectiveness: 0.8
      },

      summarize_and_confirm: {
        description: 'Lock in agreements',
        when_to_use: 'After reaching verbal agreement',
        scripts: [
          'Let me summarize what we\'ve agreed...',
          'To confirm, we\'re aligned on...',
          'I\'ll send a written summary of...'
        ],
        effectiveness: 0.95
      }
    },

    defensive: {
      take_a_break: {
        description: 'Pause to regroup',
        when_to_use: 'When pressured, emotional, or need to consult',
        scripts: [
          'Let\'s take a 15-minute break...',
          'I need to review this with my team...',
          'Can we reconvene tomorrow?'
        ],
        effectiveness: 0.85
      },

      redirect: {
        description: 'Shift focus from weak points',
        when_to_use: 'When questioned on vulnerabilities',
        scripts: [
          'That\'s one perspective, but consider...',
          'Let\'s focus on the bigger picture...',
          'The more important issue is...'
        ],
        effectiveness: 0.7
      },

      conditional_acceptance: {
        description: 'Accept with conditions',
        when_to_use: 'When pressured to agree',
        scripts: [
          'I can agree to that if...',
          'That works, provided that...',
          'Subject to the following conditions...'
        ],
        effectiveness: 0.8
      }
    }
  },

  // Counter-tactics for manipulation
  COUNTER_TACTICS: {
    gaslighting: {
      recognition: 'They deny reality or your experience',
      response: {
        immediate: 'I have documentation that shows...',
        strategic: 'Request everything in writing',
        long_term: 'Keep detailed records of all interactions'
      }
    },

    false_urgency: {
      recognition: 'Artificial deadlines or pressure',
      response: {
        immediate: 'I need time to properly evaluate this',
        strategic: 'What specifically changes after [deadline]?',
        long_term: 'Always have a BATNA ready'
      }
    },

    emotional_manipulation: {
      recognition: 'Using guilt, shame, or personal attacks',
      response: {
        immediate: 'Let\'s keep this professional',
        strategic: 'I\'d like to focus on the business aspects',
        long_term: 'Document inappropriate behavior'
      }
    },

    bait_and_switch: {
      recognition: 'Changing terms after agreement',
      response: {
        immediate: 'This differs from what we discussed',
        strategic: 'I\'ll need to review the original agreement',
        long_term: 'Always get commitments in writing'
      }
    }
  },

  // Generate recommendations based on analysis
  generateRecommendations(analysis, context = {}) {
    const recommendations = [];

    // Stage-based recommendations
    const stageRecs = this.getStageRecommendations(analysis.stage, analysis);
    recommendations.push(...stageRecs);

    // Situation-based recommendations
    const situationRecs = this.getSituationRecommendations(analysis);
    recommendations.push(...situationRecs);

    // Counter-tactic recommendations
    if (analysis.manipulation && analysis.manipulation.length > 0) {
      const counterRecs = this.getCounterTactics(analysis.manipulation);
      recommendations.push(...counterRecs);
    }

    // Risk-based recommendations
    if (analysis.risk && analysis.risk.level !== 'low') {
      const riskRecs = this.getRiskMitigation(analysis.risk);
      recommendations.push(...riskRecs);
    }

    // Opportunity-based recommendations
    const opportunityRecs = this.identifyOpportunities(analysis);
    recommendations.push(...opportunityRecs);

    // Sort by priority
    return this.prioritizeRecommendations(recommendations, context);
  },

  // Get stage-specific recommendations
  getStageRecommendations(stage, analysis) {
    const recommendations = [];

    switch(stage) {
      case 'opening':
        if (analysis.emotions?.tone === 'negative') {
          recommendations.push({
            tactic: 'build_rapport',
            priority: 'high',
            reasoning: 'Negative emotional tone detected - build rapport first',
            ...this.TACTICS.opening.build_rapport
          });
        }
        recommendations.push({
          tactic: 'information_gathering',
          priority: 'medium',
          reasoning: 'Early stage - gather intelligence',
          ...this.TACTICS.opening.information_gathering
        });
        break;

      case 'exploration':
        recommendations.push({
          tactic: 'value_creation',
          priority: 'high',
          reasoning: 'Exploration phase - look for mutual gains',
          ...this.TACTICS.middle_game.value_creation
        });
        break;

      case 'bargaining':
        if (analysis.deadlock_risk > 0.5) {
          recommendations.push({
            tactic: 'reframing',
            priority: 'high',
            reasoning: 'High deadlock risk - reframe the discussion',
            ...this.TACTICS.middle_game.reframing
          });
        }
        recommendations.push({
          tactic: 'trade_offs',
          priority: 'medium',
          reasoning: 'Bargaining phase - explore trade-offs',
          ...this.TACTICS.middle_game.trade_offs
        });
        break;

      case 'closing':
        recommendations.push({
          tactic: 'summarize_and_confirm',
          priority: 'critical',
          reasoning: 'Closing phase - lock in agreements',
          ...this.TACTICS.closing.summarize_and_confirm
        });
        if (analysis.commitment_level < 0.7) {
          recommendations.push({
            tactic: 'trial_close',
            priority: 'high',
            reasoning: 'Low commitment detected - test readiness',
            ...this.TACTICS.closing.trial_close
          });
        }
        break;
    }

    return recommendations;
  },

  // Get situation-specific recommendations
  getSituationRecommendations(analysis) {
    const recommendations = [];

    // High pressure situation
    if (analysis.pressure_level > 0.7) {
      recommendations.push({
        tactic: 'take_a_break',
        priority: 'critical',
        reasoning: 'High pressure detected - take time to think',
        ...this.TACTICS.defensive.take_a_break
      });
    }

    // Power imbalance
    if (analysis.power_dynamics?.balance < -0.3) {
      recommendations.push({
        tactic: 'coalition_building',
        priority: 'high',
        reasoning: 'Power imbalance detected - build coalition',
        description: 'Bring in allies or stakeholders',
        scripts: [
          'I\'d like to involve [stakeholder] in this discussion',
          'This affects multiple departments, we should include...',
          'Let me bring in our technical expert to address...'
        ]
      });
    }

    // Emotional escalation
    if (analysis.emotions?.volatility > 0.6) {
      recommendations.push({
        tactic: 'de-escalation',
        priority: 'critical',
        reasoning: 'High emotional volatility - de-escalate',
        description: 'Calm the situation',
        scripts: [
          'I can see this is important to both of us',
          'Let\'s take a step back and look at our common goals',
          'I understand your frustration, let\'s work through this'
        ]
      });
    }

    return recommendations;
  },

  // Get counter-tactics for detected manipulation
  getCounterTactics(manipulations) {
    const recommendations = [];

    manipulations.forEach(manipulation => {
      const counter = this.COUNTER_TACTICS[manipulation.type];
      if (counter) {
        recommendations.push({
          type: 'counter_tactic',
          priority: 'critical',
          manipulation_type: manipulation.type,
          reasoning: `Counter ${manipulation.type} tactic detected`,
          ...counter.response
        });
      }
    });

    return recommendations;
  },

  // Get risk mitigation strategies
  getRiskMitigation(risk) {
    const recommendations = [];

    if (risk.level === 'critical') {
      recommendations.push({
        type: 'risk_mitigation',
        priority: 'critical',
        action: 'Consider walking away',
        reasoning: 'Critical risk level - protect yourself',
        scripts: [
          'I need to reconsider if this aligns with our goals',
          'The risks seem to outweigh the benefits',
          'Let\'s revisit when conditions are more favorable'
        ]
      });
    }

    // Specific risk factors
    if (risk.factors.manipulation > 0.2) {
      recommendations.push({
        type: 'risk_mitigation',
        priority: 'high',
        action: 'Document everything',
        reasoning: 'High manipulation risk - create paper trail',
        steps: [
          'Record all conversations (if legal)',
          'Follow up meetings with email summaries',
          'Get all commitments in writing'
        ]
      });
    }

    if (risk.factors.commitment_weakness > 0.2) {
      recommendations.push({
        type: 'risk_mitigation',
        priority: 'medium',
        action: 'Strengthen commitments',
        reasoning: 'Weak commitment language detected',
        scripts: [
          'Can we make this more specific?',
          'What exactly does "try" mean in this context?',
          'I need a firm commitment on...'
        ]
      });
    }

    return recommendations;
  },

  // Identify opportunities in the negotiation
  identifyOpportunities(analysis) {
    const opportunities = [];

    // Value creation opportunity
    if (analysis.collaboration_level > 0.6 && !analysis.value_creation_explored) {
      opportunities.push({
        type: 'opportunity',
        priority: 'high',
        action: 'Explore value creation',
        reasoning: 'High collaboration but value not maximized',
        scripts: [
          'What if we could both benefit by...',
          'Have we considered combining our resources to...',
          'There might be synergies if we...'
        ]
      });
    }

    // Trust building opportunity
    if (analysis.trust_indicators > 0 && analysis.trust_indicators < 5) {
      opportunities.push({
        type: 'opportunity',
        priority: 'medium',
        action: 'Build trust',
        reasoning: 'Some trust exists - can be strengthened',
        scripts: [
          'I appreciate your transparency on...',
          'Let me share something confidential...',
          'We\'ve worked well together on...'
        ]
      });
    }

    // Information asymmetry opportunity
    if (analysis.information_gaps?.length > 0) {
      opportunities.push({
        type: 'opportunity',
        priority: 'high',
        action: 'Gather missing information',
        reasoning: 'Information gaps identified',
        questions: analysis.information_gaps.map(gap =>
          `What is your position on ${gap}?`
        )
      });
    }

    return opportunities;
  },

  // Prioritize recommendations
  prioritizeRecommendations(recommendations, context) {
    // Assign scores
    const scored = recommendations.map(rec => {
      let score = 0;

      // Priority scoring
      switch(rec.priority) {
        case 'critical': score += 100; break;
        case 'high': score += 75; break;
        case 'medium': score += 50; break;
        case 'low': score += 25; break;
      }

      // Context relevance
      if (context.time_pressure && rec.tactic === 'take_a_break') {
        score += 20;
      }

      if (context.relationship_importance && rec.tactic === 'build_rapport') {
        score += 30;
      }

      // Effectiveness
      if (rec.effectiveness) {
        score += rec.effectiveness * 50;
      }

      return { ...rec, score };
    });

    // Sort by score
    return scored.sort((a, b) => b.score - a.score);
  },

  // Generate real-time tactical advice
  getRealTimeTactic(currentStatement, negotiationState) {
    const tactics = [];

    // Analyze the current statement
    const statementType = this.classifyStatement(currentStatement);

    switch(statementType) {
      case 'offer':
        tactics.push({
          action: 'Evaluate carefully',
          response: 'Let me review this against our objectives...',
          next_steps: [
            'Compare to your BATNA',
            'Identify what\'s missing',
            'Prepare counter-offer'
          ]
        });
        break;

      case 'threat':
        tactics.push({
          action: 'Don\'t react emotionally',
          response: 'I understand your position. Let\'s explore alternatives...',
          next_steps: [
            'Assess credibility of threat',
            'Prepare walkaway option',
            'Seek common ground'
          ]
        });
        break;

      case 'question':
        tactics.push({
          action: 'Answer strategically',
          response: 'That\'s a good question. Here\'s what I can share...',
          next_steps: [
            'Decide what to reveal',
            'Ask reciprocal question',
            'Guide conversation back'
          ]
        });
        break;

      case 'concession':
        tactics.push({
          action: 'Acknowledge and reciprocate carefully',
          response: 'I appreciate that movement. In return...',
          next_steps: [
            'Value the concession',
            'Make smaller reciprocal move',
            'Bank goodwill'
          ]
        });
        break;
    }

    return tactics;
  },

  // Classify statement type
  classifyStatement(statement) {
    const lower = statement.toLowerCase();

    if (/\b(offer|propose|suggest)\b/.test(lower)) return 'offer';
    if (/\b(or else|otherwise|if not)\b/.test(lower)) return 'threat';
    if (lower.includes('?')) return 'question';
    if (/\b(willing to|can|could|might)\b/.test(lower)) return 'concession';
    if (/\b(no|never|won\'t|can\'t)\b/.test(lower)) return 'rejection';

    return 'statement';
  },

  // Generate negotiation script
  generateScript(situation, objective) {
    const script = {
      opening: '',
      main_points: [],
      responses_to_objections: {},
      closing: ''
    };

    // Opening based on situation
    if (situation.relationship === 'new') {
      script.opening = 'Thank you for taking the time to meet. I believe we have an opportunity to create mutual value...';
    } else {
      script.opening = 'Good to see you again. Building on our previous discussions...';
    }

    // Main points based on objective
    switch(objective) {
      case 'price_increase':
        script.main_points = [
          'Market conditions have changed significantly',
          'Our costs have increased by X%',
          'The value we provide has expanded'
        ];
        script.responses_to_objections = {
          'too_expensive': 'Let\'s look at the total value, not just the price',
          'budget_constraints': 'We can explore payment terms or phased implementation',
          'competitor_cheaper': 'You\'re right about price, but consider the total cost of ownership'
        };
        break;

      case 'new_deal':
        script.main_points = [
          'We\'ve identified an opportunity that aligns with your goals',
          'The expected ROI is...',
          'We can start with a pilot to prove value'
        ];
        script.responses_to_objections = {
          'not_interested': 'What would make this interesting for you?',
          'bad_timing': 'When would be a better time to revisit?',
          'no_budget': 'Let\'s explore creative funding options'
        };
        break;
    }

    // Closing
    script.closing = 'What questions do you have? What would need to be true for us to move forward?';

    return script;
  },

  // Success pattern recognition
  identifySuccessPatterns(historicalNegotiations) {
    const patterns = {
      successful: {},
      failed: {}
    };

    // Analyze successful negotiations
    historicalNegotiations.filter(n => n.outcome === 'success').forEach(negotiation => {
      // Extract patterns
      if (negotiation.tactics_used) {
        negotiation.tactics_used.forEach(tactic => {
          patterns.successful[tactic] = (patterns.successful[tactic] || 0) + 1;
        });
      }
    });

    // Analyze failed negotiations
    historicalNegotiations.filter(n => n.outcome === 'failure').forEach(negotiation => {
      if (negotiation.mistakes) {
        negotiation.mistakes.forEach(mistake => {
          patterns.failed[mistake] = (patterns.failed[mistake] || 0) + 1;
        });
      }
    });

    return patterns;
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecommendationEngine;
}

// Global export
window.RecommendationEngine = RecommendationEngine;