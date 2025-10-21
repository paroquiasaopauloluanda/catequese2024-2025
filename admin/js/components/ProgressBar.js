/**
 * Progress Bar Component
 * Provides UI components for displaying operation progress
 */
class ProgressBar {
    constructor() {
        this.activeProgressBars = new Map();
        this.progressTracker = null;
        this.initializeOverlay();
        this.initializeErrorNotifications();
    }

    /**
     * Initialize the main progress overlay
     */
    initializeOverlay() {
        this.overlay = document.getElementById('progress-overlay');
        this.titleElement = document.getElementById('progress-title');
        this.fillElement = document.getElementById('progress-fill');
        this.messageElement = document.getElementById('progress-message');
        this.cancelButton = document.getElementById('cancel-operation');

        // Set up cancel button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.handleCancelOperation();
            });
        }
    }

    /**
     * Set the progress tracker instance
     * @param {ProgressTracker} tracker - Progress tracker instance
     */
    setProgressTracker(tracker) {
        this.progressTracker = tracker;
    }

    /**
     * Show the main progress overlay
     * @param {string} operationId - Operation ID
     * @param {string} title - Progress title
     */
    showOverlay(operationId, title = 'Processando...') {
        if (!this.overlay) return;

        this.currentOperationId = operationId;
        this.titleElement.textContent = title;
        this.fillElement.style.width = '0%';
        this.messageElement.textContent = 'Iniciando operação...';
        
        this.overlay.classList.remove('hidden');
        
        // Listen for progress updates
        if (this.progressTracker) {
            this.progressTracker.onProgress(operationId, (operation) => {
                this.updateOverlay(operation);
            });
        }
    }

    /**
     * Update the main progress overlay
     * @param {ProgressState} operation - Operation state
     */
    updateOverlay(operation) {
        if (!this.overlay || this.overlay.classList.contains('hidden')) return;

        this.fillElement.style.width = `${operation.percentage}%`;
        this.messageElement.textContent = operation.message;

        // Update title with status
        if (operation.status === 'error') {
            this.titleElement.textContent = 'Erro na Operação';
            this.fillElement.style.backgroundColor = 'var(--error-color)';
        } else if (operation.status === 'completed') {
            this.titleElement.textContent = 'Operação Concluída';
            this.fillElement.style.backgroundColor = 'var(--success-color)';
        } else if (operation.status === 'cancelled') {
            this.titleElement.textContent = 'Operação Cancelada';
            this.fillElement.style.backgroundColor = 'var(--warning-color)';
        }

        // Auto-hide overlay when operation is complete
        if (operation.status !== 'running') {
            setTimeout(() => {
                this.hideOverlay();
            }, 3000);
        }
    }

    /**
     * Hide the main progress overlay
     */
    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            this.currentOperationId = null;
            
            // Reset styles
            this.fillElement.style.backgroundColor = 'var(--primary-color)';
        }
    }

    /**
     * Handle cancel operation button click
     */
    handleCancelOperation() {
        if (this.currentOperationId && this.progressTracker) {
            this.progressTracker.cancelOperation(this.currentOperationId);
        }
    }

    /**
     * Create an inline progress bar for specific elements
     * @param {HTMLElement} container - Container element
     * @param {string} operationId - Operation ID
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} Progress bar element
     */
    createInlineProgressBar(container, operationId, options = {}) {
        const config = {
            showPercentage: true,
            showMessage: true,
            height: '20px',
            className: 'inline-progress',
            ...options
        };

        // Create progress bar HTML
        const progressHTML = `
            <div class="progress-wrapper ${config.className}" data-operation-id="${operationId}">
                <div class="progress-header">
                    <span class="progress-label">${config.title || 'Processando...'}</span>
                    ${config.showPercentage ? '<span class="progress-percentage">0%</span>' : ''}
                </div>
                <div class="progress-bar-inline" style="height: ${config.height}">
                    <div class="progress-fill-inline" style="width: 0%"></div>
                </div>
                ${config.showMessage ? '<div class="progress-message-inline">Iniciando...</div>' : ''}
                ${config.showCancel ? '<button class="progress-cancel-btn btn btn-sm btn-secondary">Cancelar</button>' : ''}
            </div>
        `;

        container.insertAdjacentHTML('beforeend', progressHTML);
        const progressElement = container.querySelector(`[data-operation-id="${operationId}"]`);

        // Store reference
        this.activeProgressBars.set(operationId, {
            element: progressElement,
            fillElement: progressElement.querySelector('.progress-fill-inline'),
            messageElement: progressElement.querySelector('.progress-message-inline'),
            percentageElement: progressElement.querySelector('.progress-percentage'),
            cancelButton: progressElement.querySelector('.progress-cancel-btn')
        });

        // Set up cancel button if present
        const cancelBtn = progressElement.querySelector('.progress-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.progressTracker) {
                    this.progressTracker.cancelOperation(operationId);
                }
            });
        }

        // Listen for progress updates
        if (this.progressTracker) {
            this.progressTracker.onProgress(operationId, (operation) => {
                this.updateInlineProgressBar(operationId, operation);
            });
        }

        return progressElement;
    }

    /**
     * Update an inline progress bar
     * @param {string} operationId - Operation ID
     * @param {ProgressState} operation - Operation state
     */
    updateInlineProgressBar(operationId, operation) {
        const progressBar = this.activeProgressBars.get(operationId);
        if (!progressBar) return;

        const { fillElement, messageElement, percentageElement, element } = progressBar;

        // Update progress fill
        if (fillElement) {
            fillElement.style.width = `${operation.percentage}%`;
        }

        // Update percentage text
        if (percentageElement) {
            percentageElement.textContent = `${Math.round(operation.percentage)}%`;
        }

        // Update message
        if (messageElement) {
            messageElement.textContent = operation.message;
        }

        // Update status classes
        element.classList.remove('progress-running', 'progress-completed', 'progress-error', 'progress-cancelled');
        element.classList.add(`progress-${operation.status}`);

        // Auto-remove completed progress bars
        if (operation.status !== 'running') {
            setTimeout(() => {
                this.removeInlineProgressBar(operationId);
            }, 5000);
        }
    }

    /**
     * Remove an inline progress bar
     * @param {string} operationId - Operation ID
     */
    removeInlineProgressBar(operationId) {
        const progressBar = this.activeProgressBars.get(operationId);
        if (progressBar && progressBar.element) {
            progressBar.element.remove();
            this.activeProgressBars.delete(operationId);
        }
    }

    /**
     * Create a mini progress indicator for buttons
     * @param {HTMLElement} button - Button element
     * @param {string} operationId - Operation ID
     */
    createButtonProgress(button, operationId) {
        // Store original button content
        const originalContent = button.innerHTML;
        
        // Add loading state
        button.classList.add('btn-loading');
        button.disabled = true;
        
        // Create progress indicator
        button.innerHTML = `
            <span class="btn-spinner"></span>
            <span class="btn-progress-text">Processando...</span>
        `;

        // Listen for progress updates
        if (this.progressTracker) {
            this.progressTracker.onProgress(operationId, (operation) => {
                const progressText = button.querySelector('.btn-progress-text');
                if (progressText) {
                    progressText.textContent = `${Math.round(operation.percentage)}%`;
                }

                // Restore button when operation completes
                if (operation.status !== 'running') {
                    setTimeout(() => {
                        button.classList.remove('btn-loading');
                        button.disabled = false;
                        button.innerHTML = originalContent;
                    }, 1000);
                }
            });
        }
    }

    /**
     * Create a progress notification
     * @param {string} operationId - Operation ID
     * @param {Object} options - Notification options
     */
    createProgressNotification(operationId, options = {}) {
        const config = {
            position: 'top-right',
            autoHide: false,
            showProgress: true,
            ...options
        };

        const notificationContainer = document.getElementById('notification-container') || document.body;
        
        const notificationHTML = `
            <div class="notification progress-notification" data-operation-id="${operationId}">
                <div class="notification-header">
                    <span class="notification-title">${config.title || 'Operação em Andamento'}</span>
                    <button class="notification-close">&times;</button>
                </div>
                <div class="notification-body">
                    <div class="notification-message">Iniciando...</div>
                    ${config.showProgress ? `
                        <div class="notification-progress">
                            <div class="notification-progress-bar">
                                <div class="notification-progress-fill" style="width: 0%"></div>
                            </div>
                            <span class="notification-percentage">0%</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        notificationContainer.insertAdjacentHTML('beforeend', notificationHTML);
        const notification = notificationContainer.querySelector(`[data-operation-id="${operationId}"]`);

        // Set up close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Listen for progress updates
        if (this.progressTracker) {
            this.progressTracker.onProgress(operationId, (operation) => {
                this.updateProgressNotification(operationId, operation);
            });
        }

        return notification;
    }

    /**
     * Update a progress notification
     * @param {string} operationId - Operation ID
     * @param {ProgressState} operation - Operation state
     */
    updateProgressNotification(operationId, operation) {
        const notification = document.querySelector(`.progress-notification[data-operation-id="${operationId}"]`);
        if (!notification) return;

        const messageElement = notification.querySelector('.notification-message');
        const fillElement = notification.querySelector('.notification-progress-fill');
        const percentageElement = notification.querySelector('.notification-percentage');

        if (messageElement) {
            messageElement.textContent = operation.message;
        }

        if (fillElement) {
            fillElement.style.width = `${operation.percentage}%`;
        }

        if (percentageElement) {
            percentageElement.textContent = `${Math.round(operation.percentage)}%`;
        }

        // Update notification status
        notification.classList.remove('notification-running', 'notification-completed', 'notification-error');
        notification.classList.add(`notification-${operation.status}`);

        // Auto-remove completed notifications
        if (operation.status !== 'running') {
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }

    /**
     * Create a step-by-step progress indicator
     * @param {HTMLElement} container - Container element
     * @param {string} operationId - Operation ID
     * @param {string[]} steps - Array of step names
     */
    createStepProgress(container, operationId, steps) {
        const stepsHTML = steps.map((step, index) => `
            <div class="step-item" data-step="${index}">
                <div class="step-indicator">
                    <span class="step-number">${index + 1}</span>
                    <span class="step-check">✓</span>
                </div>
                <div class="step-label">${step}</div>
            </div>
        `).join('');

        const progressHTML = `
            <div class="step-progress" data-operation-id="${operationId}">
                <div class="step-progress-header">
                    <h4>Progresso da Operação</h4>
                    <span class="step-counter">0 de ${steps.length}</span>
                </div>
                <div class="step-list">
                    ${stepsHTML}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', progressHTML);
        const stepProgress = container.querySelector(`[data-operation-id="${operationId}"]`);

        // Listen for progress updates
        if (this.progressTracker) {
            this.progressTracker.onProgress(operationId, (operation) => {
                this.updateStepProgress(operationId, operation);
            });
        }

        return stepProgress;
    }

    /**
     * Update step progress indicator
     * @param {string} operationId - Operation ID
     * @param {ProgressState} operation - Operation state
     */
    updateStepProgress(operationId, operation) {
        const stepProgress = document.querySelector(`.step-progress[data-operation-id="${operationId}"]`);
        if (!stepProgress) return;

        const stepItems = stepProgress.querySelectorAll('.step-item');
        const stepCounter = stepProgress.querySelector('.step-counter');

        // Update step states
        stepItems.forEach((item, index) => {
            item.classList.remove('step-active', 'step-completed', 'step-error');
            
            if (index < operation.currentStep) {
                item.classList.add('step-completed');
            } else if (index === operation.currentStep) {
                item.classList.add('step-active');
            }
        });

        // Update counter
        if (stepCounter) {
            stepCounter.textContent = `${operation.currentStep} de ${stepItems.length}`;
        }

        // Handle error state
        if (operation.status === 'error' && operation.currentStep < stepItems.length) {
            stepItems[operation.currentStep].classList.add('step-error');
        }
    }

    /**
     * Clear all active progress bars
     */
    clearAllProgress() {
        // Hide main overlay
        this.hideOverlay();

        // Remove all inline progress bars
        for (const operationId of this.activeProgressBars.keys()) {
            this.removeInlineProgressBar(operationId);
        }

        // Remove all progress notifications
        const notifications = document.querySelectorAll('.progress-notification');
        notifications.forEach(notification => notification.remove());
    }

    /**
     * Get active progress operations count
     * @returns {number} Number of active operations
     */
    getActiveOperationsCount() {
        return this.activeProgressBars.size;
    }

    /**
     * Initialize error notification listener
     */
    initializeErrorNotifications() {
        if (typeof window !== 'undefined') {
            window.addEventListener('progressError', (event) => {
                this.showErrorNotification(event.detail);
            });
        }
    }

    /**
     * Show error notification
     * @param {Object} notification - Error notification details
     */
    showErrorNotification(notification) {
        const container = document.getElementById('notification-container') || document.body;
        
        const notificationHTML = `
            <div class="notification error-notification" data-notification-id="${notification.id}">
                <div class="notification-header">
                    <span class="notification-icon">⚠️</span>
                    <span class="notification-title">Erro na Operação</span>
                    <button class="notification-close">&times;</button>
                </div>
                <div class="notification-body">
                    <div class="notification-message">${notification.error}</div>
                    <div class="notification-timestamp">
                        ${notification.timestamp.toLocaleTimeString()}
                    </div>
                    ${notification.canRetry ? `
                        <div class="notification-actions">
                            <button class="btn btn-sm btn-primary retry-operation" 
                                    data-operation-id="${notification.operationId}">
                                Tentar Novamente
                            </button>
                            <button class="btn btn-sm btn-secondary dismiss-notification" 
                                    data-notification-id="${notification.id}">
                                Dispensar
                            </button>
                        </div>
                    ` : `
                        <div class="notification-actions">
                            <button class="btn btn-sm btn-secondary dismiss-notification" 
                                    data-notification-id="${notification.id}">
                                Dispensar
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', notificationHTML);
        const notificationElement = container.querySelector(`[data-notification-id="${notification.id}"]`);

        // Set up event listeners
        this.setupErrorNotificationListeners(notificationElement, notification);

        // Auto-remove after 10 seconds if not retryable
        if (!notification.canRetry) {
            setTimeout(() => {
                if (notificationElement && notificationElement.parentNode) {
                    notificationElement.remove();
                }
            }, 10000);
        }
    }

    /**
     * Set up error notification event listeners
     * @param {HTMLElement} element - Notification element
     * @param {Object} notification - Notification data
     */
    setupErrorNotificationListeners(element, notification) {
        // Close button
        const closeBtn = element.querySelector('.notification-close');
        closeBtn?.addEventListener('click', () => {
            element.remove();
            if (this.progressTracker) {
                this.progressTracker.dismissErrorNotification(notification.id);
            }
        });

        // Dismiss button
        const dismissBtn = element.querySelector('.dismiss-notification');
        dismissBtn?.addEventListener('click', () => {
            element.remove();
            if (this.progressTracker) {
                this.progressTracker.dismissErrorNotification(notification.id);
            }
        });

        // Retry button
        const retryBtn = element.querySelector('.retry-operation');
        retryBtn?.addEventListener('click', () => {
            if (this.progressTracker) {
                const success = this.progressTracker.retryOperation(notification.operationId);
                if (success) {
                    element.remove();
                    this.showRetryNotification(notification.operationId);
                } else {
                    this.showRetryFailedNotification();
                }
            }
        });
    }

    /**
     * Show retry notification
     * @param {string} operationId - Operation ID being retried
     */
    showRetryNotification(operationId) {
        const container = document.getElementById('notification-container') || document.body;
        
        const notificationHTML = `
            <div class="notification retry-notification">
                <div class="notification-header">
                    <span class="notification-icon">🔄</span>
                    <span class="notification-title">Tentando Novamente</span>
                    <button class="notification-close">&times;</button>
                </div>
                <div class="notification-body">
                    <div class="notification-message">Operação sendo executada novamente...</div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', notificationHTML);
        const notification = container.lastElementChild;

        // Set up close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn?.addEventListener('click', () => notification.remove());

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * Show retry failed notification
     */
    showRetryFailedNotification() {
        const container = document.getElementById('notification-container') || document.body;
        
        const notificationHTML = `
            <div class="notification error-notification">
                <div class="notification-header">
                    <span class="notification-icon">❌</span>
                    <span class="notification-title">Falha na Tentativa</span>
                    <button class="notification-close">&times;</button>
                </div>
                <div class="notification-body">
                    <div class="notification-message">
                        Não foi possível tentar novamente. Número máximo de tentativas excedido.
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', notificationHTML);
        const notification = container.lastElementChild;

        // Set up close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn?.addEventListener('click', () => notification.remove());

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Create error recovery dialog
     * @param {string} operationId - Operation ID
     * @param {string} error - Error message
     * @param {Object} options - Recovery options
     */
    createErrorRecoveryDialog(operationId, error, options = {}) {
        const { canRetry = false, canCancel = true, suggestions = [] } = options;
        
        const dialogHTML = `
            <div class="modal error-recovery-modal" data-operation-id="${operationId}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Erro na Operação</h3>
                        ${canCancel ? '<button class="modal-close">&times;</button>' : ''}
                    </div>
                    <div class="modal-body">
                        <div class="error-details">
                            <div class="error-icon">⚠️</div>
                            <div class="error-message">${error}</div>
                        </div>
                        
                        ${suggestions.length > 0 ? `
                            <div class="error-suggestions">
                                <h4>Sugestões para Resolver:</h4>
                                <ul>
                                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        <div class="recovery-actions">
                            ${canRetry ? `
                                <button class="btn btn-primary retry-operation" 
                                        data-operation-id="${operationId}">
                                    Tentar Novamente
                                </button>
                            ` : ''}
                            ${canCancel ? `
                                <button class="btn btn-secondary cancel-operation" 
                                        data-operation-id="${operationId}">
                                    Cancelar Operação
                                </button>
                            ` : ''}
                            <button class="btn btn-secondary close-dialog">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        const dialog = document.querySelector(`[data-operation-id="${operationId}"]`);

        // Set up event listeners
        this.setupErrorRecoveryListeners(dialog, operationId);

        return dialog;
    }

    /**
     * Set up error recovery dialog listeners
     * @param {HTMLElement} dialog - Dialog element
     * @param {string} operationId - Operation ID
     */
    setupErrorRecoveryListeners(dialog, operationId) {
        // Close buttons
        const closeButtons = dialog.querySelectorAll('.modal-close, .close-dialog');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => dialog.remove());
        });

        // Retry button
        const retryBtn = dialog.querySelector('.retry-operation');
        retryBtn?.addEventListener('click', () => {
            if (this.progressTracker) {
                this.progressTracker.retryOperation(operationId);
            }
            dialog.remove();
        });

        // Cancel button
        const cancelBtn = dialog.querySelector('.cancel-operation');
        cancelBtn?.addEventListener('click', () => {
            if (this.progressTracker) {
                this.progressTracker.cancelOperation(operationId);
            }
            dialog.remove();
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressBar;
} else {
    window.ProgressBar = ProgressBar;
}