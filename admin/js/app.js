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
        
        // Security managers (initialized by AuthManager)
        this.tokenManager = null;
        this.securityManager = null;
        
        // UI Components (initialized later)
        this.configForm = null;
        this.fileUpload = null;
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
            if (this.authManager.isAuthenticated()) {
                await this.showAdminPanel();
            } else {
                this.showLoginScreen();
            }
            
            this.isInitialized = true;
            this.logManager.logSuccess('system', 'Painel administrativo inicializado com sucesso');
            console.log('Admin Panel initialized successfully');
            
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
                            console.log('Using fallback default configuration');
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
                            console.log(`Progress ${operationId}: ${progress}%`);
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
     * Show login screen
     */
    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('admin-panel').classList.remove('active');
        
        // Focus on username field
        const usernameField = document.getElementById('username');
        if (usernameField) {
            setTimeout(() => usernameField.focus(), 100);
        }
    }

    /**
     * Show admin panel
     */
    async showAdminPanel() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('admin-panel').classList.add('active');
        
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
    showSection(sectionName) {
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
        this.loadSectionContent(sectionName);
        
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
            case 'logs':
                await this.loadLogsSection();
                break;
            case 'backup':
                await this.loadBackupSection();
                break;
        }
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
        if (!container) return;
        
        try {
            await this.initializeComponent('configForm', container);
            
            // Reload the form if it already exists
            if (this.configForm && this.configForm.init) {
                this.configForm.init();
            }
        } catch (error) {
            console.error('Error loading configuration section:', error);
            
            // Use comprehensive error handling with fallback UI
            const errorResult = this.errorHandler.handleError(error, { 
                operation: 'load_config_section' 
            });
            
            container.innerHTML = this.errorHandler.generateFallbackUI(errorResult, {
                title: 'Erro ao carregar configurações',
                showRetry: true,
                customActions: [{
                    label: 'Reinicializar Componente',
                    onclick: 'adminApp.reinitializeComponent("configForm")'
                }]
            });
        }
    }



    /**
     * Load files section
     */
    async loadFilesSection() {
        const container = document.getElementById('file-upload-container');
        if (!container) return;
        
        try {
            await this.initializeComponent('fileUpload', container);
        } catch (error) {
            console.error('Error loading files section:', error);
            
            // Use comprehensive error handling with fallback UI
            const errorResult = this.errorHandler.handleError(error, { 
                operation: 'load_files_section' 
            });
            
            container.innerHTML = this.errorHandler.generateFallbackUI(errorResult, {
                title: 'Erro ao carregar gerenciamento de arquivos',
                showRetry: true,
                customActions: [{
                    label: 'Reinicializar Componente',
                    onclick: 'adminApp.reinitializeComponent("fileUpload")'
                }]
            });
        }
    }

    /**
     * Load logs section
     */
    async loadLogsSection() {
        const container = document.getElementById('logs-container');
        if (!container) return;
        
        try {
            await this.initializeComponent('logDisplay', container);
        } catch (error) {
            console.error('Error loading logs section:', error);
            
            // Use comprehensive error handling with fallback UI
            const errorResult = this.errorHandler.handleError(error, { 
                operation: 'load_logs_section' 
            });
            
            container.innerHTML = this.errorHandler.generateFallbackUI(errorResult, {
                title: 'Erro ao carregar logs do sistema',
                showRetry: true,
                customActions: [{
                    label: 'Reinicializar Componente',
                    onclick: 'adminApp.reinitializeComponent("logDisplay")'
                }]
            });
        }
    }

    /**
     * Load backup section
     */
    async loadBackupSection() {
        const container = document.getElementById('backup-container');
        if (!container) return;
        
        try {
            await this.initializeComponent('backupManager', container);
            
            // Initialize if it has an init method
            if (this.backupManager && this.backupManager.init) {
                this.backupManager.init();
            }
        } catch (error) {
            console.error('Error loading backup section:', error);
            
            // Use comprehensive error handling with fallback UI
            const errorResult = this.errorHandler.handleError(error, { 
                operation: 'load_backup_section' 
            });
            
            container.innerHTML = this.errorHandler.generateFallbackUI(errorResult, {
                title: 'Erro ao carregar backup e restauração',
                showRetry: true,
                customActions: [{
                    label: 'Reinicializar Componente',
                    onclick: 'adminApp.reinitializeComponent("backupManager")'
                }]
            });
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
            // Update connection status
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                const isOnline = navigator.onLine;
                const statusDot = connectionStatus.querySelector('.status-dot');
                const statusText = connectionStatus.querySelector('.status-text');
                
                if (isOnline) {
                    statusDot.style.backgroundColor = 'var(--success-color)';
                    statusText.textContent = 'Conectado';
                    connectionStatus.classList.remove('warning', 'error');
                } else {
                    statusDot.style.backgroundColor = 'var(--error-color)';
                    statusText.textContent = 'Desconectado';
                    connectionStatus.classList.add('error');
                }
            }

            // Update GitHub status
            const githubStatus = document.getElementById('github-status');
            if (githubStatus && this.githubManager) {
                try {
                    // Simple check - this would be replaced with actual GitHub API call
                    const statusDot = githubStatus.querySelector('.status-dot');
                    const statusText = githubStatus.querySelector('.status-text');
                    
                    statusDot.style.backgroundColor = 'var(--success-color)';
                    statusText.textContent = 'GitHub OK';
                    githubStatus.classList.remove('warning', 'error');
                } catch (error) {
                    const statusDot = githubStatus.querySelector('.status-dot');
                    const statusText = githubStatus.querySelector('.status-text');
                    
                    statusDot.style.backgroundColor = 'var(--error-color)';
                    statusText.textContent = 'GitHub Error';
                    githubStatus.classList.add('error');
                }
            }

            // Update last sync time
            const lastSync = document.getElementById('last-sync');
            if (lastSync) {
                const now = new Date();
                lastSync.textContent = `Última sync: ${now.toLocaleTimeString()}`;
            }

        } catch (error) {
            console.error('Error updating system status:', error);
        }
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

            // Update navigation badges
            this.updateNavigationBadges();

        } catch (error) {
            console.error('Error updating dashboard stats:', error);
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
            ['configForm', 'fileUpload', 'logDisplay', 'backupManager'].forEach(component => {
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
        
        if (!token) {
            this.showGitHubStatus('error', 'Por favor, insira um token válido');
            return;
        }
        
        // Validate token format
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            this.showGitHubStatus('warning', 'Formato de token inválido. Deve começar com "ghp_" ou "github_pat_"');
            return;
        }
        
        try {
            saveButton.disabled = true;
            saveButton.textContent = '⏳ Salvando...';
            
            // Configure GitHub manager
            await this.githubManager.setToken(token);
            
            // Test connection
            const isConfigured = this.githubManager.isConfigured();
            
            if (isConfigured) {
                this.showGitHubStatus('success', '✅ Token configurado com sucesso! GitHub conectado.');
                tokenInput.value = ''; // Clear for security
                
                // Reload configuration to reflect changes
                if (this.configManager) {
                    await this.configManager.loadSettings();
                }
            } else {
                this.showGitHubStatus('error', '❌ Falha ao configurar token. Verifique se o token é válido.');
            }
            
        } catch (error) {
            console.error('Error saving GitHub token:', error);
            this.showGitHubStatus('error', `❌ Erro ao salvar token: ${error.message}`);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = '💾 Salvar Token';
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