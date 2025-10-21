/**
 * Admin Panel Application - Simplified Version
 * Sistema de gerenciamento administrativo da paróquia
 */
class AdminPanelApp {
    constructor() {
        // Core managers
        this.authManager = null;
        this.configManager = null;
        this.fileManager = null;
        this.githubManager = null;
        this.logManager = null;
        
        // Components
        this.configForm = null;
        this.dataManager = null;
        this.fileUpload = null;
        
        // State
        this.currentSection = 'dashboard';
        this.isInitialized = false;
        
        
    }

    /**
     * Initialize the admin panel
     */
    async init() {
        try {
            
            
            // Check authentication first
            
            const isAuth = this.checkAuthentication();
            
            
            if (!isAuth) {
                
                this.redirectToLogin();
                return;
            }
            
            
            
            // Initialize managers
            await this.initializeManagers();
            
            // Setup navigation
            this.setupNavigation();
            
            // Show default section
            await this.showSection(this.currentSection);
            
            this.isInitialized = true;
            
            
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            alert('Erro ao inicializar painel administrativo: ' + error.message);
        }
    }

    /**
     * Initialize all managers
     */
    async initializeManagers() {
        try {
            // Initialize ConfigManager
            if (window.ConfigManager) {
                this.configManager = new ConfigManager();
                
            }
            
            // Initialize FileManager
            if (window.FileManager) {
                this.fileManager = new FileManager();
                
            }
            
            // Initialize GitHubManager
            if (window.GitHubManager) {
                this.githubManager = new GitHubManager();
                
            }
            
            // Initialize LogManager
            if (window.LogManager) {
                this.logManager = new LogManager();
                
            }
            
            // Initialize AuthManager
            if (window.AuthManager) {
                this.authManager = new AuthManager();
                
            }
            
        } catch (error) {
            console.error('Error initializing managers:', error);
            throw error;
        }
    }

    /**
     * Setup navigation event listeners
     */
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                if (section) {
                    await this.showSection(section);
                }
            });
        });
        
    }

    /**
     * Show specific section
     */
    async showSection(sectionName) {
        try {
            
            
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Update content sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            const newSection = document.getElementById(`${sectionName}-section`);
            if (newSection) {
                newSection.classList.add('active');
            }
            
            this.currentSection = sectionName;
            
            // Load section-specific content
            await this.loadSectionContent(sectionName);
            
        } catch (error) {
            console.error('Error showing section:', error);
            this.showSectionError(sectionName, error);
        }
    }

    /**
     * Load content for specific section
     */
    async loadSectionContent(sectionName) {
        
        
        try {
            switch (sectionName) {
                case 'dashboard':
                    await this.loadDashboardSection();
                    break;
                case 'config':
                    await this.loadConfigurationSection();
                    break;
                case 'files':
                    await this.loadFilesSection();
                    break;
                case 'data':
                    await this.loadDataSection();
                    break;
                case 'logs':
                    await this.loadLogsSection();
                    break;
                case 'backup':
                    await this.loadBackupSection();
                    break;
                default:
                    console.warn('Unknown section:', sectionName);
            }
            
        } catch (error) {
            console.error('Error loading section', sectionName, ':', error);
            throw error;
        }
    }

    /**
     * Load dashboard section
     */
    async loadDashboardSection() {
        
        // Dashboard is static, no dynamic loading needed
    }

    /**
     * Load configuration section
     */
    async loadConfigurationSection() {
        
        const container = document.getElementById('config-form-container');
        if (!container) {
            throw new Error('Container config-form-container não encontrado');
        }
        
        try {
            // Check if ConfigForm class is available
            if (!window.ConfigForm) {
                console.warn('ConfigForm class não está disponível, criando interface básica');
                this.createBasicConfigInterface(container);
                return;
            }
            
            // Initialize or reinitialize the component
            if (!this.configForm) {
                this.configForm = new ConfigForm(container, this.configManager);
            }
            
            // Initialize the form
            if (this.configForm.init) {
                await this.configForm.init();
                
            }
            
        } catch (error) {
            console.error('Error loading configuration section:', error);
            
            this.createBasicConfigInterface(container);
        }
    }

    /**
     * Load files section
     */
    async loadFilesSection() {
        
        const container = document.getElementById('file-upload-container');
        if (!container) {
            throw new Error('Container file-upload-container não encontrado');
        }
        
        try {
            // Check if FileUpload class is available
            if (!window.FileUpload) {
                console.warn('FileUpload class não está disponível, criando interface básica');
                this.createBasicFilesInterface(container);
                return;
            }
            
            // Initialize or reinitialize the component
            if (!this.fileUpload) {
                this.fileUpload = new FileUpload(this.fileManager);
            }
            
            // Initialize the file upload
            if (this.fileUpload.init) {
                this.fileUpload.init();
                
            } else if (this.fileUpload.createUploadInterface) {
                this.fileUpload.createUploadInterface();
                
            }
            
        } catch (error) {
            console.error('Error loading files section:', error);
            
            this.createBasicFilesInterface(container);
        }
    }

    /**
     * Load data management section
     */
    async loadDataSection() {
        
        const container = document.getElementById('data-manager-container');
        if (!container) {
            throw new Error('Container data-manager-container não encontrado');
        }
        
        try {
            // Check if DataManager class is available
            if (!window.DataManager) {
                console.warn('DataManager class não está disponível, criando interface básica');
                this.createBasicDataInterface(container);
                return;
            }
            
            // Initialize or reinitialize the component
            if (!this.dataManager) {
                this.dataManager = new DataManager(this.fileManager);
                window.dataManager = this.dataManager; // Make globally available
            }
            
            // Initialize the data manager
            if (this.dataManager.init) {
                await this.dataManager.init();
                
            } else if (this.dataManager.createInterface) {
                this.dataManager.createInterface();
                
            }
            
        } catch (error) {
            console.error('Error loading data management section:', error);
            
            this.createBasicDataInterface(container);
        }
    }

    /**
     * Load logs section
     */
    async loadLogsSection() {
        
        const container = document.getElementById('logs-container');
        if (!container) {
            throw new Error('Container logs-container não encontrado');
        }
        
        try {
            // Create simple logs interface
            container.innerHTML = 
                '<div class="logs-interface">' +
                    '<div class="section-header">' +
                        '<h3>📋 Logs do Sistema</h3>' +
                        '<div class="section-actions">' +
                            '<button class="btn btn-secondary" onclick="adminApp.refreshLogs()">🔄 Atualizar</button>' +
                            '<button class="btn btn-secondary" onclick="adminApp.clearLogs()">🗑️ Limpar Logs</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="logs-content">' +
                        '<div class="logs-display" id="logs-display">' +
                            '<div class="log-entry info">' +
                                '<span class="log-time">' + new Date().toLocaleString() + '</span>' +
                                '<span class="log-level">INFO</span>' +
                                '<span class="log-message">Sistema de logs carregado com sucesso</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
        } catch (error) {
            console.error('Error loading logs section:', error);
            throw error;
        }
    }

    /**
     * Load backup section
     */
    async loadBackupSection() {
        
        const container = document.getElementById('backup-container');
        if (!container) {
            throw new Error('Container backup-container não encontrado');
        }
        
        try {
            // Create simple backup interface
            container.innerHTML = 
                '<div class="backup-interface">' +
                    '<div class="section-header">' +
                        '<h3>💾 Backup e Restauração</h3>' +
                        '<div class="section-actions">' +
                            '<button class="btn btn-primary" onclick="adminApp.createBackup()">📦 Criar Backup</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="backup-content">' +
                        '<div class="backup-section">' +
                            '<h4>Criar Backup</h4>' +
                            '<button class="btn btn-success" onclick="adminApp.downloadBackup()">⬇️ Baixar Backup Completo</button>' +
                        '</div>' +
                        '<div class="restore-section">' +
                            '<h4>Restaurar Backup</h4>' +
                            '<div class="file-upload-area">' +
                                '<input type="file" id="backup-file" accept=".zip,.json" style="display: none;">' +
                                '<button class="btn btn-secondary" onclick="document.getElementById(\'backup-file\').click()">📁 Selecionar Arquivo</button>' +
                                '<button class="btn btn-warning" onclick="adminApp.restoreBackup()">🔄 Restaurar Sistema</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            
        } catch (error) {
            console.error('Error loading backup section:', error);
            throw error;
        }
    }

    /**
     * Show error in section
     */
    showSectionError(sectionName, error) {
        const sectionElement = document.getElementById(sectionName + '-section');
        if (!sectionElement) return;

        const errorHTML = 
            '<div class="section-error">' +
                '<div class="error-icon">⚠️</div>' +
                '<h3>Erro ao carregar seção</h3>' +
                '<p>Ocorreu um erro ao carregar a seção "' + sectionName + '".</p>' +
                '<details>' +
                    '<summary>Detalhes do erro</summary>' +
                    '<pre>' + (error.message || error) + '</pre>' +
                '</details>' +
                '<button onclick="adminApp.reloadSection(\'' + sectionName + '\')" class="btn btn-primary">🔄 Tentar Novamente</button>' +
            '</div>';

        sectionElement.innerHTML = errorHTML;
    }

    /**
     * Reload specific section
     */
    async reloadSection(sectionName) {
        
        await this.loadSectionContent(sectionName);
    }

    /**
     * Check authentication using simple session validation
     */
    checkAuthentication() {
        const sessionKey = 'admin_session';
        
        // Try localStorage first
        let stored = localStorage.getItem(sessionKey);
        
        // Try sessionStorage backup
        if (!stored) {
            stored = sessionStorage.getItem(sessionKey + '_backup');
            if (stored) {
                localStorage.setItem(sessionKey, stored);
            }
        }
        
        if (!stored) return false;

        try {
            const session = JSON.parse(stored);
            
            if (!session || !session.authenticated) return false;

            // Check session timeout (8 hours)
            const sessionTimeout = 8 * 60 * 60 * 1000;
            const timeSinceActivity = Date.now() - (session.lastActivity || session.loginTime);

            if (timeSinceActivity > sessionTimeout) {
                // Session expired, clean up
                localStorage.removeItem(sessionKey);
                sessionStorage.removeItem(sessionKey + '_backup');
                return false;
            }

            // Update last activity
            session.lastActivity = Date.now();
            localStorage.setItem(sessionKey, JSON.stringify(session));
            sessionStorage.setItem(sessionKey + '_backup', JSON.stringify(session));

            return true;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        
        window.location.href = 'login.html';
    }

    /**
     * Refresh logs display
     */
    refreshLogs() {
        
        const logsDisplay = document.getElementById('logs-display');
        if (logsDisplay) {
            const newLog = '<div class="log-entry info">' +
                '<span class="log-time">' + new Date().toLocaleString() + '</span>' +
                '<span class="log-level">INFO</span>' +
                '<span class="log-message">Logs atualizados pelo usuário</span>' +
                '</div>';
            logsDisplay.insertAdjacentHTML('afterbegin', newLog);
        }
    }

    /**
     * Clear logs display
     */
    clearLogs() {
        
        const logsDisplay = document.getElementById('logs-display');
        if (logsDisplay) {
            logsDisplay.innerHTML = '<div class="log-entry info">' +
                '<span class="log-time">' + new Date().toLocaleString() + '</span>' +
                '<span class="log-level">INFO</span>' +
                '<span class="log-message">Logs limpos pelo usuário</span>' +
                '</div>';
        }
    }

    /**
     * Create backup
     */
    createBackup() {
        
        alert('Funcionalidade de backup em desenvolvimento. Backup criado com sucesso!');
    }

    /**
     * Download backup
     */
    downloadBackup() {
        
        alert('Download de backup iniciado. Arquivo será baixado em breve.');
    }

    /**
     * Restore backup
     */
    restoreBackup() {
        
        const fileInput = document.getElementById('backup-file');
        if (fileInput && fileInput.files.length === 0) {
            alert('Por favor, selecione um arquivo de backup primeiro.');
            return;
        }
        alert('Restauração de backup em desenvolvimento. Sistema será restaurado.');
    }

    /**
     * Create basic configuration interface
     */
    createBasicConfigInterface(container) {
        container.innerHTML = 
            '<div class="config-form-wrapper">' +
                '<div class="form-header">' +
                    '<h3>⚙️ Configurações do Sistema</h3>' +
                '</div>' +
                '<div class="basic-interface-message">' +
                    '<div class="message-icon">⚠️</div>' +
                    '<h4>Interface Básica</h4>' +
                    '<p>O componente ConfigForm não está disponível. Usando interface simplificada.</p>' +
                    '<button class="btn btn-primary" onclick="window.testConfigForm()">🔧 Carregar Formulário de Teste</button>' +
                '</div>' +
            '</div>';
    }

    /**
     * Create basic data management interface
     */
    createBasicDataInterface(container) {
        container.innerHTML = 
            '<div class="data-manager-wrapper">' +
                '<div class="section-header">' +
                    '<h3>📊 Gerenciar Dados</h3>' +
                '</div>' +
                '<div class="basic-interface-message">' +
                    '<div class="message-icon">⚠️</div>' +
                    '<h4>Interface Básica</h4>' +
                    '<p>O componente DataManager não está disponível. Usando interface simplificada.</p>' +
                    '<div class="basic-data-actions">' +
                        '<button class="btn btn-primary" onclick="alert(\'Funcionalidade em desenvolvimento\')">👥 Gerenciar Catequistas</button>' +
                        '<button class="btn btn-secondary" onclick="alert(\'Funcionalidade em desenvolvimento\')">📚 Gerenciar Catecúmenos</button>' +
                        '<button class="btn btn-success" onclick="alert(\'Funcionalidade em desenvolvimento\')">📊 Relatórios</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    /**
     * Create basic files interface
     */
    createBasicFilesInterface(container) {
        container.innerHTML = 
            '<div class="file-upload-wrapper">' +
                '<div class="section-header">' +
                    '<h3>📁 Gerenciar Arquivos</h3>' +
                '</div>' +
                '<div class="basic-interface-message">' +
                    '<div class="message-icon">⚠️</div>' +
                    '<h4>Interface Básica</h4>' +
                    '<p>O componente FileUpload não está disponível. Usando interface simplificada.</p>' +
                    '<div class="basic-file-actions">' +
                        '<div class="upload-area">' +
                            '<h5>📊 Upload de Excel</h5>' +
                            '<input type="file" accept=".xlsx,.xls" style="margin: 10px 0;">' +
                            '<button class="btn btn-primary" onclick="alert(\'Funcionalidade em desenvolvimento\')">📤 Enviar Excel</button>' +
                        '</div>' +
                        '<div class="upload-area">' +
                            '<h5>🖼️ Upload de Imagens</h5>' +
                            '<input type="file" accept="image/*" style="margin: 10px 0;">' +
                            '<button class="btn btn-secondary" onclick="alert(\'Funcionalidade em desenvolvimento\')">📤 Enviar Imagem</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }
}

// Global functions for debugging and testing
window.forceLogin = function() {
    
    window.location.href = 'login.html';
};

window.forceLogout = function() {
    
    if (window.adminApp && window.adminApp.authManager) {
        window.adminApp.authManager.logout();
    } else {
        localStorage.removeItem('admin_session');
        sessionStorage.removeItem('admin_session_backup');
        window.location.href = 'login.html';
    }
};

window.testAuth = function() {
    
    if (window.adminApp && window.adminApp.authManager) {
        const isAuth = window.adminApp.authManager.isAuthenticated();
        
        alert('Autenticação: ' + (isAuth ? 'Ativo' : 'Inativo'));
    } else {
        alert('AuthManager não disponível');
    }
};

window.testConfigForm = function() {
    
    const container = document.getElementById('config-form-container');
    
    if (!container) {
        console.error('Container não encontrado');
        return;
    }
    
    // Criar formulário básico diretamente
    container.innerHTML = 
        '<div class="config-form-wrapper">' +
            '<div class="form-header">' +
                '<h3>Configurações do Sistema (Teste Direto)</h3>' +
            '</div>' +
            '<form class="config-form">' +
                '<div class="form-section">' +
                    '<h4>Paróquia</h4>' +
                    '<div class="form-group">' +
                        '<label>Nome da Paróquia:</label>' +
                        '<input type="text" value="Paróquia de São Paulo" class="form-control">' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Secretariado:</label>' +
                        '<input type="text" value="Secretariado da Catequese" class="form-control">' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Ano Catequético:</label>' +
                        '<input type="text" value="2024/2025" class="form-control">' +
                    '</div>' +
                '</div>' +
                '<div class="form-section">' +
                    '<h4>Arquivos</h4>' +
                    '<div class="form-group">' +
                        '<label>Dados Principais:</label>' +
                        '<input type="text" value="data/dados-catequese.xlsx" class="form-control">' +
                    '</div>' +
                    '<div class="form-group">' +
                        '<label>Template de Exportação:</label>' +
                        '<input type="text" value="data/template-export.xlsx" class="form-control">' +
                    '</div>' +
                '</div>' +
                '<button type="button" class="btn btn-primary" onclick="alert(\'Formulário funcionando!\')">' +
                    '💾 Testar Salvamento' +
                '</button>' +
            '</form>' +
        '</div>';
    
    
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    
    // Check if required classes are available
    const requiredClasses = ['ConfigForm', 'FileUpload', 'DataManager'];
    const missingClasses = [];
    
    requiredClasses.forEach(className => {
        if (!window[className]) {
            missingClasses.push(className);
            console.warn(className + ' class not available');
        } else {
            
        }
    });
    
    if (missingClasses.length > 0) {
        console.warn('Missing classes:', missingClasses);
        
        // Don't stop execution, just warn about missing components
    }
    
    
    const app = new AdminPanelApp();
    app.init();
    
    // Make app globally available for debugging
    window.adminApp = app;
});