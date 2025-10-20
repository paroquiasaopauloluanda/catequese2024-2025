/**
 * Log Manager
 * Handles operation logging, filtering, search, and display functionality
 */
class LogManager {
    constructor() {
        this.logKey = 'admin_logs';
        this.maxLogs = 50; // Keep last 50 entries as per requirement 6.3
        this.logs = this.loadLogs();
        this.listeners = [];
        this.filters = {
            type: 'all',
            status: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };
    }

    /**
     * Load logs from localStorage
     * @returns {LogEntry[]} Array of log entries
     */
    loadLogs() {
        try {
            const stored = localStorage.getItem(this.logKey);
            if (!stored) return [];
            
            const logs = JSON.parse(stored);
            
            // Validate log entries
            return logs.filter(log => this.validateLogEntry(log));
            
        } catch (error) {
            console.error('Error loading logs:', error);
            return [];
        }
    }

    /**
     * Save logs to localStorage
     */
    saveLogs() {
        try {
            // Implement log rotation - keep only the most recent entries
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
            
            localStorage.setItem(this.logKey, JSON.stringify(this.logs));
        } catch (error) {
            console.error('Error saving logs:', error);
        }
    }

    /**
     * Validate log entry structure
     * @param {any} log - Log entry to validate
     * @returns {boolean} True if valid
     */
    validateLogEntry(log) {
        return log && 
               typeof log.id === 'string' &&
               typeof log.timestamp === 'string' &&
               typeof log.type === 'string' &&
               typeof log.status === 'string' &&
               typeof log.message === 'string';
    }

    /**
     * Generate unique log ID
     * @returns {string} Unique log ID
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log an operation with timestamp and details
     * @param {string} type - Operation type (auth, config, file, github, backup)
     * @param {string} status - Operation status (success, error, warning, info)
     * @param {string} message - Log message
     * @param {Object} details - Additional details (optional)
     * @returns {string} Log entry ID
     */
    log(type, status, message, details = {}) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            type: type.toLowerCase(),
            status: status.toLowerCase(),
            message: message,
            details: details,
            duration: details.duration || null,
            files: details.files || [],
            user: details.user || 'admin'
        };

        // Add to logs array
        this.logs.push(logEntry);
        
        // Save to localStorage
        this.saveLogs();
        
        // Notify listeners
        this.notifyListeners('log_added', logEntry);
        
        console.log(`[${type.toUpperCase()}] ${status.toUpperCase()}: ${message}`, details);
        
        return logEntry.id;
    }

    /**
     * Log successful operation
     * @param {string} type - Operation type
     * @param {string} message - Success message
     * @param {Object} details - Additional details
     * @returns {string} Log entry ID
     */
    logSuccess(type, message, details = {}) {
        return this.log(type, 'success', message, details);
    }

    /**
     * Log error operation
     * @param {string} type - Operation type
     * @param {string} message - Error message
     * @param {Object} details - Additional details (should include error info)
     * @returns {string} Log entry ID
     */
    logError(type, message, details = {}) {
        return this.log(type, 'error', message, details);
    }

    /**
     * Log warning
     * @param {string} type - Operation type
     * @param {string} message - Warning message
     * @param {Object} details - Additional details
     * @returns {string} Log entry ID
     */
    logWarning(type, message, details = {}) {
        return this.log(type, 'warning', message, details);
    }

    /**
     * Log info message
     * @param {string} type - Operation type
     * @param {string} message - Info message
     * @param {Object} details - Additional details
     * @returns {string} Log entry ID
     */
    logInfo(type, message, details = {}) {
        return this.log(type, 'info', message, details);
    }

    /**
     * Get all logs with optional filtering
     * @param {Object} filters - Filter options
     * @returns {LogEntry[]} Filtered log entries
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        // Apply type filter
        if (filters.type && filters.type !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.type === filters.type);
        }

        // Apply status filter
        if (filters.status && filters.status !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.status === filters.status);
        }

        // Apply date range filter
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
        }

        // Apply search filter
        if (filters.searchTerm) {
            const searchTerm = filters.searchTerm.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchTerm) ||
                log.type.toLowerCase().includes(searchTerm) ||
                log.status.toLowerCase().includes(searchTerm) ||
                (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm))
            );
        }

        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return filteredLogs;
    }

    /**
     * Get logs by type
     * @param {string} type - Log type to filter by
     * @returns {LogEntry[]} Logs of specified type
     */
    getLogsByType(type) {
        return this.getLogs({ type });
    }

    /**
     * Get logs by status
     * @param {string} status - Log status to filter by
     * @returns {LogEntry[]} Logs of specified status
     */
    getLogsByStatus(status) {
        return this.getLogs({ status });
    }

    /**
     * Get recent logs
     * @param {number} count - Number of recent logs to get
     * @returns {LogEntry[]} Recent log entries
     */
    getRecentLogs(count = 10) {
        return this.logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, count);
    }

    /**
     * Search logs by term
     * @param {string} searchTerm - Search term
     * @returns {LogEntry[]} Matching log entries
     */
    searchLogs(searchTerm) {
        return this.getLogs({ searchTerm });
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    getLogStatistics() {
        const stats = {
            total: this.logs.length,
            byType: {},
            byStatus: {},
            byDate: {},
            recentActivity: this.getRecentLogs(5)
        };

        // Count by type
        this.logs.forEach(log => {
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
            stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
            
            // Count by date (last 7 days)
            const date = new Date(log.timestamp).toDateString();
            stats.byDate[date] = (stats.byDate[date] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear all logs
     * @returns {boolean} True if cleared successfully
     */
    clearLogs() {
        try {
            this.logs = [];
            localStorage.removeItem(this.logKey);
            this.notifyListeners('logs_cleared');
            return true;
        } catch (error) {
            console.error('Error clearing logs:', error);
            return false;
        }
    }

    /**
     * Delete specific log entry
     * @param {string} logId - Log ID to delete
     * @returns {boolean} True if deleted successfully
     */
    deleteLog(logId) {
        try {
            const initialLength = this.logs.length;
            this.logs = this.logs.filter(log => log.id !== logId);
            
            if (this.logs.length < initialLength) {
                this.saveLogs();
                this.notifyListeners('log_deleted', { logId });
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error deleting log:', error);
            return false;
        }
    }

    /**
     * Export logs as JSON file
     * @param {Object} filters - Optional filters to apply before export
     * @returns {void}
     */
    exportLogs(filters = {}) {
        try {
            const logsToExport = this.getLogs(filters);
            const exportData = {
                exportDate: new Date().toISOString(),
                totalLogs: logsToExport.length,
                filters: filters,
                logs: logsToExport
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `admin-logs-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
            
            this.logSuccess('export', 'Logs exportados com sucesso', {
                totalLogs: logsToExport.length,
                filters: filters
            });
            
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.logError('export', 'Erro ao exportar logs', { error: error.message });
            throw error;
        }
    }

    /**
     * Export logs as CSV file
     * @param {Object} filters - Optional filters to apply before export
     * @returns {void}
     */
    exportLogsAsCSV(filters = {}) {
        try {
            const logsToExport = this.getLogs(filters);
            
            // CSV headers
            const headers = ['Timestamp', 'Type', 'Status', 'Message', 'Duration', 'Files', 'User'];
            
            // Convert logs to CSV format
            const csvRows = [headers.join(',')];
            
            logsToExport.forEach(log => {
                const row = [
                    `"${new Date(log.timestamp).toLocaleString('pt-BR')}"`,
                    `"${log.type}"`,
                    `"${log.status}"`,
                    `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
                    log.duration || '',
                    `"${log.files.join('; ')}"`,
                    `"${log.user}"`
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(link.href);
            
            this.logSuccess('export', 'Logs exportados como CSV com sucesso', {
                totalLogs: logsToExport.length,
                format: 'CSV'
            });
            
        } catch (error) {
            console.error('Error exporting logs as CSV:', error);
            this.logError('export', 'Erro ao exportar logs como CSV', { error: error.message });
            throw error;
        }
    }

    /**
     * Set current filters
     * @param {Object} filters - Filter options
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.notifyListeners('filters_changed', this.filters);
    }

    /**
     * Get current filters
     * @returns {Object} Current filter settings
     */
    getFilters() {
        return { ...this.filters };
    }

    /**
     * Reset filters to default
     */
    resetFilters() {
        this.filters = {
            type: 'all',
            status: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };
        this.notifyListeners('filters_reset', this.filters);
    }

    /**
     * Add event listener for log events
     * @param {Function} listener - Event listener function
     */
    addListener(listener) {
        if (typeof listener === 'function') {
            this.listeners.push(listener);
        }
    }

    /**
     * Remove event listener
     * @param {Function} listener - Event listener function to remove
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of an event
     * @param {string} event - Event type
     * @param {any} data - Event data
     */
    notifyListeners(event, data = null) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in log listener:', error);
            }
        });
    }

    /**
     * Get log entry by ID
     * @param {string} logId - Log ID
     * @returns {LogEntry|null} Log entry or null if not found
     */
    getLogById(logId) {
        return this.logs.find(log => log.id === logId) || null;
    }

    /**
     * Update existing log entry
     * @param {string} logId - Log ID to update
     * @param {Object} updates - Updates to apply
     * @returns {boolean} True if updated successfully
     */
    updateLog(logId, updates) {
        try {
            const logIndex = this.logs.findIndex(log => log.id === logId);
            
            if (logIndex === -1) {
                return false;
            }
            
            // Apply updates
            this.logs[logIndex] = { ...this.logs[logIndex], ...updates };
            
            // Save changes
            this.saveLogs();
            
            // Notify listeners
            this.notifyListeners('log_updated', { logId, updates });
            
            return true;
        } catch (error) {
            console.error('Error updating log:', error);
            return false;
        }
    }

    /**
     * Get logs within date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {LogEntry[]} Logs within date range
     */
    getLogsInDateRange(startDate, endDate) {
        return this.logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= startDate && logDate <= endDate;
        });
    }

    /**
     * Get error logs for troubleshooting
     * @param {number} hours - Hours to look back (default: 24)
     * @returns {LogEntry[]} Recent error logs
     */
    getRecentErrors(hours = 24) {
        const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
        
        return this.logs.filter(log => 
            log.status === 'error' && 
            new Date(log.timestamp) >= cutoffTime
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Format log entry for display
     * @param {LogEntry} log - Log entry to format
     * @returns {Object} Formatted log entry
     */
    formatLogForDisplay(log) {
        return {
            ...log,
            formattedTimestamp: new Date(log.timestamp).toLocaleString('pt-BR'),
            formattedDuration: log.duration ? `${log.duration}ms` : null,
            typeLabel: this.getTypeLabel(log.type),
            statusLabel: this.getStatusLabel(log.status),
            statusClass: this.getStatusClass(log.status)
        };
    }

    /**
     * Get human-readable type label
     * @param {string} type - Log type
     * @returns {string} Type label
     */
    getTypeLabel(type) {
        const labels = {
            auth: 'Autenticação',
            config: 'Configuração',
            file: 'Arquivo',
            github: 'GitHub',
            backup: 'Backup',
            export: 'Exportação',
            system: 'Sistema'
        };
        
        return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    /**
     * Get human-readable status label
     * @param {string} status - Log status
     * @returns {string} Status label
     */
    getStatusLabel(status) {
        const labels = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Aviso',
            info: 'Informação'
        };
        
        return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    /**
     * Get CSS class for status
     * @param {string} status - Log status
     * @returns {string} CSS class
     */
    getStatusClass(status) {
        const classes = {
            success: 'status-success',
            error: 'status-error',
            warning: 'status-warning',
            info: 'status-info'
        };
        
        return classes[status] || 'status-default';
    }

    /**
     * Cleanup old logs automatically
     * This method is called periodically to maintain log size
     */
    performLogCleanup() {
        const initialCount = this.logs.length;
        
        if (initialCount > this.maxLogs) {
            // Keep only the most recent logs
            this.logs = this.logs
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, this.maxLogs);
            
            this.saveLogs();
            
            const removedCount = initialCount - this.logs.length;
            this.logInfo('system', `Limpeza automática de logs: ${removedCount} entradas antigas removidas`, {
                initialCount,
                finalCount: this.logs.length,
                removedCount
            });
            
            this.notifyListeners('logs_cleaned', { removedCount });
        }
    }

    /**
     * Initialize automatic log cleanup
     * Sets up periodic cleanup to maintain log size limits
     */
    initAutoCleanup() {
        // Run cleanup every hour
        setInterval(() => {
            this.performLogCleanup();
        }, 60 * 60 * 1000);
        
        // Run initial cleanup
        this.performLogCleanup();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogManager;
} else {
    window.LogManager = LogManager;
}