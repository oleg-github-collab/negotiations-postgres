/* ============================================
   ANALYSIS VISUALIZER
   Advanced visualization for negotiation analysis
   ============================================ */

const AnalysisVisualizer = {

  // Chart configurations
  chartConfigs: {
    riskRadar: {
      type: 'radar',
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: 'rgba(255,255,255,0.6)'
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            pointLabels: {
              color: '#fff',
              font: {
                size: 12
              }
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff'
            }
          }
        }
      }
    },

    emotionTimeline: {
      type: 'line',
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Time',
              color: '#fff'
            },
            ticks: {
              color: 'rgba(255,255,255,0.6)'
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Emotional Intensity',
              color: '#fff'
            },
            ticks: {
              color: 'rgba(255,255,255,0.6)'
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          }
        }
      }
    },

    manipulationHeatmap: {
      type: 'bar',
      options: {
        indexAxis: 'y',
        responsive: true,
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Frequency',
              color: '#fff'
            },
            ticks: {
              color: 'rgba(255,255,255,0.6)'
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          },
          y: {
            ticks: {
              color: 'rgba(255,255,255,0.6)'
            },
            grid: {
              display: false
            }
          }
        }
      }
    }
  },

  // Create analysis dashboard
  createDashboard(containerId, analysisData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="analysis-dashboard">
        <!-- Header with Score -->
        <div class="analysis-header">
          ${this.renderSuccessScore(analysisData.success_probability)}
          ${this.renderRiskLevel(analysisData.risk)}
        </div>

        <!-- Key Metrics Grid -->
        <div class="metrics-grid">
          ${this.renderKeyMetrics(analysisData)}
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <!-- Risk Radar Chart -->
          <div class="chart-card">
            <h3><i class="fas fa-radar"></i> Risk Analysis</h3>
            <canvas id="risk-radar-chart"></canvas>
          </div>

          <!-- Emotion Timeline -->
          <div class="chart-card">
            <h3><i class="fas fa-heart-rate"></i> Emotional Dynamics</h3>
            <canvas id="emotion-timeline-chart"></canvas>
          </div>

          <!-- Manipulation Patterns -->
          <div class="chart-card">
            <h3><i class="fas fa-exclamation-triangle"></i> Manipulation Detected</h3>
            <canvas id="manipulation-chart"></canvas>
          </div>

          <!-- Power Balance -->
          <div class="chart-card">
            <h3><i class="fas fa-balance-scale"></i> Power Dynamics</h3>
            <canvas id="power-balance-chart"></canvas>
          </div>
        </div>

        <!-- Recommendations Section -->
        <div class="recommendations-section">
          ${this.renderRecommendations(analysisData.recommendations)}
        </div>

        <!-- Real-time Alerts -->
        <div class="alerts-section" id="real-time-alerts"></div>
      </div>
    `;

    // Initialize charts
    this.initializeCharts(analysisData);
  },

  // Render success score
  renderSuccessScore(probability) {
    const percentage = Math.round(probability * 100);
    const color = percentage > 70 ? '#4ade80' :
                 percentage > 40 ? '#fbbf24' : '#f87171';

    return `
      <div class="success-score-card">
        <div class="score-circle" style="background: conic-gradient(${color} 0deg ${percentage * 3.6}deg, rgba(255,255,255,0.1) ${percentage * 3.6}deg)">
          <div class="score-inner">
            <div class="score-value">${percentage}%</div>
            <div class="score-label">Success Probability</div>
          </div>
        </div>
        <div class="score-indicators">
          ${this.renderScoreFactors(probability)}
        </div>
      </div>
    `;
  },

  // Render score factors
  renderScoreFactors(probability) {
    const factors = [
      { label: 'Trust Level', value: probability > 0.6 ? 'High' : 'Low', positive: probability > 0.6 },
      { label: 'Collaboration', value: probability > 0.5 ? 'Good' : 'Poor', positive: probability > 0.5 },
      { label: 'Risk Level', value: probability > 0.4 ? 'Manageable' : 'High', positive: probability > 0.4 }
    ];

    return factors.map(f => `
      <div class="score-factor ${f.positive ? 'positive' : 'negative'}">
        <i class="fas fa-${f.positive ? 'check' : 'times'}-circle"></i>
        <span>${f.label}: ${f.value}</span>
      </div>
    `).join('');
  },

  // Render risk level
  renderRiskLevel(risk) {
    const colors = {
      critical: '#dc2626',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981'
    };

    return `
      <div class="risk-level-card">
        <div class="risk-indicator" style="background: ${colors[risk.level]}">
          <i class="fas fa-shield-alt"></i>
          <span>Risk: ${risk.level.toUpperCase()}</span>
        </div>
        <div class="risk-factors">
          ${this.renderRiskFactors(risk.factors)}
        </div>
      </div>
    `;
  },

  // Render risk factors
  renderRiskFactors(factors) {
    return Object.entries(factors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor, value]) => `
        <div class="risk-factor">
          <span>${factor.replace(/_/g, ' ')}</span>
          <div class="risk-bar">
            <div class="risk-bar-fill" style="width: ${value * 100}%"></div>
          </div>
        </div>
      `).join('');
  },

  // Render key metrics
  renderKeyMetrics(data) {
    const metrics = [
      {
        icon: 'fa-brain',
        label: 'Cognitive Biases',
        value: data.biases?.length || 0,
        status: data.biases?.length > 3 ? 'warning' : 'success'
      },
      {
        icon: 'fa-mask',
        label: 'Manipulation Tactics',
        value: data.manipulation?.length || 0,
        status: data.manipulation?.length > 0 ? 'danger' : 'success'
      },
      {
        icon: 'fa-heart',
        label: 'Emotional Tone',
        value: data.emotions?.tone || 'Neutral',
        status: data.emotions?.tone === 'positive' ? 'success' :
               data.emotions?.tone === 'negative' ? 'danger' : 'warning'
      },
      {
        icon: 'fa-handshake',
        label: 'Collaboration Level',
        value: `${Math.round((data.power_dynamics?.collaboration || 0) * 100)}%`,
        status: data.power_dynamics?.collaboration > 0.6 ? 'success' : 'warning'
      }
    ];

    return metrics.map(m => `
      <div class="metric-card ${m.status}">
        <i class="fas ${m.icon}"></i>
        <div class="metric-content">
          <div class="metric-value">${m.value}</div>
          <div class="metric-label">${m.label}</div>
        </div>
      </div>
    `).join('');
  },

  // Render recommendations
  renderRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return '<div class="no-recommendations">No specific recommendations at this time.</div>';
    }

    const grouped = {
      critical: recommendations.filter(r => r.type === 'critical'),
      warning: recommendations.filter(r => r.type === 'warning'),
      suggestion: recommendations.filter(r => r.type === 'suggestion'),
      tactical: recommendations.filter(r => r.type === 'tactical')
    };

    return `
      <div class="recommendations-container">
        <h3><i class="fas fa-lightbulb"></i> Strategic Recommendations</h3>
        ${Object.entries(grouped).map(([type, recs]) => {
          if (recs.length === 0) return '';
          return `
            <div class="recommendation-group ${type}">
              <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
              ${recs.map(r => `
                <div class="recommendation-item">
                  <div class="recommendation-text">${r.text}</div>
                  <div class="recommendation-action">
                    <i class="fas fa-arrow-right"></i>
                    ${r.action}
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // Initialize all charts
  initializeCharts(data) {
    // Risk Radar Chart
    this.createRiskRadar(data);

    // Emotion Timeline
    this.createEmotionTimeline(data);

    // Manipulation Chart
    this.createManipulationChart(data);

    // Power Balance Chart
    this.createPowerBalanceChart(data);
  },

  // Create risk radar chart
  createRiskRadar(data) {
    const canvas = document.getElementById('risk-radar-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Manipulation', 'Bias', 'Emotion', 'Power', 'Commitment', 'Trust'],
        datasets: [{
          label: 'Current Negotiation',
          data: [
            (data.manipulation?.length || 0) * 20,
            (data.biases?.length || 0) * 15,
            data.emotions?.volatility * 100 || 0,
            Math.abs(data.power_dynamics?.balance || 0) * 100,
            100 - (data.linguistic?.commitment?.weak?.percentage || 0) * 10,
            data.trust_indicators || 50
          ],
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          borderColor: '#667eea',
          borderWidth: 2,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#667eea'
        }]
      },
      options: this.chartConfigs.riskRadar.options
    });
  },

  // Create emotion timeline
  createEmotionTimeline(data) {
    const canvas = document.getElementById('emotion-timeline-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Mock timeline data - in real app, this would come from segments
    const timelineData = this.generateEmotionTimeline(data);

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: timelineData.labels,
        datasets: [
          {
            label: 'Positive',
            data: timelineData.positive,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          },
          {
            label: 'Negative',
            data: timelineData.negative,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Neutral',
            data: timelineData.neutral,
            borderColor: '#6b7280',
            backgroundColor: 'rgba(107, 114, 128, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: this.chartConfigs.emotionTimeline.options
    });
  },

  // Create manipulation chart
  createManipulationChart(data) {
    const canvas = document.getElementById('manipulation-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const manipulationCounts = {};
    if (data.manipulation) {
      data.manipulation.forEach(m => {
        manipulationCounts[m.type] = (manipulationCounts[m.type] || 0) + 1;
      });
    }

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(manipulationCounts),
        datasets: [{
          label: 'Frequency',
          data: Object.values(manipulationCounts),
          backgroundColor: [
            '#ef4444',
            '#f59e0b',
            '#eab308',
            '#84cc16',
            '#22c55e'
          ]
        }]
      },
      options: this.chartConfigs.manipulationHeatmap.options
    });
  },

  // Create power balance chart
  createPowerBalanceChart(data) {
    const canvas = document.getElementById('power-balance-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Dominance', 'Submission', 'Collaboration', 'Competition'],
        datasets: [{
          data: [
            data.power_dynamics?.dominance || 0,
            data.power_dynamics?.submission || 0,
            data.power_dynamics?.collaboration || 0,
            data.power_dynamics?.competition || 0
          ],
          backgroundColor: [
            '#dc2626',
            '#f59e0b',
            '#10b981',
            '#3b82f6'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#fff'
            }
          }
        }
      }
    });
  },

  // Generate mock emotion timeline
  generateEmotionTimeline(data) {
    const points = 10;
    const labels = [];
    const positive = [];
    const negative = [];
    const neutral = [];

    for (let i = 0; i < points; i++) {
      labels.push(`T${i}`);
      positive.push(Math.random() * 100);
      negative.push(Math.random() * 100);
      neutral.push(Math.random() * 100);
    }

    return { labels, positive, negative, neutral };
  },

  // Create real-time alert
  createRealTimeAlert(alert) {
    const alertsContainer = document.getElementById('real-time-alerts');
    if (!alertsContainer) return;

    const alertEl = document.createElement('div');
    alertEl.className = `real-time-alert ${alert.type}`;
    alertEl.innerHTML = `
      <div class="alert-icon">
        <i class="fas fa-${alert.type === 'danger' ? 'exclamation-triangle' :
                           alert.type === 'warning' ? 'exclamation-circle' :
                           'info-circle'}"></i>
      </div>
      <div class="alert-content">
        <div class="alert-title">${alert.title}</div>
        <div class="alert-message">${alert.message}</div>
        <div class="alert-action">${alert.action}</div>
      </div>
      <button class="alert-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    alertsContainer.insertBefore(alertEl, alertsContainer.firstChild);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      alertEl.style.animation = 'fadeOut 0.5s';
      setTimeout(() => alertEl.remove(), 500);
    }, 10000);
  },

  // Update charts with new data
  updateCharts(newData) {
    // This would update existing charts with new data
    // Implementation depends on specific chart library
  },

  // Export visualization as image
  exportAsImage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartId}-${Date.now()}.png`;
    a.click();
  },

  // Generate PDF report
  async generatePDFReport(analysisData) {
    // This would generate a comprehensive PDF report
    // Using a library like jsPDF
    console.log('Generating PDF report...', analysisData);
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalysisVisualizer;
}

// Global export
window.AnalysisVisualizer = AnalysisVisualizer;