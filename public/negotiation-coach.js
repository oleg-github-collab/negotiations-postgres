/* ============================================
   REAL-TIME NEGOTIATION COACH
   AI-powered live coaching during negotiations
   ============================================ */

const NegotiationCoach = {

  // Coaching strategies database
  COACHING_STRATEGIES: {
    // Opening strategies
    opening: {
      aggressive: {
        name: 'Aggressive Opening',
        when: 'When you have strong leverage or time pressure',
        scripts: [
          'I need to be direct - we have limited time and specific requirements.',
          'Let me be clear about our position from the start...',
          'We\'ve analyzed the market thoroughly, and here\'s what we need...'
        ],
        risks: ['May damage rapport', 'Could trigger defensive response'],
        counters: ['If met with resistance, soften with "I appreciate your position..."']
      },

      collaborative: {
        name: 'Collaborative Opening',
        when: 'When building long-term relationship is priority',
        scripts: [
          'I\'m looking forward to finding a solution that works for both of us.',
          'Let\'s explore how we can create mutual value here.',
          'I believe we have shared interests we can build on...'
        ],
        risks: ['May be seen as weak', 'Could invite exploitation'],
        counters: ['Set clear boundaries: "While I value collaboration, we do have constraints..."']
      },

      analytical: {
        name: 'Data-Driven Opening',
        when: 'When dealing with analytical counterparts',
        scripts: [
          'I\'ve prepared some data that might help frame our discussion.',
          'Based on market analysis, here are the key factors we should consider.',
          'Let me share the metrics that are driving our position...'
        ],
        risks: ['May seem impersonal', 'Could bog down in details'],
        counters: ['Balance with emotion: "Behind these numbers are real people..."']
      }
    },

    // Objection handling strategies
    objections: {
      price_too_high: {
        responses: [
          'I understand price is a concern. Let\'s look at the total value proposition...',
          'When you factor in [specific benefits], the ROI becomes clear.',
          'What specific budget constraints are you working with?',
          'How do you typically evaluate cost versus value in decisions like this?'
        ],
        advanced: 'Reframe from price to investment: "This isn\'t a cost, it\'s an investment that pays for itself in [timeframe]"'
      },

      need_approval: {
        responses: [
          'I appreciate you need to consult others. What information would help them decide?',
          'Who else needs to be involved, and what are their key concerns?',
          'What would need to happen for you to champion this internally?',
          'Let\'s prepare the business case together for your stakeholders.'
        ],
        advanced: 'Offer to present directly: "Would it help if I joined that discussion to address technical questions?"'
      },

      timing_not_right: {
        responses: [
          'I understand timing is important. What would make the timing right?',
          'What are the consequences of waiting versus moving forward now?',
          'Often the best time to plant a tree was 20 years ago; the second best time is now.',
          'Let\'s explore a phased approach that works with your timeline.'
        ],
        advanced: 'Create urgency: "The market/opportunity won\'t wait. Here\'s what you risk by delaying..."'
      },

      competitor_comparison: {
        responses: [
          'It\'s smart to evaluate options. What criteria matter most to you?',
          'How do you weight different factors in your decision?',
          'Rather than compete on their terms, let me show you our unique strengths.',
          'I respect that you\'re considering alternatives. Here\'s where we differentiate...'
        ],
        advanced: 'Reposition competitors: "They\'re excellent at X, we excel at Y - which matters more to you?"'
      }
    },

    // Closing strategies
    closing: {
      assumptive: {
        name: 'Assumptive Close',
        when: 'When signals are positive throughout',
        scripts: [
          'So, shall we move forward with the quarterly billing option?',
          'I\'ll send over the agreement this afternoon for your signature.',
          'When would you like to schedule the kickoff meeting?'
        ],
        watch_for: ['Hesitation', 'Questions about terms', 'Body language changes']
      },

      urgency: {
        name: 'Urgency Close',
        when: 'When there\'s genuine time sensitivity',
        scripts: [
          'This pricing is only available until [date].',
          'We have limited capacity and are booking for [timeframe].',
          'The market conditions that make this possible won\'t last.'
        ],
        watch_for: ['Skepticism about urgency', 'Request for exceptions', 'Pressure tactics backfiring']
      },

      trial: {
        name: 'Trial Close',
        when: 'When commitment is uncertain',
        scripts: [
          'How about we start with a pilot program?',
          'Let\'s do a 30-day proof of concept.',
          'We could begin with a smaller engagement to prove value.'
        ],
        watch_for: ['Scope creep in trial', 'Unclear success metrics', 'No path to full engagement']
      },

      collaborative: {
        name: 'Collaborative Close',
        when: 'When building consensus',
        scripts: [
          'What would need to be true for this to work for you?',
          'Let\'s design the ideal solution together.',
          'How can we structure this so everyone wins?'
        ],
        watch_for: ['Endless negotiation', 'Loss of deal value', 'Decision paralysis']
      }
    },

    // Power tactics responses
    power_plays: {
      good_cop_bad_cop: {
        detection: ['Sudden personality change', 'One harsh, one friendly', 'Orchestrated conflict'],
        response: 'I appreciate both perspectives. Let\'s focus on the facts and our mutual interests.',
        advanced: 'Address directly: "I sense different approaches here. Who has final decision authority?"'
      },

      anchoring: {
        detection: ['Extreme initial position', 'Unreasonable first offer', 'Setting false expectations'],
        response: 'That\'s one perspective. Let me share how we typically approach this...',
        advanced: 'Re-anchor: "Before we proceed, let\'s establish realistic parameters based on market data..."'
      },

      silence_pressure: {
        detection: ['Extended silence after question', 'Waiting for you to fill void', 'Creating discomfort'],
        response: 'Take your time to consider. [Then match their silence]',
        advanced: 'Use productively: "This silence tells me we\'re at an important juncture. What\'s your biggest concern?"'
      },

      false_deadline: {
        detection: ['Sudden urgency', 'Arbitrary deadline', 'Pressure without clear reason'],
        response: 'Help me understand what\'s driving this timeline.',
        advanced: 'Test it: "If we can\'t meet that deadline, what happens? Let\'s explore alternatives."'
      }
    }
  },

  // Real-time coaching system
  coach(context) {
    const coaching = {
      immediate: [],
      strategic: [],
      warnings: [],
      opportunities: [],
      scripts: [],
      bodyLanguage: []
    };

    // Analyze current situation
    const situation = this.analyzeSituation(context);

    // Generate immediate tactical advice
    coaching.immediate = this.getImmediateTactics(situation);

    // Identify strategic opportunities
    coaching.opportunities = this.identifyOpportunities(situation);

    // Detect manipulation or power plays
    coaching.warnings = this.detectThreats(situation);

    // Provide relevant scripts
    coaching.scripts = this.getRelevantScripts(situation);

    // Body language guidance
    coaching.bodyLanguage = this.getBodyLanguageGuide(situation);

    // Strategic recommendations
    coaching.strategic = this.getStrategicAdvice(situation);

    return coaching;
  },

  // Analyze current negotiation situation
  analyzeSituation(context) {
    return {
      stage: this.detectNegotiationStage(context),
      momentum: this.assessMomentum(context),
      emotional_state: this.assessEmotionalState(context),
      power_balance: this.assessPowerBalance(context),
      risk_level: this.assessRisk(context),
      opportunity_window: this.identifyOpportunityWindow(context)
    };
  },

  // Get immediate tactical advice
  getImmediateTactics(situation) {
    const tactics = [];

    // Stage-specific tactics
    switch (situation.stage) {
      case 'opening':
        tactics.push({
          priority: 'high',
          action: 'Set collaborative tone',
          script: 'I appreciate you taking the time. My goal is to find a solution that works for both of us.'
        });
        break;

      case 'discovery':
        tactics.push({
          priority: 'high',
          action: 'Ask open-ended questions',
          script: 'Help me understand what success looks like from your perspective.'
        });
        break;

      case 'negotiation':
        tactics.push({
          priority: 'high',
          action: 'Trade concessions strategically',
          script: 'If we can agree on X, I might be able to accommodate Y.'
        });
        break;

      case 'closing':
        tactics.push({
          priority: 'critical',
          action: 'Secure commitment',
          script: 'It sounds like we\'re aligned. Shall we move forward?'
        });
        break;
    }

    // Momentum-based tactics
    if (situation.momentum === 'stalled') {
      tactics.push({
        priority: 'high',
        action: 'Break pattern',
        script: 'Let\'s take a step back. What\'s the core issue we\'re trying to solve?'
      });
    }

    if (situation.momentum === 'accelerating') {
      tactics.push({
        priority: 'medium',
        action: 'Maintain pace',
        script: 'Great progress. Let\'s keep this momentum going...'
      });
    }

    return tactics;
  },

  // Identify opportunities
  identifyOpportunities(situation) {
    const opportunities = [];

    if (situation.emotional_state === 'frustrated') {
      opportunities.push({
        type: 'emotional_shift',
        action: 'Show empathy to reset dynamic',
        timing: 'immediate',
        script: 'I sense some frustration. Let\'s make sure we\'re addressing your concerns.'
      });
    }

    if (situation.power_balance < -0.3) {
      opportunities.push({
        type: 'rebalance_power',
        action: 'Introduce new value or alternative',
        timing: 'next_exchange',
        script: 'I haven\'t mentioned this yet, but we also provide...'
      });
    }

    if (situation.opportunity_window === 'open') {
      opportunities.push({
        type: 'advance_position',
        action: 'Make strategic ask',
        timing: 'immediate',
        script: 'Given our alignment on these points, I propose...'
      });
    }

    return opportunities;
  },

  // Detect threats and manipulation
  detectThreats(situation) {
    const threats = [];

    // Check for manipulation patterns
    const manipulationPatterns = [
      { pattern: 'gaslighting', indicator: 'denial of previous statements' },
      { pattern: 'false_urgency', indicator: 'sudden deadline pressure' },
      { pattern: 'bait_and_switch', indicator: 'changing terms after agreement' },
      { pattern: 'emotional_manipulation', indicator: 'guilt or fear tactics' }
    ];

    manipulationPatterns.forEach(({ pattern, indicator }) => {
      if (this.detectPattern(situation, pattern)) {
        threats.push({
          type: pattern,
          severity: 'high',
          indicator: indicator,
          response: this.COACHING_STRATEGIES.power_plays[pattern]?.response || 'Stay calm and document everything.'
        });
      }
    });

    return threats;
  },

  // Get relevant scripts
  getRelevantScripts(situation) {
    const scripts = [];

    // Add stage-appropriate scripts
    const stageStrategies = this.COACHING_STRATEGIES[situation.stage] || {};
    Object.values(stageStrategies).forEach(strategy => {
      if (strategy.scripts) {
        scripts.push(...strategy.scripts.map(script => ({
          context: strategy.when,
          text: script,
          risk: strategy.risks?.[0] || 'None identified'
        })));
      }
    });

    return scripts.slice(0, 3); // Top 3 most relevant
  },

  // Body language guidance
  getBodyLanguageGuide(situation) {
    const guides = [];

    if (situation.stage === 'opening') {
      guides.push({
        do: 'Open posture, steady eye contact, slight forward lean',
        avoid: 'Crossed arms, looking at phone/watch, turning away'
      });
    }

    if (situation.power_balance < 0) {
      guides.push({
        do: 'Sit/stand tall, take up appropriate space, firm handshake',
        avoid: 'Slouching, minimizing presence, nervous gestures'
      });
    }

    if (situation.emotional_state === 'tense') {
      guides.push({
        do: 'Slower movements, relaxed shoulders, calm breathing',
        avoid: 'Rapid gestures, tense jaw, clenched fists'
      });
    }

    return guides;
  },

  // Strategic advice
  getStrategicAdvice(situation) {
    const advice = [];

    // Long-term relationship building
    if (situation.stage === 'closing' && situation.momentum === 'positive') {
      advice.push({
        category: 'relationship',
        insight: 'Strong close. Set foundation for future negotiations.',
        action: 'End with forward-looking statement about partnership'
      });
    }

    // Dealing with difficult situations
    if (situation.risk_level > 0.7) {
      advice.push({
        category: 'risk_management',
        insight: 'High risk detected. Consider alternative approach.',
        action: 'Propose breaking into smaller, less risky components'
      });
    }

    // Maximizing value
    if (situation.opportunity_window === 'open' && situation.momentum === 'positive') {
      advice.push({
        category: 'value_creation',
        insight: 'Optimal conditions for expanding deal scope.',
        action: 'Introduce additional value propositions'
      });
    }

    return advice;
  },

  // Helper methods
  detectNegotiationStage(context) {
    // Simplified stage detection
    const keywords = {
      opening: ['hello', 'thank you for', 'appreciate'],
      discovery: ['tell me', 'understand', 'explain'],
      negotiation: ['price', 'terms', 'offer'],
      closing: ['agree', 'deal', 'move forward']
    };

    for (const [stage, words] of Object.entries(keywords)) {
      if (words.some(word => context.recent_text?.toLowerCase().includes(word))) {
        return stage;
      }
    }

    return 'discovery'; // Default
  },

  assessMomentum(context) {
    // Simplified momentum assessment
    if (context.positive_signals > context.negative_signals) return 'positive';
    if (context.positive_signals < context.negative_signals) return 'negative';
    if (context.exchanges_without_progress > 3) return 'stalled';
    return 'neutral';
  },

  assessEmotionalState(context) {
    // Simplified emotional assessment
    const emotions = context.detected_emotions || {};
    const dominant = Object.entries(emotions).reduce((a, b) =>
      emotions[a] > emotions[b] ? a : b, 'neutral');
    return dominant;
  },

  assessPowerBalance(context) {
    // Returns -1 (them) to 1 (you)
    return context.power_balance || 0;
  },

  assessRisk(context) {
    // Returns 0 (low) to 1 (high)
    return context.risk_level || 0.5;
  },

  identifyOpportunityWindow(context) {
    if (context.positive_signals > 3 && context.objections_resolved) return 'open';
    if (context.new_information) return 'emerging';
    return 'closed';
  },

  detectPattern(situation, pattern) {
    // Simplified pattern detection
    return false; // Would need actual implementation
  },

  // Live coaching interface
  startLiveCoaching(negotiationId) {
    console.log(`Starting live coaching for negotiation ${negotiationId}`);

    // Set up real-time monitoring
    this.monitoringInterval = setInterval(() => {
      const context = this.gatherContext(negotiationId);
      const coaching = this.coach(context);

      // Display coaching in UI
      this.displayCoaching(coaching);

      // Check for critical situations
      if (coaching.warnings.length > 0) {
        this.alertUser(coaching.warnings[0]);
      }
    }, 5000); // Every 5 seconds
  },

  stopLiveCoaching() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  },

  // UI display methods
  displayCoaching(coaching) {
    // This would update the UI with coaching advice
    console.log('Coaching update:', coaching);
  },

  alertUser(warning) {
    // This would show an alert to the user
    console.log('ALERT:', warning);
  },

  gatherContext(negotiationId) {
    // This would gather real-time context
    return {
      negotiation_id: negotiationId,
      recent_text: '',
      positive_signals: 0,
      negative_signals: 0,
      exchanges_without_progress: 0,
      detected_emotions: {},
      power_balance: 0,
      risk_level: 0.5,
      objections_resolved: false,
      new_information: false
    };
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NegotiationCoach;
}

// Global export
window.NegotiationCoach = NegotiationCoach;