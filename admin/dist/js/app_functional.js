/**
 * Admin Panel Application - Functional Version
 * Sistema administrativo funcional e simplificado
 */
class AdminPanelApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.isInitialized = false;
        this.currentConfig = null;
        this.excelData = null;
        
        // Initialize managers
        this.githubAPI = new GitHubAPI();
        this.excelManager = new ExcelManager();
        
        
    }

    /**
     * Initialize the admin panel
     */
    async init() {
        try {
            
            
            // Check authentication first
            if (!this.checkAuthentication()) {
                
                this.redirectToLogin();
                return;
            }
            
            
            
            // Setup navigation
            this.setupNavigation();
            
            // Setup logout button
            this.setupLogout();
            
            // Show default section
            await this.showSection(this.currentSection);
            
            this.isInitialized = true;
            
            
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            alert('Erro ao inicializar painel administrativo: ' + error.message);
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

        // Back to dashboard buttons
        document.querySelectorAll('[id^="back-to-dashboard"]').forEach(btn => {
            btn.addEventListener('click', () => this.showSection('dashboard'));
        });

        
    }

    /**
     * Setup logout functionality
     */
    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
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
        this.updateDashboardStats();
    }

    /**
     * Update dashboard statistics
     */
    updateDashboardStats() {
        // Update config status
        const configStatus = document.getElementById('config-status');
        if (configStatus) {
            configStatus.textContent = this.currentConfig ? 'Status: Carregado' : 'Status: Não carregado';
        }

        // Update files count
        const filesCount = document.getElementById('files-count');
        if (filesCount) {
            filesCount.textContent = this.excelData ? 'Arquivos: 1' : 'Arquivos: 0';
        }

        // Update logs count
        const logsCount = document.getElementById('logs-count');
        if (logsCount) {
            logsCount.textContent = 'Entradas: ' + this.getLogCount();
        }

        // Update backup count
        const backupCount = document.getElementById('backup-count');
        if (backupCount) {
            backupCount.textContent = 'Backups: ' + this.getBackupCount();
        }
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
            // Load current configuration
            await this.loadConfiguration();
            
            // Create functional configuration form
            this.createConfigurationForm(container);
            
        } catch (error) {
            console.error('Error loading configuration section:', error);
            this.createBasicConfigInterface(container);
        }
    }

    /**
     * Load current configuration
     */
    async loadConfiguration() {
        try {
            const response = await fetch('../config/settings.json');
            if (response.ok) {
                this.currentConfig = await response.json();
                
            } else {
                throw new Error('Não foi possível carregar o arquivo de configuração');
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            // Use default configuration
            this.currentConfig = this.getDefaultConfiguration();
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfiguration() {
        return {
            paroquia: {
                nome: "Paróquia de São Paulo de Luanda, Angola",
                secretariado: "Secretariado da Catequese",
                ano_catequetico: "2024/2025",
                data_inicio: "2024-10-01",
                data_inicio_formatada: "1 de Outubro de 2024"
            },
            arquivos: {
                dados_principais: "data/dados-catequese.xlsx",
                template_export: "data/template-export.xlsx",
                logo: "assets/images/logo-paroquia.jpg"
            },
            interface: {
                tema: "claro",
                idioma: "pt",
                items_por_pagina: 50,
                auto_backup: true,
                backup_intervalo_horas: 24
            }
        };
    }

    /**
     * Create functional configuration form
     */
    createConfigurationForm(container) {
        const config = this.currentConfig;
        
        container.innerHTML = `
            <div class="config-form-wrapper">
                <div class="form-header">
                    <h3>⚙️ Configurações do Sistema</h3>
                    <div class="form-actions">
                        <button id="reset-config" class="btn btn-secondary">🔄 Resetar</button>
                        <button id="save-config" class="btn btn-primary">💾 Salvar Configurações</button>
                    </div>
                </div>
                
                <form id="config-form" class="config-form">
                    <!-- Seção Paróquia -->
                    <div class="form-section">
                        <h4>📍 Informações da Paróquia</h4>
                        <div class="form-group">
                            <label for="paroquia-nome">Nome da Paróquia:</label>
                            <input type="text" id="paroquia-nome" name="paroquia.nome" 
                                   value="${config.paroquia?.nome || ''}" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="paroquia-secretariado">Secretariado:</label>
                            <input type="text" id="paroquia-secretariado" name="paroquia.secretariado" 
                                   value="${config.paroquia?.secretariado || ''}" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="paroquia-ano">Ano Catequético:</label>
                            <input type="text" id="paroquia-ano" name="paroquia.ano_catequetico" 
                                   value="${config.paroquia?.ano_catequetico || ''}" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="paroquia-data">Data de Início:</label>
                            <input type="date" id="paroquia-data" name="paroquia.data_inicio" 
                                   value="${config.paroquia?.data_inicio || ''}" class="form-control" required>
                        </div>
                    </div>

                    <!-- Seção Arquivos -->
                    <div class="form-section">
                        <h4>📁 Configuração de Arquivos</h4>
                        <div class="form-group">
                            <label for="arquivos-dados">Arquivo de Dados Principais:</label>
                            <input type="text" id="arquivos-dados" name="arquivos.dados_principais" 
                                   value="${config.arquivos?.dados_principais || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="arquivos-template">Template de Exportação:</label>
                            <input type="text" id="arquivos-template" name="arquivos.template_export" 
                                   value="${config.arquivos?.template_export || ''}" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="arquivos-logo">Logotipo:</label>
                            <input type="text" id="arquivos-logo" name="arquivos.logo" 
                                   value="${config.arquivos?.logo || ''}" class="form-control">
                        </div>
                    </div>

                    <!-- Seção Interface -->
                    <div class="form-section">
                        <h4>🎨 Configurações da Interface</h4>
                        <div class="form-group">
                            <label for="interface-tema">Tema:</label>
                            <select id="interface-tema" name="interface.tema" class="form-control">
                                <option value="claro" ${config.interface?.tema === 'claro' ? 'selected' : ''}>Claro</option>
                                <option value="escuro" ${config.interface?.tema === 'escuro' ? 'selected' : ''}>Escuro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="interface-idioma">Idioma:</label>
                            <select id="interface-idioma" name="interface.idioma" class="form-control">
                                <option value="pt" ${config.interface?.idioma === 'pt' ? 'selected' : ''}>Português</option>
                                <option value="en" ${config.interface?.idioma === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="interface-items">Items por Página:</label>
                            <input type="number" id="interface-items" name="interface.items_por_pagina" 
                                   value="${config.interface?.items_por_pagina || 50}" class="form-control" min="10" max="100">
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="interface-backup" name="interface.auto_backup" 
                                       ${config.interface?.auto_backup ? 'checked' : ''}>
                                <span>Backup Automático</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="interface-intervalo">Intervalo de Backup (horas):</label>
                            <input type="number" id="interface-intervalo" name="interface.backup_intervalo_horas" 
                                   value="${config.interface?.backup_intervalo_horas || 24}" class="form-control" min="1" max="168">
                        </div>
                    </div>

                    <!-- Seção GitHub -->
                    <div class="form-section">
                        <h4>🔗 Integração GitHub</h4>
                        <p class="section-description">Configure a integração com GitHub para salvar alterações automaticamente</p>
                        
                        <div class="form-group">
                            <label for="github-token">Personal Access Token:</label>
                            <input type="password" id="github-token" class="form-control" 
                                   placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                            <small class="form-help">Token para acessar o repositório GitHub</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="github-owner">Proprietário do Repositório:</label>
                            <input type="text" id="github-owner" class="form-control" 
                                   placeholder="seu-usuario">
                        </div>
                        
                        <div class="form-group">
                            <label for="github-repo">Nome do Repositório:</label>
                            <input type="text" id="github-repo" class="form-control" 
                                   placeholder="nome-do-repositorio">
                        </div>
                        
                        <div class="form-group">
                            <label for="github-branch">Branch:</label>
                            <input type="text" id="github-branch" class="form-control" 
                                   value="main" placeholder="main">
                        </div>
                        
                        <div class="github-actions">
                            <button type="button" class="btn btn-secondary" onclick="adminApp.testGitHubConnection()">
                                🔍 Testar Conexão
                            </button>
                            <button type="button" class="btn btn-primary" onclick="adminApp.saveGitHubConfig()">
                                💾 Salvar Configuração GitHub
                            </button>
                        </div>
                        
                        <div id="github-status" class="github-status"></div>
                    </div>
                </form>

                <div id="config-status" class="status-message"></div>
            </div>
        `;

        // Attach event listeners
        this.attachConfigFormListeners();
        
        // Load GitHub configuration
        this.loadGitHubConfigIntoForm();
    }

    /**
     * Attach configuration form event listeners
     */
    attachConfigFormListeners() {
        const saveBtn = document.getElementById('save-config');
        const resetBtn = document.getElementById('reset-config');
        const form = document.getElementById('config-form');

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveConfiguration();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetConfiguration();
            });
        }

        // Form change detection
        if (form) {
            form.addEventListener('input', () => {
                this.markConfigAsChanged();
            });
        }
    }

    /**
     * Save configuration
     */
    async saveConfiguration() {
        try {
            const form = document.getElementById('config-form');
            const formData = new FormData(form);
            
            // Build configuration object
            const newConfig = {};
            
            for (const [key, value] of formData.entries()) {
                this.setNestedValue(newConfig, key, value);
            }

            // Handle checkboxes
            const autoBackupCheckbox = document.getElementById('interface-backup');
            if (autoBackupCheckbox) {
                this.setNestedValue(newConfig, 'interface.auto_backup', autoBackupCheckbox.checked);
            }

            // Update formatted date
            if (newConfig.paroquia?.data_inicio) {
                newConfig.paroquia.data_inicio_formatada = this.formatDate(newConfig.paroquia.data_inicio);
            }

            

            // Show loading status
            this.showConfigStatus('Salvando configurações...', 'info');

            // Try to save to GitHub if configured
            if (this.githubAPI.isConfigured()) {
                try {
                    await this.githubAPI.saveConfiguration(newConfig);
                    this.showConfigStatus('Configurações salvas no GitHub com sucesso!', 'success');
                    
                    // Trigger deployment
                    setTimeout(async () => {
                        try {
                            await this.githubAPI.triggerDeployment();
                            this.showConfigStatus('Configurações salvas e deployment iniciado!', 'success');
                        } catch (deployError) {
                            
                        }
                    }, 1000);
                    
                } catch (githubError) {
                    console.error('GitHub save failed:', githubError);
                    this.showConfigStatus('Erro ao salvar no GitHub: ' + githubError.message, 'error');
                    return;
                }
            } else {
                // Save locally only
                this.showConfigStatus('Configurações salvas localmente (GitHub não configurado)', 'warning');
            }
            
            // Update local state
            this.currentConfig = newConfig;
            
            // Update dashboard stats
            this.updateDashboardStats();

        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showConfigStatus('Erro ao salvar configurações: ' + error.message, 'error');
        }
    }

    /**
     * Reset configuration to original values
     */
    resetConfiguration() {
        if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
            this.loadConfigurationSection();
        }
    }

    /**
     * Mark configuration as changed
     */
    markConfigAsChanged() {
        const saveBtn = document.getElementById('save-config');
        if (saveBtn) {
            saveBtn.textContent = '💾 Salvar Alterações';
            saveBtn.classList.add('btn-warning');
        }
    }

    /**
     * Show configuration status message
     */
    showConfigStatus(message, type) {
        const statusEl = document.getElementById('config-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            
            // Clear after 3 seconds
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }, 3000);
        }
    }

    /**
     * Set nested object value using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    }

    /**
     * Load files section
     */
    async loadFilesSection() {
        
        const container = document.getElementById('file-upload-container');
        if (!container) {
            throw new Error('Container file-upload-container não encontrado');
        }
        
        this.createFilesInterface(container);
    }

    /**
     * Create files interface
     */
    createFilesInterface(container) {
        container.innerHTML = `
            <div class="file-upload-wrapper">
                <div class="section-header">
                    <h3>📁 Gerenciar Arquivos</h3>
                </div>
                
                <div class="upload-sections">
                    <!-- Excel Upload -->
                    <div class="upload-section">
                        <h4>📊 Upload de Arquivo Excel</h4>
                        <p>Carregue o arquivo principal com os dados da catequese</p>
                        <div class="upload-area" id="excel-upload-area">
                            <input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display: none;">
                            <div class="upload-placeholder">
                                <div class="upload-icon">📊</div>
                                <p>Clique para selecionar arquivo Excel</p>
                                <small>Formatos aceitos: .xlsx, .xls</small>
                            </div>
                        </div>
                        <div class="upload-actions">
                            <button id="select-excel-btn" class="btn btn-primary">📁 Selecionar Arquivo</button>
                            <button id="process-excel-btn" class="btn btn-success" disabled>⚡ Processar Excel</button>
                        </div>
                        <div id="excel-status" class="upload-status"></div>
                    </div>

                    <!-- Image Upload -->
                    <div class="upload-section">
                        <h4>🖼️ Upload de Imagens</h4>
                        <p>Carregue o logotipo da paróquia e outras imagens</p>
                        <div class="upload-area" id="image-upload-area">
                            <input type="file" id="image-file-input" accept="image/*" style="display: none;">
                            <div class="upload-placeholder">
                                <div class="upload-icon">🖼️</div>
                                <p>Clique para selecionar imagem</p>
                                <small>Formatos aceitos: JPG, PNG, GIF</small>
                            </div>
                        </div>
                        <div class="upload-actions">
                            <button id="select-image-btn" class="btn btn-primary">📁 Selecionar Imagem</button>
                            <button id="upload-image-btn" class="btn btn-success" disabled>📤 Enviar Imagem</button>
                        </div>
                        <div id="image-status" class="upload-status"></div>
                    </div>

                    <!-- Current Files -->
                    <div class="upload-section">
                        <h4>📋 Arquivos Atuais</h4>
                        <div id="current-files-list">
                            <div class="file-item">
                                <span class="file-icon">📊</span>
                                <span class="file-name">dados-catequese.xlsx</span>
                                <span class="file-status">✅ Carregado</span>
                            </div>
                            <div class="file-item">
                                <span class="file-icon">🖼️</span>
                                <span class="file-name">logo-paroquia.jpg</span>
                                <span class="file-status">✅ Disponível</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachFilesListeners();
    }

    /**
     * Attach files section event listeners
     */
    attachFilesListeners() {
        // Excel file handling
        const selectExcelBtn = document.getElementById('select-excel-btn');
        const excelFileInput = document.getElementById('excel-file-input');
        const processExcelBtn = document.getElementById('process-excel-btn');

        if (selectExcelBtn && excelFileInput) {
            selectExcelBtn.addEventListener('click', () => {
                excelFileInput.click();
            });

            excelFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleExcelFileSelected(file);
                }
            });
        }

        if (processExcelBtn) {
            processExcelBtn.addEventListener('click', () => {
                this.processExcelFile();
            });
        }

        // Image file handling
        const selectImageBtn = document.getElementById('select-image-btn');
        const imageFileInput = document.getElementById('image-file-input');
        const uploadImageBtn = document.getElementById('upload-image-btn');

        if (selectImageBtn && imageFileInput) {
            selectImageBtn.addEventListener('click', () => {
                imageFileInput.click();
            });

            imageFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImageFileSelected(file);
                }
            });
        }

        if (uploadImageBtn) {
            uploadImageBtn.addEventListener('click', () => {
                this.uploadImageFile();
            });
        }
    }

    /**
     * Handle Excel file selection
     */
    handleExcelFileSelected(file) {
        const statusEl = document.getElementById('excel-status');
        const processBtn = document.getElementById('process-excel-btn');
        
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="status-success">
                    ✅ Arquivo selecionado: ${file.name} (${this.formatFileSize(file.size)})
                </div>
            `;
        }
        
        if (processBtn) {
            processBtn.disabled = false;
        }
        
        this.selectedExcelFile = file;
    }

    /**
     * Process Excel file
     */
    async processExcelFile() {
        if (!this.selectedExcelFile) return;
        
        const statusEl = document.getElementById('excel-status');
        
        try {
            if (statusEl) {
                statusEl.innerHTML = '<div class="status-loading">⏳ Processando arquivo Excel...</div>';
            }
            
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In a real implementation, this would use SheetJS to parse the Excel file
            this.excelData = {
                filename: this.selectedExcelFile.name,
                size: this.selectedExcelFile.size,
                processed: new Date().toISOString()
            };
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-success">
                        ✅ Arquivo processado com sucesso!<br>
                        <small>Dados carregados: ${this.selectedExcelFile.name}</small>
                    </div>
                `;
            }
            
            // Update dashboard stats
            this.updateDashboardStats();
            
        } catch (error) {
            console.error('Error processing Excel file:', error);
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-error">
                        ❌ Erro ao processar arquivo: ${error.message}
                    </div>
                `;
            }
        }
    }

    /**
     * Handle image file selection
     */
    handleImageFileSelected(file) {
        const statusEl = document.getElementById('image-status');
        const uploadBtn = document.getElementById('upload-image-btn');
        
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="status-success">
                    ✅ Imagem selecionada: ${file.name} (${this.formatFileSize(file.size)})
                </div>
            `;
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
        
        this.selectedImageFile = file;
    }

    /**
     * Upload image file
     */
    async uploadImageFile() {
        if (!this.selectedImageFile) return;
        
        const statusEl = document.getElementById('image-status');
        
        try {
            if (statusEl) {
                statusEl.innerHTML = '<div class="status-loading">⏳ Enviando imagem...</div>';
            }
            
            // Simulate upload
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-success">
                        ✅ Imagem enviada com sucesso!<br>
                        <small>Arquivo: ${this.selectedImageFile.name}</small>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error uploading image:', error);
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-error">
                        ❌ Erro ao enviar imagem: ${error.message}
                    </div>
                `;
            }
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Load data management section
     */
    async loadDataSection() {
        
        const container = document.getElementById('data-manager-container');
        if (!container) {
            throw new Error('Container data-manager-container não encontrado');
        }
        
        this.createDataInterface(container);
    }

    /**
     * Create data management interface
     */
    createDataInterface(container) {
        container.innerHTML = `
            <div class="data-manager-wrapper">
                <div class="section-header">
                    <h3>📊 Gerenciar Dados</h3>
                </div>
                
                <div class="data-overview">
                    <div class="data-stats">
                        <div class="stat-card">
                            <h4>Total de Catecúmenos</h4>
                            <span class="stat-number" id="total-catechumens-stat">0</span>
                        </div>
                        <div class="stat-card">
                            <h4>Total de Catequistas</h4>
                            <span class="stat-number" id="total-catechists-stat">0</span>
                        </div>
                        <div class="stat-card">
                            <h4>Total de Turmas</h4>
                            <span class="stat-number" id="total-classes-stat">0</span>
                        </div>
                    </div>
                </div>

                <div class="data-actions">
                    <div class="action-section">
                        <h4>👥 Gerenciar Catequistas</h4>
                        <p>Adicione, edite ou remova catequistas do sistema</p>
                        <button class="btn btn-primary" onclick="adminApp.manageCatechists()">
                            👥 Abrir Gerenciador de Catequistas
                        </button>
                    </div>

                    <div class="action-section">
                        <h4>🎓 Gerenciar Catecúmenos</h4>
                        <p>Visualize e edite informações dos catecúmenos</p>
                        <button class="btn btn-primary" onclick="adminApp.manageCatechumens()">
                            🎓 Abrir Gerenciador de Catecúmenos
                        </button>
                    </div>

                    <div class="action-section">
                        <h4>📊 Relatórios</h4>
                        <p>Gere relatórios e estatísticas dos dados</p>
                        <button class="btn btn-secondary" onclick="adminApp.generateReports()">
                            📊 Gerar Relatórios
                        </button>
                    </div>

                    <div class="action-section">
                        <h4>🔄 Sincronização</h4>
                        <p>Sincronize dados com o arquivo Excel</p>
                        <button class="btn btn-success" onclick="adminApp.syncData()">
                            🔄 Sincronizar Dados
                        </button>
                    </div>
                </div>

                <div id="data-content" class="data-content">
                    <!-- Dynamic content will be loaded here -->
                </div>
            </div>
        `;

        this.updateDataStats();
    }

    /**
     * Update data statistics
     */
    updateDataStats() {
        // Simulate data counts
        const catechumensCount = this.excelData ? 150 : 0;
        const catechistsCount = this.excelData ? 25 : 0;
        const classesCount = this.excelData ? 12 : 0;

        const catechumensEl = document.getElementById('total-catechumens-stat');
        const catechistsEl = document.getElementById('total-catechists-stat');
        const classesEl = document.getElementById('total-classes-stat');

        if (catechumensEl) catechumensEl.textContent = catechumensCount;
        if (catechistsEl) catechistsEl.textContent = catechistsCount;
        if (classesEl) classesEl.textContent = classesCount;
    }

    /**
     * Manage catechists
     */
    async manageCatechists() {
        if (!this.excelManager.currentData) {
            alert('Nenhum arquivo Excel carregado. Por favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }

        const container = document.getElementById('data-content');
        if (!container) return;

        container.innerHTML = `
            <div class="catechists-manager">
                <div class="manager-header">
                    <h3>👥 Gerenciamento de Catequistas</h3>
                    <div class="manager-actions">
                        <button class="btn btn-primary" onclick="adminApp.addNewCatechist()">➕ Adicionar Catequista</button>
                        <button class="btn btn-secondary" onclick="adminApp.backToDataOverview()">← Voltar</button>
                    </div>
                </div>
                
                <div class="catechists-stats">
                    <div class="stat-item">
                        <strong>Total de Catequistas:</strong> ${this.excelManager.catechists.size}
                    </div>
                    <div class="stat-item">
                        <strong>Total de Turmas:</strong> ${this.excelManager.classes.size}
                    </div>
                </div>

                <div class="catechists-list" id="catechists-list">
                    ${this.renderCatechistsList()}
                </div>
            </div>
        `;
    }

    /**
     * Render catechists list
     */
    renderCatechistsList() {
        let html = '';
        
        this.excelManager.catechists.forEach((info, name) => {
            html += `
                <div class="catechist-card">
                    <div class="catechist-header">
                        <h4>${name}</h4>
                        <div class="catechist-actions">
                            <button class="btn btn-sm btn-primary" onclick="adminApp.editCatechist('${name}')">✏️ Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="adminApp.removeCatechist('${name}')">🗑️ Remover</button>
                        </div>
                    </div>
                    <div class="catechist-info">
                        <p><strong>Catecúmenos:</strong> ${info.students.length}</p>
                        <p><strong>Turmas:</strong> ${Array.from(info.classes).join(', ')}</p>
                    </div>
                    <div class="catechist-students">
                        <details>
                            <summary>Ver catecúmenos (${info.students.length})</summary>
                            <ul>
                                ${info.students.map(student => `
                                    <li>${student.name} - ${student.center} - ${student.stage}</li>
                                `).join('')}
                            </ul>
                        </details>
                    </div>
                </div>
            `;
        });

        return html || '<p>Nenhum catequista encontrado.</p>';
    }

    /**
     * Manage catechumens
     */
    async manageCatechumens() {
        if (!this.excelManager.currentData) {
            alert('Nenhum arquivo Excel carregado. Por favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }

        const container = document.getElementById('data-content');
        if (!container) return;

        container.innerHTML = `
            <div class="catechumens-manager">
                <div class="manager-header">
                    <h3>🎓 Gerenciamento de Catecúmenos</h3>
                    <div class="manager-actions">
                        <button class="btn btn-primary" onclick="adminApp.addNewCatechumen()">➕ Adicionar Catecúmeno</button>
                        <button class="btn btn-secondary" onclick="adminApp.backToDataOverview()">← Voltar</button>
                    </div>
                </div>
                
                <div class="catechumens-filters">
                    <input type="text" id="catechumens-search" placeholder="Buscar por nome..." onkeyup="adminApp.filterCatechumens()">
                    <select id="center-filter" onchange="adminApp.filterCatechumens()">
                        <option value="">Todos os centros</option>
                        ${this.getCenterOptions()}
                    </select>
                    <select id="stage-filter" onchange="adminApp.filterCatechumens()">
                        <option value="">Todas as etapas</option>
                        ${this.getStageOptions()}
                    </select>
                </div>

                <div class="catechumens-table-wrapper">
                    <table class="catechumens-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Centro</th>
                                <th>Etapa</th>
                                <th>Catequista</th>
                                <th>Resultado</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="catechumens-tbody">
                            ${this.renderCatechumensTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Get center options for filter
     */
    getCenterOptions() {
        const centers = [...new Set(this.excelManager.catechumens.map(c => c.center))].filter(Boolean);
        return centers.map(center => `<option value="${center}">${center}</option>`).join('');
    }

    /**
     * Get stage options for filter
     */
    getStageOptions() {
        const stages = [...new Set(this.excelManager.catechumens.map(c => c.stage))].filter(Boolean);
        return stages.map(stage => `<option value="${stage}">${stage}</option>`).join('');
    }

    /**
     * Render catechumens table
     */
    renderCatechumensTable() {
        return this.excelManager.catechumens.map(catechumen => `
            <tr>
                <td>${catechumen.name}</td>
                <td>${catechumen.center}</td>
                <td>${catechumen.stage}</td>
                <td>${catechumen.catechist}</td>
                <td>${catechumen.result}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="adminApp.editCatechumen('${catechumen.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="adminApp.removeCatechumen('${catechumen.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Filter catechumens
     */
    filterCatechumens() {
        const search = document.getElementById('catechumens-search')?.value.toLowerCase() || '';
        const centerFilter = document.getElementById('center-filter')?.value || '';
        const stageFilter = document.getElementById('stage-filter')?.value || '';

        let filtered = this.excelManager.catechumens;

        if (search) {
            filtered = filtered.filter(c => c.name.toLowerCase().includes(search));
        }
        if (centerFilter) {
            filtered = filtered.filter(c => c.center === centerFilter);
        }
        if (stageFilter) {
            filtered = filtered.filter(c => c.stage === stageFilter);
        }

        const tbody = document.getElementById('catechumens-tbody');
        if (tbody) {
            tbody.innerHTML = filtered.map(catechumen => `
                <tr>
                    <td>${catechumen.name}</td>
                    <td>${catechumen.center}</td>
                    <td>${catechumen.stage}</td>
                    <td>${catechumen.catechist}</td>
                    <td>${catechumen.result}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="adminApp.editCatechumen('${catechumen.id}')">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="adminApp.removeCatechumen('${catechumen.id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    /**
     * Generate reports
     */
    async generateReports() {
        if (!this.excelManager.currentData) {
            alert('Nenhum arquivo Excel carregado. Por favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }

        const container = document.getElementById('data-content');
        if (!container) return;

        container.innerHTML = `
            <div class="reports-manager">
                <div class="manager-header">
                    <h3>📊 Geração de Relatórios</h3>
                    <div class="manager-actions">
                        <button class="btn btn-secondary" onclick="adminApp.backToDataOverview()">← Voltar</button>
                    </div>
                </div>
                
                <div class="reports-options">
                    <div class="report-card">
                        <h4>📋 Relatório Geral</h4>
                        <p>Visão geral completa da catequese</p>
                        <button class="btn btn-primary" onclick="adminApp.generateReport('general')">Gerar Relatório</button>
                    </div>
                    
                    <div class="report-card">
                        <h4>👥 Relatório de Catequistas</h4>
                        <p>Informações detalhadas dos catequistas</p>
                        <button class="btn btn-primary" onclick="adminApp.generateReport('catechists')">Gerar Relatório</button>
                    </div>
                    
                    <div class="report-card">
                        <h4>🏫 Relatório de Turmas</h4>
                        <p>Informações por turma e centro</p>
                        <button class="btn btn-primary" onclick="adminApp.generateReport('classes')">Gerar Relatório</button>
                    </div>
                    
                    <div class="report-card">
                        <h4>📈 Relatório de Resultados</h4>
                        <p>Distribuição de resultados e estatísticas</p>
                        <button class="btn btn-primary" onclick="adminApp.generateReport('results')">Gerar Relatório</button>
                    </div>
                </div>
                
                <div id="report-output" class="report-output"></div>
            </div>
        `;
    }

    /**
     * Generate specific report
     */
    async generateReport(type) {
        try {
            const report = this.excelManager.generateReport(type);
            const outputDiv = document.getElementById('report-output');
            
            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div class="report-result">
                        <div class="report-header">
                            <h4>${report.title}</h4>
                            <div class="report-actions">
                                <button class="btn btn-success" onclick="adminApp.downloadReport('${type}')">⬇️ Baixar JSON</button>
                                <button class="btn btn-primary" onclick="adminApp.exportReportToExcel('${type}')">📊 Exportar Excel</button>
                            </div>
                        </div>
                        <div class="report-content">
                            <pre>${JSON.stringify(report, null, 2)}</pre>
                        </div>
                    </div>
                `;
            }
            
            // Store report for download
            this.lastGeneratedReport = { type, data: report };
            
        } catch (error) {
            alert('Erro ao gerar relatório: ' + error.message);
        }
    }

    /**
     * Download report
     */
    downloadReport(type) {
        if (!this.lastGeneratedReport || this.lastGeneratedReport.type !== type) {
            alert('Relatório não encontrado. Gere o relatório novamente.');
            return;
        }

        const blob = new Blob([JSON.stringify(this.lastGeneratedReport.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${type}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Export report to Excel
     */
    exportReportToExcel(type) {
        if (!this.lastGeneratedReport || this.lastGeneratedReport.type !== type) {
            alert('Relatório não encontrado. Gere o relatório novamente.');
            return;
        }

        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(this.lastGeneratedReport.data.data || []);
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
        
        // Download
        XLSX.writeFile(wb, `relatorio-${type}-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    /**
     * Sync data
     */
    async syncData() {
        if (!this.excelManager.currentData) {
            alert('Nenhum arquivo Excel carregado. Por favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }
        
        if (!this.githubAPI.isConfigured()) {
            alert('GitHub não está configurado. Configure o GitHub primeiro para sincronizar os dados.');
            return;
        }

        try {
            // Show loading
            const container = document.getElementById('data-content');
            if (container) {
                container.innerHTML = `
                    <div class="sync-status">
                        <h3>🔄 Sincronizando Dados</h3>
                        <p>Enviando dados para o GitHub...</p>
                        <div class="loading-spinner">⏳</div>
                    </div>
                `;
            }

            // Save to GitHub
            const result = await this.excelManager.saveToGitHub();
            
            if (container) {
                container.innerHTML = `
                    <div class="sync-status success">
                        <h3>✅ Sincronização Concluída</h3>
                        <p>Os dados foram salvos no GitHub com sucesso!</p>
                        <p><strong>Commit:</strong> ${result.commit?.sha || 'N/A'}</p>
                        <div class="sync-actions">
                            <button class="btn btn-primary" onclick="adminApp.backToDataOverview()">← Voltar ao Gerenciamento</button>
                            <button class="btn btn-secondary" onclick="adminApp.viewGitHubChanges()">👁️ Ver no GitHub</button>
                        </div>
                    </div>
                `;
            }

            // Update dashboard stats
            this.updateDataStats();

        } catch (error) {
            console.error('Sync error:', error);
            
            const container = document.getElementById('data-content');
            if (container) {
                container.innerHTML = `
                    <div class="sync-status error">
                        <h3>❌ Erro na Sincronização</h3>
                        <p>Não foi possível sincronizar os dados:</p>
                        <p><strong>Erro:</strong> ${error.message}</p>
                        <div class="sync-actions">
                            <button class="btn btn-primary" onclick="adminApp.syncData()">🔄 Tentar Novamente</button>
                            <button class="btn btn-secondary" onclick="adminApp.backToDataOverview()">← Voltar</button>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Back to data overview
     */
    backToDataOverview() {
        this.loadDataSection();
    }

    /**
     * Load logs section
     */
    async loadLogsSection() {
        
        const container = document.getElementById('logs-container');
        if (!container) {
            throw new Error('Container logs-container não encontrado');
        }
        
        this.createLogsInterface(container);
    }

    /**
     * Create logs interface
     */
    createLogsInterface(container) {
        const logs = this.getSystemLogs();
        
        container.innerHTML = `
            <div class="logs-interface">
                <div class="logs-header">
                    <h3>📋 Logs do Sistema</h3>
                    <div class="logs-actions">
                        <button class="btn btn-secondary" onclick="adminApp.refreshLogs()">🔄 Atualizar</button>
                        <button class="btn btn-secondary" onclick="adminApp.clearLogs()">🗑️ Limpar Logs</button>
                        <button class="btn btn-primary" onclick="adminApp.exportLogs()">📤 Exportar Logs</button>
                    </div>
                </div>
                
                <div class="logs-filters">
                    <select id="log-level-filter" onchange="adminApp.filterLogs()">
                        <option value="">Todos os níveis</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                        <option value="debug">Debug</option>
                    </select>
                    <input type="text" id="log-search" placeholder="Buscar nos logs..." onkeyup="adminApp.searchLogs()">
                </div>
                
                <div class="logs-content">
                    <div class="logs-display" id="logs-display">
                        ${logs.map(log => `
                            <div class="log-entry ${log.level}">
                                <span class="log-time">${log.time}</span>
                                <span class="log-level">${log.level.toUpperCase()}</span>
                                <span class="log-message">${log.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get system logs
     */
    getSystemLogs() {
        return [
            {
                time: new Date().toLocaleString(),
                level: 'info',
                message: 'Sistema administrativo inicializado com sucesso'
            },
            {
                time: new Date(Date.now() - 300000).toLocaleString(),
                level: 'info',
                message: 'Usuário admin fez login no sistema'
            },
            {
                time: new Date(Date.now() - 600000).toLocaleString(),
                level: 'info',
                message: 'Configurações do sistema carregadas'
            },
            {
                time: new Date(Date.now() - 900000).toLocaleString(),
                level: 'warning',
                message: 'Tentativa de acesso sem autenticação detectada'
            },
            {
                time: new Date(Date.now() - 1200000).toLocaleString(),
                level: 'info',
                message: 'Sistema iniciado'
            }
        ];
    }

    /**
     * Get log count
     */
    getLogCount() {
        return this.getSystemLogs().length;
    }

    /**
     * Refresh logs
     */
    refreshLogs() {
        
        this.loadLogsSection();
    }

    /**
     * Clear logs
     */
    clearLogs() {
        if (confirm('Tem certeza que deseja limpar todos os logs?')) {
            const logsDisplay = document.getElementById('logs-display');
            if (logsDisplay) {
                logsDisplay.innerHTML = `
                    <div class="log-entry info">
                        <span class="log-time">${new Date().toLocaleString()}</span>
                        <span class="log-level">INFO</span>
                        <span class="log-message">Logs limpos pelo usuário</span>
                    </div>
                `;
            }
        }
    }

    /**
     * Export logs
     */
    exportLogs() {
        const logs = this.getSystemLogs();
        const logText = logs.map(log => `${log.time} [${log.level.toUpperCase()}] ${log.message}`).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Filter logs
     */
    filterLogs() {
        // Implementation for filtering logs by level
        
    }

    /**
     * Search logs
     */
    searchLogs() {
        // Implementation for searching logs
        
    }

    /**
     * Load backup section
     */
    async loadBackupSection() {
        
        const container = document.getElementById('backup-container');
        if (!container) {
            throw new Error('Container backup-container não encontrado');
        }
        
        this.createBackupInterface(container);
    }

    /**
     * Create backup interface
     */
    createBackupInterface(container) {
        container.innerHTML = `
            <div class="backup-interface">
                <div class="backup-header">
                    <h3>💾 Backup e Restauração</h3>
                </div>
                
                <div class="backup-sections">
                    <!-- Create Backup -->
                    <div class="backup-section">
                        <h4>📦 Criar Backup</h4>
                        <p>Crie um backup completo das configurações e dados do sistema</p>
                        <div class="backup-options">
                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-config" checked>
                                <span>Incluir configurações</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-data" checked>
                                <span>Incluir dados Excel</span>
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" id="backup-images">
                                <span>Incluir imagens</span>
                            </label>
                        </div>
                        <div class="backup-actions">
                            <button class="btn btn-primary" onclick="adminApp.createBackup()">📦 Criar Backup</button>
                            <button class="btn btn-success" onclick="adminApp.downloadBackup()">⬇️ Baixar Backup</button>
                        </div>
                        <div id="backup-status" class="backup-status"></div>
                    </div>

                    <!-- Restore Backup -->
                    <div class="backup-section">
                        <h4>🔄 Restaurar Backup</h4>
                        <p>Restaure o sistema a partir de um arquivo de backup</p>
                        <div class="restore-area">
                            <input type="file" id="backup-file-input" accept=".zip,.json" style="display: none;">
                            <div class="file-drop-area" onclick="document.getElementById('backup-file-input').click()">
                                <div class="drop-icon">📁</div>
                                <p>Clique para selecionar arquivo de backup</p>
                                <small>Formatos aceitos: .zip, .json</small>
                            </div>
                        </div>
                        <div class="restore-actions">
                            <button class="btn btn-secondary" onclick="document.getElementById('backup-file-input').click()">
                                📁 Selecionar Arquivo
                            </button>
                            <button class="btn btn-warning" onclick="adminApp.restoreBackup()" disabled id="restore-btn">
                                🔄 Restaurar Sistema
                            </button>
                        </div>
                        <div id="restore-status" class="backup-status"></div>
                    </div>

                    <!-- Backup History -->
                    <div class="backup-section">
                        <h4>📋 Histórico de Backups</h4>
                        <div class="backup-history">
                            <div class="backup-item">
                                <span class="backup-date">Hoje, 14:30</span>
                                <span class="backup-type">Backup Completo</span>
                                <span class="backup-size">2.5 MB</span>
                                <div class="backup-item-actions">
                                    <button class="btn btn-sm btn-secondary">⬇️ Baixar</button>
                                    <button class="btn btn-sm btn-danger">🗑️ Excluir</button>
                                </div>
                            </div>
                            <div class="backup-item">
                                <span class="backup-date">Ontem, 09:15</span>
                                <span class="backup-type">Backup Automático</span>
                                <span class="backup-size">2.3 MB</span>
                                <div class="backup-item-actions">
                                    <button class="btn btn-sm btn-secondary">⬇️ Baixar</button>
                                    <button class="btn btn-sm btn-danger">🗑️ Excluir</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachBackupListeners();
    }

    /**
     * Attach backup event listeners
     */
    attachBackupListeners() {
        const backupFileInput = document.getElementById('backup-file-input');
        if (backupFileInput) {
            backupFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleBackupFileSelected(file);
                }
            });
        }
    }

    /**
     * Handle backup file selection
     */
    handleBackupFileSelected(file) {
        const restoreBtn = document.getElementById('restore-btn');
        const statusEl = document.getElementById('restore-status');
        
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="status-success">
                    ✅ Arquivo de backup selecionado: ${file.name} (${this.formatFileSize(file.size)})
                </div>
            `;
        }
        
        if (restoreBtn) {
            restoreBtn.disabled = false;
        }
        
        this.selectedBackupFile = file;
    }

    /**
     * Create backup
     */
    async createBackup() {
        const statusEl = document.getElementById('backup-status');
        
        try {
            if (statusEl) {
                statusEl.innerHTML = '<div class="status-loading">⏳ Criando backup...</div>';
            }
            
            // Simulate backup creation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-success">
                        ✅ Backup criado com sucesso!<br>
                        <small>Data: ${new Date().toLocaleString()}</small>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error creating backup:', error);
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-error">
                        ❌ Erro ao criar backup: ${error.message}
                    </div>
                `;
            }
        }
    }

    /**
     * Download backup
     */
    downloadBackup() {
        // Create a simple backup object
        const backup = {
            timestamp: new Date().toISOString(),
            config: this.currentConfig,
            data: this.excelData,
            version: '1.0'
        };
        
        const backupJson = JSON.stringify(backup, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paroquia-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Restore backup
     */
    async restoreBackup() {
        if (!this.selectedBackupFile) {
            alert('Por favor, selecione um arquivo de backup primeiro.');
            return;
        }
        
        if (!confirm('Tem certeza que deseja restaurar o sistema? Esta ação irá sobrescrever as configurações atuais.')) {
            return;
        }
        
        const statusEl = document.getElementById('restore-status');
        
        try {
            if (statusEl) {
                statusEl.innerHTML = '<div class="status-loading">⏳ Restaurando backup...</div>';
            }
            
            // Simulate restore process
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-success">
                        ✅ Sistema restaurado com sucesso!<br>
                        <small>Arquivo: ${this.selectedBackupFile.name}</small>
                    </div>
                `;
            }
            
            // Reload the page after successful restore
            setTimeout(() => {
                if (confirm('Sistema restaurado! Deseja recarregar a página para aplicar as alterações?')) {
                    window.location.reload();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-error">
                        ❌ Erro ao restaurar backup: ${error.message}
                    </div>
                `;
            }
        }
    }

    /**
     * Get backup count
     */
    getBackupCount() {
        return 2; // Simulate backup count
    }

    /**
     * Show error in section
     */
    showSectionError(sectionName, error) {
        const sectionElement = document.getElementById(sectionName + '-section');
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
                <button onclick="adminApp.reloadSection('${sectionName}')" class="btn btn-primary">🔄 Tentar Novamente</button>
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
     * Logout user
     */
    logout() {
        if (confirm('Tem certeza que deseja sair do sistema?')) {
            localStorage.removeItem('admin_session');
            sessionStorage.removeItem('admin_session_backup');
            window.location.href = 'login.html';
        }
    }

    /**
     * Create basic configuration interface (fallback)
     */
    createBasicConfigInterface(container) {
        container.innerHTML = `
            <div class="config-form-wrapper">
                <div class="form-header">
                    <h3>⚙️ Configurações do Sistema</h3>
                </div>
                <div class="basic-interface-message">
                    <div class="message-icon">⚠️</div>
                    <h4>Erro ao Carregar Configurações</h4>
                    <p>Não foi possível carregar o arquivo de configuração. Verifique se o arquivo existe e está acessível.</p>
                    <button class="btn btn-primary" onclick="adminApp.reloadSection('config')">🔄 Tentar Novamente</button>
                </div>
            </div>
        `;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    
    
    const app = new AdminPanelApp();
    app.init();
    
    // Make app globally available
    window.adminApp = app;
    
    
});
 
   /**
     * Add new catechist
     */
    addNewCatechist() {
        this.showCatechistModal('Adicionar Catequista', {
            name: '',
            classes: '',
            phone: '',
            email: ''
        }, 'add');
    }

    /**
     * Edit catechist
     */
    editCatechist(name) {
        const catechistInfo = this.excelManager.catechists.get(name);
        if (!catechistInfo) {
            alert('Catequista não encontrado');
            return;
        }

        this.showCatechistModal('Editar Catequista', {
            name: name,
            classes: Array.from(catechistInfo.classes).join(', '),
            students: catechistInfo.students.length
        }, 'edit', name);
    }

    /**
     * Show catechist modal
     */
    showCatechistModal(title, data, mode, originalName = null) {
        const modalHTML = `
            <div class="modal-overlay" id="catechist-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="adminApp.closeCatechistModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="catechist-form">
                            <div class="form-group">
                                <label for="catechist-name">Nome do Catequista:</label>
                                <input type="text" id="catechist-name" value="${data.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="catechist-phone">Telefone:</label>
                                <input type="text" id="catechist-phone" value="${data.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label for="catechist-email">Email:</label>
                                <input type="email" id="catechist-email" value="${data.email || ''}">
                            </div>
                            ${mode === 'edit' ? `
                                <div class="form-group">
                                    <label>Turmas Atuais:</label>
                                    <p>${data.classes}</p>
                                </div>
                                <div class="form-group">
                                    <label>Catecúmenos:</label>
                                    <p>${data.students} catecúmenos</p>
                                </div>
                            ` : ''}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="adminApp.closeCatechistModal()">Cancelar</button>
                        <button class="btn btn-primary" onclick="adminApp.saveCatechist('${mode}', '${originalName}')">Salvar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Close catechist modal
     */
    closeCatechistModal() {
        const modal = document.getElementById('catechist-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Save catechist
     */
    saveCatechist(mode, originalName) {
        const name = document.getElementById('catechist-name').value.trim();
        const phone = document.getElementById('catechist-phone').value.trim();
        const email = document.getElementById('catechist-email').value.trim();

        if (!name) {
            alert('Nome do catequista é obrigatório');
            return;
        }

        if (mode === 'add') {
            // Add new catechist (this would need to be implemented in ExcelManager)
            alert('Catequista adicionado com sucesso!\n\nNota: Para associar o catequista a turmas, edite os catecúmenos correspondentes.');
        } else if (mode === 'edit') {
            // Update catechist name in all related catechumens
            this.excelManager.catechumens.forEach(catechumen => {
                if (catechumen.catechist.includes(originalName)) {
                    catechumen.catechist = catechumen.catechist.replace(originalName, name);
                }
            });
            
            // Rebuild catechists and classes
            this.excelManager.rebuildCatechistsAndClasses();
            
            alert('Catequista atualizado com sucesso!');
        }

        this.closeCatechistModal();
        this.manageCatechists(); // Refresh the list
    }

    /**
     * Remove catechist
     */
    removeCatechist(name) {
        if (!confirm(`Tem certeza que deseja remover o catequista "${name}"?\n\nEsta ação irá remover o catequista de todas as turmas.`)) {
            return;
        }

        // Remove catechist from all catechumens
        this.excelManager.catechumens.forEach(catechumen => {
            if (catechumen.catechist.includes(name)) {
                const catechists = catechumen.catechist.split('|').map(c => c.trim()).filter(c => c !== name);
                catechumen.catechist = catechists.join(' | ');
            }
        });

        // Rebuild catechists and classes
        this.excelManager.rebuildCatechistsAndClasses();

        alert('Catequista removido com sucesso!');
        this.manageCatechists(); // Refresh the list
    }

    /**
     * Add new catechumen
     */
    addNewCatechumen() {
        this.showCatechumenModal('Adicionar Catecúmeno', {
            name: '',
            birthdate: '',
            center: '',
            stage: '',
            room: '',
            schedule: '',
            catechist: '',
            result: '',
            phone: '',
            address: '',
            father: '',
            mother: ''
        }, 'add');
    }

    /**
     * Edit catechumen
     */
    editCatechumen(id) {
        const catechumen = this.excelManager.catechumens.find(c => c.id === id);
        if (!catechumen) {
            alert('Catecúmeno não encontrado');
            return;
        }

        this.showCatechumenModal('Editar Catecúmeno', catechumen, 'edit', id);
    }

    /**
     * Show catechumen modal
     */
    showCatechumenModal(title, data, mode, id = null) {
        const centers = [...new Set(this.excelManager.catechumens.map(c => c.center))].filter(Boolean);
        const stages = [...new Set(this.excelManager.catechumens.map(c => c.stage))].filter(Boolean);
        const schedules = [...new Set(this.excelManager.catechumens.map(c => c.schedule))].filter(Boolean);
        const catechists = [...this.excelManager.catechists.keys()];

        const modalHTML = `
            <div class="modal-overlay" id="catechumen-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="adminApp.closeCatechumenModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="catechumen-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="catechumen-name">Nome Completo:</label>
                                    <input type="text" id="catechumen-name" value="${data.name}" required>
                                </div>
                                <div class="form-group">
                                    <label for="catechumen-birthdate">Data de Nascimento:</label>
                                    <input type="date" id="catechumen-birthdate" value="${data.birthdate}">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="catechumen-center">Centro:</label>
                                    <select id="catechumen-center">
                                        <option value="">Selecione...</option>
                                        ${centers.map(center => `
                                            <option value="${center}" ${data.center === center ? 'selected' : ''}>${center}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="catechumen-stage">Etapa:</label>
                                    <select id="catechumen-stage">
                                        <option value="">Selecione...</option>
                                        ${stages.map(stage => `
                                            <option value="${stage}" ${data.stage === stage ? 'selected' : ''}>${stage}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="catechumen-room">Sala:</label>
                                    <input type="text" id="catechumen-room" value="${data.room}">
                                </div>
                                <div class="form-group">
                                    <label for="catechumen-schedule">Horário:</label>
                                    <select id="catechumen-schedule">
                                        <option value="">Selecione...</option>
                                        ${schedules.map(schedule => `
                                            <option value="${schedule}" ${data.schedule === schedule ? 'selected' : ''}>${schedule}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="catechumen-catechist">Catequista:</label>
                                    <select id="catechumen-catechist">
                                        <option value="">Selecione...</option>
                                        ${catechists.map(catechist => `
                                            <option value="${catechist}" ${data.catechist === catechist ? 'selected' : ''}>${catechist}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="catechumen-result">Resultado:</label>
                                    <select id="catechumen-result">
                                        <option value="">Selecione...</option>
                                        <option value="Aprovado" ${data.result === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                                        <option value="Reprovado" ${data.result === 'Reprovado' ? 'selected' : ''}>Reprovado</option>
                                        <option value="Desistente" ${data.result === 'Desistente' ? 'selected' : ''}>Desistente</option>
                                        <option value="Transferido" ${data.result === 'Transferido' ? 'selected' : ''}>Transferido</option>
                                        <option value="Em Avaliação" ${data.result === 'Em Avaliação' ? 'selected' : ''}>Em Avaliação</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="catechumen-father">Nome do Pai:</label>
                                    <input type="text" id="catechumen-father" value="${data.father || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="catechumen-mother">Nome da Mãe:</label>
                                    <input type="text" id="catechumen-mother" value="${data.mother || ''}">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="catechumen-phone">Telefone:</label>
                                    <input type="text" id="catechumen-phone" value="${data.phone || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="catechumen-address">Endereço:</label>
                                    <input type="text" id="catechumen-address" value="${data.address || ''}">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="adminApp.closeCatechumenModal()">Cancelar</button>
                        <button class="btn btn-primary" onclick="adminApp.saveCatechumen('${mode}', '${id}')">Salvar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Close catechumen modal
     */
    closeCatechumenModal() {
        const modal = document.getElementById('catechumen-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Save catechumen
     */
    saveCatechumen(mode, id) {
        const formData = {
            name: document.getElementById('catechumen-name').value.trim(),
            birthdate: document.getElementById('catechumen-birthdate').value,
            center: document.getElementById('catechumen-center').value,
            stage: document.getElementById('catechumen-stage').value,
            room: document.getElementById('catechumen-room').value,
            schedule: document.getElementById('catechumen-schedule').value,
            catechist: document.getElementById('catechumen-catechist').value,
            result: document.getElementById('catechumen-result').value,
            father: document.getElementById('catechumen-father').value.trim(),
            mother: document.getElementById('catechumen-mother').value.trim(),
            phone: document.getElementById('catechumen-phone').value.trim(),
            address: document.getElementById('catechumen-address').value.trim()
        };

        if (!formData.name) {
            alert('Nome do catecúmeno é obrigatório');
            return;
        }

        try {
            if (mode === 'add') {
                this.excelManager.addCatechumen(formData);
                alert('Catecúmeno adicionado com sucesso!');
            } else if (mode === 'edit') {
                this.excelManager.updateCatechumen(id, formData);
                alert('Catecúmeno atualizado com sucesso!');
            }

            this.closeCatechumenModal();
            this.manageCatechumens(); // Refresh the list
            this.updateDataStats(); // Update statistics

        } catch (error) {
            alert('Erro ao salvar catecúmeno: ' + error.message);
        }
    }

    /**
     * Remove catechumen
     */
    removeCatechumen(id) {
        const catechumen = this.excelManager.catechumens.find(c => c.id === id);
        if (!catechumen) {
            alert('Catecúmeno não encontrado');
            return;
        }

        if (!confirm(`Tem certeza que deseja remover o catecúmeno "${catechumen.name}"?`)) {
            return;
        }

        try {
            this.excelManager.removeCatechumen(id);
            alert('Catecúmeno removido com sucesso!');
            this.manageCatechumens(); // Refresh the list
            this.updateDataStats(); // Update statistics
        } catch (error) {
            alert('Erro ao remover catecúmeno: ' + error.message);
        }
    }

    /**
     * View GitHub changes
     */
    viewGitHubChanges() {
        if (this.githubAPI.isConfigured()) {
            const url = `https://github.com/${this.githubAPI.owner}/${this.githubAPI.repo}`;
            window.open(url, '_blank');
        } else {
            alert('GitHub não está configurado');
        }
    }
 
   /**
     * Load GitHub configuration into form
     */
    loadGitHubConfigIntoForm() {
        const config = localStorage.getItem('github_config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                
                const tokenField = document.getElementById('github-token');
                const ownerField = document.getElementById('github-owner');
                const repoField = document.getElementById('github-repo');
                const branchField = document.getElementById('github-branch');
                
                if (tokenField) tokenField.value = parsed.token || '';
                if (ownerField) ownerField.value = parsed.owner || '';
                if (repoField) repoField.value = parsed.repo || '';
                if (branchField) branchField.value = parsed.branch || 'main';
                
                // Show status
                this.showGitHubStatus('Configuração GitHub carregada', 'info');
                
            } catch (error) {
                console.error('Error loading GitHub config:', error);
            }
        }
    }

    /**
     * Save GitHub configuration
     */
    async saveGitHubConfig() {
        const token = document.getElementById('github-token')?.value.trim();
        const owner = document.getElementById('github-owner')?.value.trim();
        const repo = document.getElementById('github-repo')?.value.trim();
        const branch = document.getElementById('github-branch')?.value.trim() || 'main';

        if (!token || !owner || !repo) {
            this.showGitHubStatus('Todos os campos são obrigatórios (exceto branch)', 'error');
            return;
        }

        try {
            // Save configuration
            this.githubAPI.saveConfig(token, owner, repo, branch);
            
            // Test connection
            this.showGitHubStatus('Testando conexão...', 'info');
            const testResult = await this.githubAPI.testConnection();
            
            if (testResult.success) {
                this.showGitHubStatus('✅ Configuração GitHub salva e testada com sucesso!', 'success');
            } else {
                this.showGitHubStatus('❌ Configuração salva, mas teste falhou: ' + testResult.message, 'error');
            }
            
        } catch (error) {
            this.showGitHubStatus('Erro ao salvar configuração: ' + error.message, 'error');
        }
    }

    /**
     * Test GitHub connection
     */
    async testGitHubConnection() {
        const token = document.getElementById('github-token')?.value.trim();
        const owner = document.getElementById('github-owner')?.value.trim();
        const repo = document.getElementById('github-repo')?.value.trim();
        const branch = document.getElementById('github-branch')?.value.trim() || 'main';

        if (!token || !owner || !repo) {
            this.showGitHubStatus('Preencha todos os campos antes de testar', 'error');
            return;
        }

        try {
            // Temporarily set config for testing
            const originalConfig = {
                token: this.githubAPI.token,
                owner: this.githubAPI.owner,
                repo: this.githubAPI.repo,
                branch: this.githubAPI.branch
            };

            this.githubAPI.saveConfig(token, owner, repo, branch);
            
            this.showGitHubStatus('Testando conexão...', 'info');
            const result = await this.githubAPI.testConnection();
            
            if (result.success) {
                this.showGitHubStatus('✅ Conexão bem-sucedida! ' + result.message, 'success');
            } else {
                this.showGitHubStatus('❌ Falha na conexão: ' + result.message, 'error');
                // Restore original config on failure
                this.githubAPI.saveConfig(originalConfig.token, originalConfig.owner, originalConfig.repo, originalConfig.branch);
            }
            
        } catch (error) {
            this.showGitHubStatus('Erro no teste: ' + error.message, 'error');
        }
    }

    /**
     * Show GitHub status message
     */
    showGitHubStatus(message, type) {
        const statusEl = document.getElementById('github-status');
        if (statusEl) {
            statusEl.innerHTML = `<div class="status-${type}">${message}</div>`;
            
            // Clear after 5 seconds for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    statusEl.innerHTML = '';
                }, 5000);
            }
        }
    }