/**
 * Error Handler Utility
 * Comprehensive error handling system for the admin panel
 */

class ErrorHandler {
    constructor() {
        this.errorTypes = {
            AUTHENTICATION: 'authentication',
            VALIDATION: 'validation',
            NETWORK: 'network',
            FILE_UPLOAD: 'file_upload',
            GITHUB_API: 'github_api',
            CONFIG: 'config',
            SYSTEM: 'system',
            USER_INPUT: 'user_input'
        };

        this.severityLevels = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };

        this.retryableErrors = new Set([
            'NetworkError',
            'TimeoutError',
            'RateLimitError',
            'TemporaryError'
        ]);

        this.logManager = null;
        this.notificationManager = null;
    }

    /**
     * Set dependencies
     * @param {LogManager} logManager - Log manager instance
     * @param {Object} notificationManager - Notification manager instance
     */
    setDependencies(logManager, notificationManager = null) {
        this.logManager = logManager;
        this.notificationManager = notificationManager || HelperUtils;
    }

    /**
     * Handle error with comprehensive processing
     * @param {Error|string} error - Error to handle
     * @param {Object} context - Error context information
     * @returns {ErrorHandlingResult} Handling result with recovery suggestions
     */
    handleError(error, context = {}) {
        try {
            // Normalize error object
            const normalizedError = this.normalizeError(error);
            
            // Classify error
            const classification = this.classifyError(normalizedError, context);
            
            // Generate user-friendly message
            const userMessage = this.generateUserMessage(normalizedError, classification);
            
            // Generate recovery suggestions
            const recoverySuggestions = this.generateRecoverySuggestions(normalizedError, classification);
            
            // Log error
            this.logError(normalizedError, classification, context);
            
            // Show user notification if appropriate
            if (classification.showToUser) {
                this.showUserNotification(userMessage, classification, recoverySuggestions);
            }
            
            // Return handling result
            return {
                error: normalizedError,
                classification,
                userMessage,
                recoverySuggestions,
                canRetry: this.canRetry(normalizedError, classification),
                shouldReload: classification.severity === this.severityLevels.CRITICAL
            };
            
        } catch (handlingError) {
            console.error('Error in error handler:', handlingError);
            
            // Fallback error handling
            const fallbackMessage = 'Ocorreu um erro inesperado. Tente recarregar a página.';
            if (this.notificationManager) {
                this.notificationManager.showNotification(fallbackMessage, 'error');
            }
            
            return {
                error: error,
                classification: { type: this.errorTypes.SYSTEM, severity: this.severityLevels.HIGH },
                userMessage: fallbackMessage,
                recoverySuggestions: ['Recarregue a página', 'Verifique sua conexão'],
                canRetry: false,
                shouldReload: true
            };
        }
    }

    /**
     * Normalize error to standard format
     * @param {Error|string|Object} error - Error to normalize
     * @returns {NormalizedError} Normalized error object
     */
    normalizeError(error) {
        if (typeof error === 'string') {
            return {
                name: 'GenericError',
                message: error,
                stack: new Error().stack,
                originalError: error
            };
        }

        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
                originalError: error
            };
        }

        if (typeof error === 'object' && error !== null) {
            return {
                name: error.name || 'UnknownError',
                message: error.message || 'Erro desconhecido',
                stack: error.stack || new Error().stack,
                originalError: error
            };
        }

        return {
            name: 'UnknownError',
            message: 'Erro desconhecido',
            stack: new Error().stack,
            originalError: error
        };
    }

    /**
     * Classify error by type and severity
     * @param {NormalizedError} error - Normalized error
     * @param {Object} context - Error context
     * @returns {ErrorClassification} Error classification
     */
    classifyError(error, context) {
        const classification = {
            type: this.errorTypes.SYSTEM,
            severity: this.severityLevels.MEDIUM,
            showToUser: true,
            category: 'unknown'
        };

        // Classify by error name/type
        if (error.name.includes('Auth') || context.operation === 'login') {
            classification.type = this.errorTypes.AUTHENTICATION;
            classification.category = 'auth';
        } else if (error.name.includes('Validation') || error.message.includes('inválid')) {
            classification.type = this.errorTypes.VALIDATION;
            classification.category = 'validation';
            classification.severity = this.severityLevels.LOW;
        } else if (error.name.includes('Network') || error.message.includes('fetch')) {
            classification.type = this.errorTypes.NETWORK;
            classification.category = 'network';
        } else if (context.operation === 'file_upload' || error.message.includes('arquivo')) {
            classification.type = this.errorTypes.FILE_UPLOAD;
            classification.category = 'file';
        } else if (error.message.includes('GitHub') || error.message.includes('API')) {
            classification.type = this.errorTypes.GITHUB_API;
            classification.category = 'github';
        } else if (context.operation === 'config' || error.message.includes('configuração')) {
            classification.type = this.errorTypes.CONFIG;
            classification.category = 'config';
        }

        // Determine severity
        if (error.message.includes('crítico') || error.name.includes('Critical')) {
            classification.severity = this.severityLevels.CRITICAL;
        } else if (error.message.includes('falha') || error.name.includes('Fatal')) {
            classification.severity = this.severityLevels.HIGH;
        } else if (error.message.includes('aviso') || error.name.includes('Warning')) {
            classification.severity = this.severityLevels.LOW;
        }

        return classification;
    }

    /**
     * Generate user-friendly error message
     * @param {NormalizedError} error - Normalized error
     * @param {ErrorClassification} classification - Error classification
     * @returns {string} User-friendly message
     */
    generateUserMessage(error, classification) {
        const messageTemplates = {
            [this.errorTypes.AUTHENTICATION]: {
                default: 'Erro de autenticação. Verifique suas credenciais.',
                session_expired: 'Sua sessão expirou. Faça login novamente.',
                invalid_credentials: 'Credenciais inválidas. Verifique usuário e senha.',
                account_locked: 'Conta temporariamente bloqueada devido a múltiplas tentativas.'
            },
            [this.errorTypes.VALIDATION]: {
                default: 'Dados inválidos. Verifique os campos preenchidos.',
                required_field: 'Campos obrigatórios não preenchidos.',
                invalid_format: 'Formato de dados inválido.',
                length_error: 'Tamanho do texto fora dos limites permitidos.'
            },
            [this.errorTypes.NETWORK]: {
                default: 'Erro de conexão. Verifique sua internet.',
                timeout: 'Operação demorou muito para responder. Tente novamente.',
                offline: 'Você está offline. Verifique sua conexão.',
                server_error: 'Erro no servidor. Tente novamente em alguns minutos.'
            },
            [this.errorTypes.FILE_UPLOAD]: {
                default: 'Erro no upload do arquivo. Verifique o arquivo e tente novamente.',
                invalid_type: 'Tipo de arquivo não permitido.',
                too_large: 'Arquivo muito grande.',
                corrupted: 'Arquivo pode estar corrompido.',
                processing_error: 'Erro ao processar o arquivo.'
            },
            [this.errorTypes.GITHUB_API]: {
                default: 'Erro na sincronização com GitHub. Verifique as configurações.',
                rate_limit: 'Limite de requisições atingido. Aguarde alguns minutos.',
                permission_denied: 'Permissões insuficientes no GitHub.',
                repository_not_found: 'Repositório não encontrado.',
                invalid_token: 'Token GitHub inválido ou expirado.'
            },
            [this.errorTypes.CONFIG]: {
                default: 'Erro na configuração. Verifique os dados inseridos.',
                invalid_config: 'Configuração inválida.',
                missing_required: 'Configurações obrigatórias não preenchidas.',
                backup_failed: 'Falha ao criar backup da configuração.'
            },
            [this.errorTypes.SYSTEM]: {
                default: 'Erro interno do sistema. Tente recarregar a página.',
                initialization_failed: 'Falha na inicialização do sistema.',
                component_error: 'Erro em componente do sistema.',
                unexpected_error: 'Erro inesperado. Entre em contato com o suporte.'
            }
        };

        const typeMessages = messageTemplates[classification.type] || messageTemplates[this.errorTypes.SYSTEM];
        
        // Try to find specific message based on error content
        for (const [key, message] of Object.entries(typeMessages)) {
            if (key !== 'default' && error.message.toLowerCase().includes(key.replace('_', ' '))) {
                return message;
            }
        }

        return typeMessages.default;
    }

    /**
     * Generate recovery suggestions
     * @param {NormalizedError} error - Normalized error
     * @param {ErrorClassification} classification - Error classification
     * @returns {string[]} Array of recovery suggestions
     */
    generateRecoverySuggestions(error, classification) {
        const suggestionTemplates = {
            [this.errorTypes.AUTHENTICATION]: [
                'Verifique se o usuário e senha estão corretos',
                'Aguarde alguns minutos se a conta estiver bloqueada',
                'Limpe o cache do navegador',
                'Tente fazer login novamente'
            ],
            [this.errorTypes.VALIDATION]: [
                'Verifique se todos os campos obrigatórios estão preenchidos',
                'Confirme se os dados estão no formato correto',
                'Remova caracteres especiais desnecessários',
                'Tente novamente com dados diferentes'
            ],
            [this.errorTypes.NETWORK]: [
                'Verifique sua conexão com a internet',
                'Tente recarregar a página',
                'Aguarde alguns minutos e tente novamente',
                'Verifique se não há bloqueios de firewall'
            ],
            [this.errorTypes.FILE_UPLOAD]: [
                'Verifique se o arquivo não está corrompido',
                'Confirme se o tipo de arquivo é permitido',
                'Reduza o tamanho do arquivo se necessário',
                'Tente fazer upload de um arquivo diferente'
            ],
            [this.errorTypes.GITHUB_API]: [
                'Verifique se o token GitHub está correto',
                'Confirme se o repositório existe e está acessível',
                'Aguarde alguns minutos se atingiu limite de requisições',
                'Verifique as permissões do token'
            ],
            [this.errorTypes.CONFIG]: [
                'Verifique se todos os campos obrigatórios estão preenchidos',
                'Confirme se os dados estão no formato correto',
                'Tente restaurar um backup anterior',
                'Reinicie o sistema se necessário'
            ],
            [this.errorTypes.SYSTEM]: [
                'Recarregue a página',
                'Limpe o cache do navegador',
                'Tente novamente em alguns minutos',
                'Entre em contato com o suporte se o problema persistir'
            ]
        };

        return suggestionTemplates[classification.type] || suggestionTemplates[this.errorTypes.SYSTEM];
    }

    /**
     * Log error with appropriate level
     * @param {NormalizedError} error - Normalized error
     * @param {ErrorClassification} classification - Error classification
     * @param {Object} context - Error context
     */
    logError(error, classification, context) {
        if (!this.logManager) return;

        const logLevel = this.getLogLevel(classification.severity);
        const logMessage = `${classification.type}: ${error.message}`;
        const logDetails = {
            errorName: error.name,
            classification: classification,
            context: context,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        switch (logLevel) {
            case 'error':
                this.logManager.logError(classification.category, logMessage, logDetails);
                break;
            case 'warning':
                this.logManager.logWarning(classification.category, logMessage, logDetails);
                break;
            default:
                this.logManager.logInfo(classification.category, logMessage, logDetails);
        }
    }

    /**
     * Get log level based on severity
     * @param {string} severity - Error severity
     * @returns {string} Log level
     */
    getLogLevel(severity) {
        switch (severity) {
            case this.severityLevels.CRITICAL:
            case this.severityLevels.HIGH:
                return 'error';
            case this.severityLevels.MEDIUM:
                return 'warning';
            default:
                return 'info';
        }
    }

    /**
     * Show user notification
     * @param {string} message - User message
     * @param {ErrorClassification} classification - Error classification
     * @param {string[]} suggestions - Recovery suggestions
     */
    showUserNotification(message, classification, suggestions) {
        if (!this.notificationManager) return;

        const notificationType = this.getNotificationType(classification.severity);
        
        // Show main error message
        this.notificationManager.showNotification(message, notificationType);

        // Show suggestions for high severity errors
        if (classification.severity === this.severityLevels.HIGH || 
            classification.severity === this.severityLevels.CRITICAL) {
            
            setTimeout(() => {
                const suggestionText = `Sugestões: ${suggestions.slice(0, 2).join('; ')}`;
                this.notificationManager.showNotification(suggestionText, 'info', 8000);
            }, 1000);
        }
    }

    /**
     * Get notification type based on severity
     * @param {string} severity - Error severity
     * @returns {string} Notification type
     */
    getNotificationType(severity) {
        switch (severity) {
            case this.severityLevels.CRITICAL:
            case this.severityLevels.HIGH:
                return 'error';
            case this.severityLevels.MEDIUM:
                return 'warning';
            default:
                return 'info';
        }
    }

    /**
     * Check if error can be retried
     * @param {NormalizedError} error - Normalized error
     * @param {ErrorClassification} classification - Error classification
     * @returns {boolean} True if can retry
     */
    canRetry(error, classification) {
        // Don't retry validation errors
        if (classification.type === this.errorTypes.VALIDATION) {
            return false;
        }

        // Don't retry authentication errors (except session expired)
        if (classification.type === this.errorTypes.AUTHENTICATION && 
            !error.message.includes('sessão')) {
            return false;
        }

        // Check if error type is retryable
        return this.retryableErrors.has(error.name) || 
               classification.type === this.errorTypes.NETWORK ||
               classification.type === this.errorTypes.GITHUB_API;
    }

    /**
     * Wrap function with error handling
     * @param {Function} fn - Function to wrap
     * @param {Object} context - Error context
     * @returns {Function} Wrapped function
     */
    wrapWithErrorHandling(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                const result = this.handleError(error, context);
                
                // Re-throw if critical error
                if (result.shouldReload) {
                    throw error;
                }
                
                return result;
            }
        };
    }

    /**
     * Create error boundary for components
     * @param {Function} componentFn - Component function
     * @param {Object} fallbackUI - Fallback UI configuration
     * @returns {Function} Error boundary wrapped component
     */
    createErrorBoundary(componentFn, fallbackUI = {}) {
        return async (container, ...args) => {
            try {
                return await componentFn(container, ...args);
            } catch (error) {
                const result = this.handleError(error, { 
                    operation: 'component_render',
                    component: componentFn.name 
                });

                // Show fallback UI
                if (container && container.innerHTML !== undefined) {
                    container.innerHTML = this.generateFallbackUI(result, fallbackUI);
                }

                return result;
            }
        };
    }

    /**
     * Generate fallback UI for errors
     * @param {ErrorHandlingResult} errorResult - Error handling result
     * @param {Object} config - Fallback UI configuration
     * @returns {string} Fallback HTML
     */
    generateFallbackUI(errorResult, config = {}) {
        const {
            title = 'Erro no Componente',
            showRetry = true,
            showSuggestions = true,
            customActions = []
        } = config;

        const suggestions = showSuggestions ? 
            errorResult.recoverySuggestions.slice(0, 3).map(s => `<li>${s}</li>`).join('') : '';

        const retryButton = showRetry && errorResult.canRetry ? 
            '<button class="btn btn-primary" onclick="location.reload()">Tentar Novamente</button>' : '';

        const customActionButtons = customActions.map(action => 
            `<button class="btn btn-secondary" onclick="${action.onclick}">${action.label}</button>`
        ).join('');

        return `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>${title}</h3>
                <p class="error-message">${errorResult.userMessage}</p>
                ${suggestions ? `
                    <div class="error-suggestions">
                        <h4>Sugestões:</h4>
                        <ul>${suggestions}</ul>
                    </div>
                ` : ''}
                <div class="error-actions">
                    ${retryButton}
                    ${customActionButtons}
                </div>
            </div>
        `;
    }
}

// Export for use in other modules
window.ErrorHandler = ErrorHandler;