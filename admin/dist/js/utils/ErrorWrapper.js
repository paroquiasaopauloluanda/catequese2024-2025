/**
 * Error Wrapper Utility
 * Wraps existing manager classes with comprehensive error handling
 */

class ErrorWrapper {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.wrappedMethods = new WeakMap();
    }

    /**
     * Wrap a manager class with error handling
     * @param {Object} manager - Manager instance to wrap
     * @param {Object} config - Wrapping configuration
     * @returns {Object} Wrapped manager
     */
    wrapManager(manager, config = {}) {
        const {
            contextName = manager.constructor.name,
            excludeMethods = ['constructor'],
            includePrivate = false,
            retryConfig = {},
            fallbackMethods = {}
        } = config;

        // Get all methods from the manager
        const methods = this.getAllMethods(manager, includePrivate);
        
        // Wrap each method
        methods.forEach(methodName => {
            if (excludeMethods.includes(methodName)) return;
            
            const originalMethod = manager[methodName];
            if (typeof originalMethod !== 'function') return;

            // Create wrapped method
            const wrappedMethod = this.createWrappedMethod(
                originalMethod,
                manager,
                methodName,
                contextName,
                retryConfig[methodName],
                fallbackMethods[methodName]
            );

            // Store original method reference
            this.wrappedMethods.set(wrappedMethod, originalMethod);
            
            // Replace method on manager
            manager[methodName] = wrappedMethod;
        });

        return manager;
    }

    /**
     * Get all methods from an object
     * @param {Object} obj - Object to inspect
     * @param {boolean} includePrivate - Include private methods
     * @returns {string[]} Method names
     */
    getAllMethods(obj, includePrivate = false) {
        const methods = new Set();
        
        // Get methods from object and its prototype chain
        let current = obj;
        while (current && current !== Object.prototype) {
            Object.getOwnPropertyNames(current).forEach(name => {
                if (typeof current[name] === 'function') {
                    if (includePrivate || !name.startsWith('_')) {
                        methods.add(name);
                    }
                }
            });
            current = Object.getPrototypeOf(current);
        }
        
        return Array.from(methods);
    }

    /**
     * Create wrapped method with error handling
     * @param {Function} originalMethod - Original method
     * @param {Object} context - Method context (this)
     * @param {string} methodName - Method name
     * @param {string} contextName - Context name for logging
     * @param {Object} retryConfig - Retry configuration
     * @param {Function} fallbackMethod - Fallback method
     * @returns {Function} Wrapped method
     */
    createWrappedMethod(originalMethod, context, methodName, contextName, retryConfig, fallbackMethod) {
        return async function wrappedMethod(...args) {
            const operationContext = {
                operation: `${contextName}.${methodName}`,
                manager: contextName,
                method: methodName,
                args: args.length > 0 ? '[arguments provided]' : 'no arguments'
            };

            try {
                // Execute original method with retry logic if configured
                if (retryConfig) {
                    return await this.executeWithRetry(
                        () => originalMethod.apply(context, args),
                        retryConfig,
                        operationContext
                    );
                } else {
                    return await originalMethod.apply(context, args);
                }
                
            } catch (error) {
                // Handle error through error handler
                const result = this.errorHandler.handleError(error, operationContext);
                
                // Try fallback method if available
                if (fallbackMethod && typeof fallbackMethod === 'function') {
                    try {
                        
                        return await fallbackMethod.apply(context, args);
                    } catch (fallbackError) {
                        console.error(`Fallback also failed for ${contextName}.${methodName}:`, fallbackError);
                    }
                }
                
                // Re-throw if critical or no fallback
                if (result.shouldReload || !result.canRetry) {
                    throw error;
                }
                
                // Return error result for non-critical errors
                return result;
            }
        }.bind(this);
    }

    /**
     * Execute function with retry logic
     * @param {Function} fn - Function to execute
     * @param {Object} retryConfig - Retry configuration
     * @param {Object} context - Operation context
     * @returns {Promise<any>} Function result
     */
    async executeWithRetry(fn, retryConfig, context) {
        const {
            maxRetries = 3,
            baseDelay = 1000,
            maxDelay = 10000,
            backoffMultiplier = 2,
            retryCondition = null
        } = retryConfig;

        let lastError;
        let delay = baseDelay;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                // Check if we should retry this error
                if (retryCondition && !retryCondition(error, attempt)) {
                    throw error;
                }
                
                // Don't retry on last attempt
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Log retry attempt
                
                
                // Wait before retry
                await this.sleep(delay);
                
                // Increase delay for next attempt
                delay = Math.min(delay * backoffMultiplier, maxDelay);
            }
        }
        
        throw lastError;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wrap specific methods of a manager
     * @param {Object} manager - Manager instance
     * @param {string[]} methodNames - Method names to wrap
     * @param {Object} config - Wrapping configuration
     * @returns {Object} Manager with wrapped methods
     */
    wrapSpecificMethods(manager, methodNames, config = {}) {
        const {
            contextName = manager.constructor.name,
            retryConfig = {},
            fallbackMethods = {}
        } = config;

        methodNames.forEach(methodName => {
            const originalMethod = manager[methodName];
            if (typeof originalMethod !== 'function') return;

            const wrappedMethod = this.createWrappedMethod(
                originalMethod,
                manager,
                methodName,
                contextName,
                retryConfig[methodName],
                fallbackMethods[methodName]
            );

            this.wrappedMethods.set(wrappedMethod, originalMethod);
            manager[methodName] = wrappedMethod;
        });

        return manager;
    }

    /**
     * Unwrap a method to restore original functionality
     * @param {Object} manager - Manager instance
     * @param {string} methodName - Method name to unwrap
     */
    unwrapMethod(manager, methodName) {
        const currentMethod = manager[methodName];
        const originalMethod = this.wrappedMethods.get(currentMethod);
        
        if (originalMethod) {
            manager[methodName] = originalMethod;
            this.wrappedMethods.delete(currentMethod);
        }
    }

    /**
     * Create error handling configuration for common manager types
     * @param {string} managerType - Type of manager (auth, config, file, github)
     * @returns {Object} Error handling configuration
     */
    static getManagerConfig(managerType) {
        const configs = {
            auth: {
                contextName: 'AuthManager',
                retryConfig: {
                    login: {
                        maxRetries: 0, // Don't retry login failures
                        retryCondition: () => false
                    }
                },
                fallbackMethods: {
                    isAuthenticated: function() {
                        // Fallback: check if session exists in localStorage
                        try {
                            const session = localStorage.getItem(this.sessionKey);
                            return session !== null;
                        } catch {
                            return false;
                        }
                    }
                }
            },
            
            config: {
                contextName: 'ConfigManager',
                retryConfig: {
                    loadSettings: {
                        maxRetries: 2,
                        baseDelay: 1000,
                        retryCondition: (error) => error.name.includes('Network')
                    },
                    updateSettings: {
                        maxRetries: 1,
                        baseDelay: 2000
                    }
                },
                fallbackMethods: {
                    loadSettings: function() {
                        // Fallback: return default configuration
                        
                        return this.getDefaultConfig();
                    }
                }
            },
            
            file: {
                contextName: 'FileManager',
                retryConfig: {
                    uploadFile: {
                        maxRetries: 2,
                        baseDelay: 2000,
                        retryCondition: (error) => 
                            error.name.includes('Network') || 
                            error.message.includes('timeout')
                    }
                },
                fallbackMethods: {
                    validateFile: function(file, type) {
                        // Fallback: basic validation
                        if (!file) {
                            return { isValid: false, errors: ['Nenhum arquivo selecionado'], warnings: [] };
                        }
                        return { isValid: true, errors: [], warnings: ['Validação básica aplicada'] };
                    }
                }
            },
            
            github: {
                contextName: 'GitHubManager',
                retryConfig: {
                    commitFile: {
                        maxRetries: 3,
                        baseDelay: 2000,
                        maxDelay: 10000,
                        retryCondition: (error) => 
                            error.message.includes('rate limit') ||
                            error.message.includes('timeout') ||
                            error.name.includes('Network')
                    },
                    getFileContent: {
                        maxRetries: 2,
                        baseDelay: 1000
                    }
                },
                fallbackMethods: {
                    isConfigured: function() {
                        // Fallback: basic configuration check
                        return this.token && this.repository;
                    }
                }
            },
            
            progress: {
                contextName: 'ProgressTracker',
                retryConfig: {},
                fallbackMethods: {
                    updateProgress: function(operationId, progress) {
                        // Fallback: log progress to console
                        
                    }
                }
            }
        };

        return configs[managerType] || {
            contextName: 'UnknownManager',
            retryConfig: {},
            fallbackMethods: {}
        };
    }

    /**
     * Wrap all managers in an application
     * @param {Object} app - Application instance with managers
     * @param {Object} customConfigs - Custom configurations for specific managers
     * @returns {Object} Application with wrapped managers
     */
    static wrapAllManagers(app, customConfigs = {}) {
        const errorHandler = new ErrorHandler();
        const wrapper = new ErrorWrapper(errorHandler);
        
        // Set up error handler dependencies
        if (app.logManager) {
            errorHandler.setDependencies(app.logManager);
        }

        // Common manager names and their types
        const managerMappings = {
            authManager: 'auth',
            configManager: 'config',
            fileManager: 'file',
            githubManager: 'github',
            progressTracker: 'progress'
        };

        // Wrap each manager
        Object.entries(managerMappings).forEach(([managerName, managerType]) => {
            if (app[managerName]) {
                const config = customConfigs[managerName] || ErrorWrapper.getManagerConfig(managerType);
                wrapper.wrapManager(app[managerName], config);
                
            }
        });

        // Store error handler and wrapper on app for access
        app.errorHandler = errorHandler;
        app.errorWrapper = wrapper;

        return app;
    }
}

// Export for use in other modules
window.ErrorWrapper = ErrorWrapper;