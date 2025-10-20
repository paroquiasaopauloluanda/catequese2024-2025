/**
 * Configuration Form Builder
 * Creates dynamic forms based on settings.json structure
 */
class ConfigForm {
    constructor(container, configManager) {
        this.container = container;
        this.configManager = configManager;
        this.currentConfig = null;
        this.originalConfig = null;
        this.formElements = new Map();
        this.validationErrors = new Map();
        this.progressTracker = null;
        this.progressBar = null;
        
        this.init();
    }

    /**
     * Set progress tracker and progress bar instances
     */
    setProgressComponents(progressTracker, progressBar) {
        this.progressTracker = progressTracker;
        this.progressBar = progressBar;
    }

    /**
     * Initialize the form builder
     */
    init() {
        console.log('ConfigForm init called');
        this.container.innerHTML = '';
        this.createFormStructure();
        this.loadConfiguration();
    }

    /**
     * Create the basic form structure
     */
    createFormStructure() {
        const formHTML = `
            <div class="config-form-wrapper">
                <div class="form-header">
                    <div class="form-actions">
                        <button id="preview-changes" class="btn btn-secondary" disabled>
                            <i class="icon-eye"></i> Visualizar Alterações
                        </button>
                        <button id="reset-form" class="btn btn-secondary">
                            <i class="icon-refresh"></i> Resetar
                        </button>
                        <button id="save-config" class="btn btn-primary" disabled>
                            <i class="icon-save"></i> Salvar Configurações
                        </button>
                    </div>
                </div>
                
                <form id="config-form" class="config-form">
                    <div id="form-content" class="form-content">
                        <!-- Dynamic form content will be inserted here -->
                    </div>
                </form>
                
                <div id="preview-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Visualizar Alterações</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="changes-preview"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary modal-close">Fechar</button>
                            <button id="confirm-changes" class="btn btn-primary">Confirmar Alterações</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = formHTML;
        this.attachEventListeners();
    }

    /**
     * Load current configuration and build form
     */
    async loadConfiguration() {
        try {
            console.log('Loading configuration for form');
            this.showLoading();
            
            const config = await this.configManager.loadSettings();
            console.log('Configuration loaded:', config);
            this.currentConfig = JSON.parse(JSON.stringify(config)); // Deep copy
            this.originalConfig = JSON.parse(JSON.stringify(config)); // Deep copy
            
            this.buildForm(config);
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.showError('Erro ao carregar configurações: ' + error.message);
        }
    }

    /**
     * Build dynamic form based on configuration structure
     * @param {Object} config - Configuration object
     */
    buildForm(config) {
        const formContent = document.getElementById('form-content');
        formContent.innerHTML = '';
        
        // Create sections for each top-level configuration group
        Object.keys(config).forEach(sectionKey => {
            const section = this.createSection(sectionKey, config[sectionKey]);
            formContent.appendChild(section);
        });
        
        this.updateFormState();
    }

    /**
     * Create a form section for a configuration group
     * @param {string} sectionKey - Section key
     * @param {Object} sectionData - Section data
     * @returns {HTMLElement} Section element
     */
    createSection(sectionKey, sectionData) {
        const section = document.createElement('div');
        section.className = 'form-section';
        section.setAttribute('data-section', sectionKey);
        
        const sectionTitle = this.getSectionTitle(sectionKey);
        const sectionDescription = this.getSectionDescription(sectionKey);
        
        section.innerHTML = `
            <div class="section-header">
                <h3 class="section-title">${sectionTitle}</h3>
                ${sectionDescription ? `<p class="section-description">${sectionDescription}</p>` : ''}
            </div>
            <div class="section-content">
                ${this.createFieldsForSection(sectionKey, sectionData)}
            </div>
        `;
        
        return section;
    }

    /**
     * Create form fields for a section
     * @param {string} sectionKey - Section key
     * @param {Object} sectionData - Section data
     * @returns {string} HTML for fields
     */
    createFieldsForSection(sectionKey, sectionData) {
        let fieldsHTML = '';
        
        Object.keys(sectionData).forEach(fieldKey => {
            const fieldPath = `${sectionKey}.${fieldKey}`;
            const fieldValue = sectionData[fieldKey];
            const fieldConfig = this.getFieldConfig(sectionKey, fieldKey);
            
            fieldsHTML += this.createField(fieldPath, fieldKey, fieldValue, fieldConfig);
        });
        
        return fieldsHTML;
    }

    /**
     * Create a single form field
     * @param {string} fieldPath - Full path to field (e.g., "paroquia.nome")
     * @param {string} fieldKey - Field key
     * @param {any} fieldValue - Field value
     * @param {Object} fieldConfig - Field configuration
     * @returns {string} HTML for field
     */
    createField(fieldPath, fieldKey, fieldValue, fieldConfig) {
        const fieldId = fieldPath.replace(/\./g, '_');
        const fieldLabel = fieldConfig.label || this.formatFieldLabel(fieldKey);
        const fieldType = fieldConfig.type || this.inferFieldType(fieldValue);
        const isRequired = fieldConfig.required || false;
        const placeholder = fieldConfig.placeholder || '';
        const helpText = fieldConfig.help || '';
        
        let fieldHTML = '';
        
        switch (fieldType) {
            case 'text':
            case 'email':
            case 'url':
                fieldHTML = `
                    <input 
                        type="${fieldType}" 
                        id="${fieldId}" 
                        name="${fieldPath}" 
                        value="${this.escapeHtml(fieldValue)}" 
                        placeholder="${placeholder}"
                        ${isRequired ? 'required' : ''}
                        class="form-input"
                    >
                `;
                break;
                
            case 'number':
                fieldHTML = `
                    <input 
                        type="number" 
                        id="${fieldId}" 
                        name="${fieldPath}" 
                        value="${fieldValue}" 
                        placeholder="${placeholder}"
                        ${fieldConfig.min !== undefined ? `min="${fieldConfig.min}"` : ''}
                        ${fieldConfig.max !== undefined ? `max="${fieldConfig.max}"` : ''}
                        ${fieldConfig.step !== undefined ? `step="${fieldConfig.step}"` : ''}
                        ${isRequired ? 'required' : ''}
                        class="form-input"
                    >
                `;
                break;
                
            case 'date':
                fieldHTML = `
                    <input 
                        type="date" 
                        id="${fieldId}" 
                        name="${fieldPath}" 
                        value="${fieldValue}" 
                        ${isRequired ? 'required' : ''}
                        class="form-input"
                    >
                `;
                break;
                
            case 'select':
                const options = fieldConfig.options || [];
                fieldHTML = `
                    <select 
                        id="${fieldId}" 
                        name="${fieldPath}" 
                        ${isRequired ? 'required' : ''}
                        class="form-select"
                    >
                        ${options.map(option => 
                            `<option value="${option.value}" ${option.value === fieldValue ? 'selected' : ''}>
                                ${option.label}
                            </option>`
                        ).join('')}
                    </select>
                `;
                break;
                
            case 'checkbox':
                fieldHTML = `
                    <label class="checkbox-label">
                        <input 
                            type="checkbox" 
                            id="${fieldId}" 
                            name="${fieldPath}" 
                            ${fieldValue ? 'checked' : ''}
                            class="form-checkbox"
                        >
                        <span class="checkbox-text">${fieldLabel}</span>
                    </label>
                `;
                break;
                
            case 'textarea':
                fieldHTML = `
                    <textarea 
                        id="${fieldId}" 
                        name="${fieldPath}" 
                        placeholder="${placeholder}"
                        ${isRequired ? 'required' : ''}
                        class="form-textarea"
                        rows="3"
                    >${this.escapeHtml(fieldValue)}</textarea>
                `;
                break;
                
            case 'array':
                fieldHTML = this.createArrayField(fieldId, fieldPath, fieldValue, fieldConfig);
                break;
                
            default:
                fieldHTML = `
                    <input 
                        type="text" 
                        id="${fieldId}" 
                        name="${fieldPath}" 
                        value="${this.escapeHtml(fieldValue)}" 
                        placeholder="${placeholder}"
                        ${isRequired ? 'required' : ''}
                        class="form-input"
                    >
                `;
        }
        
        return `
            <div class="form-group" data-field="${fieldPath}">
                ${fieldType !== 'checkbox' ? `<label for="${fieldId}" class="form-label">
                    ${fieldLabel}
                    ${isRequired ? '<span class="required">*</span>' : ''}
                </label>` : ''}
                <div class="form-field">
                    ${fieldHTML}
                    ${helpText ? `<div class="field-help">${helpText}</div>` : ''}
                    <div class="field-error" id="${fieldId}_error"></div>
                </div>
            </div>
        `;
    }

    /**
     * Create array field (for arrays like campos_obrigatorios)
     * @param {string} fieldId - Field ID
     * @param {string} fieldPath - Field path
     * @param {Array} fieldValue - Field value
     * @param {Object} fieldConfig - Field configuration
     * @returns {string} HTML for array field
     */
    createArrayField(fieldId, fieldPath, fieldValue, fieldConfig) {
        const items = Array.isArray(fieldValue) ? fieldValue : [];
        
        return `
            <div class="array-field" data-field-path="${fieldPath}">
                <div class="array-items" id="${fieldId}_items">
                    ${items.map((item, index) => `
                        <div class="array-item" data-index="${index}">
                            <input 
                                type="text" 
                                value="${this.escapeHtml(item)}" 
                                class="form-input array-input"
                                placeholder="Digite um valor"
                            >
                            <button type="button" class="btn btn-small btn-danger remove-array-item">
                                <i class="icon-trash"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button type="button" class="btn btn-small btn-secondary add-array-item" data-target="${fieldId}_items">
                    <i class="icon-plus"></i> Adicionar Item
                </button>
            </div>
        `;
    }

    /**
     * Get section title for display
     * @param {string} sectionKey - Section key
     * @returns {string} Section title
     */
    getSectionTitle(sectionKey) {
        const titles = {
            'paroquia': 'Informações da Paróquia',
            'arquivos': 'Configuração de Arquivos',
            'interface': 'Configurações da Interface',
            'exportacao': 'Configurações de Exportação',
            'validacao': 'Regras de Validação'
        };
        
        return titles[sectionKey] || this.formatFieldLabel(sectionKey);
    }

    /**
     * Get section description
     * @param {string} sectionKey - Section key
     * @returns {string} Section description
     */
    getSectionDescription(sectionKey) {
        const descriptions = {
            'paroquia': 'Informações básicas sobre a paróquia e ano catequético atual',
            'arquivos': 'Caminhos para os arquivos principais do sistema',
            'interface': 'Configurações de aparência e comportamento da interface',
            'exportacao': 'Configurações para exportação de dados',
            'validacao': 'Regras de validação para dados inseridos'
        };
        
        return descriptions[sectionKey] || '';
    }

    /**
     * Get field configuration
     * @param {string} sectionKey - Section key
     * @param {string} fieldKey - Field key
     * @returns {Object} Field configuration
     */
    getFieldConfig(sectionKey, fieldKey) {
        const configs = {
            'paroquia': {
                'nome': { 
                    label: 'Nome da Paróquia', 
                    type: 'text', 
                    required: true,
                    placeholder: 'Ex: Paróquia de São Paulo'
                },
                'secretariado': { 
                    label: 'Secretariado', 
                    type: 'text', 
                    required: true,
                    placeholder: 'Ex: Secretariado da Catequese'
                },
                'ano_catequetico': { 
                    label: 'Ano Catequético', 
                    type: 'text', 
                    required: true,
                    placeholder: 'Ex: 2024/2025'
                },
                'data_inicio': { 
                    label: 'Data de Início', 
                    type: 'date', 
                    required: true 
                },
                'data_inicio_formatada': { 
                    label: 'Data de Início (Formatada)', 
                    type: 'text',
                    placeholder: 'Ex: 1 de Outubro de 2024',
                    help: 'Formato legível da data de início'
                }
            },
            'arquivos': {
                'dados_principais': { 
                    label: 'Arquivo de Dados Principais', 
                    type: 'text',
                    placeholder: 'data/dados-catequese.xlsx'
                },
                'template_export': { 
                    label: 'Template de Exportação', 
                    type: 'text',
                    placeholder: 'data/template-export.xlsx'
                },
                'logo': { 
                    label: 'Logotipo', 
                    type: 'text',
                    placeholder: 'assets/images/logo.jpg'
                }
            },
            'interface': {
                'tema': { 
                    label: 'Tema', 
                    type: 'select',
                    options: [
                        { value: 'claro', label: 'Claro' },
                        { value: 'escuro', label: 'Escuro' }
                    ]
                },
                'idioma': { 
                    label: 'Idioma', 
                    type: 'select',
                    options: [
                        { value: 'pt', label: 'Português' },
                        { value: 'en', label: 'English' }
                    ]
                },
                'items_por_pagina': { 
                    label: 'Items por Página', 
                    type: 'number',
                    min: 10,
                    max: 100,
                    step: 10
                },
                'auto_backup': { 
                    label: 'Backup Automático', 
                    type: 'checkbox'
                },
                'backup_intervalo_horas': { 
                    label: 'Intervalo de Backup (horas)', 
                    type: 'number',
                    min: 1,
                    max: 168
                }
            },
            'exportacao': {
                'template_start_cell': { 
                    label: 'Célula Inicial do Template', 
                    type: 'text',
                    placeholder: 'Ex: B8'
                },
                'template_date_cell': { 
                    label: 'Célula da Data', 
                    type: 'text',
                    placeholder: 'Ex: B6'
                },
                'nome_arquivo_padrao': { 
                    label: 'Nome Padrão do Arquivo', 
                    type: 'text',
                    placeholder: 'Ex: catequistas_filtrado'
                }
            },
            'validacao': {
                'campos_obrigatorios': { 
                    label: 'Campos Obrigatórios', 
                    type: 'array',
                    help: 'Lista de campos que são obrigatórios no sistema'
                },
                'formato_data': { 
                    label: 'Formato de Data', 
                    type: 'text',
                    placeholder: 'DD/MM/YYYY'
                },
                'idade_minima': { 
                    label: 'Idade Mínima', 
                    type: 'number',
                    min: 0,
                    max: 100
                },
                'idade_maxima': { 
                    label: 'Idade Máxima', 
                    type: 'number',
                    min: 0,
                    max: 150
                }
            }
        };
        
        return configs[sectionKey]?.[fieldKey] || {};
    }

    /**
     * Format field label for display
     * @param {string} fieldKey - Field key
     * @returns {string} Formatted label
     */
    formatFieldLabel(fieldKey) {
        return fieldKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Infer field type from value
     * @param {any} value - Field value
     * @returns {string} Field type
     */
    inferFieldType(value) {
        if (typeof value === 'boolean') return 'checkbox';
        if (typeof value === 'number') return 'number';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'string') {
            if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date';
            if (value.includes('@')) return 'email';
            if (value.startsWith('http')) return 'url';
        }
        return 'text';
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Form change detection
        document.addEventListener('input', (e) => {
            if (e.target.closest('#config-form')) {
                this.handleFieldChange(e.target);
            }
        });

        // Array field management
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-array-item')) {
                this.addArrayItem(e.target);
            } else if (e.target.closest('.remove-array-item')) {
                this.removeArrayItem(e.target);
            }
        });

        // Form actions
        document.getElementById('preview-changes')?.addEventListener('click', () => {
            this.showPreview();
        });

        document.getElementById('reset-form')?.addEventListener('click', () => {
            this.resetForm();
        });

        document.getElementById('save-config')?.addEventListener('click', () => {
            this.saveConfiguration();
        });

        // Modal handling
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close')) {
                this.hideModal();
            }
        });

        document.getElementById('confirm-changes')?.addEventListener('click', () => {
            this.hideModal();
            this.saveConfiguration();
        });
    }

    /**
     * Handle field change
     * @param {HTMLElement} field - Changed field
     */
    handleFieldChange(field) {
        this.clearFieldError(field);
        this.validateField(field);
        this.updateConfigFromForm();
        this.updateFormState();
    }

    /**
     * Add array item
     * @param {HTMLElement} button - Add button
     */
    addArrayItem(button) {
        const container = document.getElementById(button.dataset.target);
        const newIndex = container.children.length;
        
        const itemHTML = `
            <div class="array-item" data-index="${newIndex}">
                <input 
                    type="text" 
                    value="" 
                    class="form-input array-input"
                    placeholder="Digite um valor"
                >
                <button type="button" class="btn btn-small btn-danger remove-array-item">
                    <i class="icon-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHTML);
        this.updateConfigFromForm();
        this.updateFormState();
    }

    /**
     * Remove array item
     * @param {HTMLElement} button - Remove button
     */
    removeArrayItem(button) {
        const item = button.closest('.array-item');
        item.remove();
        this.updateConfigFromForm();
        this.updateFormState();
    }

    /**
     * Update configuration object from form values
     */
    updateConfigFromForm() {
        const formData = new FormData(document.getElementById('config-form'));
        const config = JSON.parse(JSON.stringify(this.originalConfig));
        
        // Handle regular form fields
        for (const [fieldPath, value] of formData.entries()) {
            this.setNestedValue(config, fieldPath, value);
        }
        
        // Handle checkboxes (not included in FormData if unchecked)
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const fieldPath = checkbox.name;
            this.setNestedValue(config, fieldPath, checkbox.checked);
        });
        
        // Handle array fields
        document.querySelectorAll('.array-field').forEach(arrayField => {
            const fieldPath = arrayField.dataset.fieldPath;
            const inputs = arrayField.querySelectorAll('.array-input');
            const values = Array.from(inputs).map(input => input.value.trim()).filter(v => v);
            this.setNestedValue(config, fieldPath, values);
        });
        
        this.currentConfig = config;
    }

    /**
     * Set nested object value using dot notation
     * @param {Object} obj - Object to modify
     * @param {string} path - Dot notation path
     * @param {any} value - Value to set
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
        const originalValue = current[lastKey];
        
        // Convert value to appropriate type
        if (typeof originalValue === 'number') {
            current[lastKey] = parseFloat(value) || 0;
        } else if (typeof originalValue === 'boolean') {
            current[lastKey] = value === true || value === 'true';
        } else {
            current[lastKey] = value;
        }
    }

    /**
     * Update form state (enable/disable buttons)
     */
    updateFormState() {
        const hasChanges = JSON.stringify(this.currentConfig) !== JSON.stringify(this.originalConfig);
        const isValid = this.validateForm();
        
        document.getElementById('preview-changes').disabled = !hasChanges;
        document.getElementById('save-config').disabled = !hasChanges || !isValid;
    }

    /**
     * Validate entire form
     * @returns {boolean} True if form is valid
     */
    validateForm() {
        let isValid = true;
        
        document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    /**
     * Validate single field
     * @param {HTMLElement} field - Field to validate
     * @returns {boolean} True if field is valid
     */
    validateField(field) {
        const value = field.value.trim();
        const isRequired = field.hasAttribute('required');
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'Este campo é obrigatório';
        }
        
        // Type-specific validation
        if (value && field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Digite um email válido';
            }
        }
        
        if (value && field.type === 'url') {
            try {
                new URL(value);
            } catch {
                isValid = false;
                errorMessage = 'Digite uma URL válida';
            }
        }
        
        if (value && field.type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) {
                isValid = false;
                errorMessage = 'Digite um número válido';
            } else {
                if (field.hasAttribute('min') && num < parseFloat(field.min)) {
                    isValid = false;
                    errorMessage = `Valor mínimo: ${field.min}`;
                }
                if (field.hasAttribute('max') && num > parseFloat(field.max)) {
                    isValid = false;
                    errorMessage = `Valor máximo: ${field.max}`;
                }
            }
        }
        
        // Show/hide error
        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }

    /**
     * Show field error
     * @param {HTMLElement} field - Field with error
     * @param {string} message - Error message
     */
    showFieldError(field, message) {
        const errorElement = document.getElementById(field.id + '_error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        field.classList.add('error');
        this.validationErrors.set(field.name, message);
    }

    /**
     * Clear field error
     * @param {HTMLElement} field - Field to clear error from
     */
    clearFieldError(field) {
        const errorElement = document.getElementById(field.id + '_error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        field.classList.remove('error');
        this.validationErrors.delete(field.name);
    }

    /**
     * Show changes preview modal
     */
    showPreview() {
        const changes = this.getChanges();
        const previewContainer = document.getElementById('changes-preview');
        
        if (changes.length === 0) {
            previewContainer.innerHTML = '<p>Nenhuma alteração detectada.</p>';
        } else {
            previewContainer.innerHTML = `
                <div class="changes-list">
                    ${changes.map(change => `
                        <div class="change-item ${change.type}">
                            <div class="change-field">${change.field}</div>
                            <div class="change-values">
                                <div class="old-value">
                                    <label>Valor Atual:</label>
                                    <span>${this.formatValue(change.oldValue)}</span>
                                </div>
                                <div class="new-value">
                                    <label>Novo Valor:</label>
                                    <span>${this.formatValue(change.newValue)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        this.showModal('preview-modal');
    }

    /**
     * Get list of changes between original and current config
     * @returns {Array} List of changes
     */
    getChanges() {
        const changes = [];
        
        this.compareObjects(this.originalConfig, this.currentConfig, '', changes);
        
        return changes;
    }

    /**
     * Compare two objects and find differences
     * @param {Object} original - Original object
     * @param {Object} current - Current object
     * @param {string} path - Current path
     * @param {Array} changes - Changes array to populate
     */
    compareObjects(original, current, path, changes) {
        const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);
        
        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;
            const originalValue = original[key];
            const currentValue = current[key];
            
            if (typeof originalValue === 'object' && typeof currentValue === 'object' && 
                !Array.isArray(originalValue) && !Array.isArray(currentValue)) {
                this.compareObjects(originalValue, currentValue, currentPath, changes);
            } else if (JSON.stringify(originalValue) !== JSON.stringify(currentValue)) {
                changes.push({
                    field: this.formatFieldPath(currentPath),
                    oldValue: originalValue,
                    newValue: currentValue,
                    type: originalValue === undefined ? 'added' : 
                          currentValue === undefined ? 'removed' : 'modified'
                });
            }
        }
    }

    /**
     * Format field path for display
     * @param {string} path - Field path
     * @returns {string} Formatted path
     */
    formatFieldPath(path) {
        return path.split('.').map(part => this.formatFieldLabel(part)).join(' → ');
    }

    /**
     * Format value for display
     * @param {any} value - Value to format
     * @returns {string} Formatted value
     */
    formatValue(value) {
        if (value === undefined) return '<não definido>';
        if (value === null) return '<nulo>';
        if (Array.isArray(value)) return `[${value.join(', ')}]`;
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (typeof value === 'string' && value === '') return '<vazio>';
        return String(value);
    }

    /**
     * Reset form to original values
     */
    resetForm() {
        if (confirm('Tem certeza que deseja descartar todas as alterações?')) {
            this.currentConfig = JSON.parse(JSON.stringify(this.originalConfig));
            this.buildForm(this.currentConfig);
        }
    }

    /**
     * Save configuration
     */
    async saveConfiguration() {
        const operationId = `config-save-${Date.now()}`;
        
        try {
            if (!this.validateForm()) {
                this.showError('Por favor, corrija os erros no formulário antes de salvar.');
                return;
            }
            
            // Start progress tracking
            if (this.progressTracker) {
                this.progressTracker.startOperation(operationId, 'Salvando Configurações', 'Iniciando salvamento...');
                
                // Create config update tracker
                const tracker = this.progressTracker.createConfigUpdateTracker(operationId);
                
                // Show inline progress in form
                if (this.progressBar) {
                    const formHeader = this.container.querySelector('.form-header');
                    this.progressBar.createInlineProgressBar(formHeader, operationId, {
                        title: 'Salvando configurações...',
                        showCancel: false,
                        showPercentage: true
                    });
                    
                    // Create button progress for save button
                    const saveBtn = document.getElementById('save-config');
                    this.progressBar.createButtonProgress(saveBtn, operationId);
                }
                
                // Step 1: Validate
                if (tracker && typeof tracker.validate === 'function') {
                    tracker.validate();
                } else {
                    console.warn('Tracker validate method not available');
                }
                await this.delay(500);
                
                // Step 2: Backup
                tracker.backup();
                await this.delay(800);
                
                // Step 3: Update
                tracker.update();
                await this.delay(300);
            }
            
            this.showLoading('Salvando configurações...');
            
            const result = await this.configManager.updateSettings(this.currentConfig);
            
            if (this.progressTracker) {
                const tracker = this.progressTracker.createConfigUpdateTracker(operationId);
                
                // Step 4: Commit
                tracker.commit();
                await this.delay(1000);
                
                // Step 5: Deploy
                tracker.deploy();
                await this.delay(1500);
            }
            
            if (result.success) {
                // Complete progress tracking
                if (this.progressTracker) {
                    this.progressTracker.completeOperation(operationId, 'Configurações salvas com sucesso!');
                }
                
                this.originalConfig = JSON.parse(JSON.stringify(this.currentConfig));
                this.updateFormState();
                this.showSuccess(result.message);
            } else {
                // Fail progress tracking with retry capability
                if (this.progressTracker) {
                    const retryFunction = () => this.saveConfiguration();
                    
                    this.progressTracker.failOperation(operationId, result.message, {
                        canRetry: true,
                        retryFunction,
                        showNotification: true
                    });
                }
                
                this.showError(result.message);
            }
            
        } catch (error) {
            console.error('Error saving configuration:', error);
            
            // Fail progress tracking with retry capability
            if (this.progressTracker) {
                const retryFunction = () => this.saveConfiguration();
                
                this.progressTracker.failOperation(operationId, error.message, {
                    canRetry: true,
                    retryFunction,
                    showNotification: true
                });
            }
            
            this.showError('Erro ao salvar configurações: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Utility method to create delays for progress simulation
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show modal
     * @param {string} modalId - Modal ID
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Hide modal
     */
    hideModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Carregando...') {
        // Use the app's progress overlay if available
        if (window.adminApp) {
            window.adminApp.showProgressOverlay(message);
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        // Use the app's progress overlay if available
        if (window.adminApp) {
            setTimeout(() => window.adminApp.hideProgressOverlay(), 1000);
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        if (window.HelperUtils) {
            window.HelperUtils.showNotification(message, 'success');
        } else {
            console.log('Success:', message);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
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
    module.exports = ConfigForm;
} else {
    window.ConfigForm = ConfigForm;
}