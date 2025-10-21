/**
 * Log Display Component
 * Provides user interface for viewing, filtering, and managing logs
 */
class LogDisplay {
    constructor(container, logManager) {
        this.container = container;
        this.logManager = logManager;
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isInitialized = false;
        
        // Bind methods
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleLogEvent = this.handleLogEvent.bind(this);
        this.handleExport = this.handleExport.bind(this);
        this.handleClearLogs = this.handleClearLogs.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
    }

    /**
     * Initialize the log display component
     */
    init() {
        if (this.isInitialized) {
            this.refresh();
            return;
        }

        this.createInterface();
        this.setupEventListeners();
        this.loadLogs();
        
        // Listen for log manager events
        this.logManager.addListener(this.handleLogEvent);
        
        this.isInitialized = true;
    }

    /**
     * Create the user interface
     */
    createInterface() {
        this.container.innerHTML = `
            <div class="logs-section">
                <div class="logs-header">
                    <h2>Logs do Sistema</h2>
                    <div class="logs-actions">
                        <button id="refresh-logs" class="btn btn-secondary">
                            <i class="icon-refresh"></i>
                            Atualizar
                        </button>
                        <button id="export-logs" class="btn btn-secondary">
                            <i class="icon-download"></i>
                            Exportar
                        </button>
                        <button id="clear-logs" class="btn btn-danger">
                            <i class="icon-trash"></i>
                            Limpar Logs
                        </button>
                    </div>
                </div>

                <div class="logs-filters">
                    <div class="filter-row">
                        <div class="filter-group">
                            <label for="log-type-filter">Tipo:</label>
                            <select id="log-type-filter" class="form-control">
                                <option value="all">Todos</option>
                                <option value="auth">Autenticação</option>
                                <option value="config">Configuração</option>
                                <option value="file">Arquivo</option>
                                <option value="github">GitHub</option>
                                <option value="backup">Backup</option>
                                <option value="export">Exportação</option>
                                <option value="system">Sistema</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="log-status-filter">Status:</label>
                            <select id="log-status-filter" class="form-control">
                                <option value="all">Todos</option>
                                <option value="success">Sucesso</option>
                                <option value="error">Erro</option>
                                <option value="warning">Aviso</option>
                                <option value="info">Informação</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="log-date-from">De:</label>
                            <input type="date" id="log-date-from" class="form-control">
                        </div>

                        <div class="filter-group">
                            <label for="log-date-to">Até:</label>
                            <input type="date" id="log-date-to" class="form-control">
                        </div>

                        <div class="filter-group search-group">
                            <label for="log-search">Buscar:</label>
                            <div class="search-input-wrapper">
                                <input type="text" id="log-search" class="form-control" placeholder="Buscar nos logs...">
                                <button id="clear-search" class="btn-clear-search" title="Limpar busca">
                                    <i class="icon-x"></i>
                                </button>
                            </div>
                        </div>

                        <div class="filter-actions">
                            <button id="reset-filters" class="btn btn-secondary">
                                <i class="icon-refresh"></i>
                                Resetar Filtros
                            </button>
                        </div>
                    </div>
                </div>

                <div class="logs-stats" id="logs-stats">
                    <!-- Statistics will be populated here -->
                </div>

                <div class="logs-content">
                    <div class="logs-table-container">
                        <table class="logs-table" id="logs-table">
                            <thead>
                                <tr>
                                    <th class="col-timestamp">Data/Hora</th>
                                    <th class="col-type">Tipo</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-message">Mensagem</th>
                                    <th class="col-duration">Duração</th>
                                    <th class="col-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="logs-table-body">
                                <!-- Log entries will be populated here -->
                            </tbody>
                        </table>
                    </div>

                    <div class="logs-pagination" id="logs-pagination">
                        <!-- Pagination will be populated here -->
                    </div>
                </div>

                <div class="logs-empty" id="logs-empty" style="display: none;">
                    <div class="empty-state">
                        <i class="icon-file-text"></i>
                        <h3>Nenhum log encontrado</h3>
                        <p>Não há logs que correspondam aos filtros selecionados.</p>
                    </div>
                </div>
            </div>

            <!-- Log Details Modal -->
            <div class="modal" id="log-details-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Detalhes do Log</h3>
                        <button class="modal-close" id="close-log-details">
                            <i class="icon-x"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="log-details-content">
                        <!-- Log details will be populated here -->
                    </div>
                </div>
            </div>

            <!-- Export Options Modal -->
            <div class="modal" id="export-modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Exportar Logs</h3>
                        <button class="modal-close" id="close-export-modal">
                            <i class="icon-x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <div class="form-group">
                                <label>Formato:</label>
                                <div class="radio-group">
                                    <label class="radio-option">
                                        <input type="radio" name="export-format" value="json" checked>
                                        <span>JSON (completo)</span>
                                    </label>
                                    <label class="radio-option">
                                        <input type="radio" name="export-format" value="csv">
                                        <span>CSV (tabela)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="export-current-filters" checked>
                                    Aplicar filtros atuais
                                </label>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button id="confirm-export" class="btn btn-primary">
                                <i class="icon-download"></i>
                                Exportar
                            </button>
                            <button id="cancel-export" class="btn btn-secondary">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Filter controls
        document.getElementById('log-type-filter').addEventListener('change', this.handleFilterChange);
        document.getElementById('log-status-filter').addEventListener('change', this.handleFilterChange);
        document.getElementById('log-date-from').addEventListener('change', this.handleFilterChange);
        document.getElementById('log-date-to').addEventListener('change', this.handleFilterChange);
        document.getElementById('log-search').addEventListener('input', this.handleSearch);
        document.getElementById('clear-search').addEventListener('click', this.clearSearch.bind(this));
        document.getElementById('reset-filters').addEventListener('click', this.resetFilters.bind(this));

        // Action buttons
        document.getElementById('refresh-logs').addEventListener('click', this.refresh.bind(this));
        document.getElementById('export-logs').addEventListener('click', this.showExportModal.bind(this));
        document.getElementById('clear-logs').addEventListener('click', this.showClearConfirmation.bind(this));

        // Modal controls
        document.getElementById('close-log-details').addEventListener('click', this.hideLogDetails.bind(this));
        document.getElementById('close-export-modal').addEventListener('click', this.hideExportModal.bind(this));
        document.getElementById('confirm-export').addEventListener('click', this.handleExport);
        document.getElementById('cancel-export').addEventListener('click', this.hideExportModal.bind(this));

        // Click outside modal to close
        document.getElementById('log-details-modal').addEventListener('click', (e) => {
            if (e.target.id === 'log-details-modal') {
                this.hideLogDetails();
            }
        });

        document.getElementById('export-modal').addEventListener('click', (e) => {
            if (e.target.id === 'export-modal') {
                this.hideExportModal();
            }
        });
    }

    /**
     * Handle filter changes
     */
    handleFilterChange() {
        const filters = {
            type: document.getElementById('log-type-filter').value,
            status: document.getElementById('log-status-filter').value,
            dateFrom: document.getElementById('log-date-from').value || null,
            dateTo: document.getElementById('log-date-to').value || null,
            searchTerm: document.getElementById('log-search').value
        };

        this.logManager.setFilters(filters);
        this.currentPage = 1;
        this.loadLogs();
    }

    /**
     * Handle search input with debouncing
     */
    handleSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.handleFilterChange();
        }, 300);
    }

    /**
     * Clear search input
     */
    clearSearch() {
        document.getElementById('log-search').value = '';
        this.handleFilterChange();
    }

    /**
     * Reset all filters
     */
    resetFilters() {
        document.getElementById('log-type-filter').value = 'all';
        document.getElementById('log-status-filter').value = 'all';
        document.getElementById('log-date-from').value = '';
        document.getElementById('log-date-to').value = '';
        document.getElementById('log-search').value = '';
        
        this.logManager.resetFilters();
        this.currentPage = 1;
        this.loadLogs();
    }

    /**
     * Load and display logs
     */
    loadLogs() {
        const filters = this.logManager.getFilters();
        const allLogs = this.logManager.getLogs(filters);
        
        // Update statistics
        this.updateStatistics(allLogs);
        
        // Paginate logs
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedLogs = allLogs.slice(startIndex, endIndex);
        
        // Display logs
        this.displayLogs(paginatedLogs);
        
        // Update pagination
        this.updatePagination(allLogs.length);
        
        // Show/hide empty state
        this.toggleEmptyState(allLogs.length === 0);
    }

    /**
     * Display logs in the table
     */
    displayLogs(logs) {
        const tbody = document.getElementById('logs-table-body');
        
        if (logs.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const formattedLog = this.logManager.formatLogForDisplay(log);
            
            return `
                <tr class="log-entry ${formattedLog.statusClass}" data-log-id="${log.id}">
                    <td class="col-timestamp" title="${formattedLog.formattedTimestamp}">
                        ${this.formatRelativeTime(log.timestamp)}
                    </td>
                    <td class="col-type">
                        <span class="log-type-badge type-${log.type}">
                            ${formattedLog.typeLabel}
                        </span>
                    </td>
                    <td class="col-status">
                        <span class="log-status-badge ${formattedLog.statusClass}">
                            ${formattedLog.statusLabel}
                        </span>
                    </td>
                    <td class="col-message">
                        <div class="log-message" title="${log.message}">
                            ${this.truncateMessage(log.message, 80)}
                        </div>
                        ${log.files.length > 0 ? `
                            <div class="log-files">
                                <i class="icon-file"></i>
                                ${log.files.length} arquivo(s)
                            </div>
                        ` : ''}
                    </td>
                    <td class="col-duration">
                        ${formattedLog.formattedDuration || '-'}
                    </td>
                    <td class="col-actions">
                        <button class="btn-action btn-view" onclick="window.adminApp.logDisplay.showLogDetails('${log.id}')" title="Ver detalhes">
                            <i class="icon-eye"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="window.adminApp.logDisplay.deleteLog('${log.id}')" title="Excluir">
                            <i class="icon-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Update statistics display
     */
    updateStatistics(logs) {
        const stats = {
            total: logs.length,
            byStatus: {},
            byType: {}
        };

        logs.forEach(log => {
            stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        });

        const statsContainer = document.getElementById('logs-stats');
        statsContainer.innerHTML = `
            <div class="stats-summary">
                <div class="stat-item">
                    <span class="stat-label">Total:</span>
                    <span class="stat-value">${stats.total}</span>
                </div>
                
                ${Object.entries(stats.byStatus).map(([status, count]) => `
                    <div class="stat-item">
                        <span class="stat-label ${this.logManager.getStatusClass(status)}">
                            ${this.logManager.getStatusLabel(status)}:
                        </span>
                        <span class="stat-value">${count}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Update pagination controls
     */
    updatePagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const paginationContainer = document.getElementById('logs-pagination');
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        paginationContainer.innerHTML = `
            <div class="pagination-info">
                Mostrando ${startItem}-${endItem} de ${totalItems} logs
            </div>
            <div class="pagination-controls">
                <button class="btn-pagination" ${this.currentPage === 1 ? 'disabled' : ''} 
                        onclick="window.adminApp.logDisplay.goToPage(${this.currentPage - 1})">
                    <i class="icon-chevron-left"></i>
                    Anterior
                </button>
                
                ${this.generatePageNumbers(totalPages)}
                
                <button class="btn-pagination" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        onclick="window.adminApp.logDisplay.goToPage(${this.currentPage + 1})">
                    Próximo
                    <i class="icon-chevron-right"></i>
                </button>
            </div>
        `;
    }

    /**
     * Generate page number buttons
     */
    generatePageNumbers(totalPages) {
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        let html = '';
        
        if (startPage > 1) {
            html += `<button class="btn-pagination" onclick="window.adminApp.logDisplay.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="btn-pagination ${i === this.currentPage ? 'active' : ''}" 
                        onclick="window.adminApp.logDisplay.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
            html += `<button class="btn-pagination" onclick="window.adminApp.logDisplay.goToPage(${totalPages})">${totalPages}</button>`;
        }

        return html;
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        this.currentPage = page;
        this.loadLogs();
    }

    /**
     * Handle page change
     */
    handlePageChange(page) {
        this.goToPage(page);
    }

    /**
     * Show/hide empty state
     */
    toggleEmptyState(isEmpty) {
        const table = document.querySelector('.logs-table-container');
        const pagination = document.getElementById('logs-pagination');
        const emptyState = document.getElementById('logs-empty');
        
        if (isEmpty) {
            table.style.display = 'none';
            pagination.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            table.style.display = 'block';
            pagination.style.display = 'block';
            emptyState.style.display = 'none';
        }
    }

    /**
     * Show log details modal
     */
    showLogDetails(logId) {
        const log = this.logManager.getLogById(logId);
        if (!log) return;

        const formattedLog = this.logManager.formatLogForDisplay(log);
        const modal = document.getElementById('log-details-modal');
        const content = document.getElementById('log-details-content');

        content.innerHTML = `
            <div class="log-details">
                <div class="detail-section">
                    <h4>Informações Básicas</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>ID:</label>
                            <span class="detail-value">${log.id}</span>
                        </div>
                        <div class="detail-item">
                            <label>Data/Hora:</label>
                            <span class="detail-value">${formattedLog.formattedTimestamp}</span>
                        </div>
                        <div class="detail-item">
                            <label>Tipo:</label>
                            <span class="detail-value">
                                <span class="log-type-badge type-${log.type}">
                                    ${formattedLog.typeLabel}
                                </span>
                            </span>
                        </div>
                        <div class="detail-item">
                            <label>Status:</label>
                            <span class="detail-value">
                                <span class="log-status-badge ${formattedLog.statusClass}">
                                    ${formattedLog.statusLabel}
                                </span>
                            </span>
                        </div>
                        ${log.duration ? `
                            <div class="detail-item">
                                <label>Duração:</label>
                                <span class="detail-value">${formattedLog.formattedDuration}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <label>Usuário:</label>
                            <span class="detail-value">${log.user}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Mensagem</h4>
                    <div class="detail-message">
                        ${log.message}
                    </div>
                </div>

                ${log.files.length > 0 ? `
                    <div class="detail-section">
                        <h4>Arquivos (${log.files.length})</h4>
                        <div class="detail-files">
                            ${log.files.map(file => `
                                <div class="file-item">
                                    <i class="icon-file"></i>
                                    <span>${file}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${Object.keys(log.details).length > 0 ? `
                    <div class="detail-section">
                        <h4>Detalhes Técnicos</h4>
                        <div class="detail-json">
                            <pre><code>${JSON.stringify(log.details, null, 2)}</code></pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'block';
    }

    /**
     * Hide log details modal
     */
    hideLogDetails() {
        document.getElementById('log-details-modal').style.display = 'none';
    }

    /**
     * Show export modal
     */
    showExportModal() {
        document.getElementById('export-modal').style.display = 'block';
    }

    /**
     * Hide export modal
     */
    hideExportModal() {
        document.getElementById('export-modal').style.display = 'none';
    }

    /**
     * Handle export
     */
    handleExport() {
        const format = document.querySelector('input[name="export-format"]:checked').value;
        const useCurrentFilters = document.getElementById('export-current-filters').checked;
        
        try {
            const filters = useCurrentFilters ? this.logManager.getFilters() : {};
            
            if (format === 'csv') {
                this.logManager.exportLogsAsCSV(filters);
            } else {
                this.logManager.exportLogs(filters);
            }
            
            this.hideExportModal();
            HelperUtils.showNotification('Logs exportados com sucesso!', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            HelperUtils.showNotification('Erro ao exportar logs', 'error');
        }
    }

    /**
     * Show clear logs confirmation
     */
    showClearConfirmation() {
        if (confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
            this.handleClearLogs();
        }
    }

    /**
     * Handle clear logs
     */
    handleClearLogs() {
        try {
            const success = this.logManager.clearLogs();
            
            if (success) {
                this.loadLogs();
                HelperUtils.showNotification('Logs limpos com sucesso!', 'success');
            } else {
                HelperUtils.showNotification('Erro ao limpar logs', 'error');
            }
        } catch (error) {
            console.error('Clear logs error:', error);
            HelperUtils.showNotification('Erro ao limpar logs', 'error');
        }
    }

    /**
     * Delete specific log
     */
    deleteLog(logId) {
        if (confirm('Tem certeza que deseja excluir este log?')) {
            try {
                const success = this.logManager.deleteLog(logId);
                
                if (success) {
                    this.loadLogs();
                    HelperUtils.showNotification('Log excluído com sucesso!', 'success');
                } else {
                    HelperUtils.showNotification('Erro ao excluir log', 'error');
                }
            } catch (error) {
                console.error('Delete log error:', error);
                HelperUtils.showNotification('Erro ao excluir log', 'error');
            }
        }
    }

    /**
     * Handle log manager events
     */
    handleLogEvent(event, data) {
        switch (event) {
            case 'log_added':
            case 'log_updated':
            case 'log_deleted':
            case 'logs_cleared':
                // Refresh the display when logs change
                this.loadLogs();
                break;
            case 'filters_changed':
            case 'filters_reset':
                // Update UI when filters change
                this.updateFiltersUI(data);
                break;
        }
    }

    /**
     * Update filters UI
     */
    updateFiltersUI(filters) {
        document.getElementById('log-type-filter').value = filters.type || 'all';
        document.getElementById('log-status-filter').value = filters.status || 'all';
        document.getElementById('log-date-from').value = filters.dateFrom || '';
        document.getElementById('log-date-to').value = filters.dateTo || '';
        document.getElementById('log-search').value = filters.searchTerm || '';
    }

    /**
     * Refresh the log display
     */
    refresh() {
        this.loadLogs();
        HelperUtils.showNotification('Logs atualizados', 'info');
    }

    /**
     * Format relative time
     */
    formatRelativeTime(timestamp) {
        const now = new Date();
        const logTime = new Date(timestamp);
        const diffMs = now - logTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays}d atrás`;
        
        return logTime.toLocaleDateString('pt-BR');
    }

    /**
     * Truncate message for display
     */
    truncateMessage(message, maxLength) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }

    /**
     * Destroy the component
     */
    destroy() {
        if (this.logManager) {
            this.logManager.removeListener(this.handleLogEvent);
        }
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogDisplay;
} else {
    window.LogDisplay = LogDisplay;
}