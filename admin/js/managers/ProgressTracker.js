/**
 * Progress Tracker
 * Handles progress tracking for long-running operations
 */
class ProgressTracker {
    constructor() {
        this.operations = new Map();
        this.callbacks = new Map();
        this.updateInterval = 100; // Update every 100ms
        this.operationQueue = [];
        this.isProcessingQueue = false;
        this.maxConcurrentOperations = 3;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second base delay
        this.errorNotifications = [];
    }

    /**
     * Start a new operation
     * @param {string} operationId - Unique operation ID
     * @param {string} title - Operation title
     * @param {string} initialMessage - Initial progress message
     * @returns {string} Operation ID
     */
    startOperation(operationId, title = 'Processando...', initialMessage = 'Iniciando operação...') {
        const operation = {
            id: operationId,
            title,
            percentage: 0,
            message: initialMessage,
            status: 'running',
            error: null,
            startTime: Date.now(),
            endTime: null,
            steps: [],
            currentStep: 0
        };

        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);
        
        return operationId;
    }

    /**
     * Update operation progress
     * @param {string} operationId - Operation ID
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    updateProgress(operationId, percentage, message) {
        const operation = this.operations.get(operationId);
        if (!operation || operation.status !== 'running') {
            return;
        }

        operation.percentage = Math.max(0, Math.min(100, percentage));
        operation.message = message;
        
        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);
    }

    /**
     * Add steps to an operation for detailed progress tracking
     * @param {string} operationId - Operation ID
     * @param {string[]} steps - Array of step descriptions
     */
    setOperationSteps(operationId, steps) {
        const operation = this.operations.get(operationId);
        if (!operation) return;

        operation.steps = steps;
        operation.currentStep = 0;
        
        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);
    }

    /**
     * Move to next step in operation
     * @param {string} operationId - Operation ID
     * @param {string} message - Optional message for the step
     */
    nextStep(operationId, message = null) {
        const operation = this.operations.get(operationId);
        if (!operation || operation.status !== 'running') return;

        if (operation.steps.length > 0) {
            operation.currentStep = Math.min(operation.currentStep + 1, operation.steps.length - 1);
            
            // Calculate percentage based on steps
            const stepPercentage = (operation.currentStep / operation.steps.length) * 100;
            operation.percentage = Math.min(stepPercentage, 95); // Leave 5% for completion
            
            // Use step description as message if no custom message provided
            if (!message && operation.currentStep < operation.steps.length) {
                operation.message = operation.steps[operation.currentStep];
            } else if (message) {
                operation.message = message;
            }
        }

        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);
    }

    /**
     * Complete an operation successfully
     * @param {string} operationId - Operation ID
     * @param {string} message - Completion message
     */
    completeOperation(operationId, message = 'Operação concluída com sucesso!') {
        const operation = this.operations.get(operationId);
        if (!operation) return;

        operation.percentage = 100;
        operation.message = message;
        operation.status = 'completed';
        operation.endTime = Date.now();
        
        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);

        // Auto-remove completed operations after 5 seconds
        setTimeout(() => {
            this.removeOperation(operationId);
        }, 5000);
    }

    /**
     * Mark operation as failed
     * @param {string} operationId - Operation ID
     * @param {string} error - Error message
     * @param {Object} options - Error options
     */
    failOperation(operationId, error, options = {}) {
        const operation = this.operations.get(operationId);
        if (!operation) return;

        const { canRetry = false, retryFunction = null, showNotification = true } = options;

        operation.status = 'error';
        operation.error = error;
        operation.message = `Erro: ${error}`;
        operation.endTime = Date.now();
        operation.canRetry = canRetry;
        operation.retryFunction = retryFunction;
        
        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);

        // Add error notification
        if (showNotification) {
            this.addErrorNotification(operationId, error, canRetry);
        }

        // Auto-retry if enabled and retry function provided
        if (canRetry && retryFunction && this.shouldRetry(operationId)) {
            this.scheduleRetry(operationId, retryFunction);
        }
    }

    /**
     * Cancel a running operation
     * @param {string} operationId - Operation ID
     */
    cancelOperation(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation || operation.status !== 'running') return;

        operation.status = 'cancelled';
        operation.message = 'Operação cancelada pelo usuário';
        operation.endTime = Date.now();
        
        this.operations.set(operationId, operation);
        this.notifyCallbacks(operationId, operation);

        // Remove cancelled operations after 2 seconds
        setTimeout(() => {
            this.removeOperation(operationId);
        }, 2000);
    }

    /**
     * Remove an operation from tracking
     * @param {string} operationId - Operation ID
     */
    removeOperation(operationId) {
        this.operations.delete(operationId);
        this.callbacks.delete(operationId);
    }

    /**
     * Get operation status
     * @param {string} operationId - Operation ID
     * @returns {ProgressState|null} Operation state
     */
    getOperation(operationId) {
        return this.operations.get(operationId) || null;
    }

    /**
     * Get all active operations
     * @returns {ProgressState[]} Array of active operations
     */
    getActiveOperations() {
        return Array.from(this.operations.values()).filter(op => op.status === 'running');
    }

    /**
     * Register callback for operation updates
     * @param {string} operationId - Operation ID
     * @param {Function} callback - Callback function
     */
    onProgress(operationId, callback) {
        if (!this.callbacks.has(operationId)) {
            this.callbacks.set(operationId, []);
        }
        this.callbacks.get(operationId).push(callback);
    }

    /**
     * Notify all callbacks for an operation
     * @param {string} operationId - Operation ID
     * @param {ProgressState} operation - Operation state
     */
    notifyCallbacks(operationId, operation) {
        const callbacks = this.callbacks.get(operationId);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(operation);
                } catch (error) {
                    console.error('Error in progress callback:', error);
                }
            });
        }
    }

    /**
     * Create a simulated progress for operations without real progress tracking
     * @param {string} operationId - Operation ID
     * @param {number} duration - Duration in milliseconds
     * @param {string[]} messages - Array of messages to show during progress
     * @returns {Promise<void>}
     */
    async simulateProgress(operationId, duration = 3000, messages = []) {
        const operation = this.operations.get(operationId);
        if (!operation || operation.status !== 'running') return;

        const steps = messages.length || 10;
        const stepDuration = duration / steps;
        
        for (let i = 0; i < steps; i++) {
            if (this.operations.get(operationId)?.status !== 'running') {
                break; // Operation was cancelled or failed
            }

            const percentage = ((i + 1) / steps) * 95; // Leave 5% for completion
            const message = messages[i] || `Processando... (${i + 1}/${steps})`;
            
            this.updateProgress(operationId, percentage, message);
            
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
    }

    /**
     * Get operation duration
     * @param {string} operationId - Operation ID
     * @returns {number} Duration in milliseconds
     */
    getOperationDuration(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation) return 0;

        const endTime = operation.endTime || Date.now();
        return endTime - operation.startTime;
    }

    /**
     * Format duration for display
     * @param {number} duration - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(duration) {
        const seconds = Math.floor(duration / 1000);
        const minutes = Math.floor(seconds / 60);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Create a progress tracker for file upload operations
     * @param {string} operationId - Operation ID
     * @param {string[]} fileNames - Names of files being uploaded
     * @returns {Object} Upload progress tracker
     */
    createFileUploadTracker(operationId, fileNames) {
        const steps = [
            'Validando arquivos...',
            'Preparando upload...',
            'Enviando para GitHub...',
            'Aguardando confirmação...',
            'Finalizando...'
        ];

        this.setOperationSteps(operationId, steps);

        return {
            validateFiles: () => this.nextStep(operationId, 'Validando arquivos selecionados...'),
            prepareUpload: () => this.nextStep(operationId, 'Convertendo arquivos para upload...'),
            uploadFiles: (current, total) => {
                const message = `Enviando arquivo ${current} de ${total}: ${fileNames[current - 1] || 'arquivo'}`;
                this.updateProgress(operationId, 30 + (current / total) * 40, message);
            },
            waitConfirmation: () => this.nextStep(operationId, 'Aguardando confirmação do GitHub...'),
            finalize: () => this.nextStep(operationId, 'Finalizando upload...')
        };
    }

    /**
     * Create a progress tracker for configuration update operations
     * @param {string} operationId - Operation ID
     * @returns {Object} Config update progress tracker
     */
    createConfigUpdateTracker(operationId) {
        const steps = [
            'Validando configuração...',
            'Criando backup...',
            'Atualizando arquivo...',
            'Commitando alterações...',
            'Aguardando deploy...'
        ];

        this.setOperationSteps(operationId, steps);

        return {
            validate: () => this.nextStep(operationId),
            backup: () => this.nextStep(operationId),
            update: () => this.nextStep(operationId),
            commit: () => this.nextStep(operationId),
            deploy: () => this.nextStep(operationId)
        };
    }

    /**
     * Clear all completed and failed operations
     */
    clearCompletedOperations() {
        const toRemove = [];
        
        for (const [id, operation] of this.operations) {
            if (operation.status === 'completed' || operation.status === 'error' || operation.status === 'cancelled') {
                toRemove.push(id);
            }
        }
        
        toRemove.forEach(id => this.removeOperation(id));
    }

    /**
     * Add operation to queue for sequential processing
     * @param {Function} operationFunction - Function that returns a Promise
     * @param {string} operationId - Unique operation ID
     * @param {Object} options - Operation options
     * @returns {Promise} Promise that resolves when operation completes
     */
    queueOperation(operationFunction, operationId, options = {}) {
        return new Promise((resolve, reject) => {
            const queueItem = {
                id: operationId,
                function: operationFunction,
                options,
                resolve,
                reject,
                priority: options.priority || 0,
                queuedAt: Date.now()
            };

            // Insert based on priority (higher priority first)
            const insertIndex = this.operationQueue.findIndex(item => item.priority < queueItem.priority);
            if (insertIndex === -1) {
                this.operationQueue.push(queueItem);
            } else {
                this.operationQueue.splice(insertIndex, 0, queueItem);
            }

            this.processQueue();
        });
    }

    /**
     * Process the operation queue
     */
    async processQueue() {
        if (this.isProcessingQueue) return;
        
        this.isProcessingQueue = true;
        
        while (this.operationQueue.length > 0) {
            const runningOperations = this.getActiveOperations();
            
            // Check if we can start more operations
            if (runningOperations.length >= this.maxConcurrentOperations) {
                // Wait for an operation to complete
                await this.waitForOperationSlot();
                continue;
            }
            
            // Get next operation from queue
            const queueItem = this.operationQueue.shift();
            
            // Start the operation
            this.executeQueuedOperation(queueItem);
        }
        
        this.isProcessingQueue = false;
    }

    /**
     * Execute a queued operation
     * @param {Object} queueItem - Queued operation item
     */
    async executeQueuedOperation(queueItem) {
        try {
            const result = await queueItem.function();
            queueItem.resolve(result);
        } catch (error) {
            queueItem.reject(error);
        }
    }

    /**
     * Wait for an operation slot to become available
     * @returns {Promise} Promise that resolves when a slot is available
     */
    waitForOperationSlot() {
        return new Promise((resolve) => {
            const checkSlot = () => {
                const runningOperations = this.getActiveOperations();
                if (runningOperations.length < this.maxConcurrentOperations) {
                    resolve();
                } else {
                    setTimeout(checkSlot, 100);
                }
            };
            checkSlot();
        });
    }

    /**
     * Get queue status
     * @returns {Object} Queue status information
     */
    getQueueStatus() {
        return {
            queueLength: this.operationQueue.length,
            activeOperations: this.getActiveOperations().length,
            maxConcurrent: this.maxConcurrentOperations,
            isProcessing: this.isProcessingQueue
        };
    }

    /**
     * Set maximum concurrent operations
     * @param {number} max - Maximum concurrent operations
     */
    setMaxConcurrentOperations(max) {
        this.maxConcurrentOperations = Math.max(1, max);
    }

    /**
     * Clear operation queue
     */
    clearQueue() {
        // Reject all queued operations
        this.operationQueue.forEach(item => {
            item.reject(new Error('Operation queue cleared'));
        });
        
        this.operationQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Get queued operations
     * @returns {Array} Array of queued operations
     */
    getQueuedOperations() {
        return this.operationQueue.map(item => ({
            id: item.id,
            priority: item.priority,
            queuedAt: item.queuedAt,
            options: item.options
        }));
    }

    /**
     * Check if operation should be retried
     * @param {string} operationId - Operation ID
     * @returns {boolean} Whether operation should be retried
     */
    shouldRetry(operationId) {
        const attempts = this.retryAttempts.get(operationId) || 0;
        return attempts < this.maxRetries;
    }

    /**
     * Schedule operation retry
     * @param {string} operationId - Operation ID
     * @param {Function} retryFunction - Function to retry
     */
    scheduleRetry(operationId, retryFunction) {
        const attempts = this.retryAttempts.get(operationId) || 0;
        const delay = this.retryDelay * Math.pow(2, attempts); // Exponential backoff
        
        this.retryAttempts.set(operationId, attempts + 1);
        
        setTimeout(async () => {
            const operation = this.operations.get(operationId);
            if (!operation || operation.status !== 'error') return;
            
            // Reset operation for retry
            operation.status = 'running';
            operation.error = null;
            operation.message = `Tentativa ${attempts + 1} de ${this.maxRetries}...`;
            operation.percentage = 0;
            
            this.operations.set(operationId, operation);
            this.notifyCallbacks(operationId, operation);
            
            try {
                await retryFunction();
            } catch (error) {
                this.failOperation(operationId, error.message, {
                    canRetry: this.shouldRetry(operationId),
                    retryFunction
                });
            }
        }, delay);
    }

    /**
     * Manually retry a failed operation
     * @param {string} operationId - Operation ID
     * @returns {boolean} Whether retry was initiated
     */
    retryOperation(operationId) {
        const operation = this.operations.get(operationId);
        if (!operation || operation.status !== 'error' || !operation.canRetry) {
            return false;
        }
        
        if (!this.shouldRetry(operationId)) {
            this.addErrorNotification(operationId, 'Número máximo de tentativas excedido', false);
            return false;
        }
        
        if (operation.retryFunction) {
            this.scheduleRetry(operationId, operation.retryFunction);
            return true;
        }
        
        return false;
    }

    /**
     * Add error notification
     * @param {string} operationId - Operation ID
     * @param {string} error - Error message
     * @param {boolean} canRetry - Whether operation can be retried
     */
    addErrorNotification(operationId, error, canRetry = false) {
        const notification = {
            id: `error-${operationId}-${Date.now()}`,
            operationId,
            error,
            canRetry,
            timestamp: new Date(),
            dismissed: false
        };
        
        this.errorNotifications.push(notification);
        
        // Limit notifications to last 20
        if (this.errorNotifications.length > 20) {
            this.errorNotifications = this.errorNotifications.slice(-20);
        }
        
        // Trigger error notification callback
        this.triggerErrorNotification(notification);
    }

    /**
     * Trigger error notification callback
     * @param {Object} notification - Error notification
     */
    triggerErrorNotification(notification) {
        // Dispatch custom event for error notifications
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('progressError', {
                detail: notification
            });
            window.dispatchEvent(event);
        }
    }

    /**
     * Get error notifications
     * @param {boolean} includesDismissed - Include dismissed notifications
     * @returns {Array} Array of error notifications
     */
    getErrorNotifications(includeDismissed = false) {
        return this.errorNotifications.filter(notification => 
            includeDismissed || !notification.dismissed
        );
    }

    /**
     * Dismiss error notification
     * @param {string} notificationId - Notification ID
     */
    dismissErrorNotification(notificationId) {
        const notification = this.errorNotifications.find(n => n.id === notificationId);
        if (notification) {
            notification.dismissed = true;
        }
    }

    /**
     * Clear all error notifications
     */
    clearErrorNotifications() {
        this.errorNotifications = [];
    }

    /**
     * Set retry configuration
     * @param {Object} config - Retry configuration
     */
    setRetryConfig(config = {}) {
        this.maxRetries = config.maxRetries || this.maxRetries;
        this.retryDelay = config.retryDelay || this.retryDelay;
    }

    /**
     * Create operation with retry capability
     * @param {string} operationId - Operation ID
     * @param {Function} operationFunction - Function to execute
     * @param {Object} options - Operation options
     * @returns {Promise} Promise that resolves when operation completes
     */
    async createRetryableOperation(operationId, operationFunction, options = {}) {
        const { title = 'Processando...', initialMessage = 'Iniciando operação...', autoRetry = true } = options;
        
        this.startOperation(operationId, title, initialMessage);
        
        const executeWithRetry = async () => {
            try {
                const result = await operationFunction();
                this.completeOperation(operationId, 'Operação concluída com sucesso!');
                return result;
            } catch (error) {
                this.failOperation(operationId, error.message, {
                    canRetry: autoRetry,
                    retryFunction: autoRetry ? executeWithRetry : null,
                    showNotification: true
                });
                throw error;
            }
        };
        
        return executeWithRetry();
    }

    /**
     * Create operation cancellation token
     * @param {string} operationId - Operation ID
     * @returns {Object} Cancellation token
     */
    createCancellationToken(operationId) {
        let isCancelled = false;
        
        return {
            get isCancelled() {
                const operation = this.operations.get(operationId);
                return isCancelled || (operation && operation.status === 'cancelled');
            },
            
            cancel: () => {
                isCancelled = true;
                this.cancelOperation(operationId);
            },
            
            throwIfCancelled: () => {
                if (this.isCancelled) {
                    throw new Error('Operation was cancelled');
                }
            }
        };
    }

    /**
     * Get operation statistics
     * @returns {Object} Operation statistics
     */
    getOperationStats() {
        const operations = Array.from(this.operations.values());
        
        return {
            total: operations.length,
            running: operations.filter(op => op.status === 'running').length,
            completed: operations.filter(op => op.status === 'completed').length,
            failed: operations.filter(op => op.status === 'error').length,
            cancelled: operations.filter(op => op.status === 'cancelled').length,
            retryable: operations.filter(op => op.status === 'error' && op.canRetry).length,
            queueLength: this.operationQueue.length,
            errorNotifications: this.getErrorNotifications().length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressTracker;
} else {
    window.ProgressTracker = ProgressTracker;
}