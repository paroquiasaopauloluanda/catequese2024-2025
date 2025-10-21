/**
 * Configuration Manager
 * Handles loading, updating, and validating configuration settings
 */
class ConfigManager {
    constructor() {
        this.configPath = '../config/settings.json';
        this.backupKey = 'config_backups';
        this.maxBackups = 10;
        this.currentConfig = null;
        
        // Initialize file optimizer for caching
        this.fileOptimizer = new FileOptimizer();
        this.configCacheKey = 'settings_config';
        
        // Log manager
        this.logManager = null;
    }

    /**
     * Set log manager instance
     * @param {LogManager} logManager - Log manager instance
     */
    setLogManager(logManager) {
        this.logManager = logManager;
    }

    /**
     * Load current configuration from the repository with caching
     * @returns {Promise<SettingsConfig>} Current configuration
     */
    async loadSettings() {
        try {
            // Check cache first
            const cachedConfig = this.fileOptimizer.getCachedConfig(this.configCacheKey);
            if (cachedConfig) {
                
                this.currentConfig = cachedConfig;
                return cachedConfig;
            }
            
            
            
            let config;
            
            // Try to load from GitHub first if GitHubManager is available and configured
            if (window.adminApp && window.adminApp.githubManager && window.adminApp.githubManager.isConfigured()) {
                try {
                    config = await this.loadFromGitHub();
                } catch (githubError) {
                    console.warn('Failed to load from GitHub, falling back to local:', githubError);
                    config = await this.loadFromLocal();
                }
            } else {
                // Load from local file
                config = await this.loadFromLocal();
            }
            
            // Ensure config is not null or undefined
            if (!config) {
                console.warn('Configuration is null/undefined, using defaults');
                config = this.getDefaultConfig();
            }
            
            // Validate configuration
            const validation = this.validateConfig(config);
            
            if (!validation.isValid) {
                console.warn('Configuration validation failed:', validation.errors);
                // Try to merge with defaults to fix missing fields
                config = this.mergeWithDefaults(config);
                
                // Validate again
                const secondValidation = this.validateConfig(config);
                if (!secondValidation.isValid) {
                    console.warn('Second validation failed, using defaults');
                    config = this.getDefaultConfig();
                }
            }
            
            // Cache the valid configuration
            this.fileOptimizer.cacheConfig(this.configCacheKey, config);
            
            this.currentConfig = config;
            return config;
            
        } catch (error) {
            console.error('Error loading settings:', error);
            
            // Return default configuration if loading fails
            const defaultConfig = this.getDefaultConfig();
            this.currentConfig = defaultConfig;
            return defaultConfig;
        }
    }

    /**
     * Load configuration from GitHub repository
     * @returns {Promise<SettingsConfig>} Configuration from GitHub
     */
    async loadFromGitHub() {
        const githubManager = window.adminApp.githubManager;
        const fileData = await githubManager.getFileContent('config/settings.json');
        
        if (!fileData || !fileData.content) {
            throw new Error('Configuration file not found in repository');
        }
        
        return JSON.parse(fileData.content);
    }

    /**
     * Load configuration from local file
     * @returns {Promise<SettingsConfig>} Configuration from local file
     */
    async loadFromLocal() {
        const response = await fetch(this.configPath);
        
        if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Merge configuration with defaults to fill missing fields
     * @param {Object} config - Configuration to merge
     * @returns {SettingsConfig} Merged configuration
     */
    mergeWithDefaults(config) {
        const defaults = this.getDefaultConfig();
        return this.deepMerge(defaults, config);
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const result = JSON.parse(JSON.stringify(target)); // Deep copy
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
                        result[key] = this.deepMerge(result[key], source[key]);
                    } else {
                        result[key] = JSON.parse(JSON.stringify(source[key]));
                    }
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Get default configuration structure
     * @returns {SettingsConfig} Default configuration
     */
    getDefaultConfig() {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        
        return {
            paroquia: {
                nome: "Paróquia de São Paulo",
                secretariado: "Secretariado da Catequese",
                ano_catequetico: `${currentYear}/${nextYear}`,
                data_inicio: `${currentYear}-10-01`,
                data_inicio_formatada: `1 de Outubro de ${currentYear}`
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
            },
            exportacao: {
                template_start_cell: "B8",
                template_date_cell: "B6",
                nome_arquivo_padrao: "catequistas_filtrado"
            },
            validacao: {
                campos_obrigatorios: ["nome", "centro", "etapa", "sala", "horario", "catequistas"],
                formato_data: "DD/MM/YYYY",
                idade_minima: 6,
                idade_maxima: 99
            },
            github: {
                token: "ghp_mock_token_for_development_1234567890123456",
                repository: "user/repo",
                branch: "main"
            }
        };
    }

    /**
     * Update configuration settings
     * @param {SettingsConfig} newConfig - New configuration
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async updateSettings(newConfig) {
        const startTime = Date.now();
        
        try {
            // Log the update attempt
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logInfo('config', 'Iniciando atualização de configurações');
            }
            
            // Validate new configuration
            const validation = this.validateConfig(newConfig);
            
            if (!validation.isValid) {
                const errorMessage = `Configuração inválida: ${validation.errors.join(', ')}`;
                if (window.adminApp && window.adminApp.logManager) {
                    window.adminApp.logManager.logError('config', errorMessage, { 
                        validationErrors: validation.errors 
                    });
                }
                return {
                    success: false,
                    message: errorMessage
                };
            }

            // Create backup before updating
            if (this.currentConfig) {
                await this.createBackup(this.currentConfig, 'Backup automático antes da atualização');
            }

            // Update configuration
            if (window.adminApp && window.adminApp.githubManager && window.adminApp.githubManager.isConfigured()) {
                await this.updateViaGitHub(newConfig);
            } else {
                await this.updateLocally(newConfig);
            }
            
            // Update cache with new configuration
            this.fileOptimizer.cacheConfig(this.configCacheKey, newConfig);
            
            this.currentConfig = newConfig;
            
            const duration = Date.now() - startTime;
            const successMessage = 'Configurações atualizadas com sucesso!';
            
            // Log success
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logSuccess('config', successMessage, { 
                    duration,
                    files: ['config/settings.json']
                });
            }
            
            return {
                success: true,
                message: successMessage
            };
            
        } catch (error) {
            console.error('Error updating settings:', error);
            const duration = Date.now() - startTime;
            const errorMessage = `Erro ao atualizar configurações: ${error.message}`;
            
            // Log error
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logError('config', errorMessage, { 
                    duration,
                    error: error.message,
                    stack: error.stack
                });
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Update configuration via GitHub API
     * @param {SettingsConfig} config - Configuration to update
     * @returns {Promise<void>}
     */
    async updateViaGitHub(config) {
        const githubManager = window.adminApp.githubManager;
        const configJson = JSON.stringify(config, null, 2);
        
        const commitMessage = `Atualizar configurações da paróquia - ${new Date().toLocaleString('pt-BR')}`;
        
        await githubManager.commitFile('config/settings.json', configJson, commitMessage);
    }

    /**
     * Update configuration locally (for development/testing)
     * @param {SettingsConfig} config - Configuration to update
     * @returns {Promise<void>}
     */
    async updateLocally(config) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In a local environment, we can't actually update the file
        // This is just for testing the interface
        
    }

    /**
     * Validate configuration against schema
     * @param {any} config - Configuration to validate
     * @returns {ValidationResult} Validation result
     */
    validateConfig(config) {
        if (window.TypeValidators && window.TypeValidators.validateSettingsConfig) {
            return window.TypeValidators.validateSettingsConfig(config);
        }
        
        // Fallback validation if TypeValidators is not available
        return this.basicValidation(config);
    }

    /**
     * Basic configuration validation
     * @param {any} config - Configuration to validate
     * @returns {ValidationResult} Validation result
     */
    basicValidation(config) {
        const errors = [];
        
        if (!config || typeof config !== 'object') {
            errors.push('Configuração deve ser um objeto');
            return { isValid: false, errors };
        }
        
        // Validate required sections
        const requiredSections = ['paroquia', 'arquivos'];
        for (const section of requiredSections) {
            if (!config[section] || typeof config[section] !== 'object') {
                errors.push(`Seção '${section}' é obrigatória`);
            }
        }
        
        // Validate paroquia section
        if (config.paroquia) {
            const requiredParoquiaFields = ['nome', 'secretariado', 'ano_catequetico'];
            for (const field of requiredParoquiaFields) {
                if (!config.paroquia[field] || typeof config.paroquia[field] !== 'string' || config.paroquia[field].trim() === '') {
                    errors.push(`Campo '${field}' na seção paróquia é obrigatório e não pode estar vazio`);
                }
            }
        }
        
        // Validate GitHub token if present
        if (config.github && config.github.token) {
            const token = config.github.token.trim();
            if (token.length > 0) {
                // Only validate if token is not empty
                if (token.length < 40) {
                    errors.push('Token do GitHub deve ter pelo menos 40 caracteres');
                }
                
                const validPrefixes = ['ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_'];
                const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));
                
                if (!hasValidPrefix) {
                    errors.push('Token do GitHub deve começar com um prefixo válido (ghp_, gho_, ghu_, ghs_, ghr_)');
                }
                
                if (!/^[a-zA-Z0-9_]+$/.test(token)) {
                    errors.push('Token do GitHub contém caracteres inválidos');
                }
            }
        }
        
        // Validate arquivos section
        if (config.arquivos) {
            const requiredArquivosFields = ['dados_principais'];
            for (const field of requiredArquivosFields) {
                if (!config.arquivos[field] || typeof config.arquivos[field] !== 'string' || config.arquivos[field].trim() === '') {
                    errors.push(`Campo 'paroquia.${field}' é obrigatório`);
                }
            }
            
            // Validate date format
            if (config.paroquia.data_inicio) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(config.paroquia.data_inicio)) {
                    errors.push('Campo data_inicio deve estar no formato YYYY-MM-DD');
                }
            }
        }
        
        // Validate arquivos section
        if (config.arquivos) {
            const requiredFileFields = ['dados_principais', 'template_export'];
            for (const field of requiredFileFields) {
                if (!config.arquivos[field] || typeof config.arquivos[field] !== 'string') {
                    errors.push(`Campo 'arquivos.${field}' é obrigatório`);
                }
            }
        }
        
        // Validate validacao section
        if (config.validacao) {
            if (!Array.isArray(config.validacao.campos_obrigatorios)) {
                errors.push('Campo campos_obrigatorios deve ser um array');
            }
            
            if (config.validacao.idade_minima !== undefined) {
                const idadeMin = Number(config.validacao.idade_minima);
                if (isNaN(idadeMin) || idadeMin < 0 || idadeMin > 100) {
                    errors.push('Idade mínima deve ser um número entre 0 e 100');
                }
            }
            
            if (config.validacao.idade_maxima !== undefined) {
                const idadeMax = Number(config.validacao.idade_maxima);
                if (isNaN(idadeMax) || idadeMax < 0 || idadeMax > 150) {
                    errors.push('Idade máxima deve ser um número entre 0 e 150');
                }
            }
        }
        
        // Validate interface section if present
        if (config.interface) {
            if (config.interface.items_por_pagina !== undefined) {
                const itemsPorPagina = Number(config.interface.items_por_pagina);
                if (isNaN(itemsPorPagina) || itemsPorPagina < 1 || itemsPorPagina > 1000) {
                    errors.push('Items por página deve ser um número entre 1 e 1000');
                }
            }
            
            if (config.interface.backup_intervalo_horas !== undefined) {
                const intervalo = Number(config.interface.backup_intervalo_horas);
                if (isNaN(intervalo) || intervalo < 1 || intervalo > 168) {
                    errors.push('Intervalo de backup deve ser um número entre 1 e 168 horas');
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get configuration schema for validation
     * @returns {Object} Configuration schema
     */
    getConfigSchema() {
        return {
            paroquia: {
                type: 'object',
                required: true,
                properties: {
                    nome: { type: 'string', required: true },
                    secretariado: { type: 'string', required: true },
                    ano_catequetico: { type: 'string', required: true },
                    data_inicio: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
                    data_inicio_formatada: { type: 'string' }
                }
            },
            arquivos: {
                type: 'object',
                required: true,
                properties: {
                    dados_principais: { type: 'string', required: true },
                    template_export: { type: 'string', required: true },
                    logo: { type: 'string' }
                }
            },
            interface: {
                type: 'object',
                properties: {
                    tema: { type: 'string', enum: ['claro', 'escuro'] },
                    idioma: { type: 'string', enum: ['pt', 'en'] },
                    items_por_pagina: { type: 'number', min: 1, max: 1000 },
                    auto_backup: { type: 'boolean' },
                    backup_intervalo_horas: { type: 'number', min: 1, max: 168 }
                }
            },
            exportacao: {
                type: 'object',
                required: true,
                properties: {
                    template_start_cell: { type: 'string' },
                    template_date_cell: { type: 'string' },
                    nome_arquivo_padrao: { type: 'string' }
                }
            },
            validacao: {
                type: 'object',
                required: true,
                properties: {
                    campos_obrigatorios: { type: 'array', required: true },
                    formato_data: { type: 'string' },
                    idade_minima: { type: 'number', min: 0, max: 100 },
                    idade_maxima: { type: 'number', min: 0, max: 150 }
                }
            }
        };
    }

    /**
     * Create a backup of the current configuration
     * @param {SettingsConfig} config - Configuration to backup
     * @param {string} description - Backup description
     * @returns {Promise<string>} Backup ID
     */
    async createBackup(config, description = '') {
        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const backup = {
            id: backupId,
            timestamp: new Date().toISOString(),
            config: JSON.parse(JSON.stringify(config)), // Deep copy
            description: description || `Backup criado em ${new Date().toLocaleString('pt-BR')}`,
            size: JSON.stringify(config).length
        };

        // Get existing backups
        const backups = this.getBackups();
        
        // Add new backup
        backups.unshift(backup);
        
        // Keep only the most recent backups
        if (backups.length > this.maxBackups) {
            backups.splice(this.maxBackups);
        }
        
        // Save to localStorage
        localStorage.setItem(this.backupKey, JSON.stringify(backups));
        
        return backupId;
    }

    /**
     * Get list of available backups
     * @returns {BackupData[]} List of backups
     */
    getBackups() {
        const stored = localStorage.getItem(this.backupKey);
        if (!stored) return [];
        
        try {
            return JSON.parse(stored);
        } catch (error) {
            console.error('Error parsing backups:', error);
            return [];
        }
    }

    /**
     * Restore configuration from backup
     * @param {string} backupId - Backup ID to restore
     * @returns {Promise<{success: boolean, message: string, config?: SettingsConfig}>}
     */
    async restoreFromBackup(backupId) {
        const startTime = Date.now();
        
        try {
            // Log restore attempt
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logInfo('backup', `Iniciando restauração do backup: ${backupId}`);
            }
            
            const backups = this.getBackups();
            const backup = backups.find(b => b.id === backupId);
            
            if (!backup) {
                const errorMessage = 'Backup não encontrado';
                if (window.adminApp && window.adminApp.logManager) {
                    window.adminApp.logManager.logError('backup', errorMessage, { backupId });
                }
                return {
                    success: false,
                    message: errorMessage
                };
            }

            // Validate backup configuration
            const validation = this.validateConfig(backup.config);
            
            if (!validation.isValid) {
                const errorMessage = `Backup inválido: ${validation.errors.join(', ')}`;
                if (window.adminApp && window.adminApp.logManager) {
                    window.adminApp.logManager.logError('backup', errorMessage, { 
                        backupId,
                        validationErrors: validation.errors 
                    });
                }
                return {
                    success: false,
                    message: errorMessage
                };
            }

            // Create backup of current config before restoring
            if (this.currentConfig) {
                await this.createBackup(this.currentConfig, 'Backup antes da restauração');
            }

            // Restore configuration
            const result = await this.updateSettings(backup.config);
            
            if (result.success) {
                const duration = Date.now() - startTime;
                const successMessage = `Configuração restaurada do backup de ${new Date(backup.timestamp).toLocaleString('pt-BR')}`;
                
                // Log success
                if (window.adminApp && window.adminApp.logManager) {
                    window.adminApp.logManager.logSuccess('backup', successMessage, { 
                        backupId,
                        backupDate: backup.timestamp,
                        duration,
                        files: ['config/settings.json']
                    });
                }
                
                return {
                    success: true,
                    message: successMessage,
                    config: backup.config
                };
            } else {
                return result;
            }
            
        } catch (error) {
            console.error('Error restoring backup:', error);
            const duration = Date.now() - startTime;
            const errorMessage = `Erro ao restaurar backup: ${error.message}`;
            
            // Log error
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logError('backup', errorMessage, { 
                    backupId,
                    duration,
                    error: error.message,
                    stack: error.stack
                });
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Delete a backup
     * @param {string} backupId - Backup ID to delete
     * @returns {boolean} True if deleted successfully
     */
    deleteBackup(backupId) {
        try {
            const backups = this.getBackups();
            const filteredBackups = backups.filter(b => b.id !== backupId);
            
            if (filteredBackups.length === backups.length) {
                return false; // Backup not found
            }
            
            localStorage.setItem(this.backupKey, JSON.stringify(filteredBackups));
            return true;
            
        } catch (error) {
            console.error('Error deleting backup:', error);
            return false;
        }
    }

    /**
     * Export configuration as JSON file
     * @param {SettingsConfig} config - Configuration to export
     * @returns {void}
     */
    exportConfig(config = this.currentConfig) {
        if (!config) {
            throw new Error('Nenhuma configuração disponível para exportar');
        }

        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `configuracao-paroquia-${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(link.href);
    }

    /**
     * Import configuration from JSON file
     * @param {File} file - JSON file to import
     * @returns {Promise<{success: boolean, message: string, config?: SettingsConfig}>}
     */
    async importConfig(file) {
        try {
            if (!file || file.type !== 'application/json') {
                return {
                    success: false,
                    message: 'Por favor, selecione um arquivo JSON válido'
                };
            }

            const text = await file.text();
            const config = JSON.parse(text);
            
            const validation = this.validateConfig(config);
            
            if (!validation.isValid) {
                return {
                    success: false,
                    message: `Arquivo de configuração inválido: ${validation.errors.join(', ')}`
                };
            }

            return {
                success: true,
                message: 'Configuração importada com sucesso',
                config
            };
            
        } catch (error) {
            console.error('Error importing config:', error);
            return {
                success: false,
                message: `Erro ao importar configuração: ${error.message}`
            };
        }
    }

    /**
     * Get current configuration
     * @returns {SettingsConfig|null} Current configuration
     */
    getCurrentConfig() {
        return this.currentConfig;
    }

    /**
     * Reset configuration to defaults
     * @returns {SettingsConfig} Default configuration
     */
    resetToDefaults() {
        this.currentConfig = this.getDefaultConfig();
        return this.currentConfig;
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to get value from
     * @param {string} path - Dot notation path (e.g., "paroquia.nome")
     * @returns {any} Value at path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Set nested value in object using dot notation
     * @param {Object} obj - Object to modify
     * @param {string} path - Dot notation path (e.g., "paroquia.nome")
     * @param {any} value - Value to set
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        // Navigate to the parent of the target property
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Set the final value
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
    }

    /**
     * Flatten nested object for form handling
     * @param {Object} obj - Object to flatten
     * @param {string} prefix - Prefix for keys
     * @returns {Object} Flattened object
     */
    flattenObject(obj, prefix = '') {
        const flattened = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                } else {
                    flattened[newKey] = value;
                }
            }
        }
        
        return flattened;
    }

    /**
     * Unflatten object from form data
     * @param {Object} flattened - Flattened object
     * @returns {Object} Nested object
     */
    unflattenObject(flattened) {
        const result = {};
        
        for (const key in flattened) {
            if (flattened.hasOwnProperty(key)) {
                this.setNestedValue(result, key, flattened[key]);
            }
        }
        
        return result;
    }

    /**
     * Compare two configurations and get differences
     * @param {Object} config1 - First configuration
     * @param {Object} config2 - Second configuration
     * @returns {Array} Array of differences
     */
    getConfigDifferences(config1, config2) {
        const differences = [];
        const flat1 = this.flattenObject(config1);
        const flat2 = this.flattenObject(config2);
        
        // Get all unique keys
        const allKeys = new Set([...Object.keys(flat1), ...Object.keys(flat2)]);
        
        for (const key of allKeys) {
            const value1 = flat1[key];
            const value2 = flat2[key];
            
            if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                differences.push({
                    path: key,
                    oldValue: value1,
                    newValue: value2,
                    type: value1 === undefined ? 'added' : 
                          value2 === undefined ? 'removed' : 'modified'
                });
            }
        }
        
        return differences;
    }

    /**
     * Sanitize configuration values
     * @param {Object} config - Configuration to sanitize
     * @returns {Object} Sanitized configuration
     */
    sanitizeConfig(config) {
        const sanitized = JSON.parse(JSON.stringify(config)); // Deep copy
        
        // Sanitize string values
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return str;
            return str.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
        };
        
        // Recursively sanitize all string values
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'string') {
                        obj[key] = sanitizeString(obj[key]);
                    } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                        sanitizeObject(obj[key]);
                    } else if (Array.isArray(obj[key])) {
                        obj[key] = obj[key].map(item => 
                            typeof item === 'string' ? sanitizeString(item) : item
                        );
                    }
                }
            }
        };
        
        sanitizeObject(sanitized);
        return sanitized;
    }

    /**
     * Demonstrate comprehensive error handling and user feedback
     * This method shows how the new error handling system works
     * @param {Object} testConfig - Test configuration to validate
     * @returns {Promise<Object>} Validation result with user feedback
     */
    async demonstrateErrorHandling(testConfig) {
        try {
            // Simulate different types of errors for demonstration
            if (!testConfig) {
                throw new ValidationError('Configuração não fornecida');
            }

            if (testConfig.simulateNetworkError) {
                throw new NetworkError('Falha na conexão com o servidor');
            }

            if (testConfig.simulateGitHubError) {
                throw new GitHubAPIError('Token GitHub inválido ou expirado');
            }

            // Show progress notification
            const progressNotification = window.adminApp?.notificationManager?.showProgress(
                'Validando configuração...', 
                { 
                    title: 'Processando',
                    cancellable: true,
                    onCancel: () => 
                }
            );

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update progress
            if (progressNotification) {
                progressNotification.update('Verificando dados...', 50);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                progressNotification.update('Finalizando validação...', 90);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                progressNotification.complete('Configuração validada com sucesso!');
            }

            // Show success notification
            if (window.adminApp?.notificationManager) {
                window.adminApp.notificationManager.showNotification(
                    'Configuração processada com sucesso',
                    'success',
                    {
                        actions: [
                            {
                                label: 'Ver Detalhes',
                                handler: () => {
                                    
                                }
                            }
                        ]
                    }
                );
            }

            return {
                success: true,
                message: 'Configuração validada com sucesso',
                data: testConfig
            };

        } catch (error) {
            // The error will be handled by the ErrorWrapper automatically
            // This demonstrates how errors are caught and processed
            
            
            // Re-throw to let the error handling system process it
            throw error;
        }
    }

    /**
     * Show confirmation dialog before critical operations
     * @param {string} operation - Operation description
     * @param {Object} options - Confirmation options
     * @returns {Promise<boolean>} True if confirmed
     */
    async confirmCriticalOperation(operation, options = {}) {
        if (!window.adminApp?.dialogManager) {
            return confirm(`Tem certeza que deseja ${operation}?`);
        }

        return window.adminApp.dialogManager.showConfirmation({
            title: 'Confirmação Necessária',
            message: `Tem certeza que deseja ${operation}?\n\nEsta ação não pode ser desfeita.`,
            type: 'warning',
            dangerous: options.dangerous || false,
            confirmText: options.confirmText || 'Confirmar',
            cancelText: options.cancelText || 'Cancelar'
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
} else {
    window.ConfigManager = ConfigManager;
}