/* ============================================
   CONVERSATION FLOW ANALYZER
   AI-powered analysis of negotiation dynamics
   ============================================ */

const ConversationFlowAnalyzer = {

  // Flow states and transitions
  CONVERSATION_STATES: {
    opening: {
      name: 'Opening',
      indicators: ['hello', 'hi', 'good morning', 'thank you for', 'appreciate'],
      nextStates: ['rapport_building', 'agenda_setting', 'problem_statement'],
      optimal_duration: '5-10%'
    },

    rapport_building: {
      name: 'Rapport Building',
      indicators: ['how are', 'weather', 'weekend', 'family', 'vacation'],
      nextStates: ['agenda_setting', 'problem_statement'],
      optimal_duration: '5-15%'
    },

    agenda_setting: {
      name: 'Agenda Setting',
      indicators: ['today we', 'agenda', 'discuss', 'cover', 'talk about'],
      nextStates: ['problem_statement', 'information_gathering'],
      optimal_duration: '5-10%'
    },

    problem_statement: {
      name: 'Problem Statement',
      indicators: ['issue', 'problem', 'challenge', 'concern', 'difficulty'],
      nextStates: ['information_gathering', 'solution_exploration'],
      optimal_duration: '10-15%'
    },

    information_gathering: {
      name: 'Information Gathering',
      indicators: ['tell me', 'explain', 'describe', 'what', 'how', 'why', 'when'],
      nextStates: ['solution_exploration', 'objection_handling'],
      optimal_duration: '15-25%'
    },

    solution_exploration: {
      name: 'Solution Exploration',
      indicators: ['propose', 'suggest', 'option', 'alternative', 'solution', 'approach'],
      nextStates: ['negotiation_core', 'objection_handling'],
      optimal_duration: '15-20%'
    },

    negotiation_core: {
      name: 'Core Negotiation',
      indicators: ['price', 'terms', 'conditions', 'offer', 'counter', 'deal'],
      nextStates: ['objection_handling', 'agreement_building', 'deadlock'],
      optimal_duration: '20-30%'
    },

    objection_handling: {
      name: 'Objection Handling',
      indicators: ['but', 'however', 'concern', 'worry', 'cannot', 'difficult'],
      nextStates: ['solution_exploration', 'negotiation_core', 'deadlock'],
      optimal_duration: '10-15%'
    },

    agreement_building: {
      name: 'Agreement Building',
      indicators: ['agree', 'sounds good', 'yes', 'confirm', 'accept', 'work with'],
      nextStates: ['closing', 'action_planning'],
      optimal_duration: '10-15%'
    },

    deadlock: {
      name: 'Deadlock',
      indicators: ['cannot agree', 'stuck', 'impasse', 'no way', 'impossible'],
      nextStates: ['break', 'solution_exploration', 'closing'],
      optimal_duration: '0-5%'
    },

    action_planning: {
      name: 'Action Planning',
      indicators: ['next steps', 'will do', 'by when', 'responsible', 'timeline'],
      nextStates: ['closing'],
      optimal_duration: '5-10%'
    },

    closing: {
      name: 'Closing',
      indicators: ['thank you', 'goodbye', 'talk soon', 'follow up', 'appreciate'],
      nextStates: [],
      optimal_duration: '5%'
    }
  },

  // Analyze conversation flow
  analyzeFlow(segments) {
    const flow = {
      states: [],
      transitions: [],
      timeline: [],
      bottlenecks: [],
      opportunities: [],
      effectiveness: 0,
      recommendations: []
    };

    // Track state progression
    let currentState = null;
    let stateStartIndex = 0;

    segments.forEach((segment, index) => {
      const detectedState = this.detectState(segment);

      if (detectedState && detectedState !== currentState) {
        // Record state transition
        if (currentState) {
          flow.transitions.push({
            from: currentState,
            to: detectedState,
            atSegment: index,
            optimal: this.isOptimalTransition(currentState, detectedState)
          });

          // Calculate state duration
          const duration = ((index - stateStartIndex) / segments.length) * 100;
          flow.states.push({
            state: currentState,
            startIndex: stateStartIndex,
            endIndex: index - 1,
            duration: duration,
            optimal: this.isOptimalDuration(currentState, duration)
          });
        }

        currentState = detectedState;
        stateStartIndex = index;
      }

      // Add to timeline
      flow.timeline.push({
        segment: index,
        state: currentState || 'unknown',
        text: segment.text.substring(0, 100),
        speaker: segment.speaker
      });
    });

    // Analyze flow patterns
    flow.bottlenecks = this.findBottlenecks(flow);
    flow.opportunities = this.findOpportunities(flow);
    flow.effectiveness = this.calculateEffectiveness(flow);
    flow.recommendations = this.generateFlowRecommendations(flow);

    return flow;
  },

  // Detect conversation state
  detectState(segment) {
    const text = segment.text.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const [stateKey, state] of Object.entries(this.CONVERSATION_STATES)) {
      let score = 0;
      state.indicators.forEach(indicator => {
        if (text.includes(indicator)) {
          score += 1;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestMatch = stateKey;
      }
    }

    return highestScore > 0 ? bestMatch : null;
  },

  // Check if transition is optimal
  isOptimalTransition(from, to) {
    const fromState = this.CONVERSATION_STATES[from];
    return fromState && fromState.nextStates.includes(to);
  },

  // Check if duration is optimal
  isOptimalDuration(state, duration) {
    const stateConfig = this.CONVERSATION_STATES[state];
    if (!stateConfig) return false;

    const range = stateConfig.optimal_duration.split('-');
    const min = parseInt(range[0]);
    const max = parseInt(range[1].replace('%', ''));

    return duration >= min && duration <= max;
  },

  // Find conversation bottlenecks
  findBottlenecks(flow) {
    const bottlenecks = [];

    // Check for stuck states
    flow.states.forEach(state => {
      if (state.duration > 40) {
        bottlenecks.push({
          type: 'stuck_state',
          state: state.state,
          duration: state.duration,
          severity: 'high',
          recommendation: `State "${this.CONVERSATION_STATES[state.state].name}" took ${state.duration.toFixed(1)}% of conversation. Consider moving forward.`
        });
      }
    });

    // Check for loops
    const loops = this.detectLoops(flow.transitions);
    loops.forEach(loop => {
      bottlenecks.push({
        type: 'loop',
        states: loop,
        severity: 'medium',
        recommendation: `Circular discussion detected: ${loop.join(' → ')}. Break the pattern.`
      });
    });

    // Check for missing critical states
    const criticalStates = ['problem_statement', 'solution_exploration', 'negotiation_core'];
    criticalStates.forEach(critical => {
      if (!flow.states.find(s => s.state === critical)) {
        bottlenecks.push({
          type: 'missing_state',
          state: critical,
          severity: 'high',
          recommendation: `Critical state "${this.CONVERSATION_STATES[critical].name}" was not reached.`
        });
      }
    });

    return bottlenecks;
  },

  // Find improvement opportunities
  findOpportunities(flow) {
    const opportunities = [];

    // Check for premature closing
    const lastState = flow.states[flow.states.length - 1];
    if (lastState && lastState.state === 'closing' && !flow.states.find(s => s.state === 'agreement_building')) {
      opportunities.push({
        type: 'premature_closing',
        impact: 'high',
        suggestion: 'Negotiation ended without clear agreement. Consider revisiting terms.'
      });
    }

    // Check for skipped rapport building
    if (!flow.states.find(s => s.state === 'rapport_building')) {
      opportunities.push({
        type: 'skipped_rapport',
        impact: 'medium',
        suggestion: 'No rapport building detected. Building trust can improve outcomes.'
      });
    }

    // Check for insufficient information gathering
    const infoGathering = flow.states.find(s => s.state === 'information_gathering');
    if (!infoGathering || infoGathering.duration < 10) {
      opportunities.push({
        type: 'insufficient_discovery',
        impact: 'high',
        suggestion: 'Limited information gathering. Understanding needs better can improve solutions.'
      });
    }

    return opportunities;
  },

  // Detect loops in conversation
  detectLoops(transitions) {
    const loops = [];
    const visited = new Set();

    transitions.forEach((trans, index) => {
      const pattern = `${trans.from}-${trans.to}`;
      if (visited.has(pattern)) {
        // Found a loop
        const loopStates = [trans.from, trans.to];

        // Trace back to find full loop
        for (let i = index - 1; i >= 0; i--) {
          if (transitions[i].to === trans.from) {
            loopStates.unshift(transitions[i].from);
            if (transitions[i].from === trans.to) {
              break; // Complete loop found
            }
          }
        }

        loops.push(loopStates);
      }
      visited.add(pattern);
    });

    return loops;
  },

  // Calculate overall flow effectiveness
  calculateEffectiveness(flow) {
    let score = 100;

    // Deduct for bottlenecks
    flow.bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'high') score -= 15;
      if (bottleneck.severity === 'medium') score -= 10;
      if (bottleneck.severity === 'low') score -= 5;
    });

    // Deduct for suboptimal transitions
    flow.transitions.forEach(trans => {
      if (!trans.optimal) score -= 5;
    });

    // Deduct for suboptimal durations
    flow.states.forEach(state => {
      if (!state.optimal) score -= 3;
    });

    // Bonus for reaching agreement
    if (flow.states.find(s => s.state === 'agreement_building')) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  },

  // Generate flow recommendations
  generateFlowRecommendations(flow) {
    const recommendations = [];

    // Based on effectiveness score
    if (flow.effectiveness < 50) {
      recommendations.push({
        priority: 'critical',
        category: 'overall',
        text: 'Conversation flow is significantly suboptimal. Major restructuring needed.',
        action: 'Review conversation structure and follow proven negotiation frameworks.'
      });
    }

    // Based on bottlenecks
    flow.bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'high') {
        recommendations.push({
          priority: 'high',
          category: 'bottleneck',
          text: bottleneck.recommendation,
          action: `Address ${bottleneck.type} immediately to improve flow.`
        });
      }
    });

    // Based on opportunities
    flow.opportunities.forEach(opp => {
      if (opp.impact === 'high') {
        recommendations.push({
          priority: 'medium',
          category: 'opportunity',
          text: opp.suggestion,
          action: `Implement ${opp.type} strategy in next interaction.`
        });
      }
    });

    // Add tactical recommendations
    if (!flow.states.find(s => s.state === 'action_planning')) {
      recommendations.push({
        priority: 'medium',
        category: 'tactical',
        text: 'No clear action planning detected.',
        action: 'Always end negotiations with specific next steps and timelines.'
      });
    }

    return recommendations;
  },

  // Generate visual flow diagram
  generateFlowDiagram(flow) {
    // This would generate a D3.js or similar visualization
    const nodes = flow.states.map(s => ({
      id: s.state,
      label: this.CONVERSATION_STATES[s.state].name,
      duration: s.duration,
      optimal: s.optimal
    }));

    const links = flow.transitions.map(t => ({
      source: t.from,
      target: t.to,
      optimal: t.optimal
    }));

    return { nodes, links };
  },

  // Predict next optimal state
  predictNextState(currentState, history) {
    const state = this.CONVERSATION_STATES[currentState];
    if (!state) return null;

    // Use history to make intelligent prediction
    const predictions = state.nextStates.map(next => {
      const score = this.calculateTransitionScore(currentState, next, history);
      return { state: next, score };
    });

    predictions.sort((a, b) => b.score - a.score);
    return predictions[0];
  },

  // Calculate transition score
  calculateTransitionScore(from, to, history) {
    let score = 50; // Base score

    // Check if we've been to this state before
    const visited = history.filter(h => h.state === to).length;
    if (visited > 0) score -= visited * 10;

    // Check natural progression
    const progression = ['opening', 'rapport_building', 'problem_statement',
                        'information_gathering', 'solution_exploration',
                        'negotiation_core', 'agreement_building', 'closing'];

    const fromIndex = progression.indexOf(from);
    const toIndex = progression.indexOf(to);

    if (toIndex > fromIndex) {
      score += (toIndex - fromIndex) * 5; // Bonus for forward progress
    } else {
      score -= (fromIndex - toIndex) * 3; // Penalty for going backwards
    }

    return score;
  },

  // Real-time flow monitoring
  monitorFlow(segment) {
    const state = this.detectState(segment);

    // Check if intervention needed
    if (this.flowHistory.length > 0) {
      const lastState = this.flowHistory[this.flowHistory.length - 1];

      // Check for stuck pattern
      if (lastState.state === state && lastState.count > 5) {
        return {
          alert: true,
          message: `Conversation stuck in ${this.CONVERSATION_STATES[state].name}`,
          suggestion: `Move to ${this.predictNextState(state, this.flowHistory).state}`
        };
      }
    }

    // Update history
    if (this.flowHistory.length === 0 || this.flowHistory[this.flowHistory.length - 1].state !== state) {
      this.flowHistory.push({ state, count: 1, timestamp: Date.now() });
    } else {
      this.flowHistory[this.flowHistory.length - 1].count++;
    }

    return { alert: false };
  },

  flowHistory: []
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConversationFlowAnalyzer;
}

// Global export
window.ConversationFlowAnalyzer = ConversationFlowAnalyzer;