/**
 * ErrorReporter - Advanced error aggregation and reporting system
 * Provides error categorization, trend analysis, and automated reporting
 */

class ErrorReporter {
    constructor(systemRecovery) {
        this.systemRecovery = systemRecovery;
        this.logThrottler = new LogThrottler();
        
        // Error categorization
        this.errorCategories = {
            AUTHENTICATION: 'authentication',
            NETWORK: 'network',
            STORAGE: 'storage',
            API: 'api',
            UI: 'ui',
            SYSTEM: 'system',
            UNKNOWN: 'unknown'
        };
        
        // Error severity levels
        this.severityLevels = {
            LOW: 1,
            MEDIUM: 2,
            HIGH: 3,
            CRITICAL: 4
        };
        
        // Error patterns for categorization
        this.errorPatterns = [
            { pattern: /session|auth|login|token/i, category: this.errorCategories.AUTHENTICATION, severity: this.severityLevels.HIGH },
            { pattern: /network|fetch|connection|timeout/i, category: this.errorCategories.NETWORK, severity: this.severityLevels.MEDIUM },
            { pattern: /storage|localStorage|sessionStorage/i, category: this.errorCategories.STORAGE, severity: this.severityLevels.MEDIUM },
            { pattern: /github|api|response\.json/i, category: this.errorCategories.API, severity: this.severityLevels.HIGH },
            { pattern: /element|dom|ui|render/i, category: this.errorCategories.UI, severity: this.severityLevels.LOW },
            { pattern: /system|critical|fatal/i, category: this.errorCategories.SYSTEM, severity: this.severityLevels.CRITICAL }
        ];
        
        // Reporting thresholds
        this.reportingThresholds = {
            errorRatePerMinute: 5,
            criticalErrorsPerHour: 3,
            totalErrorsPerSession: 50,
            repeatedErrorThreshold: 10
        };
        
        // Initialize reporting
        this.initializeReporting();
    }

    /**
     * Initialize error reporting system
     */
    initializeReporting() {
        // Set up periodic error analysis
        setInterval(() => {
            this.analyzeErrorTrends();
        }, 60000); // Every minute

        // Set up periodic reporting
        setInterval(() => {
            this.generatePeriodicReport();
        }, 300000); // Every 5 minutes
    }

    /**
     * Categorize error based on message and context
     */
    categorizeError(error) {
        const message = error.message || '';
        const type = error.type || '';
        const details = error.details || {};
        
        // Check against patterns
        for (const pattern of this.errorPatterns) {
            if (pattern.pattern.test(message) || pattern.pattern.test(type)) {
                return {
                    category: pattern.category,
                    severity: pattern.severity,
                    confidence: 0.8
                };
            }
        }
        
        // Check details for additional context
        if (details.operation) {
            if (details.operation.includes('auth') || details.operation.includes('login')) {
                return {
                    category: this.errorCategories.AUTHENTICATION,
                    severity: this.severityLevels.HIGH,
                    confidence: 0.7
                };
            }
            
            if (details.operation.includes('github') || details.operation.includes('api')) {
                return {
                    category: this.errorCategories.API,
                    severity: this.severityLevels.MEDIUM,
                    confidence: 0.7
                };
            }
        }
        
        // Default categorization
        return {
            category: this.errorCategories.UNKNOWN,
            severity: this.severityLevels.LOW,
            confidence: 0.3
        };
    }

    /**
     * Analyze error trends and patterns
     */
    analyzeErrorTrends() {
        const errorHistory = this.systemRecovery.errorHistory;
        if (errorHistory.length === 0) return;

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Get recent errors
        const recentErrors = errorHistory.filter(error => 
            new Date(error.timestamp) > fiveMinutesAgo
        );

        const hourlyErrors = errorHistory.filter(error => 
            new Date(error.timestamp) > oneHourAgo
        );

        // Categorize errors
        const categorizedErrors = recentErrors.map(error => ({
            ...error,
            ...this.categorizeError(error)
        }));

        // Analyze patterns
        const analysis = {
            timestamp: now.toISOString(),
            recentErrorCount: recentErrors.length,
            hourlyErrorCount: hourlyErrors.length,
            errorRate: recentErrors.length / 5, // per minute
            categories: this.groupErrorsByCategory(categorizedErrors),
            severity: this.analyzeSeverity(categorizedErrors),
            repeatedErrors: this.findRepeatedErrors(recentErrors),
            trends: this.analyzeTrends(hourlyErrors)
        };

        // Check if reporting thresholds are exceeded
        this.checkReportingThresholds(analysis);

        return analysis;
    }

    /**
     * Group errors by category
     */
    groupErrorsByCategory(errors) {
        const categories = {};
        
        errors.forEach(error => {
            const category = error.category || this.errorCategories.UNKNOWN;
            if (!categories[category]) {
                categories[category] = {
                    count: 0,
                    errors: [],
                    avgSeverity: 0
                };
            }
            
            categories[category].count++;
            categories[category].errors.push(error);
        });

        // Calculate average severity for each category
        Object.keys(categories).forEach(category => {
            const errors = categories[category].errors;
            const totalSeverity = errors.reduce((sum, error) => sum + (error.severity || 1), 0);
            categories[category].avgSeverity = totalSeverity / errors.length;
        });

        return categories;
    }

    /**
     * Analyze error severity distribution
     */
    analyzeSeverity(errors) {
        const severityCount = {
            [this.severityLevels.LOW]: 0,
            [this.severityLevels.MEDIUM]: 0,
            [this.severityLevels.HIGH]: 0,
            [this.severityLevels.CRITICAL]: 0
        };

        errors.forEach(error => {
            const severity = error.severity || this.severityLevels.LOW;
            severityCount[severity]++;
        });

        const totalErrors = errors.length;
        const severityDistribution = {};
        
        Object.keys(severityCount).forEach(level => {
            severityDistribution[level] = {
                count: severityCount[level],
                percentage: totalErrors > 0 ? (severityCount[level] / totalErrors) * 100 : 0
            };
        });

        return {
            distribution: severityDistribution,
            criticalCount: severityCount[this.severityLevels.CRITICAL],
            highCount: severityCount[this.severityLevels.HIGH],
            avgSeverity: totalErrors > 0 ? 
                Object.keys(severityCount).reduce((sum, level) => 
                    sum + (parseInt(level) * severityCount[level]), 0) / totalErrors : 0
        };
    }

    /**
     * Find repeated error patterns
     */
    findRepeatedErrors(errors) {
        const errorGroups = {};
        
        errors.forEach(error => {
            // Group by message and type
            const key = `${error.type}:${error.message}`;
            if (!errorGroups[key]) {
                errorGroups[key] = {
                    count: 0,
                    firstOccurrence: error.timestamp,
                    lastOccurrence: error.timestamp,
                    sample: error
                };
            }
            
            errorGroups[key].count++;
            errorGroups[key].lastOccurrence = error.timestamp;
        });

        // Filter repeated errors
        const repeatedErrors = Object.values(errorGroups)
            .filter(group => group.count >= 3)
            .sort((a, b) => b.count - a.count);

        return repeatedErrors;
    }

    /**
     * Analyze error trends over time
     */
    analyzeTrends(errors) {
        if (errors.length < 2) return { trend: 'insufficient_data' };

        // Group errors by 10-minute intervals
        const intervals = {};
        const now = new Date();
        
        for (let i = 0; i < 6; i++) {
            const intervalStart = new Date(now.getTime() - (i + 1) * 10 * 60 * 1000);
            const intervalEnd = new Date(now.getTime() - i * 10 * 60 * 1000);
            const intervalKey = intervalStart.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
            
            intervals[intervalKey] = {
                start: intervalStart,
                end: intervalEnd,
                count: 0
            };
        }

        // Count errors in each interval
        errors.forEach(error => {
            const errorTime = new Date(error.timestamp);
            Object.keys(intervals).forEach(key => {
                const interval = intervals[key];
                if (errorTime >= interval.start && errorTime < interval.end) {
                    interval.count++;
                }
            });
        });

        // Analyze trend
        const counts = Object.values(intervals).map(interval => interval.count).reverse();
        const trend = this.calculateTrend(counts);

        return {
            trend,
            intervals: counts,
            currentRate: counts[counts.length - 1] || 0,
            peakRate: Math.max(...counts),
            avgRate: counts.reduce((sum, count) => sum + count, 0) / counts.length
        };
    }

    /**
     * Calculate trend direction from data points
     */
    calculateTrend(dataPoints) {
        if (dataPoints.length < 2) return 'stable';

        const recent = dataPoints.slice(-3); // Last 3 points
        const earlier = dataPoints.slice(0, 3); // First 3 points

        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;

        const change = recentAvg - earlierAvg;
        const changePercent = earlierAvg > 0 ? (change / earlierAvg) * 100 : 0;

        if (changePercent > 50) return 'increasing_rapidly';
        if (changePercent > 20) return 'increasing';
        if (changePercent < -50) return 'decreasing_rapidly';
        if (changePercent < -20) return 'decreasing';
        return 'stable';
    }

    /**
     * Check if reporting thresholds are exceeded
     */
    checkReportingThresholds(analysis) {
        const alerts = [];

        // Check error rate threshold
        if (analysis.errorRate > this.reportingThresholds.errorRatePerMinute) {
            alerts.push({
                type: 'high_error_rate',
                severity: this.severityLevels.HIGH,
                message: `Taxa de erro alta: ${analysis.errorRate.toFixed(2)} erros/min`,
                threshold: this.reportingThresholds.errorRatePerMinute,
                actual: analysis.errorRate
            });
        }

        // Check critical errors
        if (analysis.severity.criticalCount > 0) {
            alerts.push({
                type: 'critical_errors',
                severity: this.severityLevels.CRITICAL,
                message: `${analysis.severity.criticalCount} erro(s) crítico(s) detectado(s)`,
                threshold: 0,
                actual: analysis.severity.criticalCount
            });
        }

        // Check repeated errors
        const highRepeatedErrors = analysis.repeatedErrors.filter(error => 
            error.count >= this.reportingThresholds.repeatedErrorThreshold
        );

        if (highRepeatedErrors.length > 0) {
            alerts.push({
                type: 'repeated_errors',
                severity: this.severityLevels.MEDIUM,
                message: `${highRepeatedErrors.length} padrão(ões) de erro repetido detectado(s)`,
                details: highRepeatedErrors.map(error => ({
                    message: error.sample.message,
                    count: error.count
                }))
            });
        }

        // Check trend
        if (analysis.trends.trend === 'increasing_rapidly') {
            alerts.push({
                type: 'error_trend',
                severity: this.severityLevels.HIGH,
                message: 'Taxa de erro aumentando rapidamente',
                trend: analysis.trends.trend,
                currentRate: analysis.trends.currentRate
            });
        }

        // Process alerts
        if (alerts.length > 0) {
            this.processAlerts(alerts, analysis);
        }
    }

    /**
     * Process and handle alerts
     */
    processAlerts(alerts, analysis) {
        alerts.forEach(alert => {
            // Log alert
            this.logThrottler.throttledLog(
                `alert_${alert.type}`,
                `🚨 ALERTA: ${alert.message}`,
                'error'
            );

            // Track alert as error
            this.systemRecovery.trackError('system_alert', alert.message, {
                type: alert.type,
                severity: alert.severity,
                analysis: analysis
            });
        });

        // Generate alert report
        this.generateAlertReport(alerts, analysis);
    }

    /**
     * Generate alert report
     */
    generateAlertReport(alerts, analysis) {
        const report = {
            timestamp: new Date().toISOString(),
            type: 'alert_report',
            alerts,
            analysis,
            recommendations: this.generateRecommendations(alerts, analysis)
        };

        // Store report
        this.storeReport(report);

        // Show notification for critical alerts
        const criticalAlerts = alerts.filter(alert => 
            alert.severity >= this.severityLevels.HIGH
        );

        if (criticalAlerts.length > 0 && window.adminApp) {
            const message = `${criticalAlerts.length} alerta(s) crítico(s) detectado(s)`;
            window.adminApp.notificationManager.showNotification(message, 'error', {
                persistent: true,
                actions: [{
                    text: 'Ver Diagnósticos',
                    onclick: () => window.adminApp.handleSystemDiagnostics()
                }]
            });
        }
    }

    /**
     * Generate recommendations based on alerts and analysis
     */
    generateRecommendations(alerts, analysis) {
        const recommendations = [];

        alerts.forEach(alert => {
            switch (alert.type) {
                case 'high_error_rate':
                    recommendations.push({
                        priority: 'high',
                        action: 'emergency_reset',
                        message: 'Considere um reset de emergência para resolver problemas sistêmicos',
                        automated: false
                    });
                    break;

                case 'critical_errors':
                    recommendations.push({
                        priority: 'critical',
                        action: 'immediate_investigation',
                        message: 'Investigação imediata necessária para erros críticos',
                        automated: false
                    });
                    break;

                case 'repeated_errors':
                    recommendations.push({
                        priority: 'medium',
                        action: 'clear_cache',
                        message: 'Limpar cache e dados temporários pode resolver erros repetidos',
                        automated: true
                    });
                    break;

                case 'error_trend':
                    recommendations.push({
                        priority: 'high',
                        action: 'monitor_closely',
                        message: 'Monitoramento próximo necessário devido ao aumento de erros',
                        automated: false
                    });
                    break;
            }
        });

        // Add category-specific recommendations
        Object.keys(analysis.categories).forEach(category => {
            const categoryData = analysis.categories[category];
            
            if (categoryData.count > 5) {
                switch (category) {
                    case this.errorCategories.AUTHENTICATION:
                        recommendations.push({
                            priority: 'high',
                            action: 'reset_auth',
                            message: 'Múltiplos erros de autenticação - considere reset de sessão',
                            automated: true
                        });
                        break;

                    case this.errorCategories.NETWORK:
                        recommendations.push({
                            priority: 'medium',
                            action: 'check_connectivity',
                            message: 'Verificar conectividade de rede e status de APIs',
                            automated: false
                        });
                        break;

                    case this.errorCategories.STORAGE:
                        recommendations.push({
                            priority: 'medium',
                            action: 'clear_storage',
                            message: 'Limpar dados de armazenamento local corrompidos',
                            automated: true
                        });
                        break;
                }
            }
        });

        return recommendations;
    }

    /**
     * Generate periodic report
     */
    generatePeriodicReport() {
        const analysis = this.analyzeErrorTrends();
        if (!analysis || analysis.recentErrorCount === 0) return;

        const report = {
            timestamp: new Date().toISOString(),
            type: 'periodic_report',
            period: '5_minutes',
            analysis,
            summary: this.generateReportSummary(analysis)
        };

        this.storeReport(report);
    }

    /**
     * Generate report summary
     */
    generateReportSummary(analysis) {
        const summary = {
            totalErrors: analysis.recentErrorCount,
            errorRate: analysis.errorRate,
            criticalErrors: analysis.severity.criticalCount,
            topCategory: null,
            trend: analysis.trends.trend,
            status: 'normal'
        };

        // Find top error category
        const categories = Object.keys(analysis.categories);
        if (categories.length > 0) {
            const topCategory = categories.reduce((top, category) => 
                analysis.categories[category].count > analysis.categories[top].count ? category : top
            );
            summary.topCategory = {
                name: topCategory,
                count: analysis.categories[topCategory].count
            };
        }

        // Determine overall status
        if (analysis.severity.criticalCount > 0) {
            summary.status = 'critical';
        } else if (analysis.errorRate > this.reportingThresholds.errorRatePerMinute) {
            summary.status = 'warning';
        } else if (analysis.trends.trend === 'increasing_rapidly') {
            summary.status = 'degraded';
        }

        return summary;
    }

    /**
     * Store report in local storage
     */
    storeReport(report) {
        try {
            const reports = this.getStoredReports();
            reports.unshift(report);
            
            // Keep only last 50 reports
            const trimmedReports = reports.slice(0, 50);
            
            localStorage.setItem('error_reports', JSON.stringify(trimmedReports));
        } catch (error) {
            console.error('Error storing report:', error);
        }
    }

    /**
     * Get stored reports
     */
    getStoredReports() {
        try {
            const stored = localStorage.getItem('error_reports');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get error statistics for dashboard
     */
    getErrorStatistics() {
        const analysis = this.analyzeErrorTrends();
        if (!analysis) return null;

        return {
            recentErrors: analysis.recentErrorCount,
            errorRate: analysis.errorRate,
            criticalErrors: analysis.severity.criticalCount,
            trend: analysis.trends.trend,
            topCategories: Object.keys(analysis.categories)
                .sort((a, b) => analysis.categories[b].count - analysis.categories[a].count)
                .slice(0, 3)
                .map(category => ({
                    name: category,
                    count: analysis.categories[category].count
                }))
        };
    }

    /**
     * Export error reports
     */
    exportErrorReports() {
        const reports = this.getStoredReports();
        const exportData = {
            exportTimestamp: new Date().toISOString(),
            systemInfo: {
                userAgent: navigator.userAgent,
                url: window.location.href
            },
            reports,
            errorHistory: this.systemRecovery.errorHistory.slice(0, 100) // Last 100 errors
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-reports-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}