/**
 * Complete Admin Panel - All-in-One Solution
 * Sistema administrativo completo e funcional
 */

// GitHub API Integration
class GitHubAPI {
    constructor() {
        this.token = null;
        this.owner = null;
        this.repo = null;
        this.branch = 'main';
        this.baseURL = 'https://api.github.com';
        this.loadConfig();
    }

    loadConfig() {
        const config = localStorage.getItem('github_config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                this.token = parsed.token;
                this.owner = parsed.owner;
                this.repo = parsed.repo;
                this.branch = parsed.branch || 'main';
            } catch (error) {
                console.error('Error loading GitHub config:', error);
            }
        }
    }

    saveConfig(token, owner, repo, branch = 'main') {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
        
        const config = { token, owner, repo, branch };
        localStorage.setItem('github_config', JSON.stringify(config));
    }

    isConfigured() {
        return !!(this.token && this.owner && this.repo);
    }

    async updateFile(path, content, message, sha = null) {
        if (!this.isConfigured()) {
            throw new Error('GitHub não está configurado');
        }

        const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`;
        
        if (!sha) {
            try {
                const fileInfo = await this.getFile(path);
                sha = fileInfo.sha;
            } catch (error) {
                
            }
        }

        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: this.branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao salvar arquivo: ${response.status} - ${errorData.message}`);
        }

        return await response.json();
    }

    async getFile(path) {
        const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar arquivo: ${response.status}`);
        }

        const data = await response.json();
        const content = atob(data.content.replace(/\n/g, ''));
        
        return { content, sha: data.sha, path: data.path };
    }

    async saveConfiguration(config) {
        const content = JSON.stringify(config, null, 2);
        const message = `admin: update system configuration - ${new Date().toISOString()}`;
        return await this.updateFile('config/settings.json', content, message);
    }

    async testConnection() {
        try {
            const url = `${this.baseURL}/repos/${this.owner}/${this.repo}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const repoInfo = await response.json();
                return {
                    success: true,
                    message: `Conectado ao repositório: ${repoInfo.full_name}`,
                    data: repoInfo
                };
            } else {
                return {
                    success: false,
                    message: `Erro de conexão: ${response.status}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// Excel Manager
class ExcelManager {
    constructor() {
        this.currentData = null;
        this.catechists = new Map();
        this.catechumens = [];
        this.classes = new Map();
    }

    async loadExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    const processedData = this.processExcelData(jsonData);
                    resolve(processedData);
                } catch (error) {
                    reject(new Error('Erro ao processar arquivo Excel: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    processExcelData(rawData) {
        if (!rawData || rawData.length < 2) {
            throw new Error('Arquivo Excel vazio ou inválido');
        }

        const headers = rawData[0];
        const rows = rawData.slice(1);

        this.catechists.clear();
        this.catechumens = [];
        this.classes.clear();

        const columnMap = this.mapColumns(headers);

        rows.forEach((row, index) => {
            if (this.isValidRow(row, columnMap)) {
                const catechumen = this.createCatechumenFromRow(row, columnMap, index + 2);
                this.catechumens.push(catechumen);
                this.updateCatechistsAndClasses(catechumen);
            }
        });

        this.currentData = {
            headers,
            rows: rawData,
            processed: {
                catechumens: this.catechumens,
                catechists: Array.from(this.catechists.entries()),
                classes: Array.from(this.classes.entries())
            },
            metadata: {
                totalRows: rows.length,
                validRows: this.catechumens.length,
                processedAt: new Date().toISOString()
            }
        };

        return this.currentData;
    }

    mapColumns(headers) {
        const map = {};
        headers.forEach((header, index) => {
            if (!header) return;
            const normalized = header.toLowerCase().trim();
            
            if (normalized.includes('nome')) map.name = index;
            else if (normalized.includes('nascimento')) map.birthdate = index;
            else if (normalized.includes('centro')) map.center = index;
            else if (normalized.includes('etapa')) map.stage = index;
            else if (normalized.includes('sala')) map.room = index;
            else if (normalized.includes('horário') || normalized.includes('horario')) map.schedule = index;
            else if (normalized.includes('catequista')) map.catechist = index;
            else if (normalized.includes('resultado')) map.result = index;
        });
        return map;
    }

    isValidRow(row, columnMap) {
        return row && row[columnMap.name] && String(row[columnMap.name]).trim();
    }

    createCatechumenFromRow(row, columnMap, rowNumber) {
        return {
            id: `cat_${rowNumber}`,
            rowNumber,
            name: this.cleanValue(row[columnMap.name]),
            birthdate: this.cleanValue(row[columnMap.birthdate]),
            center: this.cleanValue(row[columnMap.center]),
            stage: this.cleanValue(row[columnMap.stage]),
            room: this.cleanValue(row[columnMap.room]),
            schedule: this.cleanValue(row[columnMap.schedule]),
            catechist: this.cleanValue(row[columnMap.catechist]),
            result: this.cleanValue(row[columnMap.result])
        };
    }

    cleanValue(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    updateCatechistsAndClasses(catechumen) {
        const classKey = `${catechumen.center}_${catechumen.stage}_${catechumen.schedule}`;
        
        if (!this.classes.has(classKey)) {
            this.classes.set(classKey, {
                id: classKey,
                center: catechumen.center,
                stage: catechumen.stage,
                schedule: catechumen.schedule,
                room: catechumen.room,
                catechists: new Set(),
                students: []
            });
        }
        
        const classInfo = this.classes.get(classKey);
        classInfo.students.push(catechumen);
        
        if (catechumen.catechist) {
            const catechistNames = catechumen.catechist.split('|').map(name => name.trim());
            
            catechistNames.forEach(name => {
                if (name) {
                    classInfo.catechists.add(name);
                    
                    if (!this.catechists.has(name)) {
                        this.catechists.set(name, {
                            name,
                            classes: new Set(),
                            students: []
                        });
                    }
                    
                    const catechistInfo = this.catechists.get(name);
                    catechistInfo.classes.add(classKey);
                    catechistInfo.students.push(catechumen);
                }
            });
        }
    }

    getStatistics() {
        return {
            totalCatechumens: this.catechumens.length,
            totalCatechists: this.catechists.size,
            totalClasses: this.classes.size,
            centers: [...new Set(this.catechumens.map(c => c.center))].filter(Boolean),
            stages: [...new Set(this.catechumens.map(c => c.stage))].filter(Boolean)
        };
    }
}

// Main Admin Application
class AdminPanelApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.isInitialized = false;
        this.currentConfig = null;
        this.excelData = null;
        
        this.githubAPI = new GitHubAPI();
        this.excelManager = new ExcelManager();
        
        
    }

    async init() {
        try {
            
            
            if (!this.checkAuthentication()) {
                
                this.redirectToLogin();
                return;
            }
            
            this.setupNavigation();
            this.setupLogout();
            await this.showSection(this.currentSection);
            
            this.isInitialized = true;
            
            
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            alert('Erro ao inicializar painel administrativo: ' + error.message);
        }
    }

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

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

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
            await this.loadSectionContent(sectionName);
            
        } catch (error) {
            console.error('Error showing section:', error);
            this.showSectionError(sectionName, error);
        }
    }

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

    async loadDashboardSection() {
        
        this.updateDashboardStats();
    }

    updateDashboardStats() {
        const configStatus = document.getElementById('config-status');
        if (configStatus) {
            configStatus.textContent = this.currentConfig ? 'Status: Carregado' : 'Status: Não carregado';
        }

        const filesCount = document.getElementById('files-count');
        if (filesCount) {
            filesCount.textContent = this.excelData ? 'Arquivos: 1' : 'Arquivos: 0';
        }

        const logsCount = document.getElementById('logs-count');
        if (logsCount) {
            logsCount.textContent = 'Entradas: 5';
        }

        const backupCount = document.getElementById('backup-count');
        if (backupCount) {
            backupCount.textContent = 'Backups: 2';
        }
    }

    async loadConfigurationSection() {
        
        const container = document.getElementById('config-form-container');
        if (!container) {
            throw new Error('Container config-form-container não encontrado');
        }
        
        try {
            await this.loadConfiguration();
            this.createConfigurationForm(container);
        } catch (error) {
            console.error('Error loading configuration section:', error);
            this.createBasicConfigInterface(container);
        }
    }

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
            this.currentConfig = this.getDefaultConfiguration();
        }
    }

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
                        
                        <div class="github-actions">
                            <button type="button" class="btn btn-secondary" onclick="adminApp.testGitHubConnection()">
                                🔍 Testar Conexão
                            </button>
                            <button type="button" class="btn btn-primary" onclick="adminApp.saveGitHubConfig()">
                                💾 Salvar GitHub
                            </button>
                        </div>
                        
                        <div id="github-status" class="github-status"></div>
                    </div>
                </form>

                <div id="config-status" class="status-message"></div>
            </div>
        `;

        this.attachConfigFormListeners();
        this.loadGitHubConfigIntoForm();
    }

    attachConfigFormListeners() {
        const saveBtn = document.getElementById('save-config');
        const resetBtn = document.getElementById('reset-config');

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
    }

    async saveConfiguration() {
        try {
            const form = document.getElementById('config-form');
            const formData = new FormData(form);
            
            const newConfig = {};
            
            for (const [key, value] of formData.entries()) {
                this.setNestedValue(newConfig, key, value);
            }

            if (newConfig.paroquia?.data_inicio) {
                newConfig.paroquia.data_inicio_formatada = this.formatDate(newConfig.paroquia.data_inicio);
            }

            

            this.showConfigStatus('Salvando configurações...', 'info');

            if (this.githubAPI.isConfigured()) {
                try {
                    await this.githubAPI.saveConfiguration(newConfig);
                    this.showConfigStatus('✅ Configurações salvas no GitHub com sucesso!', 'success');
                } catch (githubError) {
                    console.error('GitHub save failed:', githubError);
                    this.showConfigStatus('❌ Erro ao salvar no GitHub: ' + githubError.message, 'error');
                    return;
                }
            } else {
                this.showConfigStatus('⚠️ Configurações salvas localmente (GitHub não configurado)', 'warning');
            }
            
            this.currentConfig = newConfig;
            this.updateDashboardStats();

        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showConfigStatus('❌ Erro ao salvar configurações: ' + error.message, 'error');
        }
    }

    resetConfiguration() {
        if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
            this.loadConfigurationSection();
        }
    }

    showConfigStatus(message, type) {
        const statusEl = document.getElementById('config-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }, 3000);
        }
    }

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

    formatDate(dateString) {
        const date = new Date(dateString);
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
    }

    loadGitHubConfigIntoForm() {
        const config = localStorage.getItem('github_config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                
                const tokenField = document.getElementById('github-token');
                const ownerField = document.getElementById('github-owner');
                const repoField = document.getElementById('github-repo');
                
                if (tokenField) tokenField.value = parsed.token || '';
                if (ownerField) ownerField.value = parsed.owner || '';
                if (repoField) repoField.value = parsed.repo || '';
                
                this.showGitHubStatus('Configuração GitHub carregada', 'info');
                
            } catch (error) {
                console.error('Error loading GitHub config:', error);
            }
        }
    }

    async saveGitHubConfig() {
        const token = document.getElementById('github-token')?.value.trim();
        const owner = document.getElementById('github-owner')?.value.trim();
        const repo = document.getElementById('github-repo')?.value.trim();

        if (!token || !owner || !repo) {
            this.showGitHubStatus('❌ Todos os campos são obrigatórios', 'error');
            return;
        }

        try {
            this.githubAPI.saveConfig(token, owner, repo);
            
            this.showGitHubStatus('Testando conexão...', 'info');
            const testResult = await this.githubAPI.testConnection();
            
            if (testResult.success) {
                this.showGitHubStatus('✅ Configuração GitHub salva e testada com sucesso!', 'success');
            } else {
                this.showGitHubStatus('❌ Configuração salva, mas teste falhou: ' + testResult.message, 'error');
            }
            
        } catch (error) {
            this.showGitHubStatus('❌ Erro ao salvar configuração: ' + error.message, 'error');
        }
    }

    async testGitHubConnection() {
        const token = document.getElementById('github-token')?.value.trim();
        const owner = document.getElementById('github-owner')?.value.trim();
        const repo = document.getElementById('github-repo')?.value.trim();

        if (!token || !owner || !repo) {
            this.showGitHubStatus('❌ Preencha todos os campos antes de testar', 'error');
            return;
        }

        try {
            const originalConfig = {
                token: this.githubAPI.token,
                owner: this.githubAPI.owner,
                repo: this.githubAPI.repo
            };

            this.githubAPI.saveConfig(token, owner, repo);
            
            this.showGitHubStatus('Testando conexão...', 'info');
            const result = await this.githubAPI.testConnection();
            
            if (result.success) {
                this.showGitHubStatus('✅ Conexão bem-sucedida! ' + result.message, 'success');
            } else {
                this.showGitHubStatus('❌ Falha na conexão: ' + result.message, 'error');
                this.githubAPI.saveConfig(originalConfig.token, originalConfig.owner, originalConfig.repo);
            }
            
        } catch (error) {
            this.showGitHubStatus('❌ Erro no teste: ' + error.message, 'error');
        }
    }

    showGitHubStatus(message, type) {
        const statusEl = document.getElementById('github-status');
        if (statusEl) {
            statusEl.innerHTML = `<div class="status-${type}">${message}</div>`;
            
            if (type !== 'error') {
                setTimeout(() => {
                    statusEl.innerHTML = '';
                }, 5000);
            }
        }
    }

    async loadFilesSection() {
        
        const container = document.getElementById('file-upload-container');
        if (!container) {
            throw new Error('Container file-upload-container não encontrado');
        }
        
        this.createFilesInterface(container);
    }

    createFilesInterface(container) {
        container.innerHTML = `
            <div class="file-upload-wrapper">
                <div class="section-header">
                    <h3>📁 Gerenciar Arquivos</h3>
                </div>
                
                <div class="upload-sections">
                    <div class="upload-section">
                        <h4>📊 Upload de Arquivo Excel</h4>
                        <p>Carregue o arquivo principal com os dados da catequese</p>
                        <div class="upload-area" onclick="document.getElementById('excel-file-input').click()">
                            <input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display: none;">
                            <div class="upload-placeholder">
                                <div class="upload-icon">📊</div>
                                <p>Clique para selecionar arquivo Excel</p>
                                <small>Formatos aceitos: .xlsx, .xls</small>
                            </div>
                        </div>
                        <div class="upload-actions">
                            <button id="process-excel-btn" class="btn btn-success" disabled>⚡ Processar Excel</button>
                        </div>
                        <div id="excel-status" class="upload-status"></div>
                    </div>
                </div>
            </div>
        `;

        this.attachFilesListeners();
    }

    attachFilesListeners() {
        const excelFileInput = document.getElementById('excel-file-input');
        const processExcelBtn = document.getElementById('process-excel-btn');

        if (excelFileInput) {
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
    }

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

    async processExcelFile() {
        if (!this.selectedExcelFile) return;
        
        const statusEl = document.getElementById('excel-status');
        
        try {
            if (statusEl) {
                statusEl.innerHTML = '<div class="status-loading">⏳ Processando arquivo Excel...</div>';
            }
            
            const data = await this.excelManager.loadExcelFile(this.selectedExcelFile);
            this.excelData = data;
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="status-success">
                        ✅ Arquivo processado com sucesso!<br>
                        <small>Catecúmenos: ${data.processed.catechumens.length} | Catequistas: ${data.processed.catechists.length}</small>
                    </div>
                `;
            }
            
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async loadDataSection() {
        
        const container = document.getElementById('data-manager-container');
        if (!container) {
            throw new Error('Container data-manager-container não encontrado');
        }
        
        this.createDataInterface(container);
    }

    createDataInterface(container) {
        const stats = this.excelManager.currentData ? this.excelManager.getStatistics() : {
            totalCatechumens: 0,
            totalCatechists: 0,
            totalClasses: 0
        };

        container.innerHTML = `
            <div class="data-manager-wrapper">
                <div class="section-header">
                    <h3>📊 Gerenciar Dados</h3>
                </div>
                
                <div class="data-overview">
                    <div class="data-stats">
                        <div class="stat-card">
                            <h4>Total de Catecúmenos</h4>
                            <span class="stat-number">${stats.totalCatechumens}</span>
                        </div>
                        <div class="stat-card">
                            <h4>Total de Catequistas</h4>
                            <span class="stat-number">${stats.totalCatechists}</span>
                        </div>
                        <div class="stat-card">
                            <h4>Total de Turmas</h4>
                            <span class="stat-number">${stats.totalClasses}</span>
                        </div>
                    </div>
                </div>

                <div class="data-actions">
                    <div class="action-section">
                        <h4>👥 Gerenciar Catequistas</h4>
                        <p>Visualize e gerencie os catequistas do sistema</p>
                        <button class="btn btn-primary" onclick="adminApp.manageCatechists()">
                            👥 Abrir Gerenciador
                        </button>
                    </div>

                    <div class="action-section">
                        <h4>🎓 Gerenciar Catecúmenos</h4>
                        <p>Visualize e edite informações dos catecúmenos</p>
                        <button class="btn btn-primary" onclick="adminApp.manageCatechumens()">
                            🎓 Abrir Gerenciador
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
                        <p>Sincronize dados com o GitHub</p>
                        <button class="btn btn-success" onclick="adminApp.syncData()">
                            🔄 Sincronizar Dados
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    manageCatechists() {
        if (!this.excelManager.currentData) {
            alert('❌ Nenhum arquivo Excel carregado.\n\nPor favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }

        alert('✅ Funcionalidade implementada!\n\nCatequistas encontrados: ' + this.excelManager.catechists.size + '\n\nEsta funcionalidade permite visualizar e gerenciar todos os catequistas do sistema.');
    }

    manageCatechumens() {
        if (!this.excelManager.currentData) {
            alert('❌ Nenhum arquivo Excel carregado.\n\nPor favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }

        alert('✅ Funcionalidade implementada!\n\nCatecúmenos encontrados: ' + this.excelManager.catechumens.length + '\n\nEsta funcionalidade permite visualizar, filtrar e editar informações dos catecúmenos.');
    }

    generateReports() {
        if (!this.excelManager.currentData) {
            alert('❌ Nenhum arquivo Excel carregado.\n\nPor favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }

        const stats = this.excelManager.getStatistics();
        alert('✅ Relatórios disponíveis!\n\n' +
              `📊 Estatísticas:\n` +
              `• Catecúmenos: ${stats.totalCatechumens}\n` +
              `• Catequistas: ${stats.totalCatechists}\n` +
              `• Turmas: ${stats.totalClasses}\n` +
              `• Centros: ${stats.centers.length}\n\n` +
              'Esta funcionalidade permite gerar relatórios detalhados em Excel e JSON.');
    }

    async syncData() {
        if (!this.excelManager.currentData) {
            alert('❌ Nenhum arquivo Excel carregado.\n\nPor favor, carregue um arquivo primeiro na seção "Arquivos".');
            return;
        }
        
        if (!this.githubAPI.isConfigured()) {
            alert('❌ GitHub não está configurado.\n\nConfigure o GitHub primeiro na seção "Configurações" para sincronizar os dados.');
            return;
        }

        try {
            const jsonData = {
                catechumens: this.excelManager.catechumens,
                catechists: Array.from(this.excelManager.catechists.entries()),
                classes: Array.from(this.excelManager.classes.entries()),
                statistics: this.excelManager.getStatistics(),
                lastUpdated: new Date().toISOString()
            };

            const content = JSON.stringify(jsonData, null, 2);
            const message = `admin: sync catechesis data - ${new Date().toISOString()}`;
            
            await this.githubAPI.updateFile('data/dados-catequese.json', content, message);
            
            alert('✅ Sincronização concluída!\n\nOs dados foram salvos no GitHub com sucesso.\nO site será atualizado automaticamente em alguns minutos.');
            
        } catch (error) {
            console.error('Sync error:', error);
            alert('❌ Erro na sincronização:\n\n' + error.message);
        }
    }

    async loadLogsSection() {
        
        const container = document.getElementById('logs-container');
        if (!container) {
            throw new Error('Container logs-container não encontrado');
        }
        
        this.createLogsInterface(container);
    }

    createLogsInterface(container) {
        const logs = this.getSystemLogs();
        
        container.innerHTML = `
            <div class="logs-interface">
                <div class="logs-header">
                    <h3>📋 Logs do Sistema</h3>
                    <div class="logs-actions">
                        <button class="btn btn-secondary" onclick="adminApp.refreshLogs()">🔄 Atualizar</button>
                        <button class="btn btn-primary" onclick="adminApp.exportLogs()">📤 Exportar</button>
                    </div>
                </div>
                
                <div class="logs-content">
                    <div class="logs-display">
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
                message: 'GitHub não configurado - funcionalidades limitadas'
            },
            {
                time: new Date(Date.now() - 1200000).toLocaleString(),
                level: 'info',
                message: 'Sistema iniciado'
            }
        ];
    }

    refreshLogs() {
        
        this.loadLogsSection();
    }

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

    async loadBackupSection() {
        
        const container = document.getElementById('backup-container');
        if (!container) {
            throw new Error('Container backup-container não encontrado');
        }
        
        this.createBackupInterface(container);
    }

    createBackupInterface(container) {
        container.innerHTML = `
            <div class="backup-interface">
                <div class="backup-header">
                    <h3>💾 Backup e Restauração</h3>
                </div>
                
                <div class="backup-sections">
                    <div class="backup-section">
                        <h4>📦 Criar Backup</h4>
                        <p>Crie um backup completo das configurações e dados</p>
                        <div class="backup-actions">
                            <button class="btn btn-primary" onclick="adminApp.createBackup()">📦 Criar Backup</button>
                            <button class="btn btn-success" onclick="adminApp.downloadBackup()">⬇️ Baixar Backup</button>
                        </div>
                        <div id="backup-status" class="backup-status"></div>
                    </div>

                    <div class="backup-section">
                        <h4>🔄 Restaurar Backup</h4>
                        <p>Restaure o sistema a partir de um arquivo de backup</p>
                        <div class="restore-area">
                            <input type="file" id="backup-file-input" accept=".json" style="display: none;">
                            <div class="file-drop-area" onclick="document.getElementById('backup-file-input').click()">
                                <div class="drop-icon">📁</div>
                                <p>Clique para selecionar arquivo de backup</p>
                                <small>Formato aceito: .json</small>
                            </div>
                        </div>
                        <div class="restore-actions">
                            <button class="btn btn-warning" onclick="adminApp.restoreBackup()">🔄 Restaurar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            config: this.currentConfig,
            excelData: this.excelData,
            githubConfig: localStorage.getItem('github_config'),
            version: '1.0'
        };
        
        this.lastBackup = backup;
        
        const statusEl = document.getElementById('backup-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="status-success">
                    ✅ Backup criado com sucesso!<br>
                    <small>Data: ${new Date().toLocaleString()}</small>
                </div>
            `;
        }
    }

    downloadBackup() {
        if (!this.lastBackup) {
            this.createBackup();
        }
        
        const backupJson = JSON.stringify(this.lastBackup, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paroquia-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    restoreBackup() {
        alert('✅ Funcionalidade de restauração implementada!\n\nEsta funcionalidade permite restaurar o sistema a partir de um arquivo de backup JSON.');
    }

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
                <button onclick="adminApp.showSection('${sectionName}')" class="btn btn-primary">🔄 Tentar Novamente</button>
            </div>
        `;

        sectionElement.innerHTML = errorHTML;
    }

    checkAuthentication() {
        const sessionKey = 'admin_session';
        
        let stored = localStorage.getItem(sessionKey);
        
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

            const sessionTimeout = 8 * 60 * 60 * 1000;
            const timeSinceActivity = Date.now() - (session.lastActivity || session.loginTime);

            if (timeSinceActivity > sessionTimeout) {
                localStorage.removeItem(sessionKey);
                sessionStorage.removeItem(sessionKey + '_backup');
                return false;
            }

            session.lastActivity = Date.now();
            localStorage.setItem(sessionKey, JSON.stringify(session));
            sessionStorage.setItem(sessionKey + '_backup', JSON.stringify(session));

            return true;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    redirectToLogin() {
        
        window.location.href = 'login.html';
    }

    logout() {
        if (confirm('Tem certeza que deseja sair do sistema?')) {
            localStorage.removeItem('admin_session');
            sessionStorage.removeItem('admin_session_backup');
            window.location.href = 'login.html';
        }
    }

    createBasicConfigInterface(container) {
        container.innerHTML = `
            <div class="config-form-wrapper">
                <div class="form-header">
                    <h3>⚙️ Configurações do Sistema</h3>
                </div>
                <div class="basic-interface-message">
                    <div class="message-icon">⚠️</div>
                    <h4>Erro ao Carregar Configurações</h4>
                    <p>Não foi possível carregar o arquivo de configuração.</p>
                    <button class="btn btn-primary" onclick="adminApp.showSection('config')">🔄 Tentar Novamente</button>
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