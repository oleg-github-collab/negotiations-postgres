/* ============================================
   SALARY ANALYTICS MODULE
   Потужна аналітика зарплат з Chart.js та AI інсайтами
   ============================================ */

const SalaryAnalytics = {
  charts: {},
  currentTeamId: null,
  salaryData: null,

  async init(teamId) {
    console.log('💰 Salary Analytics initializing for team:', teamId);
    this.currentTeamId = teamId;
    await this.loadSalaryData();
  },

  async loadSalaryData() {
    try {
      const response = await apiCall(`/teams/${this.currentTeamId}/salary-analytics`);
      this.salaryData = response.data || response;
      this.render();
    } catch (error) {
      console.error('Failed to load salary analytics:', error);
      showNotification('Не вдалося завантажити аналітику зарплат', 'error');
    }
  },

  render() {
    if (!this.salaryData) return;

    this.showSalaryAnalyticsModal();
  },

  showSalaryAnalyticsModal() {
    let modal = document.getElementById('salary-analytics-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'salary-analytics-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const data = this.salaryData;
    const members = data.members || [];
    const budget = data.budget || {};
    const insights = data.ai_insights || {};

    modal.innerHTML = `
      <div class="modal-overlay" onclick="hideModal('salary-analytics-modal')"></div>
      <div class="modal-content modal-fullscreen">
        <div class="modal-header">
          <h2>
            <i class="fas fa-chart-pie"></i>
            Аналітика зарплат: ${this.escapeHtml(data.team_name || 'Команда')}
          </h2>
          <button class="modal-close-btn" onclick="hideModal('salary-analytics-modal')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body salary-analytics-body">
          <!-- Key Metrics -->
          <div class="salary-metrics-grid">
            ${this.renderKeyMetrics(data)}
          </div>

          <!-- Charts Grid -->
          <div class="salary-charts-grid">
            <!-- Salary Distribution Chart -->
            <div class="chart-card">
              <div class="chart-card-header">
                <h3><i class="fas fa-chart-bar"></i> Розподіл зарплат</h3>
                <div class="chart-actions">
                  <button class="btn-icon" onclick="SalaryAnalytics.exportChart('salaryDistribution')" title="Експорт">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="salary-distribution-chart"></canvas>
              </div>
            </div>

            <!-- Department Comparison Chart -->
            <div class="chart-card">
              <div class="chart-card-header">
                <h3><i class="fas fa-users"></i> Порівняння по ролях</h3>
                <div class="chart-actions">
                  <button class="btn-icon" onclick="SalaryAnalytics.exportChart('roleComparison')" title="Експорт">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="role-comparison-chart"></canvas>
              </div>
            </div>

            <!-- Budget Allocation Pie Chart -->
            <div class="chart-card">
              <div class="chart-card-header">
                <h3><i class="fas fa-pie-chart"></i> Розподіл бюджету</h3>
                <div class="chart-actions">
                  <button class="btn-icon" onclick="SalaryAnalytics.exportChart('budgetAllocation')" title="Експорт">
                    <i class="fas fa-download"></i>
                  </button>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="budget-allocation-chart"></canvas>
              </div>
            </div>

            <!-- Salary Growth Trend -->
            <div class="chart-card">
              <div class="chart-card-header">
                <h3><i class="fas fa-chart-line"></i> Прогноз зростання</h3>
                <div class="chart-actions">
                  <button class="btn-icon" onclick="SalaryAnalytics.toggleForecast()" title="Показати прогноз">
                    <i class="fas fa-magic"></i>
                  </button>
                </div>
              </div>
              <div class="chart-container">
                <canvas id="salary-growth-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- AI Insights Section -->
          <div class="ai-insights-section">
            <div class="insights-header">
              <h3><i class="fas fa-brain"></i> AI Рекомендації та Інсайти</h3>
              <button class="btn-primary" onclick="SalaryAnalytics.refreshAIInsights()">
                <i class="fas fa-sync-alt"></i>
                Оновити інсайти
              </button>
            </div>
            <div class="insights-grid" id="salary-ai-insights">
              ${this.renderAIInsights(insights)}
            </div>
          </div>

          <!-- Detailed Table -->
          <div class="salary-table-section">
            <div class="table-header">
              <h3><i class="fas fa-table"></i> Детальна таблиця зарплат</h3>
              <div class="table-actions">
                <button class="btn-secondary" onclick="SalaryAnalytics.exportToExcel()">
                  <i class="fas fa-file-excel"></i>
                  Експорт в Excel
                </button>
                <button class="btn-secondary" onclick="SalaryAnalytics.exportToPDF()">
                  <i class="fas fa-file-pdf"></i>
                  Експорт в PDF
                </button>
              </div>
            </div>
            <div class="salary-table-container">
              ${this.renderSalaryTable(members)}
            </div>
          </div>

          <!-- Market Comparison -->
          <div class="market-comparison-section">
            <div class="section-header">
              <h3><i class="fas fa-balance-scale"></i> Порівняння з ринком</h3>
              <button class="btn-secondary" onclick="SalaryAnalytics.updateMarketData()">
                <i class="fas fa-sync"></i>
                Оновити ринкові дані
              </button>
            </div>
            <div class="market-comparison-grid">
              ${this.renderMarketComparison(data.market_data || {})}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" onclick="hideModal('salary-analytics-modal')">
            Закрити
          </button>
          <button class="btn-primary" onclick="SalaryAnalytics.generateReport()">
            <i class="fas fa-file-alt"></i>
            Згенерувати повний звіт
          </button>
        </div>
      </div>
    `;

    showModal('salary-analytics-modal');

    // Initialize charts after modal is shown
    setTimeout(() => {
      this.initializeCharts(data);
    }, 100);
  },

  renderKeyMetrics(data) {
    const metrics = [
      {
        icon: 'fa-dollar-sign',
        label: 'Загальний бюджет',
        value: this.formatCurrency(data.total_budget || 0),
        trend: data.budget_trend || 0,
        color: '#4facfe'
      },
      {
        icon: 'fa-chart-line',
        label: 'Середня зарплата',
        value: this.formatCurrency(data.average_salary || 0),
        trend: data.salary_trend || 0,
        color: '#51cf66'
      },
      {
        icon: 'fa-users',
        label: 'Кількість працівників',
        value: data.total_members || 0,
        trend: data.headcount_trend || 0,
        color: '#ffa94d'
      },
      {
        icon: 'fa-percentage',
        label: 'Використано бюджету',
        value: `${Math.round((data.budget_used_percent || 0))}%`,
        trend: null,
        color: data.budget_used_percent > 90 ? '#ff6b6b' : '#a78bfa'
      }
    ];

    return metrics.map(metric => `
      <div class="salary-metric-card" style="border-left: 4px solid ${metric.color}">
        <div class="metric-icon" style="color: ${metric.color}">
          <i class="fas ${metric.icon}"></i>
        </div>
        <div class="metric-content">
          <div class="metric-label">${metric.label}</div>
          <div class="metric-value">${metric.value}</div>
          ${metric.trend !== null ? `
            <div class="metric-trend ${metric.trend >= 0 ? 'positive' : 'negative'}">
              <i class="fas fa-arrow-${metric.trend >= 0 ? 'up' : 'down'}"></i>
              ${Math.abs(metric.trend)}%
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  renderAIInsights(insights) {
    if (!insights || Object.keys(insights).length === 0) {
      return `
        <div class="insights-loading">
          <div class="loading-spinner"></div>
          <p>Генерую AI інсайти...</p>
          <button class="btn-primary" onclick="SalaryAnalytics.generateAIInsights()">
            Згенерувати інсайти
          </button>
        </div>
      `;
    }

    const insightTypes = [
      { key: 'budget_optimization', icon: 'fa-lightbulb', title: 'Оптимізація бюджету', color: '#4facfe' },
      { key: 'salary_fairness', icon: 'fa-balance-scale', title: 'Справедливість оплати', color: '#51cf66' },
      { key: 'market_position', icon: 'fa-chart-bar', title: 'Позиція на ринку', color: '#ffa94d' },
      { key: 'retention_risk', icon: 'fa-exclamation-triangle', title: 'Ризики втрати кадрів', color: '#ff6b6b' },
      { key: 'growth_recommendations', icon: 'fa-rocket', title: 'Рекомендації по зростанню', color: '#a78bfa' },
      { key: 'cost_efficiency', icon: 'fa-cogs', title: 'Ефективність витрат', color: '#00d4aa' }
    ];

    return insightTypes.map(type => {
      const insight = insights[type.key];
      if (!insight) return '';

      return `
        <div class="insight-card" style="border-top: 3px solid ${type.color}">
          <div class="insight-header">
            <div class="insight-icon" style="background: ${type.color}20; color: ${type.color}">
              <i class="fas ${type.icon}"></i>
            </div>
            <h4>${type.title}</h4>
          </div>
          <div class="insight-content">
            <p class="insight-summary">${this.escapeHtml(insight.summary || '')}</p>
            ${insight.recommendations ? `
              <div class="insight-recommendations">
                <strong>Рекомендації:</strong>
                <ul>
                  ${insight.recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${insight.metrics ? `
              <div class="insight-metrics">
                ${Object.entries(insight.metrics).map(([key, value]) => `
                  <div class="insight-metric">
                    <span class="metric-label">${this.escapeHtml(key)}:</span>
                    <span class="metric-value">${value}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="insight-footer">
            <span class="insight-confidence" style="color: ${type.color}">
              <i class="fas fa-check-circle"></i>
              Впевненість: ${insight.confidence || 85}%
            </span>
            <button class="btn-link" onclick="SalaryAnalytics.explainInsight('${type.key}')">
              Детальніше <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderSalaryTable(members) {
    if (!members || members.length === 0) {
      return '<div class="empty-state"><p>Немає даних про зарплати</p></div>';
    }

    return `
      <table class="salary-table">
        <thead>
          <tr>
            <th>Ім'я</th>
            <th>Роль</th>
            <th>Зарплата</th>
            <th>Ринкова вартість</th>
            <th>Різниця</th>
            <th>Оцінка</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(member => this.renderSalaryRow(member)).join('')}
        </tbody>
      </table>
    `;
  },

  renderSalaryRow(member) {
    const salary = member.salary || 0;
    const marketValue = member.market_value || salary;
    const difference = salary - marketValue;
    const differencePercent = marketValue > 0 ? ((difference / marketValue) * 100).toFixed(1) : 0;
    const rating = this.calculateSalaryRating(salary, marketValue);

    return `
      <tr class="salary-row">
        <td>
          <div class="member-cell">
            <div class="member-avatar">${this.getInitials(member.name)}</div>
            <span>${this.escapeHtml(member.name)}</span>
          </div>
        </td>
        <td>${this.escapeHtml(member.role || '—')}</td>
        <td class="salary-value">${this.formatCurrency(salary)}</td>
        <td class="market-value">${this.formatCurrency(marketValue)}</td>
        <td class="difference ${difference >= 0 ? 'positive' : 'negative'}">
          ${difference >= 0 ? '+' : ''}${this.formatCurrency(difference)}
          <small>(${differencePercent >= 0 ? '+' : ''}${differencePercent}%)</small>
        </td>
        <td>
          <div class="salary-rating rating-${rating.level}">
            ${this.renderStars(rating.stars)}
            <span>${rating.label}</span>
          </div>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="SalaryAnalytics.viewMemberDetails(${member.id})" title="Деталі">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" onclick="SalaryAnalytics.suggestAdjustment(${member.id})" title="AI рекомендація">
              <i class="fas fa-brain"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderMarketComparison(marketData) {
    const roles = marketData.roles || [];

    if (roles.length === 0) {
      return `
        <div class="empty-state">
          <p>Ринкові дані недоступні</p>
          <button class="btn-primary" onclick="SalaryAnalytics.fetchMarketData()">
            <i class="fas fa-download"></i>
            Завантажити ринкові дані
          </button>
        </div>
      `;
    }

    return roles.map(role => `
      <div class="market-role-card">
        <h4>${this.escapeHtml(role.name)}</h4>
        <div class="market-stats">
          <div class="market-stat">
            <span class="stat-label">Наша зарплата:</span>
            <span class="stat-value">${this.formatCurrency(role.our_salary || 0)}</span>
          </div>
          <div class="market-stat">
            <span class="stat-label">Ринкова медіана:</span>
            <span class="stat-value">${this.formatCurrency(role.market_median || 0)}</span>
          </div>
          <div class="market-stat">
            <span class="stat-label">Різниця:</span>
            <span class="stat-value ${role.difference >= 0 ? 'positive' : 'negative'}">
              ${role.difference >= 0 ? '+' : ''}${role.difference}%
            </span>
          </div>
        </div>
        <div class="market-range">
          <div class="range-bar">
            <div class="range-fill" style="left: ${role.percentile_min}%; width: ${role.percentile_max - role.percentile_min}%"></div>
            <div class="our-position" style="left: ${role.our_percentile}%"></div>
          </div>
          <div class="range-labels">
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  initializeCharts(data) {
    // Salary Distribution Bar Chart
    this.createSalaryDistributionChart(data);

    // Role Comparison Horizontal Bar Chart
    this.createRoleComparisonChart(data);

    // Budget Allocation Pie Chart
    this.createBudgetAllocationChart(data);

    // Salary Growth Line Chart
    this.createSalaryGrowthChart(data);
  },

  createSalaryDistributionChart(data) {
    const ctx = document.getElementById('salary-distribution-chart');
    if (!ctx) return;

    const members = data.members || [];
    const labels = members.map(m => m.name);
    const salaries = members.map(m => m.salary || 0);

    if (this.charts.salaryDistribution) {
      this.charts.salaryDistribution.destroy();
    }

    this.charts.salaryDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Зарплата',
          data: salaries,
          backgroundColor: 'rgba(79, 172, 254, 0.6)',
          borderColor: 'rgba(79, 172, 254, 1)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => `Зарплата: ${this.formatCurrency(context.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              callback: (value) => this.formatCurrency(value)
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  },

  createRoleComparisonChart(data) {
    const ctx = document.getElementById('role-comparison-chart');
    if (!ctx) return;

    const roleStats = data.role_statistics || [];
    const labels = roleStats.map(r => r.role);
    const avgSalaries = roleStats.map(r => r.average_salary || 0);
    const counts = roleStats.map(r => r.count || 0);

    if (this.charts.roleComparison) {
      this.charts.roleComparison.destroy();
    }

    this.charts.roleComparison = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Середня зарплата',
            data: avgSalaries,
            backgroundColor: 'rgba(81, 207, 102, 0.6)',
            borderColor: 'rgba(81, 207, 102, 1)',
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: 'y'
          },
          {
            label: 'Кількість',
            data: counts,
            backgroundColor: 'rgba(255, 169, 77, 0.6)',
            borderColor: 'rgba(255, 169, 77, 1)',
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              display: false
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  },

  createBudgetAllocationChart(data) {
    const ctx = document.getElementById('budget-allocation-chart');
    if (!ctx) return;

    const allocation = data.budget_allocation || {};
    const labels = Object.keys(allocation);
    const values = Object.values(allocation);

    if (this.charts.budgetAllocation) {
      this.charts.budgetAllocation.destroy();
    }

    this.charts.budgetAllocation = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: [
            'rgba(79, 172, 254, 0.8)',
            'rgba(81, 207, 102, 0.8)',
            'rgba(255, 169, 77, 0.8)',
            'rgba(167, 139, 250, 0.8)',
            'rgba(255, 107, 107, 0.8)',
            'rgba(0, 212, 170, 0.8)'
          ],
          borderColor: '#0a0a0f',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: { size: 12 },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = ((value / total) * 100).toFixed(1);
                return `${label}: ${this.formatCurrency(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  },

  createSalaryGrowthChart(data) {
    const ctx = document.getElementById('salary-growth-chart');
    if (!ctx) return;

    const history = data.salary_history || [];
    const labels = history.map(h => h.month);
    const actual = history.map(h => h.actual || 0);
    const forecast = history.map(h => h.forecast || null);

    if (this.charts.salaryGrowth) {
      this.charts.salaryGrowth.destroy();
    }

    this.charts.salaryGrowth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Фактичні витрати',
            data: actual,
            borderColor: 'rgba(79, 172, 254, 1)',
            backgroundColor: 'rgba(79, 172, 254, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Прогноз',
            data: forecast,
            borderColor: 'rgba(167, 139, 250, 1)',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            borderWidth: 3,
            borderDash: [5, 5],
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'rgba(255, 255, 255, 0.9)',
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            padding: 12,
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)',
              callback: (value) => this.formatCurrency(value)
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  },

  // Helper Functions
  formatCurrency(amount) {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  },

  calculateSalaryRating(salary, marketValue) {
    const ratio = salary / marketValue;

    if (ratio >= 1.2) return { stars: 5, level: 'excellent', label: 'Відмінно' };
    if (ratio >= 1.05) return { stars: 4, level: 'good', label: 'Добре' };
    if (ratio >= 0.95) return { stars: 3, level: 'fair', label: 'Справедливо' };
    if (ratio >= 0.8) return { stars: 2, level: 'low', label: 'Нижче норми' };
    return { stars: 1, level: 'critical', label: 'Критично' };
  },

  renderStars(count) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += `<i class="fas fa-star ${i < count ? 'active' : ''}"></i>`;
    }
    return stars;
  },

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  },

  // Action Methods
  async generateAIInsights() {
    try {
      showNotification('Генерую AI інсайти...', 'info');

      const response = await apiCall('/ai/salary-insights', {
        method: 'POST',
        body: JSON.stringify({
          team_id: this.currentTeamId,
          members: this.salaryData.members,
          budget: this.salaryData.budget
        })
      });

      this.salaryData.ai_insights = response.insights;

      // Re-render insights section
      const insightsContainer = document.getElementById('salary-ai-insights');
      if (insightsContainer) {
        insightsContainer.innerHTML = this.renderAIInsights(response.insights);
      }

      showNotification('AI інсайти згенеровано', 'success');
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      showNotification('Помилка генерації AI інсайтів', 'error');
    }
  },

  async refreshAIInsights() {
    await this.generateAIInsights();
  },

  exportChart(chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;

    const url = chart.toBase64Image();
    const link = document.createElement('a');
    link.download = `${chartName}-${Date.now()}.png`;
    link.href = url;
    link.click();

    showNotification('Графік експортовано', 'success');
  },

  exportToExcel() {
    showNotification('Експорт в Excel... (в розробці)', 'info');
  },

  exportToPDF() {
    showNotification('Експорт в PDF... (в розробці)', 'info');
  },

  generateReport() {
    showNotification('Генерація звіту... (в розробці)', 'info');
  },

  viewMemberDetails(memberId) {
    showNotification(`Деталі члена команди ${memberId}... (в розробці)`, 'info');
  },

  async suggestAdjustment(memberId) {
    try {
      showNotification('Запитую AI рекомендацію...', 'info');

      const response = await apiCall('/ai/salary-adjustment', {
        method: 'POST',
        body: JSON.stringify({
          member_id: memberId,
          team_id: this.currentTeamId
        })
      });

      // Show AI recommendation in a modal or notification
      showNotification(`AI рекомендація: ${response.recommendation}`, 'success');
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      showNotification('Помилка отримання AI рекомендації', 'error');
    }
  },

  updateMarketData() {
    showNotification('Оновлення ринкових даних... (в розробці)', 'info');
  },

  fetchMarketData() {
    showNotification('Завантаження ринкових даних... (в розробці)', 'info');
  },

  explainInsight(insightKey) {
    showNotification(`Пояснення інсайту ${insightKey}... (в розробці)`, 'info');
  },

  toggleForecast() {
    const chart = this.charts.salaryGrowth;
    if (!chart) return;

    const dataset = chart.data.datasets[1]; // Forecast dataset
    dataset.hidden = !dataset.hidden;
    chart.update();
  }
};

// Expose globally
window.SalaryAnalytics = SalaryAnalytics;
