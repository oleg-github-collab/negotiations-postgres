/* ============================================
   TRANSCRIPT PARSER WITH SPEAKER DETECTION
   Advanced transcript parsing and filtering
   ============================================ */

const TranscriptParser = {

  // Parse transcript into structured format
  parseTranscript(text) {
    if (!text || typeof text !== 'string') {
      return { speakers: [], segments: [], raw: text };
    }

    const segments = [];
    const speakers = new Set();

    // Common speaker patterns
    const patterns = [
      // Format: "Speaker Name: text"
      /^([A-Z][A-Za-z\s]+):\s*(.+)$/gm,
      // Format: "[Speaker Name] text"
      /^\[([^\]]+)\]\s*(.+)$/gm,
      // Format: "SPEAKER_NAME: text"
      /^([A-Z_]+):\s*(.+)$/gm,
      // Format: "- Name: text"
      /^-\s*([A-Z][A-Za-z\s]+):\s*(.+)$/gm,
      // Format: "Name (Role): text"
      /^([A-Z][A-Za-z\s]+)\s*\([^)]+\):\s*(.+)$/gm,
      // Zoom/Teams format: "00:00:00 Name: text"
      /^\d{2}:\d{2}:\d{2}\s+([^:]+):\s*(.+)$/gm
    ];

    let lines = text.split('\n');
    let currentSpeaker = 'Unknown';
    let currentText = '';
    let segmentIndex = 0;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      let matched = false;

      // Try each pattern
      for (let pattern of patterns) {
        const match = pattern.exec(line);
        if (match) {
          // Save previous segment if exists
          if (currentText) {
            segments.push({
              id: segmentIndex++,
              speaker: currentSpeaker,
              text: currentText.trim(),
              timestamp: null
            });
          }

          currentSpeaker = match[1].trim();
          currentText = match[2].trim();
          speakers.add(currentSpeaker);
          matched = true;
          pattern.lastIndex = 0; // Reset regex
          break;
        }
        pattern.lastIndex = 0; // Reset regex
      }

      if (!matched) {
        // Continue with current speaker
        currentText += ' ' + line;
      }
    }

    // Save last segment
    if (currentText) {
      segments.push({
        id: segmentIndex++,
        speaker: currentSpeaker,
        text: currentText.trim(),
        timestamp: null
      });
    }

    return {
      speakers: Array.from(speakers),
      segments,
      raw: text
    };
  },

  // Filter segments by speaker
  filterBySpeaker(segments, speaker) {
    if (!speaker || speaker === 'all') {
      return segments;
    }
    return segments.filter(s => s.speaker === speaker);
  },

  // Extract key points from segments
  extractKeyPoints(segments) {
    const keyPoints = [];
    const keyPhrases = [
      /\b(agree|agreed|agreement)\b/i,
      /\b(reject|rejected|decline|declined)\b/i,
      /\b(propose|proposal|suggest|suggestion)\b/i,
      /\b(deadline|timeline|date|schedule)\b/i,
      /\b(price|cost|budget|payment)\b/i,
      /\b(condition|requirement|prerequisite)\b/i,
      /\b(risk|concern|issue|problem)\b/i,
      /\b(decision|decide|decided)\b/i
    ];

    segments.forEach(segment => {
      keyPhrases.forEach(pattern => {
        if (pattern.test(segment.text)) {
          keyPoints.push({
            speaker: segment.speaker,
            text: segment.text,
            type: pattern.source.match(/\\b\(([^)]+)\)/)[1].split('|')[0]
          });
        }
      });
    });

    return keyPoints;
  },

  // Analyze speaker participation
  analyzeSpeakerParticipation(segments) {
    const stats = {};
    let totalWords = 0;

    segments.forEach(segment => {
      const wordCount = segment.text.split(/\s+/).length;
      totalWords += wordCount;

      if (!stats[segment.speaker]) {
        stats[segment.speaker] = {
          segmentCount: 0,
          wordCount: 0,
          percentage: 0
        };
      }

      stats[segment.speaker].segmentCount++;
      stats[segment.speaker].wordCount += wordCount;
    });

    // Calculate percentages
    Object.keys(stats).forEach(speaker => {
      stats[speaker].percentage = Math.round(
        (stats[speaker].wordCount / totalWords) * 100
      );
    });

    return stats;
  },

  // Detect conversation dynamics
  detectDynamics(segments) {
    const dynamics = {
      interruptions: 0,
      questions: 0,
      agreements: 0,
      disagreements: 0,
      escalations: 0
    };

    segments.forEach((segment, index) => {
      const text = segment.text.toLowerCase();

      // Questions
      if (text.includes('?')) {
        dynamics.questions++;
      }

      // Agreements
      if (/\b(yes|agree|correct|right|exactly|absolutely)\b/.test(text)) {
        dynamics.agreements++;
      }

      // Disagreements
      if (/\b(no|disagree|wrong|incorrect|but|however)\b/.test(text)) {
        dynamics.disagreements++;
      }

      // Escalations (emotional language)
      if (/\b(unacceptable|ridiculous|absurd|crazy|insane|stupid)\b/.test(text)) {
        dynamics.escalations++;
      }

      // Detect interruptions (short segments alternating)
      if (index > 0 && segment.text.length < 50 &&
          segments[index - 1].speaker !== segment.speaker) {
        dynamics.interruptions++;
      }
    });

    return dynamics;
  },

  // Generate summary
  generateSummary(segments, maxLength = 500) {
    if (!segments || segments.length === 0) {
      return 'No transcript available';
    }

    const keyPoints = this.extractKeyPoints(segments);
    const dynamics = this.detectDynamics(segments);
    const participation = this.analyzeSpeakerParticipation(segments);

    let summary = `Conversation between ${Object.keys(participation).join(', ')}. `;

    // Add participation info
    const dominant = Object.entries(participation)
      .sort((a, b) => b[1].percentage - a[1].percentage)[0];
    summary += `${dominant[0]} dominated with ${dominant[1].percentage}% of conversation. `;

    // Add dynamics
    if (dynamics.escalations > 0) {
      summary += `Detected ${dynamics.escalations} escalations. `;
    }
    if (dynamics.disagreements > dynamics.agreements) {
      summary += 'More disagreements than agreements. ';
    }

    // Add key points
    if (keyPoints.length > 0) {
      summary += `Key topics: ${[...new Set(keyPoints.map(kp => kp.type))].join(', ')}.`;
    }

    return summary.substring(0, maxLength);
  },

  // Render speaker filter UI
  renderSpeakerFilter(speakers, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="speaker-filter">
        <label>Filter by Speaker:</label>
        <select id="speaker-select" class="form-control">
          <option value="all">All Speakers</option>
          ${speakers.map(speaker =>
            `<option value="${speaker}">${speaker}</option>`
          ).join('')}
        </select>
      </div>
    `;

    // Add event listener
    const select = container.querySelector('#speaker-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.onSpeakerFilterChange(e.target.value);
      });
    }
  },

  // Callback for speaker filter change
  onSpeakerFilterChange(speaker) {
    // Override this method in implementation
    console.log('Speaker filter changed:', speaker);
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptParser;
}

// Make available globally
window.TranscriptParser = TranscriptParser;