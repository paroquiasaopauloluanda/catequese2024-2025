/**
 * Validation Utilities
 * Common validation functions used throughout the admin panel
 */

window.ValidationUtils = {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate date format (YYYY-MM-DD)
     * @param {string} date - Date string to validate
     * @returns {boolean} True if valid date
     */
    isValidDate(date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) return false;
        
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj);
    },

    /**
     * Validate GitHub repository format (owner/repo)
     * @param {string} repo - Repository string to validate
     * @returns {boolean} True if valid format
     */
    isValidGitHubRepo(repo) {
        const repoRegex = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
        return repoRegex.test(repo);
    },

    /**
     * Validate GitHub token format
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid format
     */
    isValidGitHubToken(token) {
        // GitHub personal access tokens are typically 40 characters
        // Classic tokens start with 'ghp_', fine-grained tokens start with 'github_pat_'
        const tokenRegex = /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})$/;
        return tokenRegex.test(token);
    },

    /**
     * Validate required fields in an object
     * @param {Object} obj - Object to validate
     * @param {string[]} requiredFields - Array of required field names
     * @returns {ValidationResult} Validation result
     */
    validateRequiredFields(obj, requiredFields) {
        const errors = [];
        const warnings = [];

        if (!obj || typeof obj !== 'object') {
            errors.push('Objeto inválido para validação');
            return { isValid: false, errors, warnings };
        }

        requiredFields.forEach(field => {
            const value = this.getNestedValue(obj, field);
            
            if (value === undefined || value === null || value === '') {
                errors.push(`Campo obrigatório não preenchido: ${field}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    },

    /**
     * Get nested object value using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path (e.g., 'paroquia.nome')
     * @returns {any} Value at path or undefined
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    },

    /**
     * Set nested object value using dot notation
     * @param {Object} obj - Object to modify
     * @param {string} path - Dot notation path
     * @param {any} value - Value to set
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    },

    /**
     * Validate string length
     * @param {string} str - String to validate
     * @param {number} minLength - Minimum length
     * @param {number} maxLength - Maximum length
     * @returns {ValidationResult} Validation result
     */
    validateStringLength(str, minLength = 0, maxLength = Infinity) {
        const errors = [];
        const warnings = [];

        if (typeof str !== 'string') {
            errors.push('Valor deve ser uma string');
            return { isValid: false, errors, warnings };
        }

        if (str.length < minLength) {
            errors.push(`Texto muito curto. Mínimo: ${minLength} caracteres`);
        }

        if (str.length > maxLength) {
            errors.push(`Texto muito longo. Máximo: ${maxLength} caracteres`);
        }

        if (str.length > maxLength * 0.9) {
            warnings.push(`Texto próximo do limite máximo (${str.length}/${maxLength})`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    },

    /**
     * Validate numeric range
     * @param {number} num - Number to validate
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {ValidationResult} Validation result
     */
    validateNumericRange(num, min = -Infinity, max = Infinity) {
        const errors = [];
        const warnings = [];

        if (typeof num !== 'number' || isNaN(num)) {
            errors.push('Valor deve ser um número válido');
            return { isValid: false, errors, warnings };
        }

        if (num < min) {
            errors.push(`Valor muito baixo. Mínimo: ${min}`);
        }

        if (num > max) {
            errors.push(`Valor muito alto. Máximo: ${max}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    },

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} html - HTML string to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },

    /**
     * Validate and sanitize form input
     * @param {string} input - Input to validate
     * @param {Object} rules - Validation rules
     * @returns {ValidationResult & {sanitized: string}} Validation result with sanitized input
     */
    validateAndSanitizeInput(input, rules = {}) {
        const {
            required = false,
            minLength = 0,
            maxLength = Infinity,
            pattern = null,
            type = 'text'
        } = rules;

        const errors = [];
        const warnings = [];
        let sanitized = input;

        // Check if required
        if (required && (!input || input.trim() === '')) {
            errors.push('Campo obrigatório');
            return { isValid: false, errors, warnings, sanitized: '' };
        }

        // Skip further validation if empty and not required
        if (!input || input.trim() === '') {
            return { isValid: true, errors, warnings, sanitized: '' };
        }

        // Sanitize input
        sanitized = this.sanitizeHtml(input.trim());

        // Validate length
        const lengthValidation = this.validateStringLength(sanitized, minLength, maxLength);
        errors.push(...lengthValidation.errors);
        warnings.push(...lengthValidation.warnings);

        // Validate pattern
        if (pattern && !pattern.test(sanitized)) {
            errors.push('Formato inválido');
        }

        // Type-specific validation
        switch (type) {
            case 'email':
                if (!this.isValidEmail(sanitized)) {
                    errors.push('Email inválido');
                }
                break;
            case 'url':
                if (!this.isValidUrl(sanitized)) {
                    errors.push('URL inválida');
                }
                break;
            case 'date':
                if (!this.isValidDate(sanitized)) {
                    errors.push('Data inválida (formato: YYYY-MM-DD)');
                }
                break;
            case 'github-repo':
                if (!this.isValidGitHubRepo(sanitized)) {
                    errors.push('Formato de repositório inválido (owner/repo)');
                }
                break;
            case 'github-token':
                if (!this.isValidGitHubToken(sanitized)) {
                    errors.push('Token GitHub inválido');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            sanitized
        };
    },

    /**
     * Validate form data against schema
     * @param {Object} formData - Form data to validate
     * @param {Object} schema - Validation schema
     * @returns {ValidationResult & {sanitizedData: Object}} Validation result with sanitized data
     */
    validateFormData(formData, schema) {
        const errors = [];
        const warnings = [];
        const sanitizedData = {};

        for (const [fieldName, rules] of Object.entries(schema)) {
            const fieldValue = this.getNestedValue(formData, fieldName);
            const validation = this.validateAndSanitizeInput(fieldValue, rules);

            if (!validation.isValid) {
                validation.errors.forEach(error => {
                    errors.push(`${fieldName}: ${error}`);
                });
            }

            warnings.push(...validation.warnings.map(warning => `${fieldName}: ${warning}`));
            
            this.setNestedValue(sanitizedData, fieldName, validation.sanitized);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            sanitizedData
        };
    },

    /**
     * Create validation schema for parish settings
     * @returns {Object} Validation schema
     */
    getParishSettingsSchema() {
        return {
            'paroquia.nome': {
                required: true,
                minLength: 2,
                maxLength: 100,
                type: 'text'
            },
            'paroquia.secretariado': {
                required: true,
                minLength: 2,
                maxLength: 100,
                type: 'text'
            },
            'paroquia.ano_catequetico': {
                required: true,
                pattern: /^\d{4}$/,
                type: 'text'
            },
            'paroquia.data_inicio': {
                required: true,
                type: 'date'
            },
            'github.repository': {
                required: true,
                type: 'github-repo'
            },
            'github.token': {
                required: true,
                type: 'github-token'
            },
            'github.branch': {
                required: false,
                minLength: 1,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9._/-]+$/,
                type: 'text'
            }
        };
    },

    /**
     * Debounce function for input validation
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    /**
     * Real-time validation for form fields
     * @param {HTMLElement} field - Form field element
     * @param {Object} rules - Validation rules
     * @param {Function} callback - Callback for validation result
     */
    setupRealTimeValidation(field, rules, callback) {
        const debouncedValidation = this.debounce((value) => {
            const result = this.validateAndSanitizeInput(value, rules);
            callback(result);
        }, 300);

        field.addEventListener('input', (e) => {
            debouncedValidation(e.target.value);
        });

        field.addEventListener('blur', (e) => {
            const result = this.validateAndSanitizeInput(e.target.value, rules);
            callback(result);
        });
    }
};