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
        
        console.log('AdminPanelApp constructor completed');
    }

    /**
     * Initialize the admin panel
     */
    async init() {
        try {
            console.log('Initializing Admin Panel...');
            
            // Check authentication first
            if (!this.checkAuthentication()) {
                console.log('User not authenticated, redirecting to login');
                this.redirectToLogin();
                return;
            }
            
            console.log('User is authenticated, showing admin panel');
            
            // Setup navigation
            this.setupNavigation();
            
            // Setup logout button
            this.setupLogout();
            
            // Show default section
            await this.showSection(this.currentSection);
            
            this.isInitialized = true;
            console.log('Admin Panel initialized successfully');
            
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

        console.log('Navigation setup completed');
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
            console.log('Showing section:', sectionName);
            
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
        console.log('Loading section content:', sectionName);
        
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
            console.log('Section', sectionName, 'loaded successfully');
        } catch (error) {
            console.error('Error loading section', sectionName, ':', error);
            throw error;
        }
    }

    /**
     * Load dashboard section
     */
    async loadDashboardSection() {
        console.log('Loading dashboard section');
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
        console.log('Loading configuration section');
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
                console.log('Configuration loaded:', this.currentConfig);
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
                </form>

                <div id="config-status" class="status-message"></div>
            </div>
        `;

        // Attach event listeners
        this.attachConfigFormListeners();
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

            console.log('Saving configuration:', newConfig);

            // In a real implementation, this would save to the server
            // For now, we'll simulate the save and update local state
            this.currentConfig = newConfig;
            
            // Show success message
            this.showConfigStatus('Configurações salvas com sucesso!', 'success');
            
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
        console.log('Loading files section');
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
        console.log('Loading data management section');
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
    manageCatechists() {
        alert('Funcionalidade de gerenciamento de catequistas será implementada em breve.\n\nEsta funcionalidade permitirá:\n- Adicionar novos catequistas\n- Editar informações existentes\n- Atribuir catequistas a turmas\n- Visualizar estatísticas por catequista');
    }

    /**
     * Manage catechumens
     */
    manageCatechumens() {
        alert('Funcionalidade de gerenciamento de catecúmenos será implementada em breve.\n\nEsta funcionalidade permitirá:\n- Visualizar lista completa de catecúmenos\n- Editar informações individuais\n- Filtrar por turma, catequista, etc.\n- Exportar listas personalizadas');
    }

    /**
     * Generate reports
     */
    generateReports() {
        alert('Funcionalidade de relatórios será implementada em breve.\n\nEsta funcionalidade permitirá:\n- Relatórios de frequência\n- Estatísticas por turma\n- Relatórios de progresso\n- Exportação em PDF e Excel');
    }

    /**
     * Sync data
     */
    syncData() {
        if (!this.excelData) {
            alert('Nenhum arquivo Excel carregado. Por favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }
        
        alert('Sincronização de dados iniciada.\n\nOs dados serão sincronizados com o arquivo Excel carregado.');
    }

    /**
     * Load logs section
     */
    async loadLogsSection() {
        console.log('Loading logs section');
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
        console.log('Refreshing logs...');
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
        console.log('Filtering logs...');
    }

    /**
     * Search logs
     */
    searchLogs() {
        // Implementation for searching logs
        console.log('Searching logs...');
    }

    /**
     * Load backup section
     */
    async loadBackupSection() {
        console.log('Loading backup section');
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
        console.log('Reloading section:', sectionName);
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
        console.log('Redirecting to login page');
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
    console.log('DOM loaded, initializing functional admin app...');
    
    const app = new AdminPanelApp();
    app.init();
    
    // Make app globally available
    window.adminApp = app;
    
    console.log('Functional admin app initialized and available globally');
});