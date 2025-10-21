/**
 * Dialog Manager
 * Handles confirmation dialogs, help tooltips, and modal interactions
 */

class DialogManager {
    constructor() {
        this.activeDialogs = new Map();
        this.tooltips = new Map();
        this.dialogCounter = 0;
        
        this.init();
    }

    /**
     * Initialize dialog system
     */
    init() {
        this.setupStyles();
        this.setupGlobalEventListeners();
    }

    /**
     * Setup dialog styles
     */
    setupStyles() {
        if (document.getElementById('dialog-styles')) return;

        const style = document.createElement('style');
        style.id = 'dialog-styles';
        style.textContent = `
            .dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                animation: fadeIn 0.2s ease forwards;
            }

            .dialog {
                background: var(--bg-primary);
                border-radius: var(--border-radius);
                box-shadow: var(--box-shadow-lg);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow: hidden;
                transform: scale(0.9);
                animation: scaleIn 0.2s ease forwards;
            }

            .dialog-header {
                padding: var(--spacing-lg);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .dialog-title {
                font-size: 1.2rem;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
            }

            .dialog-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .dialog-close:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .dialog-content {
                padding: var(--spacing-lg);
                color: var(--text-secondary);
                line-height: 1.5;
                max-height: 60vh;
                overflow-y: auto;
            }

            .dialog-actions {
                padding: var(--spacing-lg);
                border-top: 1px solid var(--border-color);
                display: flex;
                gap: var(--spacing-md);
                justify-content: flex-end;
            }

            .dialog-action {
                padding: var(--spacing-sm) var(--spacing-lg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-sm);
                background: var(--bg-primary);
                color: var(--text-primary);
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.2s ease;
                min-width: 80px;
            }

            .dialog-action:hover {
                background: var(--bg-secondary);
            }

            .dialog-action.primary {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }

            .dialog-action.primary:hover {
                background: var(--primary-hover);
            }

            .dialog-action.danger {
                background: var(--error-color);
                color: white;
                border-color: var(--error-color);
            }

            .dialog-action.danger:hover {
                background: var(--error-hover, #c53030);
            }

            /* Confirmation Dialog Specific Styles */
            .confirmation-dialog .dialog-content {
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-md);
            }

            .confirmation-icon {
                font-size: 2rem;
                flex-shrink: 0;
                margin-top: var(--spacing-xs);
            }

            .confirmation-icon.warning { color: var(--warning-color); }
            .confirmation-icon.danger { color: var(--error-color); }
            .confirmation-icon.info { color: var(--info-color); }

            /* Tooltip Styles */
            .tooltip {
                position: absolute;
                background: var(--bg-tooltip, #333);
                color: var(--text-tooltip, white);
                padding: var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                font-size: 0.8rem;
                max-width: 250px;
                z-index: 10001;
                opacity: 0;
                transform: translateY(-5px);
                transition: all 0.2s ease;
                pointer-events: none;
                box-shadow: var(--box-shadow-md);
            }

            .tooltip.show {
                opacity: 1;
                transform: translateY(0);
            }

            .tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: var(--bg-tooltip, #333);
            }

            .tooltip.bottom::after {
                top: -10px;
                border-top-color: transparent;
                border-bottom-color: var(--bg-tooltip, #333);
            }

            .tooltip.left::after {
                top: 50%;
                left: 100%;
                transform: translateY(-50%);
                border-left-color: var(--bg-tooltip, #333);
                border-top-color: transparent;
            }

            .tooltip.right::after {
                top: 50%;
                left: -10px;
                transform: translateY(-50%);
                border-right-color: var(--bg-tooltip, #333);
                border-top-color: transparent;
            }

            /* Help Dialog Styles */
            .help-dialog .dialog-content {
                font-size: 0.9rem;
            }

            .help-dialog h3 {
                color: var(--text-primary);
                margin-top: var(--spacing-lg);
                margin-bottom: var(--spacing-sm);
            }

            .help-dialog h3:first-child {
                margin-top: 0;
            }

            .help-dialog ul {
                margin: var(--spacing-sm) 0;
                padding-left: var(--spacing-lg);
            }

            .help-dialog li {
                margin-bottom: var(--spacing-xs);
            }

            .help-dialog code {
                background: var(--bg-secondary);
                padding: 2px 4px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 0.85em;
            }

            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scaleIn {
                from { transform: scale(0.9); }
                to { transform: scale(1); }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            @keyframes scaleOut {
                from { transform: scale(1); }
                to { transform: scale(0.9); }
            }

            /* Responsive adjustments */
            @media (max-width: 480px) {
                .dialog {
                    width: 95%;
                    margin: var(--spacing-md);
                }

                .dialog-actions {
                    flex-direction: column;
                }

                .dialog-action {
                    width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Close dialogs on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopDialog();
            }
        });

        // Hide tooltips on scroll
        document.addEventListener('scroll', () => {
            this.hideAllTooltips();
        }, true);
    }

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} True if confirmed
     */
    showConfirmation(options = {}) {
        const {
            title = 'Confirmação',
            message = 'Tem certeza?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'warning', // warning, danger, info
            dangerous = false
        } = options;

        return new Promise((resolve) => {
            const dialogId = this.generateId();
            
            const overlay = this.createElement('div', {
                className: 'dialog-overlay',
                id: `overlay-${dialogId}`
            });

            const dialog = this.createElement('div', {
                className: `dialog confirmation-dialog ${type}`
            });

            // Header
            const header = this.createElement('div', {
                className: 'dialog-header'
            });

            const titleEl = this.createElement('h2', {
                className: 'dialog-title'
            }, title);

            const closeBtn = this.createElement('button', {
                className: 'dialog-close',
                type: 'button',
                'aria-label': 'Fechar'
            }, '×');

            header.appendChild(titleEl);
            header.appendChild(closeBtn);

            // Content
            const content = this.createElement('div', {
                className: 'dialog-content'
            });

            const icon = this.createElement('div', {
                className: `confirmation-icon ${type}`
            }, this.getConfirmationIcon(type));

            const messageEl = this.createElement('div', {}, message);

            content.appendChild(icon);
            content.appendChild(messageEl);

            // Actions
            const actions = this.createElement('div', {
                className: 'dialog-actions'
            });

            const cancelBtn = this.createElement('button', {
                className: 'dialog-action',
                type: 'button'
            }, cancelText);

            const confirmBtn = this.createElement('button', {
                className: `dialog-action ${dangerous ? 'danger' : 'primary'}`,
                type: 'button'
            }, confirmText);

            actions.appendChild(cancelBtn);
            actions.appendChild(confirmBtn);

            // Assemble dialog
            dialog.appendChild(header);
            dialog.appendChild(content);
            dialog.appendChild(actions);
            overlay.appendChild(dialog);

            // Event handlers
            const cleanup = () => {
                this.closeDialog(dialogId);
            };

            closeBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });

            // Show dialog
            document.body.appendChild(overlay);
            this.activeDialogs.set(dialogId, overlay);
            
            // Focus confirm button
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }

    /**
     * Show help dialog
     * @param {Object} options - Help dialog options
     * @returns {string} Dialog ID
     */
    showHelp(options = {}) {
        const {
            title = 'Ajuda',
            content = '',
            sections = [],
            width = '600px'
        } = options;

        const dialogId = this.generateId();
        
        const overlay = this.createElement('div', {
            className: 'dialog-overlay',
            id: `overlay-${dialogId}`
        });

        const dialog = this.createElement('div', {
            className: 'dialog help-dialog'
        });

        if (width) {
            dialog.style.maxWidth = width;
        }

        // Header
        const header = this.createElement('div', {
            className: 'dialog-header'
        });

        const titleEl = this.createElement('h2', {
            className: 'dialog-title'
        }, title);

        const closeBtn = this.createElement('button', {
            className: 'dialog-close',
            type: 'button',
            'aria-label': 'Fechar'
        }, '×');

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        // Content
        const contentEl = this.createElement('div', {
            className: 'dialog-content'
        });

        if (content) {
            contentEl.innerHTML = content;
        }

        if (sections.length > 0) {
            sections.forEach(section => {
                const sectionEl = this.createElement('div');
                
                if (section.title) {
                    const titleEl = this.createElement('h3', {}, section.title);
                    sectionEl.appendChild(titleEl);
                }
                
                if (section.content) {
                    const contentEl = this.createElement('div');
                    contentEl.innerHTML = section.content;
                    sectionEl.appendChild(contentEl);
                }
                
                contentEl.appendChild(sectionEl);
            });
        }

        // Actions
        const actions = this.createElement('div', {
            className: 'dialog-actions'
        });

        const okBtn = this.createElement('button', {
            className: 'dialog-action primary',
            type: 'button'
        }, 'Entendi');

        actions.appendChild(okBtn);

        // Assemble dialog
        dialog.appendChild(header);
        dialog.appendChild(contentEl);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);

        // Event handlers
        const cleanup = () => {
            this.closeDialog(dialogId);
        };

        closeBtn.addEventListener('click', cleanup);
        okBtn.addEventListener('click', cleanup);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });

        // Show dialog
        document.body.appendChild(overlay);
        this.activeDialogs.set(dialogId, overlay);
        
        // Focus OK button
        setTimeout(() => okBtn.focus(), 100);

        return dialogId;
    }

    /**
     * Show tooltip
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string|Object} options - Tooltip text or options
     * @returns {string} Tooltip ID
     */
    showTooltip(element, options = {}) {
        if (typeof options === 'string') {
            options = { text: options };
        }

        const {
            text = '',
            position = 'top', // top, bottom, left, right
            delay = 500,
            duration = 0, // 0 = permanent until hidden
            className = ''
        } = options;

        const tooltipId = this.generateId();
        
        const tooltip = this.createElement('div', {
            className: `tooltip ${position} ${className}`,
            id: `tooltip-${tooltipId}`,
            role: 'tooltip'
        }, text);

        document.body.appendChild(tooltip);
        
        // Position tooltip
        this.positionTooltip(tooltip, element, position);
        
        // Show tooltip after delay
        const showTimeout = setTimeout(() => {
            tooltip.classList.add('show');
        }, delay);

        // Auto-hide after duration
        let hideTimeout = null;
        if (duration > 0) {
            hideTimeout = setTimeout(() => {
                this.hideTooltip(tooltipId);
            }, delay + duration);
        }

        // Store tooltip reference
        this.tooltips.set(tooltipId, {
            element: tooltip,
            target: element,
            showTimeout,
            hideTimeout
        });

        return tooltipId;
    }

    /**
     * Position tooltip relative to target element
     * @param {HTMLElement} tooltip - Tooltip element
     * @param {HTMLElement} target - Target element
     * @param {string} position - Position (top, bottom, left, right)
     */
    positionTooltip(tooltip, target, position) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 10;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = targetRect.bottom + 10;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.right + 10;
                break;
        }

        // Ensure tooltip stays within viewport
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        if (left < 10) left = 10;
        if (left + tooltipRect.width > viewport.width - 10) {
            left = viewport.width - tooltipRect.width - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipRect.height > viewport.height - 10) {
            top = viewport.height - tooltipRect.height - 10;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    /**
     * Hide tooltip
     * @param {string} tooltipId - Tooltip ID
     */
    hideTooltip(tooltipId) {
        const tooltip = this.tooltips.get(tooltipId);
        if (!tooltip) return;

        // Clear timeouts
        if (tooltip.showTimeout) {
            clearTimeout(tooltip.showTimeout);
        }
        if (tooltip.hideTimeout) {
            clearTimeout(tooltip.hideTimeout);
        }

        // Remove tooltip
        if (tooltip.element.parentNode) {
            tooltip.element.parentNode.removeChild(tooltip.element);
        }

        this.tooltips.delete(tooltipId);
    }

    /**
     * Hide all tooltips
     */
    hideAllTooltips() {
        this.tooltips.forEach((_, tooltipId) => {
            this.hideTooltip(tooltipId);
        });
    }

    /**
     * Close dialog
     * @param {string} dialogId - Dialog ID
     */
    closeDialog(dialogId) {
        const overlay = this.activeDialogs.get(dialogId);
        if (!overlay) return;

        // Animate out
        overlay.style.animation = 'fadeOut 0.2s ease forwards';
        const dialog = overlay.querySelector('.dialog');
        if (dialog) {
            dialog.style.animation = 'scaleOut 0.2s ease forwards';
        }

        // Remove after animation
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            this.activeDialogs.delete(dialogId);
        }, 200);
    }

    /**
     * Close top dialog (for Escape key)
     */
    closeTopDialog() {
        if (this.activeDialogs.size === 0) return;
        
        // Get the last dialog (top-most)
        const dialogIds = Array.from(this.activeDialogs.keys());
        const topDialogId = dialogIds[dialogIds.length - 1];
        this.closeDialog(topDialogId);
    }

    /**
     * Get confirmation icon for type
     * @param {string} type - Confirmation type
     * @returns {string} Icon
     */
    getConfirmationIcon(type) {
        const icons = {
            warning: '⚠️',
            danger: '🚨',
            info: 'ℹ️'
        };
        return icons[type] || '❓';
    }

    /**
     * Create DOM element
     * @param {string} tag - HTML tag
     * @param {Object} attributes - Element attributes
     * @param {string} content - Element content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `dialog_${++this.dialogCounter}_${Date.now()}`;
    }

    /**
     * Setup help tooltips for elements with data-help attribute
     */
    setupHelpTooltips() {
        const helpElements = document.querySelectorAll('[data-help]');
        
        helpElements.forEach(element => {
            const helpText = element.getAttribute('data-help');
            const position = element.getAttribute('data-help-position') || 'top';
            
            let tooltipId = null;
            
            element.addEventListener('mouseenter', () => {
                tooltipId = this.showTooltip(element, {
                    text: helpText,
                    position: position,
                    delay: 300
                });
            });
            
            element.addEventListener('mouseleave', () => {
                if (tooltipId) {
                    this.hideTooltip(tooltipId);
                    tooltipId = null;
                }
            });
            
            element.addEventListener('focus', () => {
                tooltipId = this.showTooltip(element, {
                    text: helpText,
                    position: position,
                    delay: 100
                });
            });
            
            element.addEventListener('blur', () => {
                if (tooltipId) {
                    this.hideTooltip(tooltipId);
                    tooltipId = null;
                }
            });
        });
    }
}

// Export for use in other modules
window.DialogManager = DialogManager;