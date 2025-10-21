/**
 * Backup Manager Component
 * Handles backup listing, creation, and restoration interface
 */
class BackupManager {
    constructor(container, configManager) {
        this.container = container;
        this.configManager = configManager;
        this.backups = [];
        
        this.init();
    }

    /**
     * Initialize the backup manager
     */
    init() {
        this.container.innerHTML = '';
        this.createBackupInterface();
        this.loadBackups();
    }

    /**
     * Create the backup management interface
     */
    createBackupInterface() {
        const interfaceHTML = `
            <div class="backup-manager">
                <div class="backup-header">
                    <div class="backup-actions">
                        <button id="create-backup" class="btn btn-primary">
                            <i class="icon-backup"></i> Criar Backup Manual
                        </button>
                        <button id="import-backup" class="btn btn-secondary">
                            <i class="icon-import"></i> Importar Backup
                        </button>
                        <button id="export-current" class="btn btn-secondary">
                            <i class="icon-export"></i> Exportar Configuração Atual
                        </button>
                    </div>
                    <div class="backup-info">
                        <p class="backup-description">
                            Os backups são criados automaticamente antes de cada alteração. 
                            Você pode criar backups manuais ou restaurar configurações anteriores.
                        </p>
                    </div>
                </div>

                <div class="backup-content">
                    <div class="backup-list-header">
                        <h3>Backups Disponíveis</h3>
                        <div class="backup-filters">
                            <select id="backup-filter" class="form-select">
                                <option value="all">Todos os Backups</option>
                                <option value="manual">Apenas Manuais</option>
                                <option value="automatic">Apenas Automáticos</option>
                            </select>
                            <button id="refresh-backups" class="btn btn-small btn-secondary">
                                <i class="icon-refresh"></i> Atualizar
                            </button>
                        </div>
                    </div>

                    <div id="backup-list" class="backup-list">
                        <!-- Backup items will be dynamically loaded -->
                    </div>
                </div>

                <!-- Restore Confirmation Modal -->
                <div id="restore-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Confirmar Restauração</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="restore-warning">
                                <div class="warning-icon">⚠️</div>
                                <div class="warning-content">
                                    <h4>Atenção!</h4>
                                    <p>Esta ação irá substituir a configuração atual pela configuração do backup selecionado.</p>
                                    <p>Um backup da configuração atual será criado automaticamente antes da restauração.</p>
                                </div>
                            </div>
                            <div id="restore-details" class="restore-details">
                                <!-- Backup details will be shown here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-close">Cancelar</button>
                            <button id="confirm-restore" class="btn btn-danger">Restaurar Backup</button>
                        </div>
                    </div>
                </div>

                <!-- Backup Details Modal -->
                <div id="backup-details-modal" class="modal hidden">
                    <div class="modal-content modal-large">
                        <div class="modal-header">
                            <h3>Detalhes do Backup</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="backup-details-content">
                                <!-- Backup details will be shown here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-close">Fechar</button>
                            <button id="download-backup" class="btn btn-primary">
                                <i class="icon-download"></i> Baixar Backup
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = interfaceHTML;
        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Create manual backup
        document.getElementById('create-backup')?.addEventListener('click', () => {
            this.createManualBackup();
        });

        // Import backup
        document.getElementById('import-backup')?.addEventListener('click', () => {
            this.importBackup();
        });

        // Export current configuration
        document.getElementById('export-current')?.addEventListener('click', () => {
            this.exportCurrentConfig();
        });

        // Filter backups
        document.getElementById('backup-filter')?.addEventListener('change', (e) => {
            this.filterBackups(e.target.value);
        });

        // Refresh backups
        document.getElementById('refresh-backups')?.addEventListener('click', () => {
            this.loadBackups();
        });

        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close')) {
                this.hideModal();
            }
        });

        // Confirm restore
        document.getElementById('confirm-restore')?.addEventListener('click', () => {
            this.executeRestore();
        });

        // Download backup
        document.getElementById('download-backup')?.addEventListener('click', () => {
            this.downloadSelectedBackup();
        });

        // Backup list event delegation
        document.getElementById('backup-list')?.addEventListener('click', (e) => {
            const backupItem = e.target.closest('.backup-item');
            if (!backupItem) return;

            const backupId = backupItem.dataset.backupId;
            const action = e.target.dataset.action;

            switch (action) {
                case 'restore':
                    this.showRestoreConfirmation(backupId);
                    break;
                case 'view':
                    this.showBackupDetails(backupId);
                    break;
                case 'delete':
                    this.deleteBackup(backupId);
                    break;
                case 'download':
                    this.downloadBackup(backupId);
                    break;
            }
        });
    }

    /**
     * Load and display backups
     */
    async loadBackups() {
        try {
            this.showLoading();
            
            this.backups = this.configManager.getBackups();
            this.renderBackupList();
            
        } catch (error) {
            console.error('Error loading backups:', error);
            this.showError('Erro ao carregar backups: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Render backup list
     */
    renderBackupList() {
        const backupList = document.getElementById('backup-list');
        
        if (this.backups.length === 0) {
            backupList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h4>Nenhum backup encontrado</h4>
                    <p>Crie um backup manual ou faça alterações nas configurações para gerar backups automáticos.</p>
                </div>
            `;
            return;
        }

        const backupItems = this.backups.map(backup => this.createBackupItem(backup)).join('');
        backupList.innerHTML = backupItems;
    }

    /**
     * Create backup item HTML
     * @param {Object} backup - Backup data
     * @returns {string} HTML for backup item
     */
    createBackupItem(backup) {
        const isManual = backup.description.includes('manual') || backup.description.includes('Manual');
        const backupType = isManual ? 'manual' : 'automatic';
        const typeLabel = isManual ? 'Manual' : 'Automático';
        
        return `
            <div class="backup-item ${backupType}" data-backup-id="${backup.id}">
                <div class="backup-info">
                    <div class="backup-main">
                        <div class="backup-title">
                            <span class="backup-type-badge ${backupType}">${typeLabel}</span>
                            <span class="backup-date">${this.formatDate(backup.timestamp)}</span>
                        </div>
                        <div class="backup-description">${backup.description}</div>
                    </div>
                    <div class="backup-meta">
                        <span class="backup-size">${this.formatSize(backup.size)}</span>
                        <span class="backup-time">${this.formatRelativeTime(backup.timestamp)}</span>
                    </div>
                </div>
                <div class="backup-actions">
                    <button class="btn btn-small btn-secondary" data-action="view" title="Ver Detalhes">
                        <i class="icon-eye"></i>
                    </button>
                    <button class="btn btn-small btn-secondary" data-action="download" title="Baixar">
                        <i class="icon-download"></i>
                    </button>
                    <button class="btn btn-small btn-primary" data-action="restore" title="Restaurar">
                        <i class="icon-restore"></i>
                    </button>
                    <button class="btn btn-small btn-danger" data-action="delete" title="Excluir">
                        <i class="icon-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Create manual backup
     */
    async createManualBackup() {
        try {
            const description = prompt('Digite uma descrição para este backup (opcional):');
            if (description === null) return; // User cancelled
            
            const finalDescription = description.trim() || `Backup manual criado em ${new Date().toLocaleString('pt-BR')}`;
            
            this.showLoading('Criando backup...');
            
            const currentConfig = this.configManager.getCurrentConfig();
            if (!currentConfig) {
                throw new Error('Nenhuma configuração disponível para backup');
            }
            
            const backupId = await this.configManager.createBackup(currentConfig, finalDescription);
            
            this.showSuccess('Backup criado com sucesso!');
            this.loadBackups();
            
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showError('Erro ao criar backup: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Import backup from file
     */
    async importBackup() {
        try {
            const file = await this.selectFile('.json');
            const result = await this.configManager.importConfig(file);
            
            if (result.success) {
                // Create backup from imported config
                const description = `Backup importado de ${file.name} em ${new Date().toLocaleString('pt-BR')}`;
                await this.configManager.createBackup(result.config, description);
                
                this.showSuccess('Backup importado com sucesso!');
                this.loadBackups();
            } else {
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Error importing backup:', error);
            this.showError('Erro ao importar backup: ' + error.message);
        }
    }

    /**
     * Export current configuration
     */
    exportCurrentConfig() {
        try {
            const currentConfig = this.configManager.getCurrentConfig();
            if (!currentConfig) {
                this.showError('Nenhuma configuração disponível para exportar');
                return;
            }
            
            this.configManager.exportConfig(currentConfig);
            this.showSuccess('Configuração exportada com sucesso!');
            
        } catch (error) {
            console.error('Error exporting config:', error);
            this.showError('Erro ao exportar configuração: ' + error.message);
        }
    }

    /**
     * Filter backups by type
     * @param {string} filter - Filter type
     */
    filterBackups(filter) {
        const backupItems = document.querySelectorAll('.backup-item');
        
        backupItems.forEach(item => {
            const isManual = item.classList.contains('manual');
            const isAutomatic = item.classList.contains('automatic');
            
            let show = true;
            
            switch (filter) {
                case 'manual':
                    show = isManual;
                    break;
                case 'automatic':
                    show = isAutomatic;
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            item.style.display = show ? 'flex' : 'none';
        });
    }

    /**
     * Show restore confirmation modal
     * @param {string} backupId - Backup ID
     */
    showRestoreConfirmation(backupId) {
        const backup = this.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        const restoreDetails = document.getElementById('restore-details');
        restoreDetails.innerHTML = `
            <div class="backup-summary">
                <h4>Backup Selecionado:</h4>
                <div class="backup-info-row">
                    <span class="label">Data:</span>
                    <span class="value">${this.formatDate(backup.timestamp)}</span>
                </div>
                <div class="backup-info-row">
                    <span class="label">Descrição:</span>
                    <span class="value">${backup.description}</span>
                </div>
                <div class="backup-info-row">
                    <span class="label">Tamanho:</span>
                    <span class="value">${this.formatSize(backup.size)}</span>
                </div>
            </div>
        `;
        
        // Store backup ID for restoration
        document.getElementById('confirm-restore').dataset.backupId = backupId;
        
        this.showModal('restore-modal');
    }

    /**
     * Execute backup restoration
     */
    async executeRestore() {
        const backupId = document.getElementById('confirm-restore').dataset.backupId;
        if (!backupId) return;
        
        try {
            this.hideModal();
            this.showLoading('Restaurando backup...');
            
            const result = await this.configManager.restoreFromBackup(backupId);
            
            if (result.success) {
                this.showSuccess(result.message);
                this.loadBackups();
                
                // Refresh the config form if it exists
                if (window.adminApp && window.adminApp.configForm) {
                    window.adminApp.configForm.init();
                }
            } else {
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.showError('Erro ao restaurar backup: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Show backup details modal
     * @param {string} backupId - Backup ID
     */
    showBackupDetails(backupId) {
        const backup = this.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        const detailsContent = document.getElementById('backup-details-content');
        detailsContent.innerHTML = `
            <div class="backup-details">
                <div class="backup-metadata">
                    <h4>Informações do Backup</h4>
                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <span class="label">ID:</span>
                            <span class="value">${backup.id}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="label">Data de Criação:</span>
                            <span class="value">${this.formatDate(backup.timestamp)}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="label">Descrição:</span>
                            <span class="value">${backup.description}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="label">Tamanho:</span>
                            <span class="value">${this.formatSize(backup.size)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="backup-config-preview">
                    <h4>Prévia da Configuração</h4>
                    <pre class="config-json">${JSON.stringify(backup.config, null, 2)}</pre>
                </div>
            </div>
        `;
        
        // Store backup ID for download
        document.getElementById('download-backup').dataset.backupId = backupId;
        
        this.showModal('backup-details-modal');
    }

    /**
     * Delete backup
     * @param {string} backupId - Backup ID
     */
    async deleteBackup(backupId) {
        const backup = this.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        const confirmed = await this.showConfirmation(
            `Tem certeza que deseja excluir o backup "${backup.description}"? Esta ação não pode ser desfeita.`,
            'Excluir Backup'
        );
        
        if (confirmed) {
            try {
                const success = this.configManager.deleteBackup(backupId);
                
                if (success) {
                    this.showSuccess('Backup excluído com sucesso!');
                    this.loadBackups();
                } else {
                    this.showError('Backup não encontrado ou não pôde ser excluído');
                }
                
            } catch (error) {
                console.error('Error deleting backup:', error);
                this.showError('Erro ao excluir backup: ' + error.message);
            }
        }
    }

    /**
     * Download backup
     * @param {string} backupId - Backup ID
     */
    downloadBackup(backupId) {
        const backup = this.backups.find(b => b.id === backupId);
        if (!backup) return;
        
        try {
            const filename = `backup-${backup.id}-${new Date(backup.timestamp).toISOString().split('T')[0]}.json`;
            const data = JSON.stringify(backup, null, 2);
            
            this.downloadFile(data, filename, 'application/json');
            this.showSuccess('Backup baixado com sucesso!');
            
        } catch (error) {
            console.error('Error downloading backup:', error);
            this.showError('Erro ao baixar backup: ' + error.message);
        }
    }

    /**
     * Download selected backup from modal
     */
    downloadSelectedBackup() {
        const backupId = document.getElementById('download-backup').dataset.backupId;
        if (backupId) {
            this.downloadBackup(backupId);
        }
    }

    /**
     * Utility methods
     */
    
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString('pt-BR');
    }
    
    formatRelativeTime(timestamp) {
        if (window.HelperUtils) {
            return window.HelperUtils.formatRelativeTime(timestamp);
        }
        return this.formatDate(timestamp);
    }
    
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
        return Math.round(bytes / (1024 * 1024)) + ' MB';
    }
    
    async selectFile(accept = '*/*') {
        if (window.HelperUtils) {
            return await window.HelperUtils.loadFile(accept);
        }
        
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    resolve(file);
                } else {
                    reject(new Error('Nenhum arquivo selecionado'));
                }
            });
            
            input.click();
        });
    }
    
    downloadFile(data, filename, mimeType) {
        if (window.HelperUtils) {
            window.HelperUtils.downloadFile(data, filename, mimeType);
        } else {
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }
    
    async showConfirmation(message, title) {
        if (window.HelperUtils) {
            return await window.HelperUtils.showConfirmation(message, title);
        }
        return confirm(message);
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    hideModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
    
    showLoading(message = 'Carregando...') {
        if (window.adminApp) {
            window.adminApp.showProgressOverlay(message);
        }
    }
    
    hideLoading() {
        if (window.adminApp) {
            setTimeout(() => window.adminApp.hideProgressOverlay(), 1000);
        }
    }
    
    showSuccess(message) {
        if (window.HelperUtils) {
            window.HelperUtils.showNotification(message, 'success');
        } else {
            
        }
    }
    
    showError(message) {
        if (window.HelperUtils) {
            window.HelperUtils.showNotification(message, 'error');
        } else {
            console.error('Error:', message);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupManager;
} else {
    window.BackupManager = BackupManager;
}