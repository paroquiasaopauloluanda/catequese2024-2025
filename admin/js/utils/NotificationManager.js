/**
 * Notification Manager
 * Advanced notification system with multiple types and interactive features
 */

class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.container = null;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.position = 'top-right'; // top-right, top-left, bottom-right, bottom-left
        
        this.init();
    }

    /**
     * Initialize notification system
     */
    init() {
        this.createContainer();
        this.setupStyles();
    }

    /**
     * Create notification container
     */
    createContainer() {
        // Remove existing container if any
        const existing = document.getElementById('notification-container');
        if (existing) {
            existing.remove();
        }

        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container ${this.position}`;
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notificações do sistema');
        
        document.body.appendChild(this.container);
    }

    /**
     * Setup notification styles
     */
    setupStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }
            
            .notification-container.top-right {
                top: 20px;
                right: 20px;
            }
            
            .notification-container.top-left {
                top: 20px;
                left: 20px;
            }
            
            .notification-container.bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .notification-container.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .notification {
                background: var(--bg-primary);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                box-shadow: var(--box-shadow-lg);
                margin-bottom: var(--spacing-sm);
                padding: 0;
                min-width: 300px;
                max-width: 400px;
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                animation: slideIn 0.3s ease forwards;
                position: relative;
                overflow: hidden;
            }

            .notification.success {
                border-left: 4px solid var(--success-color);
            }

            .notification.error {
                border-left: 4px solid var(--error-color);
            }

            .notification.warning {
                border-left: 4px solid var(--warning-color);
            }

            .notification.info {
                border-left: 4px solid var(--info-color);
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-md) var(--spacing-md) 0;
            }

            .notification-title {
                font-weight: 600;
                font-size: 0.9rem;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: var(--text-secondary);
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
            }

            .notification-close:hover {
                background: var(--bg-secondary);
                color: var(--text-primary);
            }

            .notification-message {
                padding: var(--spacing-sm) var(--spacing-md);
                color: var(--text-secondary);
                font-size: 0.85rem;
                line-height: 1.4;
            }

            .notification-actions {
                padding: 0 var(--spacing-md) var(--spacing-md);
                display: flex;
                gap: var(--spacing-sm);
                justify-content: flex-end;
            }

            .notification-action {
                background: none;
                border: 1px solid var(--border-color);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--border-radius-sm);
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .notification-action:hover {
                background: var(--bg-secondary);
            }

            .notification-action.primary {
                background: var(--primary-color);
                color: white;
                border-color: var(--primary-color);
            }

            .notification-action.primary:hover {
                background: var(--primary-hover);
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: var(--primary-color);
                transition: width 0.1s linear;
            }

            .notification.success .notification-progress {
                background: var(--success-color);
            }

            .notification.error .notification-progress {
                background: var(--error-color);
            }

            .notification.warning .notification-progress {
                background: var(--warning-color);
            }

            .notification.info .notification-progress {
                background: var(--info-color);
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
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

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            .notification.shake {
                animation: shake 0.5s ease-in-out;
            }

            /* Responsive adjustments */
            @media (max-width: 480px) {
                .notification-container {
                    left: 10px !important;
                    right: 10px !important;
                    max-width: none;
                }

                .notification {
                    min-width: auto;
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    showNotification(message, type = 'info', options = {}) {
        const {
            title = this.getDefaultTitle(type),
            duration = this.defaultDuration,
            actions = [],
            persistent = false,
            showProgress = true,
            icon = this.getDefaultIcon(type),
            onClose = null,
            onClick = null
        } = options;

        // Generate unique ID
        const id = this.generateId();

        // Create notification element
        const notification = this.createNotificationElement({
            id,
            message,
            type,
            title,
            icon,
            actions,
            persistent,
            showProgress,
            duration,
            onClose,
            onClick
        });

        // Add to container
        this.container.appendChild(notification);
        
        // Store notification reference
        this.notifications.set(id, {
            element: notification,
            type,
            persistent,
            duration,
            startTime: Date.now()
        });

        // Manage notification count
        this.manageNotificationCount();

        // Auto-remove if not persistent
        if (!persistent && duration > 0) {
            this.scheduleRemoval(id, duration);
        }

        // Start progress animation
        if (showProgress && !persistent && duration > 0) {
            this.animateProgress(id, duration);
        }

        return id;
    }

    /**
     * Create notification element
     * @param {Object} config - Notification configuration
     * @returns {HTMLElement} Notification element
     */
    createNotificationElement(config) {
        const {
            id, message, type, title, icon, actions, persistent, 
            showProgress, duration, onClose, onClick
        } = config;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = id;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

        // Add click handler if provided
        if (onClick) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', (e) => {
                if (e.target === notification || e.target.classList.contains('notification-message')) {
                    onClick(id);
                }
            });
        }

        // Create header
        const header = document.createElement('div');
        header.className = 'notification-header';

        const titleElement = document.createElement('div');
        titleElement.className = 'notification-title';
        titleElement.innerHTML = `${icon} ${HelperUtils.escapeHtml(title)}`;

        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Fechar notificação');
        closeButton.addEventListener('click', () => {
            this.removeNotification(id);
            if (onClose) onClose(id);
        });

        header.appendChild(titleElement);
        if (!persistent) {
            header.appendChild(closeButton);
        }

        // Create message
        const messageElement = document.createElement('div');
        messageElement.className = 'notification-message';
        messageElement.innerHTML = HelperUtils.escapeHtml(message);

        // Create actions if any
        let actionsElement = null;
        if (actions.length > 0) {
            actionsElement = document.createElement('div');
            actionsElement.className = 'notification-actions';

            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `notification-action ${action.primary ? 'primary' : ''}`;
                button.textContent = action.label;
                button.addEventListener('click', () => {
                    action.handler(id);
                    if (action.closeOnClick !== false) {
                        this.removeNotification(id);
                    }
                });
                actionsElement.appendChild(button);
            });
        }

        // Create progress bar
        let progressElement = null;
        if (showProgress && !persistent && duration > 0) {
            progressElement = document.createElement('div');
            progressElement.className = 'notification-progress';
            progressElement.style.width = '100%';
        }

        // Assemble notification
        notification.appendChild(header);
        notification.appendChild(messageElement);
        if (actionsElement) {
            notification.appendChild(actionsElement);
        }
        if (progressElement) {
            notification.appendChild(progressElement);
        }

        return notification;
    }

    /**
     * Remove notification
     * @param {string} id - Notification ID
     */
    removeNotification(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;

        const element = notificationData.element;
        
        // Animate out
        element.style.animation = 'slideOut 0.3s ease forwards';
        
        // Remove after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Show confirmation notification
     * @param {string} message - Confirmation message
     * @param {Object} options - Confirmation options
     * @returns {Promise<boolean>} True if confirmed
     */
    showConfirmation(message, options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirmação',
                confirmLabel = 'Confirmar',
                cancelLabel = 'Cancelar',
                type = 'warning'
            } = options;

            const actions = [
                {
                    label: cancelLabel,
                    handler: () => resolve(false)
                },
                {
                    label: confirmLabel,
                    primary: true,
                    handler: () => resolve(true)
                }
            ];

            this.showNotification(message, type, {
                title,
                actions,
                persistent: true,
                showProgress: false
            });
        });
    }

    /**
     * Show progress notification
     * @param {string} message - Progress message
     * @param {Object} options - Progress options
     * @returns {Object} Progress controller
     */
    showProgress(message, options = {}) {
        const {
            title = 'Processando...',
            type = 'info',
            cancellable = false,
            onCancel = null
        } = options;

        const actions = cancellable ? [{
            label: 'Cancelar',
            handler: (id) => {
                if (onCancel) onCancel();
                this.removeNotification(id);
            }
        }] : [];

        const id = this.showNotification(message, type, {
            title,
            actions,
            persistent: true,
            showProgress: false
        });

        return {
            id,
            update: (newMessage, progress = null) => {
                const notification = this.notifications.get(id);
                if (notification) {
                    const messageEl = notification.element.querySelector('.notification-message');
                    if (messageEl) {
                        messageEl.textContent = newMessage;
                    }
                    
                    if (progress !== null) {
                        let progressEl = notification.element.querySelector('.notification-progress');
                        if (!progressEl) {
                            progressEl = document.createElement('div');
                            progressEl.className = 'notification-progress';
                            notification.element.appendChild(progressEl);
                        }
                        progressEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
                    }
                }
            },
            complete: (finalMessage = null) => {
                if (finalMessage) {
                    const notification = this.notifications.get(id);
                    if (notification) {
                        const messageEl = notification.element.querySelector('.notification-message');
                        if (messageEl) {
                            messageEl.textContent = finalMessage;
                        }
                        notification.element.classList.remove('info', 'warning');
                        notification.element.classList.add('success');
                    }
                }
                
                setTimeout(() => {
                    this.removeNotification(id);
                }, 2000);
            },
            error: (errorMessage) => {
                const notification = this.notifications.get(id);
                if (notification) {
                    const messageEl = notification.element.querySelector('.notification-message');
                    if (messageEl) {
                        messageEl.textContent = errorMessage;
                    }
                    notification.element.classList.remove('info', 'warning');
                    notification.element.classList.add('error');
                }
                
                setTimeout(() => {
                    this.removeNotification(id);
                }, 5000);
            },
            remove: () => {
                this.removeNotification(id);
            }
        };
    }

    /**
     * Show toast notification (simple, auto-dismiss)
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Notification ID
     */
    showToast(message, type = 'info', duration = 3000) {
        return this.showNotification(message, type, {
            title: '',
            duration,
            showProgress: false
        });
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach((_, id) => {
            this.removeNotification(id);
        });
    }

    /**
     * Clear notifications by type
     * @param {string} type - Notification type to clear
     */
    clearByType(type) {
        this.notifications.forEach((notification, id) => {
            if (notification.type === type) {
                this.removeNotification(id);
            }
        });
    }

    /**
     * Manage notification count (remove oldest if exceeding limit)
     */
    manageNotificationCount() {
        if (this.notifications.size <= this.maxNotifications) return;

        // Find oldest non-persistent notification
        let oldestId = null;
        let oldestTime = Date.now();

        this.notifications.forEach((notification, id) => {
            if (!notification.persistent && notification.startTime < oldestTime) {
                oldestTime = notification.startTime;
                oldestId = id;
            }
        });

        if (oldestId) {
            this.removeNotification(oldestId);
        }
    }

    /**
     * Schedule notification removal
     * @param {string} id - Notification ID
     * @param {number} duration - Duration in milliseconds
     */
    scheduleRemoval(id, duration) {
        setTimeout(() => {
            this.removeNotification(id);
        }, duration);
    }

    /**
     * Animate progress bar
     * @param {string} id - Notification ID
     * @param {number} duration - Duration in milliseconds
     */
    animateProgress(id, duration) {
        const notification = this.notifications.get(id);
        if (!notification) return;

        const progressElement = notification.element.querySelector('.notification-progress');
        if (!progressElement) return;

        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.max(0, 100 - (elapsed / duration) * 100);
            
            progressElement.style.width = `${progress}%`;
            
            if (progress > 0 && this.notifications.has(id)) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get default title for notification type
     * @param {string} type - Notification type
     * @returns {string} Default title
     */
    getDefaultTitle(type) {
        const titles = {
            success: 'Sucesso',
            error: 'Erro',
            warning: 'Aviso',
            info: 'Informação'
        };
        return titles[type] || 'Notificação';
    }

    /**
     * Get default icon for notification type
     * @param {string} type - Notification type
     * @returns {string} Default icon
     */
    getDefaultIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }
}

// Export for use in other modules
window.NotificationManager = NotificationManager;