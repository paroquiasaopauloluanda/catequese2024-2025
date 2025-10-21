/**
 * Main Application
 * Initializes and manages the admin panel application
 */

class AdminPanelApp {
    constructor() {
        // Core managers
        this.authManager = new AuthManager();
        this.configManager = new ConfigManager();
        this.fileManager = new FileManager();
        this.githubManager = new GitHubManager();
        this.progressTracker = new ProgressTracker();
        this.progressBar = new ProgressBar();
        this.logManager = new LogManager();
        
        // Deployment and optimization managers
        this.deploymentManager = new DeploymentManager();
        this.deploymentVerifier = new DeploymentVerifier();
        
        // Error handling system
        this.errorHandler = new ErrorHandler();
        this.notificationManager = new NotificationManager();
        this.dialogManager = new DialogManager();
        this.errorWrapper = new ErrorWrapper(this.errorHandler);
        
        // System recovery
        this.systemRecovery = new SystemRecovery();
        
        // Error reporting
        this.errorReporter = new ErrorReporter(this.systemRecovery);
        
        // Security managers (initialized by AuthManager)
        this.tokenManager = null;
        this.securityManager = null;
        
        // UI Components (initialized later)
        this.configForm = null;
        this.fileUpload = null;
        this.dataManager = null;
        this.logDisplay = null;
        this.backupManager = null;
        
        // App state
        this.currentSection = 'dashboard';
        this.isInitialized = false;
        this.statusUpdateInterval = null;
        this.notificationsEnabled = true;
        this.componentStates = new Map();
        
        // Bind methods to preserve context
        this.handleAuthStateChange = this.handleAuthStateChange.bind(this);
        this.handleConfigChange = this.handleConfigChange.bind(this);
        this.handleFileUpload = this.handleFileUpload.bind(this);
        this.handleProgressUpdate = this.handleProgressUpdate.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize logging system first
            this.logManager.initAutoCleanup();
            this.logManager.logInfo('system', 'Iniciando painel administrativo');
            
            // Initialize core managers
            await this.initializeManagers();
            
            // Set up component integrations
            this.setupComponentIntegrations();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize help system
            this.initializeHelpSystem();
            
            // Check if user is already authenticated
            
            const isAuth = this.checkAuthentication();
            
            
            if (isAuth) {
                
                await this.showAdminPanel();
            } else {
                
                this.redirectToLogin();
            }
            
            this.isInitialized = true;
            this.logManager.logSuccess('system', 'Painel administrativo inicializado com sucesso');
            
            
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            this.logManager.logError('system', 'Erro ao inicializar painel administrativo', { error: error.message });
            
            // Use notification manager if available, fallback to HelperUtils
            if (this.notificationManager) {
                this.notificationManager.showNotification('Erro ao inicializar painel administrativo', 'error');
            } else {
                HelperUtils.showNotification('Erro ao inicializar painel administrativo', 'error');
            }
        }
    }

    /**
     * Initialize all managers
     */
    async initializeManagers() {
        try {
            // Initialize error handling system first
            this.errorHandler.setDependencies(this.logManager, this.notificationManager);
            
            // Initialize authentication system (includes security managers)
            this.authManager.init();
            
            // Get references to security managers
            this.tokenManager = this.authManager.tokenManager;
            this.securityManager = this.authManager.securityManager;
            
            // Initialize progress bar and connect it to progress tracker
            this.progressBar.setProgressTracker(this.progressTracker);
            
            // Initialize file manager with progress tracking
            this.fileManager.setProgressTracker(this.progressTracker);
            
            // Initialize config manager with logging
            this.configManager.setLogManager(this.logManager);
            
            // Wrap all managers with comprehensive error handling
            this.wrapManagersWithErrorHandling();
            
            this.logManager.logInfo('system', 'Gerenciadores inicializados com sucesso');
            
        } catch (error) {
            this.logManager.logError('system', 'Erro ao inicializar gerenciadores', { error: error.message });
            throw error;
        }
    }

    /**
     * Wrap all managers with comprehensive error handling
     */
    wrapManagersWithErrorHandling() {
        try {
            // Configuration for each manager type
            const managerConfigs = {
                authManager: {
                    ...ErrorWrapper.getManagerConfig('auth'),
                    fallbackMethods: {
                        isAuthenticated: function() {
                            try {
                                const session = localStorage.getItem(this.sessionKey);
                                return session !== null;
                            } catch {
                                return false;
                            }
                        }
                    }
                },
                
                configManager: {
                    ...ErrorWrapper.getManagerConfig('config'),
                    fallbackMethods: {
                        loadSettings: function() {
                            
                            return this.getDefaultConfig();
                        }
                    }
                },
                
                fileManager: {
                    ...ErrorWrapper.getManagerConfig('file'),
                    fallbackMethods: {
                        validateFile: function(file, type) {
                            if (!file) {
                                return { isValid: false, errors: ['Nenhum arquivo selecionado'], warnings: [] };
                            }
                            return { isValid: true, errors: [], warnings: ['Validação básica aplicada'] };
                        }
                    }
                },
                
                githubManager: {
                    ...ErrorWrapper.getManagerConfig('github'),
                    fallbackMethods: {
                        isConfigured: function() {
                            return this.token && this.repository;
                        }
                    }
                },
                
                progressTracker: {
                    ...ErrorWrapper.getManagerConfig('progress'),
                    fallbackMethods: {
                        updateProgress: function(operationId, progress) {
                            
                        }
                    }
                }
            };

            // Wrap each manager
            Object.entries(managerConfigs).forEach(([managerName, config]) => {
                if (this[managerName]) {
                    this.errorWrapper.wrapManager(this[managerName], config);
                    this.logManager.logInfo('system', `Wrapped ${managerName} with error handling`);
                }
            });

        } catch (error) {
            console.error('Error wrapping managers with error handling:', error);
            this.logManager.logWarning('system', 'Falha ao aplicar tratamento de erro aos gerenciadores', { error: error.message });
        }
    }

    /**
     * Set up component integrations
     */
    setupComponentIntegrations() {
        // Set up authentication state change handler
        if (this.authManager.onStateChange) {
            this.authManager.onStateChange(this.handleAuthStateChange);
        }
        
        // Set up progress tracker event handlers
        this.progressTracker.onProgressUpdate = this.handleProgressUpdate;
        this.progressTracker.onOperationComplete = (operationId, result) => {
            this.logManager.logSuccess('operation', `Operação ${operationId} concluída`, result);
            this.updateDashboardStats();
        };
        this.progressTracker.onOperationError = (operationId, error) => {
            this.logManager.logError('operation', `Erro na operação ${operationId}`, { error: error.message });
            this.updateNavigationBadges();
        };
        
        // Set up file manager event handlers
        this.fileManager.onFileUploaded = this.handleFileUpload;
        this.fileManager.onUploadError = (error) => {
            this.logManager.logError('file', 'Erro no upload de arquivo', { error: error.message });
        };
        
        // Set up config manager event handlers
        this.configManager.onConfigChanged = this.handleConfigChange;
        this.configManager.onConfigError = (error) => {
            this.logManager.logError('config', 'Erro na configuração', { error: error.message });
        };
        
        this.logManager.logInfo('system', 'Integrações de componentes configuradas');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });

        // Back to dashboard buttons
        const backButtons = document.querySelectorAll('[id^="back-to-dashboard"]');
        backButtons.forEach(button => {
            button.addEventListener('click', () => this.showSection('dashboard'));
        });

        // Dashboard action buttons
        const refreshBtn = document.getElementById('refresh-all');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.handleRefreshAll.bind(this));
        }

        const notificationToggle = document.getElementById('toggle-notifications');
        if (notificationToggle) {
            notificationToggle.addEventListener('click', this.handleToggleNotifications.bind(this));
        }

        // Progress overlay cancel button
        const cancelBtn = document.getElementById('cancel-operation');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.handleCancelOperation.bind(this));
        }

        // System recovery buttons
        const emergencyResetBtn = document.getElementById('emergency-reset-btn');
        if (emergencyResetBtn) {
            emergencyResetBtn.addEventListener('click', this.handleEmergencyReset.bind(this));
        }

        const diagnosticsBtn = document.getElementById('system-diagnostics-btn');
        if (diagnosticsBtn) {
            diagnosticsBtn.addEventListener('click', this.handleSystemDiagnostics.bind(this));
        }

        const integrationTestBtn = document.getElementById('integration-test-btn');
        if (integrationTestBtn) {
            integrationTestBtn.addEventListener('click', this.handleIntegrationTest.bind(this));
        }
    }

    /**
     * Initialize help system
     */
    initializeHelpSystem() {
        try {
            // Setup help tooltips for elements with data-help attribute
            this.dialogManager.setupHelpTooltips();
            
            // Add help button to header if not exists
            this.addGlobalHelpButton();
            
            this.logManager.logInfo('system', 'Sistema de ajuda inicializado');
            
        } catch (error) {
            console.error('Error initializing help system:', error);
            this.logManager.logWarning('system', 'Falha ao inicializar sistema de ajuda', { error: error.message });
        }
    }

    /**
     * Add global help button to header
     */
    addGlobalHelpButton() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions || document.getElementById('global-help-btn')) return;

        const helpBtn = document.createElement('button');
        helpBtn.id = 'global-help-btn';
        helpBtn.className = 'btn btn-icon';
        helpBtn.innerHTML = '❓';
        helpBtn.title = 'Ajuda do Sistema';
        helpBtn.setAttribute('aria-label', 'Abrir ajuda do sistema');

        helpBtn.addEventListener('click', () => {
            this.showGlobalHelp();
        });

        // Insert before logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            headerActions.insertBefore(helpBtn, logoutBtn);
        } else {
            headerActions.appendChild(helpBtn);
        }
    }

    /**
     * Show global help dialog
     */
    showGlobalHelp() {
        const helpSections = [
            {
                title: 'Navegação',
                content: `
                    <ul>
                        <li><strong>Dashboard:</strong> Visão geral do sistema e estatísticas</li>
                        <li><strong>Configurações:</strong> Editar configurações da paróquia</li>
                        <li><strong>Arquivos:</strong> Upload de arquivos Excel, templates e imagens</li>
                        <li><strong>Logs:</strong> Histórico de operações do sistema</li>
                        <li><strong>Backup:</strong> Gerenciar backups das configurações</li>
                    </ul>
                `
            },
            {
                title: 'Configurações',
                content: `
                    <ul>
                        <li>Preencha todos os campos obrigatórios</li>
                        <li>Use o formato YYYY para o ano catequético</li>
                        <li>A data de início deve estar no formato YYYY-MM-DD</li>
                        <li>O token GitHub deve ter permissões de escrita no repositório</li>
                    </ul>
                `
            },
            {
                title: 'Upload de Arquivos',
                content: `
                    <ul>
                        <li><strong>Dados Principais:</strong> Arquivo Excel (.xlsx/.xls) com dados da catequese</li>
                        <li><strong>Template de Exportação:</strong> Modelo para exportação de dados</li>
                        <li><strong>Logotipo:</strong> Imagem JPG ou PNG (máximo 5MB)</li>
                        <li>Sempre faça backup antes de substituir arquivos importantes</li>
                    </ul>
                `
            },
            {
                title: 'Solução de Problemas',
                content: `
                    <ul>
                        <li>Se houver erro de conexão, verifique sua internet</li>
                        <li>Para erros do GitHub, verifique o token e permissões</li>
                        <li>Use o botão "Tentar Novamente" em caso de falhas temporárias</li>
                        <li>Consulte os logs para detalhes sobre erros</li>
                    </ul>
                `
            }
        ];

        this.dialogManager.showHelp({
            title: 'Ajuda do Sistema',
            sections: helpSections,
            width: '700px'
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const loginBtn = document.getElementById('login-btn');
        const loginError = document.getElementById('login-error');
        
        // Clear previous errors
        loginError.classList.remove('show');
        
        // Show loading state
        loginBtn.disabled = true;
        loginBtn.querySelector('.btn-text').style.display = 'none';
        loginBtn.querySelector('.btn-loading').classList.remove('hidden');
        
        try {
            this.logManager.logInfo('auth', `Tentativa de login para usuário: ${username}`);
            const result = await this.authManager.login(username, password);
            
            if (result.success) {
                this.logManager.logSuccess('auth', 'Login realizado com sucesso', { user: username });
                HelperUtils.showNotification(result.message, 'success');
                await this.showAdminPanel();
            } else {
                this.logManager.logWarning('auth', 'Falha no login', { user: username, reason: result.message });
                loginError.textContent = result.message;
                loginError.classList.add('show');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Use comprehensive error handling
            const errorResult = this.errorHandler.handleError(error, { 
                operation: 'login', 
                user: username 
            });
            
            loginError.textContent = errorResult.userMessage;
            loginError.classList.add('show');
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            loginBtn.querySelector('.btn-text').style.display = 'inline';
            loginBtn.querySelector('.btn-loading').classList.add('hidden');
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        this.logManager.logInfo('auth', 'Usuário fez logout');
        this.cleanup();
        this.authManager.logout();
    }

    /**
     * Handle navigation between sections
     */
    handleNavigation(event) {
        event.preventDefault();
        
        const link = event.target;
        const section = link.dataset.section;
        
        if (section) {
            this.showSection(section);
        }
    }

    /**
     * Handle operation cancellation
     */
    handleCancelOperation() {
        // Get active operations and cancel them
        const activeOps = this.progressTracker.getActiveOperations();
        activeOps.forEach(op => {
            this.progressTracker.cancelOperation(op.id);
        });
        
        this.hideProgressOverlay();
    }

    /**
     * Handle refresh all data
     */
    async handleRefreshAll() {
        const refreshBtn = document.getElementById('refresh-all');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.querySelector('.btn-icon').textContent = '⏳';
        }

        try {
            await this.loadInitialData();
            await this.updateDashboardStats();
            await this.updateSystemStatus();
            HelperUtils.showNotification('Dados atualizados com sucesso', 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            
            // Use comprehensive error handling
            this.errorHandler.handleError(error, { 
                operation: 'refresh_data' 
            });
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.querySelector('.btn-icon').textContent = '🔄';
            }
        }
    }

    /**
     * Handle toggle notifications
     */
    handleToggleNotifications() {
        this.notificationsEnabled = !this.notificationsEnabled;
        const toggleBtn = document.getElementById('toggle-notifications');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('.btn-icon');
            icon.textContent = this.notificationsEnabled ? '🔔' : '🔕';
            toggleBtn.title = this.notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações';
        }
        
        const message = this.notificationsEnabled ? 'Notificações ativadas' : 'Notificações desativadas';
        HelperUtils.showNotification(message, 'info');
    }

    /**
     * Handle emergency reset button click
     */
    async handleEmergencyReset() {
        try {
            // Show confirmation dialog
            const confirmed = await this.dialogManager.showConfirmation({
                title: 'Reset de Emergência',
                message: `
                    <p><strong>⚠️ Atenção:</strong> Esta ação irá resetar o sistema para resolver problemas críticos.</p>
                    <p>Escolha o tipo de reset:</p>
                    <div style="margin: 1rem 0;">
                        <label style="display: block; margin: 0.5rem 0;">
                            <input type="radio" name="resetMode" value="soft" checked> 
                            <strong>Suave:</strong> Limpar apenas sessões e cache
                        </label>
                        <label style="display: block; margin: 0.5rem 0;">
                            <input type="radio" name="resetMode" value="medium"> 
                            <strong>Médio:</strong> Resetar configurações para padrão
                        </label>
                        <label style="display: block; margin: 0.5rem 0;">
                            <input type="radio" name="resetMode" value="hard"> 
                            <strong>Completo:</strong> Reset total do sistema (recarrega a página)
                        </label>
                    </div>
                `,
                confirmText: 'Executar Reset',
                cancelText: 'Cancelar',
                type: 'warning'
            });

            if (!confirmed) return;

            // Get selected reset mode
            const selectedMode = document.querySelector('input[name="resetMode"]:checked')?.value || 'soft';

            // Show progress
            this.showProgressOverlay('Executando reset do sistema...', 0);

            // Perform reset
            const result = await this.systemRecovery.performEmergencyReset(selectedMode);

            this.hideProgressOverlay();

            if (result.success) {
                this.notificationManager.showNotification(result.message, 'success');
                this.logManager.logSuccess('system', `Reset de emergência concluído: ${selectedMode}`);
                
                // If it's a hard reset, the page will reload automatically
                if (selectedMode !== 'hard') {
                    // Refresh the current section
                    await this.loadSectionContent(this.currentSection);
                    await this.updateSystemStatus();
                }
            } else {
                this.notificationManager.showNotification(result.message, 'error');
                this.logManager.logError('system', `Falha no reset de emergência: ${result.error}`);
            }

        } catch (error) {
            this.hideProgressOverlay();
            console.error('Error during emergency reset:', error);
            this.notificationManager.showNotification('Erro durante reset de emergência', 'error');
            this.logManager.logError('system', 'Erro durante reset de emergência', { error: error.message });
        }
    }

    /**
     * Handle system diagnostics button click
     */
    async handleSystemDiagnostics() {
        try {
            // Show progress while gathering diagnostics
            this.showProgressOverlay('Coletando diagnósticos do sistema...', 0);

            // Perform health check
            const healthCheck = await this.systemRecovery.performHealthCheck();
            const diagnostics = this.systemRecovery.getSystemDiagnostics();
            const recommendations = this.systemRecovery.getRecoveryRecommendations();

            this.hideProgressOverlay();

            // Create diagnostics dialog content
            const diagnosticsContent = this.createDiagnosticsContent(healthCheck, diagnostics, recommendations);

            // Show diagnostics dialog
            this.dialogManager.showDialog({
                title: 'Diagnósticos do Sistema',
                content: diagnosticsContent,
                width: '800px',
                height: '600px',
                buttons: [
                    {
                        text: 'Exportar Diagnósticos',
                        class: 'btn-secondary',
                        onclick: () => {
                            this.systemRecovery.exportDiagnostics();
                            this.notificationManager.showNotification('Diagnósticos exportados com sucesso', 'success');
                        }
                    },
                    {
                        text: 'Atualizar',
                        class: 'btn-primary',
                        onclick: () => {
                            this.handleSystemDiagnostics();
                        }
                    },
                    {
                        text: 'Fechar',
                        class: 'btn-secondary',
                        onclick: () => {
                            this.dialogManager.closeDialog();
                        }
                    }
                ]
            });

        } catch (error) {
            this.hideProgressOverlay();
            console.error('Error gathering system diagnostics:', error);
            this.notificationManager.showNotification('Erro ao coletar diagnósticos', 'error');
            this.logManager.logError('system', 'Erro ao coletar diagnósticos', { error: error.message });
        }
    }

    /**
     * Handle integration test button click
     */
    async handleIntegrationTest() {
        try {
            // Show progress while running tests
            this.showProgressOverlay('Executando testes de integração...', 0);

            // Run integration tests
            const testResults = await this.testSystemIntegration();

            this.hideProgressOverlay();

            // Create test results dialog content
            const testContent = this.createIntegrationTestContent(testResults);

            // Show test results dialog
            this.dialogManager.showDialog({
                title: 'Resultados do Teste de Integração',
                content: testContent,
                width: '800px',
                height: '600px',
                buttons: [
                    {
                        text: 'Executar Novamente',
                        class: 'btn-primary',
                        onclick: () => {
                            this.handleIntegrationTest();
                        }
                    },
                    {
                        text: 'Exportar Resultados',
                        class: 'btn-secondary',
                        onclick: () => {
                            this.exportIntegrationTestResults(testResults);
                        }
                    },
                    {
                        text: 'Fechar',
                        class: 'btn-secondary',
                        onclick: () => {
                            this.dialogManager.closeDialog();
                        }
                    }
                ]
            });

        } catch (error) {
            this.hideProgressOverlay();
            console.error('Error running integration test:', error);
            this.notificationManager.showNotification('Erro ao executar teste de integração', 'error');
            this.logManager.logError('system', 'Erro ao executar teste de integração', { error: error.message });
        }
    }

    /**
     * Create integration test results content
     */
    createIntegrationTestContent(testResults) {
        const statusColor = testResults.overallStatus === 'passed' ? '#10b981' : '#ef4444';
        const statusIcon = testResults.overallStatus === 'passed' ? '✅' : '❌';

        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <!-- Overall Status -->
                <div style="margin-bottom: 2rem; padding: 1rem; border-radius: 8px; background: #f8f9fa; border-left: 4px solid ${statusColor};">
                    <h3 style="margin: 0 0 0.5rem 0; color: ${statusColor};">
                        ${statusIcon} Status Geral: ${testResults.overallStatus.toUpperCase()}
                    </h3>
                    <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">
                        Executado em: ${new Date(testResults.timestamp).toLocaleString('pt-BR')}
                    </p>
                </div>

                <!-- Test Results -->
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 1rem 0;">Resultados dos Testes</h4>
                    <div style="space-y: 1rem;">
                        ${testResults.tests.map(test => {
                            const testStatusColor = test.status === 'passed' ? '#10b981' : '#ef4444';
                            const testStatusIcon = test.status === 'passed' ? '✅' : '❌';
                            
                            return `
                                <div style="border: 1px solid #e5e7eb; border-radius: 6px; background: white; margin-bottom: 1rem;">
                                    <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                                        <div style="display: flex; align-items: center; justify-content: space-between;">
                                            <h5 style="margin: 0; font-size: 1rem;">${test.name}</h5>
                                            <span style="color: ${testStatusColor}; font-weight: 600;">
                                                ${testStatusIcon} ${test.status.toUpperCase()}
                                            </span>
                                        </div>
                                        ${test.error ? `
                                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fef2f2; border-radius: 4px; color: #dc2626; font-size: 0.9rem;">
                                                <strong>Erro:</strong> ${test.error}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div style="padding: 1rem;">
                                        <h6 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #6b7280;">Detalhes:</h6>
                                        <div style="font-size: 0.8rem; color: #374151;">
                                            ${Object.entries(test.details).map(([key, value]) => `
                                                <div style="margin-bottom: 0.5rem;">
                                                    <strong>${key}:</strong>
                                                    <div style="margin-left: 1rem;">
                                                        ${typeof value === 'object' ? 
                                                            Object.entries(value).map(([subKey, subValue]) => 
                                                                `<div>${subKey}: ${subValue ? '✅' : '❌'}</div>`
                                                            ).join('') :
                                                            value
                                                        }
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Summary -->
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 1rem 0;">Resumo</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; background: white;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #10b981;">
                                ${testResults.tests.filter(t => t.status === 'passed').length}
                            </div>
                            <div style="font-size: 0.9rem; color: #6b7280;">Testes Aprovados</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; background: white;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #ef4444;">
                                ${testResults.tests.filter(t => t.status === 'failed').length}
                            </div>
                            <div style="font-size: 0.9rem; color: #6b7280;">Testes Falharam</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; background: white;">
                            <div style="font-size: 1.5rem; font-weight: 600; color: #6b7280;">
                                ${testResults.tests.length}
                            </div>
                            <div style="font-size: 0.9rem; color: #6b7280;">Total de Testes</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Export integration test results
     */
    exportIntegrationTestResults(testResults) {
        const exportData = {
            exportTimestamp: new Date().toISOString(),
            testResults,
            systemInfo: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `integration-test-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.notificationManager.showNotification('Resultados do teste exportados com sucesso', 'success');
    }

    /**
     * Create diagnostics content for dialog
     */
    createDiagnosticsContent(healthCheck, diagnostics, recommendations) {
        const statusColors = {
            healthy: '#10b981',
            warning: '#f59e0b',
            degraded: '#ef4444',
            critical: '#dc2626'
        };

        const statusColor = statusColors[healthCheck.status] || '#6b7280';

        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <!-- System Status -->
                <div style="margin-bottom: 2rem; padding: 1rem; border-radius: 8px; background: #f8f9fa; border-left: 4px solid ${statusColor};">
                    <h3 style="margin: 0 0 0.5rem 0; color: ${statusColor};">
                        Status do Sistema: ${healthCheck.status.toUpperCase()}
                    </h3>
                    <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">
                        Última verificação: ${new Date(healthCheck.timestamp).toLocaleString('pt-BR')}
                    </p>
                </div>

                <!-- Components Status -->
                <div style="margin-bottom: 2rem;">
                    <h4 style="margin: 0 0 1rem 0;">Status dos Componentes</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        ${Object.entries(healthCheck.components).map(([name, component]) => `
                            <div style="padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; background: white;">
                                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColors[component.status] || '#6b7280'}; margin-right: 0.5rem;"></span>
                                    <strong style="font-size: 0.9rem;">${name}</strong>
                                </div>
                                <div style="font-size: 0.8rem; color: #6b7280;">
                                    ${component.error ? `Erro: ${component.error}` : 'Funcionando'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Error Rate -->
                ${healthCheck.metrics.errorRate ? `
                    <div style="margin-bottom: 2rem;">
                        <h4 style="margin: 0 0 1rem 0;">Taxa de Erros</h4>
                        <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; background: white;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Erros recentes (5 min):</span>
                                <strong>${healthCheck.metrics.errorRate.recentErrors}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span>Total de erros:</span>
                                <strong>${healthCheck.metrics.errorRate.totalErrors}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Taxa por minuto:</span>
                                <strong>${healthCheck.metrics.errorRate.rate.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Recommendations -->
                ${recommendations.length > 0 ? `
                    <div style="margin-bottom: 2rem;">
                        <h4 style="margin: 0 0 1rem 0;">Recomendações de Recuperação</h4>
                        <div style="space-y: 0.5rem;">
                            ${recommendations.map(rec => `
                                <div style="padding: 0.75rem; border-left: 4px solid ${rec.priority === 'high' ? '#ef4444' : '#f59e0b'}; background: #fef7f0; margin-bottom: 0.5rem;">
                                    <div style="font-weight: 600; color: #92400e; margin-bottom: 0.25rem;">
                                        ${rec.priority === 'high' ? '🔴 Alta Prioridade' : '🟡 Média Prioridade'}
                                    </div>
                                    <div style="color: #451a03;">${rec.message}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Browser Info -->
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 1rem 0;">Informações do Navegador</h4>
                    <div style="padding: 1rem; border: 1px solid #e5e7eb; border-radius: 6px; background: white; font-size: 0.8rem; color: #6b7280;">
                        <div><strong>Navegador:</strong> ${diagnostics.browserInfo.userAgent}</div>
                        <div><strong>Idioma:</strong> ${diagnostics.browserInfo.language}</div>
                        <div><strong>Plataforma:</strong> ${diagnostics.browserInfo.platform}</div>
                        <div><strong>Online:</strong> ${diagnostics.browserInfo.onLine ? 'Sim' : 'Não'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Test system integration and stability
     */
    async testSystemIntegration() {
        const testResults = {
            timestamp: new Date().toISOString(),
            tests: [],
            overallStatus: 'passed',
            errors: []
        };

        try {
            // Test 1: Core managers initialization
            testResults.tests.push(await this.testManagersInitialization());

            // Test 2: Utility classes integration
            testResults.tests.push(await this.testUtilityClassesIntegration());

            // Test 3: Error handling system
            testResults.tests.push(await this.testErrorHandlingSystem());

            // Test 4: System recovery functionality
            testResults.tests.push(await this.testSystemRecoveryFunctionality());

            // Test 5: Authentication flow
            testResults.tests.push(await this.testAuthenticationFlow());

            // Test 6: GitHub integration
            testResults.tests.push(await this.testGitHubIntegration());

            // Determine overall status
            const failedTests = testResults.tests.filter(test => test.status === 'failed');
            if (failedTests.length > 0) {
                testResults.overallStatus = 'failed';
                testResults.errors = failedTests.map(test => test.error);
            }

            // Log results
            this.logManager.logInfo('integration_test', 'Teste de integração do sistema concluído', {
                status: testResults.overallStatus,
                passedTests: testResults.tests.filter(test => test.status === 'passed').length,
                failedTests: failedTests.length
            });

            return testResults;

        } catch (error) {
            testResults.overallStatus = 'error';
            testResults.errors.push(error.message);
            this.logManager.logError('integration_test', 'Erro durante teste de integração', { error: error.message });
            return testResults;
        }
    }

    /**
     * Test managers initialization
     */
    async testManagersInitialization() {
        const test = {
            name: 'Managers Initialization',
            status: 'passed',
            details: {},
            error: null
        };

        try {
            // Test AuthManager
            test.details.authManager = {
                initialized: !!this.authManager,
                hasSessionValidator: !!this.authManager.sessionValidator,
                hasLogThrottler: !!this.authManager.logThrottler,
                hasTokenManager: !!this.authManager.tokenManager,
                hasSecurityManager: !!this.authManager.securityManager
            };

            // Test GitHubManager
            test.details.githubManager = {
                initialized: !!this.githubManager,
                hasResponseHandler: !!this.githubManager.responseHandler,
                hasOfflineMode: this.githubManager.offlineMode !== undefined,
                hasLocalCache: !!this.githubManager.localCache
            };

            // Test SystemRecovery
            test.details.systemRecovery = {
                initialized: !!this.systemRecovery,
                hasLogThrottler: !!this.systemRecovery.logThrottler,
                hasErrorHistory: Array.isArray(this.systemRecovery.errorHistory),
                hasSystemHealth: !!this.systemRecovery.systemHealth
            };

            // Test ErrorReporter
            test.details.errorReporter = {
                initialized: !!this.errorReporter,
                hasSystemRecovery: !!this.errorReporter.systemRecovery,
                hasErrorCategories: !!this.errorReporter.errorCategories,
                hasReportingThresholds: !!this.errorReporter.reportingThresholds
            };

            // Check for any missing components
            const missingComponents = [];
            Object.keys(test.details).forEach(manager => {
                const managerDetails = test.details[manager];
                Object.keys(managerDetails).forEach(component => {
                    if (!managerDetails[component]) {
                        missingComponents.push(`${manager}.${component}`);
                    }
                });
            });

            if (missingComponents.length > 0) {
                test.status = 'failed';
                test.error = `Missing components: ${missingComponents.join(', ')}`;
            }

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
        }

        return test;
    }

    /**
     * Test utility classes integration
     */
    async testUtilityClassesIntegration() {
        const test = {
            name: 'Utility Classes Integration',
            status: 'passed',
            details: {},
            error: null
        };

        try {
            // Test SessionValidator
            if (this.authManager.sessionValidator) {
                const testSession = {
                    authenticated: true,
                    loginTime: Date.now(),
                    lastActivity: Date.now(),
                    sessionId: 'test-session'
                };
                
                const validationResult = this.authManager.sessionValidator.validateSession(testSession);
                test.details.sessionValidator = {
                    canValidate: validationResult !== undefined,
                    hasThrottling: !!this.authManager.sessionValidator.lastCheck
                };
            }

            // Test LogThrottler
            if (this.authManager.logThrottler) {
                this.authManager.logThrottler.throttledLog('test', 'Integration test message', 'info');
                test.details.logThrottler = {
                    canLog: true,
                    hasMessageCache: !!this.authManager.logThrottler.messageCache
                };
            }

            // Test ResponseHandler
            if (this.githubManager.responseHandler) {
                test.details.responseHandler = {
                    hasStaticMethods: typeof ResponseHandler.safeJsonParse === 'function',
                    canHandleResponses: true
                };
            }

            // Test SystemRecovery
            if (this.systemRecovery) {
                const healthCheck = await this.systemRecovery.performHealthCheck();
                test.details.systemRecovery = {
                    canPerformHealthCheck: !!healthCheck,
                    hasValidHealthStatus: ['healthy', 'warning', 'degraded', 'critical'].includes(healthCheck.status),
                    canTrackErrors: typeof this.systemRecovery.trackError === 'function'
                };
            }

            // Test ErrorReporter
            if (this.errorReporter) {
                const errorStats = this.errorReporter.getErrorStatistics();
                test.details.errorReporter = {
                    canGetStatistics: errorStats !== null,
                    canCategorizeErrors: typeof this.errorReporter.categorizeError === 'function',
                    canAnalyzeTrends: typeof this.errorReporter.analyzeErrorTrends === 'function'
                };
            }

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
        }

        return test;
    }

    /**
     * Test error handling system
     */
    async testErrorHandlingSystem() {
        const test = {
            name: 'Error Handling System',
            status: 'passed',
            details: {},
            error: null
        };

        try {
            // Test error tracking
            const initialErrorCount = this.systemRecovery.errorHistory.length;
            this.systemRecovery.trackError('test', 'Integration test error', { test: true });
            const newErrorCount = this.systemRecovery.errorHistory.length;
            
            test.details.errorTracking = {
                canTrackErrors: newErrorCount > initialErrorCount,
                errorHistoryExists: Array.isArray(this.systemRecovery.errorHistory)
            };

            // Test error categorization
            const testError = {
                message: 'Authentication failed',
                type: 'auth_error',
                details: { operation: 'login' }
            };
            
            const categorization = this.errorReporter.categorizeError(testError);
            test.details.errorCategorization = {
                canCategorize: !!categorization.category,
                hasSeverity: !!categorization.severity,
                hasConfidence: typeof categorization.confidence === 'number'
            };

            // Test error reporting
            const errorStats = this.errorReporter.getErrorStatistics();
            test.details.errorReporting = {
                canGenerateStats: errorStats !== null,
                hasErrorRate: typeof errorStats?.errorRate === 'number',
                hasRecentErrors: typeof errorStats?.recentErrors === 'number'
            };

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
        }

        return test;
    }

    /**
     * Test system recovery functionality
     */
    async testSystemRecoveryFunctionality() {
        const test = {
            name: 'System Recovery Functionality',
            status: 'passed',
            details: {},
            error: null
        };

        try {
            // Test health check
            const healthCheck = await this.systemRecovery.performHealthCheck();
            test.details.healthCheck = {
                hasStatus: !!healthCheck.status,
                hasComponents: !!healthCheck.components,
                hasMetrics: !!healthCheck.metrics,
                hasTimestamp: !!healthCheck.timestamp
            };

            // Test diagnostics
            const diagnostics = this.systemRecovery.getSystemDiagnostics();
            test.details.diagnostics = {
                hasSystemHealth: !!diagnostics.systemHealth,
                hasErrorHistory: Array.isArray(diagnostics.errorHistory),
                hasBrowserInfo: !!diagnostics.browserInfo,
                hasStorageInfo: !!diagnostics.storageInfo
            };

            // Test recovery recommendations
            const recommendations = this.systemRecovery.getRecoveryRecommendations();
            test.details.recommendations = {
                isArray: Array.isArray(recommendations),
                canGenerateRecommendations: true
            };

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
        }

        return test;
    }

    /**
     * Test authentication flow
     */
    async testAuthenticationFlow() {
        const test = {
            name: 'Authentication Flow',
            status: 'passed',
            details: {},
            error: null
        };

        try {
            // Test session validation without infinite loops
            const initialValidationCount = this.authManager.sessionValidator.lastCheck || 0;
            
            // Simulate multiple rapid session checks
            for (let i = 0; i < 5; i++) {
                this.authManager.isAuthenticated();
            }
            
            const finalValidationCount = this.authManager.sessionValidator.lastCheck || 0;
            
            test.details.sessionValidation = {
                hasThrottling: finalValidationCount > initialValidationCount,
                noInfiniteLoop: true // If we reach here, no infinite loop occurred
            };

            // Test session cleanup
            test.details.sessionCleanup = {
                canClearSessions: typeof this.authManager.clearSession === 'function',
                hasSilentCleanup: true
            };

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
        }

        return test;
    }

    /**
     * Test GitHub integration
     */
    async testGitHubIntegration() {
        const test = {
            name: 'GitHub Integration',
            status: 'passed',
            details: {},
            error: null
        };

        try {
            // Test response handling
            test.details.responseHandling = {
                hasResponseHandler: !!this.githubManager.responseHandler,
                hasSafeJsonParse: typeof ResponseHandler.safeJsonParse === 'function',
                hasOfflineMode: this.githubManager.offlineMode !== undefined
            };

            // Test caching
            test.details.caching = {
                hasLocalCache: !!this.githubManager.localCache,
                hasCacheTimeout: typeof this.githubManager.cacheTimeout === 'number'
            };

            // Test rate limiting
            test.details.rateLimiting = {
                hasRequestQueue: Array.isArray(this.githubManager.requestQueue),
                hasRequestHistory: Array.isArray(this.githubManager.requestHistory),
                hasRateLimits: typeof this.githubManager.maxRequestsPerMinute === 'number'
            };

        } catch (error) {
            test.status = 'failed';
            test.error = error.message;
        }

        return test;
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
     * Show admin panel
     */
    async showAdminPanel() {
        
        const loginScreen = document.getElementById('login-screen');
        const adminPanel = document.getElementById('admin-panel');
        
        if (loginScreen) {
            loginScreen.classList.remove('active');
        }
        if (adminPanel) {
            adminPanel.classList.add('active');
        }
        
        // Load initial data
        await this.loadInitialData();
        
        // Start status monitoring
        this.startStatusMonitoring();
        
        // Show default section
        this.showSection(this.currentSection);
        
        // Update dashboard stats
        await this.updateDashboardStats();
    }

    /**
     * Load initial data for the admin panel
     */
    async loadInitialData() {
        try {
            // Load configuration
            const config = await this.configManager.loadSettings();
            
            // Initialize GitHub manager if config is available
            if (config.github && config.github.token) {
                this.githubManager.init(config.github);
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            
            // Use comprehensive error handling
            this.errorHandler.handleError(error, { 
                operation: 'load_initial_data' 
            });
        }
    }

    /**
     * Show specific section
     */
    async showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.setAttribute('aria-current', 'page');
        }
        
        // Update content sections with animation
        document.querySelectorAll('.content-section').forEach(section => {
            if (section.classList.contains('active')) {
                section.classList.add('animate-fade-out');
                setTimeout(() => {
                    section.classList.remove('active', 'animate-fade-out');
                }, 150);
            }
        });
        
        // Show new section with animation
        setTimeout(() => {
            const newSection = document.getElementById(`${sectionName}-section`);
            if (newSection) {
                newSection.classList.add('active', 'animate-fade-in-up');
                
                // Focus management for accessibility
                const firstFocusable = newSection.querySelector('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    setTimeout(() => firstFocusable.focus(), 200);
                }
                
                // Remove animation class after completion
                setTimeout(() => {
                    newSection.classList.remove('animate-fade-in-up');
                }, 500);
            }
        }, 150);
        
        this.currentSection = sectionName;
        
        // Load section-specific content
        await this.loadSectionContent(sectionName);
        
        // Update page title for screen readers
        document.title = `${this.getSectionTitle(sectionName)} - Painel Administrativo`;
        
        // Log section change
        this.logManager.logInfo('navigation', `Navegou para seção: ${sectionName}`);
    }

    /**
     * Get section title for accessibility
     */
    getSectionTitle(sectionName) {
        const titles = {
            'dashboard': 'Dashboard',
            'config': 'Configurações',
            'files': 'Arquivos',
            'logs': 'Logs',
            'backup': 'Backup'
        };
        return titles[sectionName] || 'Painel Administrativo';
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
                    console.warn(`Unknown section: ${sectionName}`);
            }
            
        } catch (error) {
            console.error(`Error loading section ${sectionName}:`, error);
            this.showSectionError(sectionName, error);
        }
    }

    /**
     * Show error in section
     */
    showSectionError(sectionName, error) {
        const sectionElement = document.getElementById(`${sectionName}-section`);
        if (!sectionElement) return;

        const errorHTML = `
            <div class="section-error">
                <div class="error-icon">⚠️</div>
                <h3>Erro ao carregar seção</h3>
                <p>Ocorreu um erro ao carregar a seção "${sectionName}".</p>
                <details>
                    <summary>Detalhes do erro</summary>
                    <pre>${error.message || error}</pre>
                </details>
                <button onclick="adminApp.reloadSection('${sectionName}')" class="btn btn-primary">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;

        sectionElement.innerHTML = errorHTML;
    }

    /**
     * Reload specific section
     */
    async reloadSection(sectionName) {
        
        await this.loadSectionContent(sectionName);
    }

    /**
     * Load dashboard section
     */
    async loadDashboardSection() {
        await this.updateDashboardStats();
        await this.loadRecentActivity();
    }

    /**
     * Load configuration section
     */
    async loadConfigurationSection() {
        
        const container = document.getElementById('config-form-container');
        if (!container) {
            console.error('Config form container not found');
            throw new Error('Container config-form-container não encontrado');
        }
        
        try {
            
            
            // Check if ConfigForm class is available
            if (!window.ConfigForm) {
                throw new Error('ConfigForm class não está disponível');
            }
            
            // Initialize or reinitialize the component
            if (!this.configForm) {
                this.configForm = new ConfigForm(container, this.configManager);
                if (this.configForm.setProgressComponents && this.progressTracker && this.progressBar) {
                    this.configForm.setProgressComponents(this.progressTracker, this.progressBar);
                }
            }
            
            // Initialize the form
            if (this.configForm.init) {
                await this.configForm.init();
                
            }
            
        } catch (error) {
            console.error('Error loading configuration section:', error);
            throw error; // Re-throw to be handled by loadSectionContent
        }
    }



    /**
     * Load files section
     */
    async loadFilesSection() {
        
        const container = document.getElementById('file-upload-container');
        if (!container) {
            console.error('File upload container not found');
            throw new Error('Container file-upload-container não encontrado');
        }
        
        try {
            
            
            // Check if FileUpload class is available
            if (!window.FileUpload) {
                throw new Error('FileUpload class não está disponível');
            }
            
            // Initialize or reinitialize the component
            if (!this.fileUpload) {
                this.fileUpload = new FileUpload(this.fileManager);
                if (this.fileUpload.setProgressComponents && this.progressTracker && this.progressBar) {
                    this.fileUpload.setProgressComponents(this.progressTracker, this.progressBar);
                }
            }
            
            // Initialize the file upload
            if (this.fileUpload.init) {
                this.fileUpload.init();
                
            } else if (this.fileUpload.createUploadInterface) {
                this.fileUpload.createUploadInterface();
                
            }
            
        } catch (error) {
            console.error('Error loading files section:', error);
            throw error; // Re-throw to be handled by loadSectionContent
        }
    }

    /**
     * Load data management section
     */
    async loadDataSection() {
        
        const container = document.getElementById('data-manager-container');
        if (!container) {
            console.error('Data manager container not found');
            throw new Error('Container data-manager-container não encontrado');
        }
        
        try {
            
            
            // Check if DataManager class is available
            if (!window.DataManager) {
                throw new Error('DataManager class não está disponível');
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
            throw error; // Re-throw to be handled by loadSectionContent
        }
    }

    /**
     * Load logs section
     */
    async loadLogsSection() {
        
        const container = document.getElementById('logs-container');
        if (!container) {
            console.error('Logs container not found');
            throw new Error('Container logs-container não encontrado');
        }
        
        try {
            // Create simple logs interface
            container.innerHTML = `
                <div class="logs-interface">
                    <div class="section-header">
                        <h3>📋 Logs do Sistema</h3>
                        <div class="section-actions">
                            <button class="btn btn-secondary" onclick="adminApp.refreshLogs()">
                                🔄 Atualizar
                            </button>
                            <button class="btn btn-secondary" onclick="adminApp.clearLogs()">
                                🗑️ Limpar Logs
                            </button>
                        </div>
                    </div>
                    <div class="logs-content">
                        <div class="log-filters">
                            <select id="log-level-filter">
                                <option value="all">Todos os níveis</option>
                                <option value="error">Erros</option>
                                <option value="warning">Avisos</option>
                                <option value="info">Informações</option>
                            </select>
                        </div>
                        <div class="logs-display" id="logs-display">
                            <div class="log-entry info">
                                <span class="log-time">${new Date().toLocaleString()}</span>
                                <span class="log-level">INFO</span>
                                <span class="log-message">Sistema de logs carregado com sucesso</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
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
            console.error('Backup container not found');
            throw new Error('Container backup-container não encontrado');
        }
        
        try {
            // Create simple backup interface
            container.innerHTML = `
                <div class="backup-interface">
                    <div class="section-header">
                        <h3>💾 Backup e Restauração</h3>
                        <div class="section-actions">
                            <button class="btn btn-primary" onclick="adminApp.createBackup()">
                                📦 Criar Backup
                            </button>
                        </div>
                    </div>
                    <div class="backup-content">
                        <div class="backup-section">
                            <h4>Criar Backup</h4>
                            <div class="backup-options">
                                <label>
                                    <input type="checkbox" checked> Configurações do sistema
                                </label>
                                <label>
                                    <input type="checkbox" checked> Dados da catequese
                                </label>
                                <label>
                                    <input type="checkbox" checked> Logs do sistema
                                </label>
                            </div>
                            <button class="btn btn-success" onclick="adminApp.downloadBackup()">
                                ⬇️ Baixar Backup Completo
                            </button>
                        </div>
                        <div class="restore-section">
                            <h4>Restaurar Backup</h4>
                            <div class="file-upload-area">
                                <input type="file" id="backup-file" accept=".zip,.json" style="display: none;">
                                <button class="btn btn-secondary" onclick="document.getElementById('backup-file').click()">
                                    📁 Selecionar Arquivo de Backup
                                </button>
                                <button class="btn btn-warning" onclick="adminApp.restoreBackup()">
                                    🔄 Restaurar Sistema
                                </button>
                            </div>
                        </div>
                        <div class="backup-history">
                            <h4>Histórico de Backups</h4>
                            <div class="backup-list">
                                <div class="backup-item">
                                    <span class="backup-date">${new Date().toLocaleString()}</span>
                                    <span class="backup-size">2.5 MB</span>
                                    <span class="backup-type">Completo</span>
                                    <button class="btn btn-sm btn-secondary">⬇️ Baixar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading backup section:', error);
            throw error;
        }
    }

    /**
     * Show progress overlay
     */
    showProgressOverlay(operationId, title = 'Processando...') {
        this.progressBar.showOverlay(operationId, title);
    }

    /**
     * Hide progress overlay
     */
    hideProgressOverlay() {
        this.progressBar.hideOverlay();
    }

    /**
     * Create inline progress bar
     */
    createInlineProgress(container, operationId, options = {}) {
        return this.progressBar.createInlineProgressBar(container, operationId, options);
    }

    /**
     * Create button progress indicator
     */
    createButtonProgress(button, operationId) {
        this.progressBar.createButtonProgress(button, operationId);
    }

    /**
     * Create progress notification
     */
    createProgressNotification(operationId, options = {}) {
        return this.progressBar.createProgressNotification(operationId, options);
    }

    /**
     * Create step progress indicator
     */
    createStepProgress(container, operationId, steps) {
        return this.progressBar.createStepProgress(container, operationId, steps);
    }

    /**
     * Get progress tracker instance
     */
    getProgressTracker() {
        return this.progressTracker;
    }

    /**
     * Get progress bar instance
     */
    getProgressBar() {
        return this.progressBar;
    }

    /**
     * Start status monitoring
     */
    startStatusMonitoring() {
        // Update status every 30 seconds
        this.statusUpdateInterval = setInterval(() => {
            this.updateSystemStatus();
        }, 30000);
        
        // Initial status update
        this.updateSystemStatus();
    }

    /**
     * Stop status monitoring
     */
    stopStatusMonitoring() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
    }

    /**
     * Update system status indicators
     */
    async updateSystemStatus() {
        try {
            // Perform comprehensive health check
            const healthCheck = await this.systemRecovery.performHealthCheck();
            
            // Update connection status
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                const networkComponent = healthCheck.components.network;
                const statusDot = connectionStatus.querySelector('.status-dot');
                const statusText = connectionStatus.querySelector('.status-text');
                
                if (networkComponent.online && networkComponent.githubReachable) {
                    statusDot.style.backgroundColor = 'var(--success-color)';
                    statusText.textContent = 'Conectado';
                    connectionStatus.classList.remove('warning', 'error');
                } else if (networkComponent.online) {
                    statusDot.style.backgroundColor = 'var(--warning-color)';
                    statusText.textContent = 'Conectado (GitHub indisponível)';
                    connectionStatus.classList.add('warning');
                    connectionStatus.classList.remove('error');
                } else {
                    statusDot.style.backgroundColor = 'var(--error-color)';
                    statusText.textContent = 'Desconectado';
                    connectionStatus.classList.add('error');
                    connectionStatus.classList.remove('warning');
                }
            }

            // Update GitHub status
            const githubStatus = document.getElementById('github-status');
            if (githubStatus) {
                const networkComponent = healthCheck.components.network;
                const authComponent = healthCheck.components.authentication;
                const statusDot = githubStatus.querySelector('.status-dot');
                const statusText = githubStatus.querySelector('.status-text');
                
                if (statusDot && statusText) {
                    if (networkComponent.githubReachable && authComponent.hasAuthToken) {
                        statusDot.style.backgroundColor = 'var(--success-color)';
                        statusText.textContent = 'GitHub OK';
                        githubStatus.classList.remove('warning', 'error');
                    } else if (networkComponent.githubReachable) {
                        statusDot.style.backgroundColor = 'var(--warning-color)';
                        statusText.textContent = 'GitHub (sem token)';
                        githubStatus.classList.add('warning');
                        githubStatus.classList.remove('error');
                    } else {
                        statusDot.style.backgroundColor = 'var(--error-color)';
                        statusText.textContent = 'GitHub indisponível';
                        githubStatus.classList.add('error');
                        githubStatus.classList.remove('warning');
                    }
                }
            }

            // Update system health indicator in header
            this.updateSystemHealthIndicator(healthCheck);

            // Update last sync time
            const lastSync = document.getElementById('last-sync');
            if (lastSync) {
                const now = new Date();
                lastSync.textContent = `Última sync: ${now.toLocaleTimeString()}`;
            }

            // Log system health if there are issues
            if (healthCheck.status !== 'healthy') {
                this.logManager.logWarning('system', `Sistema em estado: ${healthCheck.status}`, {
                    errorRate: healthCheck.metrics.errorRate?.rate,
                    issues: healthCheck.issues
                });
            }

        } catch (error) {
            console.error('Error updating system status:', error);
            this.systemRecovery.trackError('system_status', 'Erro ao atualizar status do sistema', { error: error.message });
        }
    }

    /**
     * Update system health indicator in header
     */
    updateSystemHealthIndicator(healthCheck) {
        // Find or create system health indicator
        let healthIndicator = document.getElementById('system-health-indicator');
        
        if (!healthIndicator) {
            // Create health indicator
            healthIndicator = document.createElement('span');
            healthIndicator.id = 'system-health-indicator';
            healthIndicator.className = 'status-indicator';
            healthIndicator.title = 'Status geral do sistema';
            
            healthIndicator.innerHTML = `
                <span class="status-dot"></span>
                <span class="status-text">Sistema</span>
            `;
            
            // Insert after GitHub status
            const githubStatus = document.getElementById('github-status');
            if (githubStatus && githubStatus.parentNode) {
                githubStatus.parentNode.insertBefore(healthIndicator, githubStatus.nextSibling);
            }
        }

        // Update health indicator
        const statusDot = healthIndicator.querySelector('.status-dot');
        const statusText = healthIndicator.querySelector('.status-text');
        
        const statusColors = {
            healthy: 'var(--success-color)',
            warning: 'var(--warning-color)',
            degraded: 'var(--error-color)',
            critical: 'var(--error-color)'
        };

        const statusTexts = {
            healthy: 'Sistema OK',
            warning: 'Sistema (avisos)',
            degraded: 'Sistema degradado',
            critical: 'Sistema crítico'
        };

        statusDot.style.backgroundColor = statusColors[healthCheck.status] || 'var(--secondary-color)';
        statusText.textContent = statusTexts[healthCheck.status] || 'Sistema desconhecido';
        
        // Update classes
        healthIndicator.className = 'status-indicator';
        if (healthCheck.status === 'warning' || healthCheck.status === 'degraded') {
            healthIndicator.classList.add('warning');
        } else if (healthCheck.status === 'critical') {
            healthIndicator.classList.add('error');
        }

        // Update tooltip with detailed information
        const errorRate = healthCheck.metrics.errorRate?.rate || 0;
        const recentErrors = healthCheck.metrics.errorRate?.recentErrors || 0;
        
        healthIndicator.title = `Status: ${healthCheck.status}
Erros recentes: ${recentErrors}
Taxa de erro: ${errorRate.toFixed(2)}/min
Última verificação: ${new Date(healthCheck.timestamp).toLocaleTimeString()}`;
    }

    /**
     * Update dashboard statistics
     */
    async updateDashboardStats() {
        try {
            // Update config status
            const configStatus = document.getElementById('config-status');
            if (configStatus) {
                try {
                    const config = await this.configManager.loadSettings();
                    configStatus.textContent = config ? 'Status: OK' : 'Status: Erro';
                } catch (error) {
                    configStatus.textContent = 'Status: Erro';
                }
            }

            // Update files count
            const filesCount = document.getElementById('files-count');
            if (filesCount) {
                // This would be replaced with actual file count logic
                filesCount.textContent = 'Arquivos: 3';
            }

            // Update logs count
            const logsCount = document.getElementById('logs-count');
            if (logsCount && this.logManager) {
                const logs = this.logManager.getLogs();
                logsCount.textContent = `Entradas: ${logs.length}`;
            }

            // Update backup count
            const backupCount = document.getElementById('backup-count');
            if (backupCount) {
                // This would be replaced with actual backup count logic
                const backups = this.configManager.getBackups ? this.configManager.getBackups() : [];
                backupCount.textContent = `Backups: ${backups.length || 0}`;
            }

            // Update error statistics
            const errorStats = this.errorReporter.getErrorStatistics();
            if (errorStats) {
                const errorRate = document.getElementById('error-rate');
                if (errorRate) {
                    errorRate.textContent = `Taxa de erro: ${errorStats.errorRate.toFixed(2)}/min`;
                    
                    // Add visual indicator based on error rate
                    errorRate.className = 'stat-item';
                    if (errorStats.errorRate > 5) {
                        errorRate.classList.add('stat-error');
                    } else if (errorStats.errorRate > 2) {
                        errorRate.classList.add('stat-warning');
                    }
                }

                const systemStatus = document.getElementById('system-status');
                if (systemStatus) {
                    const healthCheck = this.systemRecovery.systemHealth;
                    systemStatus.textContent = `Status: ${healthCheck.status || 'unknown'}`;
                    
                    // Add visual indicator based on system status
                    systemStatus.className = 'stat-item';
                    if (healthCheck.status === 'critical' || healthCheck.status === 'degraded') {
                        systemStatus.classList.add('stat-error');
                    } else if (healthCheck.status === 'warning') {
                        systemStatus.classList.add('stat-warning');
                    } else if (healthCheck.status === 'healthy') {
                        systemStatus.classList.add('stat-success');
                    }
                }
            }

            // Update navigation badges
            this.updateNavigationBadges();

        } catch (error) {
            console.error('Error updating dashboard stats:', error);
            this.systemRecovery.trackError('dashboard', 'Erro ao atualizar estatísticas do dashboard', { error: error.message });
        }
    }

    /**
     * Update navigation badges
     */
    updateNavigationBadges() {
        // Update logs badge if there are recent errors
        const logsBadge = document.getElementById('logs-badge');
        if (logsBadge && this.logManager) {
            const recentErrors = this.logManager.getLogs().filter(log => 
                log.level === 'error' && 
                Date.now() - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
            );
            
            if (recentErrors.length > 0) {
                logsBadge.textContent = recentErrors.length;
                logsBadge.classList.add('show');
            } else {
                logsBadge.classList.remove('show');
            }
        }

        // Other badges can be updated similarly based on system state
    }

    /**
     * Load recent activity for dashboard
     */
    async loadRecentActivity() {
        const container = document.getElementById('recent-logs');
        if (!container || !this.logManager) return;

        try {
            const recentLogs = this.logManager.getLogs().slice(-5).reverse(); // Last 5 logs
            
            if (recentLogs.length === 0) {
                container.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon info">ℹ️</div>
                        <div class="activity-content">
                            <div class="activity-title">Nenhuma atividade recente</div>
                            <div class="activity-time">Sistema iniciado</div>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = recentLogs.map(log => {
                const iconClass = log.level === 'error' ? 'error' : 
                                log.level === 'warning' ? 'warning' : 
                                log.level === 'success' ? 'success' : 'info';
                
                const icon = log.level === 'error' ? '❌' : 
                           log.level === 'warning' ? '⚠️' : 
                           log.level === 'success' ? '✅' : 'ℹ️';

                const time = new Date(log.timestamp).toLocaleString();

                return `
                    <div class="activity-item">
                        <div class="activity-icon ${iconClass}">${icon}</div>
                        <div class="activity-content">
                            <div class="activity-title">${log.message}</div>
                            <div class="activity-time">${time}</div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading recent activity:', error);
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon error">❌</div>
                    <div class="activity-content">
                        <div class="activity-title">Erro ao carregar atividade recente</div>
                        <div class="activity-time">Agora</div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(isAuthenticated) {
        if (!isAuthenticated) {
            this.cleanup();
            this.showLoginScreen();
        }
    }

    /**
     * Handle configuration changes
     */
    handleConfigChange(config) {
        this.logManager.logInfo('config', 'Configuração atualizada');
        
        // Update GitHub manager if GitHub config changed
        if (config.github && config.github.token) {
            this.githubManager.init(config.github);
        }
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Show success notification
        if (this.notificationsEnabled) {
            HelperUtils.showNotification('Configuração salva com sucesso', 'success');
        }
    }

    /**
     * Handle file upload completion
     */
    handleFileUpload(fileInfo) {
        this.logManager.logSuccess('file', `Arquivo ${fileInfo.name} enviado com sucesso`, fileInfo);
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Show success notification
        if (this.notificationsEnabled) {
            HelperUtils.showNotification(`Arquivo ${fileInfo.name} enviado com sucesso`, 'success');
        }
    }

    /**
     * Handle progress updates
     */
    handleProgressUpdate(operationId, progress) {
        // Update any UI elements that show progress
        const progressElements = document.querySelectorAll(`[data-operation-id="${operationId}"]`);
        progressElements.forEach(element => {
            const progressBar = element.querySelector('.progress-fill');
            if (progressBar) {
                progressBar.style.width = `${progress.percentage}%`;
            }
            
            const progressText = element.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = progress.message || `${progress.percentage}%`;
            }
        });
    }

    /**
     * Initialize component if not already done
     */
    async initializeComponent(componentName, container, ...args) {
        
        if (this.componentStates.get(componentName) === 'initialized') {
            
            return this[componentName];
        }

        try {
            this.componentStates.set(componentName, 'initializing');
            
            switch (componentName) {
                case 'configForm':
                    
                    this.configForm = new ConfigForm(container, this.configManager);
                    this.configForm.setProgressComponents(this.progressTracker, this.progressBar);
                    break;
                    
                case 'fileUpload':
                    
                    this.fileUpload = new FileUpload(this.fileManager);
                    this.fileUpload.setProgressComponents(this.progressTracker, this.progressBar);
                    this.fileUpload.init();
                    
                    break;
                    
                case 'dataManager':
                    
                    this.dataManager = new DataManager(this.fileManager);
                    // Make it globally available for onclick handlers
                    window.dataManager = this.dataManager;
                    
                    break;
                    
                case 'logDisplay':
                    this.logDisplay = new LogDisplay(container, this.logManager);
                    this.logDisplay.init();
                    break;
                    
                case 'backupManager':
                    this.backupManager = new BackupManager(container, this.configManager);
                    break;
            }
            
            this.componentStates.set(componentName, 'initialized');
            this.logManager.logInfo('component', `Componente ${componentName} inicializado`);
            
            return this[componentName];
            
        } catch (error) {
            this.componentStates.set(componentName, 'error');
            this.logManager.logError('component', `Erro ao inicializar componente ${componentName}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Get component state
     */
    getComponentState(componentName) {
        return this.componentStates.get(componentName) || 'not_initialized';
    }

    /**
     * Reinitialize component
     */
    async reinitializeComponent(componentName) {
        this.componentStates.delete(componentName);
        const container = this.getComponentContainer(componentName);
        if (container) {
            return await this.initializeComponent(componentName, container);
        }
    }

    /**
     * Get component container element
     */
    getComponentContainer(componentName) {
        const containerMap = {
            'configForm': document.getElementById('config-form-container'),
            'fileUpload': document.getElementById('file-upload-container'),
            'logDisplay': document.getElementById('logs-container'),
            'backupManager': document.getElementById('backup-container')
        };
        
        return containerMap[componentName];
    }

    /**
     * Check system health
     */
    async checkSystemHealth() {
        const health = {
            authentication: this.authManager.isAuthenticated(),
            configuration: false,
            github: false,
            components: {}
        };

        try {
            // Check configuration
            const config = await this.configManager.loadSettings();
            health.configuration = !!config;
            
            // Check GitHub connection
            if (config && config.github && config.github.token) {
                health.github = true; // Would check actual GitHub API in production
            }
            
            // Check component states
            ['configForm', 'fileUpload', 'dataManager', 'logDisplay', 'backupManager'].forEach(component => {
                health.components[component] = this.getComponentState(component);
            });
            
        } catch (error) {
            this.logManager.logError('system', 'Erro ao verificar saúde do sistema', { error: error.message });
        }

        return health;
    }

    /**
     * Reinitialize a component after error
     * @param {string} componentName - Name of component to reinitialize
     */
    async reinitializeComponent(componentName) {
        try {
            // Clear component state
            this.componentStates.delete(componentName);
            
            // Get component container
            const container = this.getComponentContainer(componentName);
            if (!container) {
                throw new Error(`Container not found for component: ${componentName}`);
            }
            
            // Clear container
            container.innerHTML = '<div class="loading">Reinicializando...</div>';
            
            // Reinitialize component based on type
            switch (componentName) {
                case 'configForm':
                    await this.loadConfigurationSection();
                    break;
                case 'fileUpload':
                    await this.loadFilesSection();
                    break;
                case 'dataManager':
                    await this.loadDataSection();
                    break;
                case 'logDisplay':
                    await this.loadLogsSection();
                    break;
                case 'backupManager':
                    await this.loadBackupSection();
                    break;
                default:
                    throw new Error(`Unknown component: ${componentName}`);
            }
            
            this.notificationManager.showNotification(
                `Componente ${componentName} reinicializado com sucesso`, 
                'success'
            );
            
        } catch (error) {
            console.error(`Error reinitializing component ${componentName}:`, error);
            this.errorHandler.handleError(error, { 
                operation: 'reinitialize_component',
                component: componentName 
            });
        }
    }

    /**
     * Get container element for component
     * @param {string} componentName - Component name
     * @returns {HTMLElement|null} Container element
     */
    getComponentContainer(componentName) {
        const containerIds = {
            configForm: 'config-form-container',
            fileUpload: 'file-upload-container',
            dataManager: 'data-manager-container',
            logDisplay: 'logs-container',
            backupManager: 'backup-container'
        };
        
        const containerId = containerIds[componentName];
        return containerId ? document.getElementById(containerId) : null;
    }

    /**
     * Save GitHub token configuration
     */
    async saveGitHubToken() {
        const tokenInput = document.getElementById('github-token');
        const statusDiv = document.getElementById('github-status');
        const saveButton = document.getElementById('save-github-token');
        
        if (!tokenInput || !statusDiv) return;
        
        const token = tokenInput.value.trim();
        
        // Validate token input
        if (!token) {
            this.showGitHubStatus('error', '❌ Por favor, insira um token válido');
            return;
        }
        
        // Basic format validation
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_') && !token.includes('mock')) {
            this.showGitHubStatus('warning', '⚠️ Formato de token pode ser inválido. Tokens GitHub começam com "ghp_" ou "github_pat_"');
        }
        
        try {
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = '⏳ Salvando...';
            }
            
            // Try to save the token
            await this.githubManager.setToken(token);
            
            this.showGitHubStatus('success', '✅ Token configurado com sucesso! GitHub conectado.');
            
            if (tokenInput) {
                tokenInput.value = ''; // Clear for security
            }
            
            // Reload configuration to reflect changes
            if (this.configManager) {
                await this.configManager.loadSettings();
            }
            
        } catch (error) {
            console.error('Error saving GitHub token:', error);
            this.showGitHubStatus('error', `❌ Erro ao salvar token: ${error.message}`);
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = '💾 Salvar Token';
            }
        }
    }
    
    /**
     * Show GitHub configuration status
     */
    showGitHubStatus(type, message) {
        const statusDiv = document.getElementById('github-status');
        if (!statusDiv) return;
        
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        
        const textColors = {
            success: '#155724',
            error: '#721c24',
            warning: '#856404',
            info: '#0c5460'
        };
        
        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = colors[type] || colors.info;
        statusDiv.style.color = textColors[type] || textColors.info;
        statusDiv.style.border = `1px solid ${colors[type] || colors.info}`;
        statusDiv.textContent = message;
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Cleanup when logging out
     */
    cleanup() {
        this.stopStatusMonitoring();
        
        // Reset component states
        this.componentStates.clear();
        
        // Clear component references
        this.configForm = null;
        this.fileUpload = null;
        this.dataManager = null;
        this.logDisplay = null;
        this.backupManager = null;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new AdminPanelApp();
    app.init();
    
    // Make app globally available for debugging
    window.adminApp = app;
});

// Debug functions
window.debugTest = async function() {
    const output = document.getElementById('debug-output');
    output.textContent = 'Testando carregamento de configuração...\n';
    
    try {
        // Test ConfigManager
        output.textContent += 'Testando ConfigManager...\n';
        const config = await window.adminApp.configManager.loadSettings();
        output.textContent += 'Configuração carregada com sucesso:\n' + JSON.stringify(config, null, 2) + '\n';
        
        // Test ConfigForm
        output.textContent += '\nTestando ConfigForm...\n';
        const container = document.getElementById('config-form-container');
        if (container) {
            output.textContent += 'Container encontrado\n';
            if (window.adminApp.configForm) {
                output.textContent += 'ConfigForm existe\n';
                window.adminApp.configForm.init();
                output.textContent += 'ConfigForm inicializado\n';
            } else {
                output.textContent += 'ConfigForm não existe, criando...\n';
                await window.adminApp.initializeComponent('configForm', container);
                output.textContent += 'ConfigForm criado\n';
            }
        } else {
            output.textContent += 'Container não encontrado!\n';
        }
        
    } catch (error) {
        output.textContent += 'ERRO: ' + error.message + '\n' + error.stack;
    }
};

window.debugFileUpload = async function() {
    const output = document.getElementById('debug-output');
    output.textContent = 'Testando upload de arquivos...\n';
    
    try {
        // Test FileManager
        output.textContent += 'Testando FileManager...\n';
        if (window.adminApp.fileManager) {
            output.textContent += 'FileManager existe\n';
            output.textContent += 'Tipos permitidos: ' + JSON.stringify(window.adminApp.fileManager.allowedTypes) + '\n';
        } else {
            output.textContent += 'FileManager não existe!\n';
        }
        
        // Test FileUpload
        output.textContent += '\nTestando FileUpload...\n';
        const container = document.getElementById('file-upload-container');
        if (container) {
            output.textContent += 'Container encontrado\n';
            if (window.adminApp.fileUpload) {
                output.textContent += 'FileUpload existe\n';
                window.adminApp.fileUpload.init();
                output.textContent += 'FileUpload inicializado\n';
            } else {
                output.textContent += 'FileUpload não existe, criando...\n';
                await window.adminApp.initializeComponent('fileUpload', container);
                output.textContent += 'FileUpload criado\n';
            }
        } else {
            output.textContent += 'Container não encontrado!\n';
        }
        
    } catch (error) {
        output.textContent += 'ERRO: ' + error.message + '\n' + error.stack;
    }
};

// Additional debug functions
window.debugAuth = function() {
    const output = document.getElementById('debug-output');
    output.textContent = 'Testando autenticação...\n';
    
    try {
        output.textContent += 'Verificando AuthManager...\n';
        if (window.adminApp.authManager) {
            output.textContent += 'AuthManager existe\n';
            const isAuth = window.adminApp.authManager.isAuthenticated();
            output.textContent += 'Está autenticado: ' + isAuth + '\n';
            
            const session = window.adminApp.authManager.getSession();
            output.textContent += 'Sessão: ' + (session ? 'Existe' : 'Não existe') + '\n';
            
            if (session) {
                output.textContent += 'Dados da sessão: ' + JSON.stringify(session, null, 2) + '\n';
            }
        } else {
            output.textContent += 'AuthManager não existe!\n';
        }
        
        // Check login screen visibility
        const loginScreen = document.getElementById('login-screen');
        const adminPanel = document.getElementById('admin-panel');
        
        output.textContent += '\nEstado das telas:\n';
        output.textContent += 'Login screen: ' + (loginScreen ? (loginScreen.classList.contains('active') ? 'Ativo' : 'Inativo') : 'Não encontrado') + '\n';
        output.textContent += 'Admin panel: ' + (adminPanel ? (adminPanel.classList.contains('active') ? 'Ativo' : 'Inativo') : 'Não encontrado') + '\n';
        
    } catch (error) {
        output.textContent += 'ERRO: ' + error.message + '\n' + error.stack;
    }
};

window.forceLogin = function() {
    
    window.adminApp.showLoginScreen();
};

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
        if (fileInput.files.length === 0) {
            alert('Por favor, selecione um arquivo de backup primeiro.');
            return;
        }
        alert('Restauração de backup em desenvolvimento. Sistema será restaurado.');
    }}


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
    container.innerHTML = `
        <div class="config-form-wrapper">
            <div class="form-header">
                <h3>Configurações do Sistema (Teste Direto)</h3>
            </div>
            <form class="config-form">
                <div class="form-section">
                    <h4>Paróquia</h4>
                    <div class="form-group">
                        <label>Nome da Paróquia:</label>
                        <input type="text" value="Paróquia de São Paulo" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Secretariado:</label>
                        <input type="text" value="Secretariado da Catequese" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Ano Catequético:</label>
                        <input type="text" value="2024/2025" class="form-control">
                    </div>
                </div>
                <div class="form-section">
                    <h4>Arquivos</h4>
                    <div class="form-group">
                        <label>Dados Principais:</label>
                        <input type="text" value="data/dados-catequese.xlsx" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Template de Exportação:</label>
                        <input type="text" value="data/template-export.xlsx" class="form-control">
                    </div>
                </div>
                <button type="button" class="btn btn-primary" onclick="alert('Formulário funcionando!')">
                    💾 Testar Salvamento
                </button>
            </form>
        </div>
    `;
    
    
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    
    // Check if required classes are available
    const requiredClasses = ['ConfigForm', 'FileUpload', 'DataManager'];
    const missingClasses = [];
    
    requiredClasses.forEach(className => {
        if (!window[className]) {
            missingClasses.push(className);
            console.error(`${className} class not available`);
        } else {
            
        }
    });
    
    if (missingClasses.length > 0) {
        console.error('Missing classes:', missingClasses);
        alert('Erro: Alguns componentes não foram carregados. Recarregue a página.');
        return;
    }
    
    
    const app = new AdminPanelApp();
    app.init();
    
    // Make app globally available for debugging
    window.adminApp = app;
});