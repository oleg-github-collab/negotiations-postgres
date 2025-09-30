// Enhanced Analysis History Component
(() => {
    'use strict';

    // Enhanced analysis history with detailed metrics
    async function loadEnhancedAnalysisHistory(clientId) {
        if (!clientId) return;

        try {
            const response = await fetch(`/api/negotiations/client/${clientId}/archive?limit=100`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка завантаження історії');
            }

            renderEnhancedAnalysisHistory(data.analyses);
            updateAnalysisHistoryStats(data.analyses);

        } catch (error) {
            console.error('Analysis history loading error:', error);
            if (window.showNotification) {
                window.showNotification(error.message || 'Помилка завантаження історії', 'error');
            }
        }
    }

    // Render enhanced analysis history
    function renderEnhancedAnalysisHistory(analyses) {
        // Find or create analysis history container
        let historyContainer = document.getElementById('enhanced-analysis-history');

        if (!historyContainer) {
            // Create history section if it doesn't exist
            const archiveSection = document.getElementById('archive-section');
            if (archiveSection) {
                historyContainer = document.createElement('div');
                historyContainer.id = 'enhanced-analysis-history';
                historyContainer.className = 'enhanced-analysis-history';
                archiveSection.appendChild(historyContainer);
            } else {
                return;
            }
        }

        if (!analyses || analyses.length === 0) {
            historyContainer.innerHTML = `
                <div class="history-header">
                    <h4>
                        <i class="fas fa-clock"></i>
                        Історія аналізів
                    </h4>
                </div>
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <p>Історія аналізів порожня</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = `
            <div class="history-header">
                <h4>
                    <i class="fas fa-clock"></i>
                    Історія аналізів
                    <span class="history-count">${analyses.length}</span>
                </h4>
                <div class="history-actions">
                    <button class="btn-icon" onclick="toggleHistoryView()" title="Змінити вигляд">
                        <i class="fas fa-table"></i>
                    </button>
                    <button class="btn-icon" onclick="exportAnalysisHistory()" title="Експорт">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>

            <div class="history-timeline" id="history-timeline">
                ${renderAnalysisTimeline(analyses)}
            </div>

            <div class="history-table" id="history-table" style="display: none;">
                ${renderAnalysisTable(analyses)}
            </div>
        `;
    }

    // Render analysis timeline view
    function renderAnalysisTimeline(analyses) {
        const groupedByDate = groupAnalysesByDate(analyses);

        return Object.entries(groupedByDate).map(([date, dayAnalyses]) => `
            <div class="timeline-day">
                <div class="timeline-date">
                    <h5>${formatDateHeader(date)}</h5>
                    <span class="day-count">${dayAnalyses.length} аналізів</span>
                </div>
                <div class="timeline-items">
                    ${dayAnalyses.map(analysis => renderTimelineItem(analysis)).join('')}
                </div>
            </div>
        `).join('');
    }

    // Render individual timeline item
    function renderTimelineItem(analysis) {
        const date = new Date(analysis.created_at);
        const time = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        const riskColor = getRiskColor(analysis.risk_level);

        return `
            <div class="timeline-item" data-analysis-id="${analysis.id}">
                <div class="timeline-marker">
                    <div class="marker-dot ${analysis.risk_level}"></div>
                    <div class="marker-time">${time}</div>
                </div>

                <div class="timeline-content">
                    <div class="analysis-card" onclick="openAnalysisDetails(${analysis.id})">
                        <div class="card-header">
                            <div class="analysis-title">
                                <i class="fas fa-brain"></i>
                                <h6>${analysis.title}</h6>
                            </div>
                            <div class="risk-badge ${analysis.risk_level}">
                                ${getRiskLabel(analysis.risk_level)}
                            </div>
                        </div>

                        <div class="card-metrics">
                            <div class="metric-grid">
                                <div class="metric-item">
                                    <span class="metric-value">${analysis.manipulation_count || 0}</span>
                                    <span class="metric-label">Маніпуляції</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-value">${analysis.bias_count || 0}</span>
                                    <span class="metric-label">Упередження</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-value">${analysis.fallacy_count || 0}</span>
                                    <span class="metric-label">Софізми</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-value">${(analysis.severity_average || 0).toFixed(1)}</span>
                                    <span class="metric-label">Середня серйозність</span>
                                </div>
                            </div>
                        </div>

                        ${analysis.person_focus ? `
                            <div class="card-focus">
                                <i class="fas fa-user"></i>
                                <span>Фокус: ${analysis.person_focus}</span>
                            </div>
                        ` : ''}

                        <div class="card-footer">
                            <div class="analysis-info">
                                <span class="tokens-info">
                                    <i class="fas fa-coins"></i>
                                    ${analysis.tokens_estimated || 0} токенів
                                </span>
                                <span class="duration-info">
                                    <i class="fas fa-clock"></i>
                                    ${analysis.analysis_duration || 0}с
                                </span>
                            </div>
                            <div class="analysis-actions">
                                <button class="btn-icon btn-sm" onclick="loadAnalysisFromHistory(${analysis.id}, event)" title="Завантажити">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon btn-sm" onclick="shareAnalysis(${analysis.id}, event)" title="Поділитися">
                                    <i class="fas fa-share"></i>
                                </button>
                                <button class="btn-icon btn-sm btn-danger" onclick="deleteAnalysisFromHistory(${analysis.id}, event)" title="Видалити">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        ${analysis.barometer ? `
                            <div class="mini-barometer">
                                ${renderMiniBarometer(analysis.barometer)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Render analysis table view
    function renderAnalysisTable(analyses) {
        return `
            <div class="table-responsive">
                <table class="history-table-element">
                    <thead>
                        <tr>
                            <th>Дата/Час</th>
                            <th>Назва</th>
                            <th>Фокус</th>
                            <th>Маніпуляції</th>
                            <th>Упередження</th>
                            <th>Софізми</th>
                            <th>Серйозність</th>
                            <th>Ризик</th>
                            <th>Токени</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analyses.map(analysis => renderTableRow(analysis)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Render table row
    function renderTableRow(analysis) {
        const date = new Date(analysis.created_at);
        const dateStr = date.toLocaleDateString('uk-UA');
        const timeStr = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

        return `
            <tr data-analysis-id="${analysis.id}" onclick="openAnalysisDetails(${analysis.id})">
                <td>
                    <div class="datetime-cell">
                        <div class="date">${dateStr}</div>
                        <div class="time">${timeStr}</div>
                    </div>
                </td>
                <td>
                    <div class="title-cell">
                        ${analysis.title}
                    </div>
                </td>
                <td>
                    ${analysis.person_focus ? `
                        <span class="person-badge">${analysis.person_focus}</span>
                    ` : `<span class="no-focus">—</span>`}
                </td>
                <td class="metric-cell">${analysis.manipulation_count || 0}</td>
                <td class="metric-cell">${analysis.bias_count || 0}</td>
                <td class="metric-cell">${analysis.fallacy_count || 0}</td>
                <td class="metric-cell">${(analysis.severity_average || 0).toFixed(1)}</td>
                <td>
                    <span class="risk-badge ${analysis.risk_level}">${getRiskLabel(analysis.risk_level)}</span>
                </td>
                <td class="metric-cell">${analysis.tokens_estimated || 0}</td>
                <td class="actions-cell" onclick="event.stopPropagation()">
                    <button class="btn-icon btn-xs" onclick="loadAnalysisFromHistory(${analysis.id}, event)" title="Завантажити">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-xs btn-danger" onclick="deleteAnalysisFromHistory(${analysis.id}, event)" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    // Group analyses by date
    function groupAnalysesByDate(analyses) {
        const groups = {};

        analyses.forEach(analysis => {
            const date = new Date(analysis.created_at);
            const dateKey = date.toISOString().split('T')[0];

            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(analysis);
        });

        // Sort by date (newest first)
        const sortedEntries = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
        return Object.fromEntries(sortedEntries);
    }

    // Format date header
    function formatDateHeader(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Сьогодні';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Вчора';
        } else {
            return date.toLocaleDateString('uk-UA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // Get risk color
    function getRiskColor(riskLevel) {
        switch (riskLevel) {
            case 'high': return '#ff4757';
            case 'medium': return '#ffa502';
            case 'low': return '#2ed573';
            default: return '#747d8c';
        }
    }

    // Get risk label
    function getRiskLabel(riskLevel) {
        switch (riskLevel) {
            case 'high': return 'Високий';
            case 'medium': return 'Середній';
            case 'low': return 'Низький';
            default: return 'Невизначений';
        }
    }

    // Render mini barometer
    function renderMiniBarometer(barometer) {
        if (!barometer || !barometer.score) return '';

        const score = barometer.score || 0;
        const level = barometer.level || 'low';

        return `
            <div class="mini-barometer-container">
                <div class="barometer-label">Барометр складності</div>
                <div class="barometer-score ${level}">
                    <span class="score-value">${score}</span>
                    <span class="score-max">/100</span>
                </div>
                <div class="barometer-bar">
                    <div class="barometer-fill ${level}" style="width: ${score}%"></div>
                </div>
            </div>
        `;
    }

    // Update analysis history statistics
    function updateAnalysisHistoryStats(analyses) {
        const stats = calculateHistoryStats(analyses);

        // Find or create stats container
        let statsContainer = document.getElementById('analysis-history-stats');
        if (!statsContainer) {
            const historyContainer = document.getElementById('enhanced-analysis-history');
            if (historyContainer) {
                statsContainer = document.createElement('div');
                statsContainer.id = 'analysis-history-stats';
                statsContainer.className = 'history-stats';
                historyContainer.insertBefore(statsContainer, historyContainer.firstChild);
            }
        }

        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalAnalyses}</div>
                        <div class="stat-label">Всього аналізів</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalManipulations}</div>
                        <div class="stat-label">Маніпуляції</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.averageSeverity.toFixed(1)}</div>
                        <div class="stat-label">Середня серйозність</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.highRiskCount}</div>
                        <div class="stat-label">Високий ризик</div>
                    </div>
                </div>
            `;
        }
    }

    // Calculate history statistics
    function calculateHistoryStats(analyses) {
        const totalAnalyses = analyses.length;
        let totalManipulations = 0;
        let totalSeverity = 0;
        let highRiskCount = 0;

        analyses.forEach(analysis => {
            totalManipulations += analysis.manipulation_count || 0;
            totalSeverity += analysis.severity_average || 0;
            if (analysis.risk_level === 'high') {
                highRiskCount++;
            }
        });

        return {
            totalAnalyses,
            totalManipulations,
            averageSeverity: totalAnalyses > 0 ? totalSeverity / totalAnalyses : 0,
            highRiskCount
        };
    }

    // Toggle between timeline and table view
    function toggleHistoryView() {
        const timeline = document.getElementById('history-timeline');
        const table = document.getElementById('history-table');
        const toggleBtn = document.querySelector('.history-actions .btn-icon i');

        if (timeline.style.display === 'none') {
            // Show timeline
            timeline.style.display = 'block';
            table.style.display = 'none';
            toggleBtn.className = 'fas fa-table';
        } else {
            // Show table
            timeline.style.display = 'none';
            table.style.display = 'block';
            toggleBtn.className = 'fas fa-clock';
        }
    }

    // Open analysis details modal
    function openAnalysisDetails(analysisId) {
        // Implementation for detailed analysis view
        console.log('Opening analysis details for:', analysisId);

        if (window.loadArchiveAnalysis) {
            window.loadArchiveAnalysis(analysisId);
        }
    }

    // Load analysis from history
    function loadAnalysisFromHistory(analysisId, event) {
        if (event) {
            event.stopPropagation();
        }

        if (window.loadArchiveAnalysis) {
            window.loadArchiveAnalysis(analysisId);
        }
    }

    // Share analysis
    function shareAnalysis(analysisId, event) {
        if (event) {
            event.stopPropagation();
        }

        // Generate shareable link
        const shareUrl = `${window.location.origin}${window.location.pathname}?analysis=${analysisId}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                if (window.showNotification) {
                    window.showNotification('Посилання скопійовано в буфер обміну', 'success');
                }
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            if (window.showNotification) {
                window.showNotification('Посилання скопійовано в буфер обміну', 'success');
            }
        }
    }

    // Delete analysis from history
    function deleteAnalysisFromHistory(analysisId, event) {
        if (event) {
            event.stopPropagation();
        }

        if (window.deleteArchiveAnalysis) {
            window.deleteArchiveAnalysis(analysisId);
        }
    }

    // Export analysis history
    function exportAnalysisHistory() {
        const currentClientId = getCurrentClientId();
        if (!currentClientId) return;

        // Generate CSV export
        const analyses = window.archiveState?.analyses || [];
        if (analyses.length === 0) {
            if (window.showNotification) {
                window.showNotification('Немає даних для експорту', 'warning');
            }
            return;
        }

        const csvContent = generateAnalysisCSV(analyses);
        downloadCSV(csvContent, `analysis-history-${currentClientId}.csv`);
    }

    // Generate CSV content
    function generateAnalysisCSV(analyses) {
        const headers = [
            'Дата',
            'Час',
            'Назва',
            'Фокус особи',
            'Маніпуляції',
            'Упередження',
            'Софізми',
            'Середня серйозність',
            'Рівень ризику',
            'Токени',
            'Тривалість (сек)'
        ];

        const rows = analyses.map(analysis => {
            const date = new Date(analysis.created_at);
            return [
                date.toLocaleDateString('uk-UA'),
                date.toLocaleTimeString('uk-UA'),
                analysis.title,
                analysis.person_focus || '',
                analysis.manipulation_count || 0,
                analysis.bias_count || 0,
                analysis.fallacy_count || 0,
                (analysis.severity_average || 0).toFixed(2),
                getRiskLabel(analysis.risk_level),
                analysis.tokens_estimated || 0,
                analysis.analysis_duration || 0
            ];
        });

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }

    // Download CSV file
    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // Get current client ID
    function getCurrentClientId() {
        return window.state?.currentClient?.id ||
               window.appState?.currentClient?.id ||
               document.querySelector('.client-item.selected')?.dataset?.clientId ||
               null;
    }

    // Integrate with person filtering system
    function applyPersonFilters(analyses) {
        if (window.personFilter && window.personFilter.currentFilters.length > 0) {
            return window.personFilter.filterAnalysisResults(analyses);
        }
        return analyses;
    }

    // Enhanced analysis display with person filtering
    function updateAnalysisDisplay(personFilters = []) {
        const historyContainer = document.getElementById('enhanced-analysis-history');
        if (!historyContainer || !window.currentAnalyses) return;

        let filteredAnalyses = applyPersonFilters(window.currentAnalyses);

        // Re-render with filtered data
        renderAnalysisHistory(filteredAnalyses, historyContainer);

        // Update filter statistics
        updateFilterStatistics(filteredAnalyses, personFilters);
    }

    function updateFilterStatistics(analyses, filters) {
        const statsContainer = document.querySelector('.filter-stats');
        if (!statsContainer) {
            // Create stats container if it doesn't exist
            const historyContainer = document.getElementById('enhanced-analysis-history');
            if (historyContainer) {
                const statsDiv = document.createElement('div');
                statsDiv.className = 'filter-stats';
                historyContainer.insertBefore(statsDiv, historyContainer.firstChild);
            }
        }

        const stats = {
            totalFiltered: analyses.length,
            activeFilters: filters.length,
            riskBreakdown: analyses.reduce((acc, analysis) => {
                acc[analysis.risk_level] = (acc[analysis.risk_level] || 0) + 1;
                return acc;
            }, {})
        };

        const statsContainer = document.querySelector('.filter-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="filter-stat">
                    <i class="fas fa-filter"></i>
                    <span>Знайдено: <span class="value">${stats.totalFiltered}</span></span>
                </div>
                <div class="filter-stat">
                    <i class="fas fa-user-check"></i>
                    <span>Фільтрів: <span class="value">${stats.activeFilters}</span></span>
                </div>
                <div class="filter-stat">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Високий ризик: <span class="value">${stats.riskBreakdown.high || 0}</span></span>
                </div>
            `;
        }
    }

    // Enhanced CSV export with person filter context
    function exportFilteredHistoryToCSV(analyses) {
        const filteredAnalyses = applyPersonFilters(analyses);
        const activeFilters = window.personFilter ? window.personFilter.currentFilters : [];

        let csvContent = 'Дата,Час,Назва,Фокус на особі,Ризик,Маніпуляції,Упередження,Помилки,Середня тяжкість,Тривалість\n';

        // Add filter context as comment
        if (activeFilters.length > 0) {
            csvContent += `# Застосовані фільтри осіб: ${activeFilters.join(', ')}\n`;
        }

        filteredAnalyses.forEach(analysis => {
            const date = new Date(analysis.created_at);
            const row = [
                date.toLocaleDateString('uk-UA'),
                date.toLocaleTimeString('uk-UA'),
                `"${(analysis.title || 'Без назви').replace(/"/g, '""')}"`,
                `"${(analysis.person_focus || '').replace(/"/g, '""')}"`,
                analysis.risk_level || 'low',
                analysis.manipulation_count || 0,
                analysis.bias_count || 0,
                analysis.fallacy_count || 0,
                (analysis.severity_average || 0).toFixed(2),
                `${analysis.analysis_duration || 0}с`
            ];
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const filterSuffix = activeFilters.length > 0 ? `_${activeFilters.join('_')}` : '';
        link.download = `аналізи_переговорів${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }

    // Global functions
    window.loadEnhancedAnalysisHistory = loadEnhancedAnalysisHistory;
    window.toggleHistoryView = toggleHistoryView;
    window.openAnalysisDetails = openAnalysisDetails;
    window.loadAnalysisFromHistory = loadAnalysisFromHistory;
    window.shareAnalysis = shareAnalysis;
    window.deleteAnalysisFromHistory = deleteAnalysisFromHistory;
    window.exportAnalysisHistory = exportAnalysisHistory;
    window.exportFilteredHistoryToCSV = exportFilteredHistoryToCSV;
    window.updateAnalysisDisplay = updateAnalysisDisplay;
    window.applyPersonFilters = applyPersonFilters;

    console.log('✨ Enhanced Analysis History component ready');

})();