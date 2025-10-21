/**
 * Helper Utilities
 * Common utility functions used throughout the admin panel
 */

window.HelperUtils = {
    /**
     * Generate unique ID
     * @param {string} prefix - Optional prefix for the ID
     * @returns {string} Unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @param {string} locale - Locale for formatting
     * @returns {string} Formatted date
     */
    formatDate(date, locale = 'pt-BR') {
        if (!date) return '';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        
        if (isNaN(dateObj.getTime())) return 'Data inválida';
        
        return dateObj.toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },

    /**
     * Format datetime for display
     * @param {Date|string} date - Date to format
     * @param {string} locale - Locale for formatting
     * @returns {string} Formatted datetime
     */
    formatDateTime(date, locale = 'pt-BR') {
        if (!date) return '';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        
        if (isNaN(dateObj.getTime())) return 'Data inválida';
        
        return dateObj.toLocaleString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /**
     * Format relative time (e.g., "2 minutes ago")
     * @param {Date|string} date - Date to format
     * @param {string} locale - Locale for formatting
     * @returns {string} Relative time string
     */
    formatRelativeTime(date, locale = 'pt-BR') {
        if (!date) return '';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'agora mesmo';
        if (diffMins < 60) return `${diffMins} minuto${diffMins > 1 ? 's' : ''} atrás`;
        if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
        if (diffDays < 7) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
        
        return this.formatDate(dateObj, locale);
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Create DOM element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|Node|Node[]} content - Element content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Set content
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    },

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {'success'|'error'|'warning'|'info'} type - Notification type
     * @param {number} duration - Duration in milliseconds (0 = permanent)
     * @returns {string} Notification ID
     */
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return null;

        const id = this.generateId('notification');
        
        const notification = this.createElement('div', {
            className: `notification ${type}`,
            id: id
        });

        const header = this.createElement('div', {
            className: 'notification-header'
        });

        const title = this.createElement('div', {
            className: 'notification-title'
        }, this.getNotificationTitle(type));

        const closeBtn = this.createElement('button', {
            className: 'notification-close',
            type: 'button'
        }, '×');

        const messageEl = this.createElement('div', {
            className: 'notification-message'
        }, this.escapeHtml(message));

        header.appendChild(title);
        header.appendChild(closeBtn);
        notification.appendChild(header);
        notification.appendChild(messageEl);

        // Close button handler
        closeBtn.addEventListener('click', () => {
            this.removeNotification(id);
        });

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(id);
            }, duration);
        }

        container.appendChild(notification);
        
        return id;
    },

    /**
     * Get notification title based on type
     * @param {'success'|'error'|'warning'|'info'} type - Notification type
     * @returns {string} Title
     */
    getNotificationTitle(type) {
        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Aviso',
            info: 'Informação'
        };
        return titles[type] || 'Notificação';
    },

    /**
     * Remove notification
     * @param {string} notificationId - Notification ID
     */
    removeNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    },

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @param {Object} options - Additional options
     * @returns {Promise<boolean>} True if confirmed
     */
    async showConfirmation(message, title = 'Confirmação', options = {}) {
        // Use DialogManager if available, fallback to simple implementation
        if (window.adminApp && window.adminApp.dialogManager) {
            return window.adminApp.dialogManager.showConfirmation({
                title,
                message,
                ...options
            });
        }

        // Fallback implementation
        return new Promise((resolve) => {
            const overlay = this.createElement('div', {
                className: 'overlay confirmation-overlay'
            });

            const dialog = this.createElement('div', {
                className: 'confirmation-dialog'
            });

            const titleEl = this.createElement('h3', {}, this.escapeHtml(title));
            const messageEl = this.createElement('p', {}, this.escapeHtml(message));
            
            const buttonContainer = this.createElement('div', {
                className: 'confirmation-buttons'
            });

            const cancelBtn = this.createElement('button', {
                className: 'btn btn-secondary',
                type: 'button'
            }, options.cancelText || 'Cancelar');

            const confirmBtn = this.createElement('button', {
                className: `btn ${options.dangerous ? 'btn-danger' : 'btn-primary'}`,
                type: 'button'
            }, options.confirmText || 'Confirmar');

            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);

            dialog.appendChild(titleEl);
            dialog.appendChild(messageEl);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);

            const cleanup = () => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });

            document.body.appendChild(overlay);
            confirmBtn.focus();
        });
    },

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} True if successful
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result;
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    },

    /**
     * Download data as file
     * @param {string} data - Data to download
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     */
    downloadFile(data, filename, mimeType = 'text/plain') {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },

    /**
     * Load file from user selection
     * @param {string} accept - File types to accept
     * @param {boolean} multiple - Allow multiple files
     * @returns {Promise<File|File[]>} Selected file(s)
     */
    async loadFile(accept = '*/*', multiple = false) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.multiple = multiple;
            
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                
                if (files.length === 0) {
                    reject(new Error('Nenhum arquivo selecionado'));
                    return;
                }
                
                resolve(multiple ? files : files[0]);
            });
            
            input.click();
        });
    },

    /**
     * Throttle function execution
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    },

    /**
     * Deep clone object
     * @param {any} obj - Object to clone
     * @returns {any} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
        return obj;
    },

    /**
     * Check if object is empty
     * @param {any} obj - Object to check
     * @returns {boolean} True if empty
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    /**
     * Merge objects deeply
     * @param {Object} target - Target object
     * @param {...Object} sources - Source objects
     * @returns {Object} Merged object
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    },

    /**
     * Check if value is an object
     * @param {any} item - Item to check
     * @returns {boolean} True if object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },

    /**
     * Wait for specified time
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Retry function with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise<any>} Function result
     */
    async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i === maxRetries) {
                    throw lastError;
                }
                
                const delay = baseDelay * Math.pow(2, i);
                await this.sleep(delay);
            }
        }
    }
};

// Add CSS for confirmation dialog and slideOut animation
const style = document.createElement('style');
style.textContent = `
    .confirmation-overlay {
        display: flex !important;
        align-items: center;
        justify-content: center;
    }
    
    .confirmation-dialog {
        background: var(--bg-primary);
        padding: var(--spacing-xl);
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow-lg);
        max-width: 400px;
        width: 90%;
        text-align: center;
    }
    
    .confirmation-dialog h3 {
        margin-bottom: var(--spacing-md);
        color: var(--text-primary);
    }
    
    .confirmation-dialog p {
        margin-bottom: var(--spacing-lg);
        color: var(--text-secondary);
    }
    
    .confirmation-buttons {
        display: flex;
        gap: var(--spacing-md);
        justify-content: center;
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);