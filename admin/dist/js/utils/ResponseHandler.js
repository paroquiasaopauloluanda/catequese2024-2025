/**
 * Response Handler Utility
 * Provides safe API response processing to prevent parsing errors
 */
class ResponseHandler {
    constructor() {
        this.defaultTimeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second base delay
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cachedResponses: 0,
            retryAttempts: 0
        };
    }

    /**
     * Safely parse JSON from response
     * @param {Response} response - Fetch response object
     * @returns {Promise<any>} Parsed JSON data
     */
    static async safeJsonParse(response) {
        try {
            // Check if response exists and has the json method
            if (!response || typeof response.json !== 'function') {
                throw new Error('Invalid response object - missing json method');
            }

            // Check if response is ok
            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    // Attempt to read response as text first
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const errorJson = JSON.parse(errorText);
                            errorMessage = errorJson.message || errorJson.error || errorMessage;
                        } catch {
                            // If not JSON, use the text as error message
                            errorMessage = errorText.substring(0, 200); // Limit length
                        }
                    }
                } catch {
                    // If we can't read the response, use the default message
                }
                
                throw new Error(errorMessage);
            }

            // Check content type
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/json')) {
                // If not JSON content type, try to read as text
                const textContent = await response.text();
                
                // Try to parse as JSON anyway (some APIs don't set correct content-type)
                try {
                    return JSON.parse(textContent);
                } catch {
                    // If parsing fails, return the text content
                    return { 
                        content: textContent,
                        contentType: contentType,
                        isText: true 
                    };
                }
            }

            // Clone response to handle potential multiple reads
            const clonedResponse = response.clone();
            
            try {
                return await response.json();
            } catch (jsonError) {
                // If JSON parsing fails, try reading as text
                try {
                    const textContent = await clonedResponse.text();
                    
                    // Check if it's empty
                    if (!textContent.trim()) {
                        return null;
                    }
                    
                    // Try manual JSON parsing with better error handling
                    try {
                        return JSON.parse(textContent);
                    } catch {
                        // Return text content with metadata
                        return {
                            content: textContent,
                            parseError: jsonError.message,
                            isText: true
                        };
                    }
                } catch (textError) {
                    throw new Error(`Failed to parse response: ${jsonError.message}`);
                }
            }

        } catch (error) {
            throw new Error(`Response parsing error: ${error.message}`);
        }
    }

    /**
     * Safely parse text from response
     * @param {Response} response - Fetch response object
     * @returns {Promise<string>} Response text
     */
    static async safeTextParse(response) {
        try {
            if (!response || typeof response.text !== 'function') {
                throw new Error('Invalid response object - missing text method');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();

        } catch (error) {
            throw new Error(`Text parsing error: ${error.message}`);
        }
    }

    /**
     * Make a safe HTTP request with retry logic and caching
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {Object} config - Additional configuration
     * @returns {Promise<Object>} Response data with metadata
     */
    async safeRequest(url, options = {}, config = {}) {
        const requestId = this.generateRequestId(url, options);
        const useCache = config.cache !== false;
        const timeout = config.timeout || this.defaultTimeout;
        const maxRetries = config.retries !== undefined ? config.retries : this.retryAttempts;

        this.stats.totalRequests++;

        // Check cache first
        if (useCache) {
            const cached = this.getFromCache(requestId);
            if (cached) {
                this.stats.cachedResponses++;
                return {
                    success: true,
                    data: cached.data,
                    cached: true,
                    timestamp: cached.timestamp,
                    requestId
                };
            }
        }

        let lastError = null;
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const requestOptions = {
                    ...options,
                    signal: controller.signal
                };

                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);

                // Parse response based on expected type
                let data;
                const expectedType = config.responseType || 'json';
                
                switch (expectedType) {
                    case 'text':
                        data = await ResponseHandler.safeTextParse(response);
                        break;
                    case 'json':
                    default:
                        data = await ResponseHandler.safeJsonParse(response);
                        break;
                }

                // Cache successful response
                if (useCache && response.ok) {
                    this.setCache(requestId, data);
                }

                this.stats.successfulRequests++;

                return {
                    success: true,
                    data,
                    cached: false,
                    timestamp: Date.now(),
                    requestId,
                    status: response.status,
                    statusText: response.statusText,
                    headers: this.extractHeaders(response),
                    attempt: attempt + 1
                };

            } catch (error) {
                lastError = error;
                attempt++;
                this.stats.retryAttempts++;

                // Don't retry on certain errors
                if (this.shouldNotRetry(error) || attempt > maxRetries) {
                    break;
                }

                // Calculate backoff delay
                const delay = this.calculateBackoffDelay(attempt, config.backoffMultiplier);
                await this.sleep(delay);
            }
        }

        this.stats.failedRequests++;

        return {
            success: false,
            error: lastError.message,
            cached: false,
            timestamp: Date.now(),
            requestId,
            attempt: attempt,
            maxRetries
        };
    }

    /**
     * Make a request with offline fallback
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {Object} fallbackData - Data to return when offline
     * @param {Object} config - Additional configuration
     * @returns {Promise<Object>} Response data with metadata
     */
    async requestWithFallback(url, options = {}, fallbackData = null, config = {}) {
        try {
            const result = await this.safeRequest(url, options, config);
            
            if (result.success) {
                return result;
            }

            // If request failed and we have fallback data, use it
            if (fallbackData !== null) {
                return {
                    success: true,
                    data: fallbackData,
                    cached: false,
                    fallback: true,
                    timestamp: Date.now(),
                    originalError: result.error
                };
            }

            return result;

        } catch (error) {
            // Network error or other exception
            if (fallbackData !== null) {
                return {
                    success: true,
                    data: fallbackData,
                    cached: false,
                    fallback: true,
                    timestamp: Date.now(),
                    originalError: error.message
                };
            }

            return {
                success: false,
                error: error.message,
                cached: false,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Generate a unique request ID for caching
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {string} Request ID
     * @private
     */
    generateRequestId(url, options) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.stringify(options.body) : '';
        const headers = JSON.stringify(options.headers || {});
        
        return btoa(`${method}:${url}:${headers}:${body}`).replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Get response from cache
     * @param {string} requestId - Request ID
     * @returns {Object|null} Cached response or null
     * @private
     */
    getFromCache(requestId) {
        const cached = this.cache.get(requestId);
        
        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(requestId);
            return null;
        }

        return cached;
    }

    /**
     * Set response in cache
     * @param {string} requestId - Request ID
     * @param {any} data - Response data
     * @private
     */
    setCache(requestId, data) {
        // Limit cache size
        if (this.cache.size >= 100) {
            // Remove oldest entries
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, 10);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }

        this.cache.set(requestId, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Check if error should not trigger a retry
     * @param {Error} error - Error object
     * @returns {boolean} True if should not retry
     * @private
     */
    shouldNotRetry(error) {
        const message = error.message.toLowerCase();
        
        // Don't retry on client errors (4xx)
        if (message.includes('http 4')) {
            return true;
        }

        // Don't retry on authentication errors
        if (message.includes('unauthorized') || message.includes('forbidden')) {
            return true;
        }

        // Don't retry on parsing errors (likely not transient)
        if (message.includes('parsing error') || message.includes('invalid json')) {
            return true;
        }

        return false;
    }

    /**
     * Calculate backoff delay for retries
     * @param {number} attempt - Current attempt number
     * @param {number} multiplier - Backoff multiplier
     * @returns {number} Delay in milliseconds
     * @private
     */
    calculateBackoffDelay(attempt, multiplier = 2) {
        const baseDelay = this.retryDelay;
        const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        
        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Extract relevant headers from response
     * @param {Response} response - Fetch response
     * @returns {Object} Headers object
     * @private
     */
    extractHeaders(response) {
        const headers = {};
        const relevantHeaders = [
            'content-type',
            'content-length',
            'x-ratelimit-remaining',
            'x-ratelimit-reset',
            'cache-control',
            'etag'
        ];

        relevantHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                headers[header] = value;
            }
        });

        return headers;
    }

    /**
     * Clear all cached responses
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.cacheTimeout) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            cacheTimeout: this.cacheTimeout
        };
    }

    /**
     * Get request statistics
     * @returns {Object} Request statistics
     */
    getStats() {
        return {
            ...this.stats,
            cache: this.getCacheStats()
        };
    }

    /**
     * Reset all statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cachedResponses: 0,
            retryAttempts: 0
        };
    }

    /**
     * Set cache timeout
     * @param {number} timeout - Timeout in milliseconds
     */
    setCacheTimeout(timeout) {
        this.cacheTimeout = Math.max(0, timeout);
    }

    /**
     * Set default request timeout
     * @param {number} timeout - Timeout in milliseconds
     */
    setTimeout(timeout) {
        this.defaultTimeout = Math.max(1000, timeout);
    }

    /**
     * Set retry configuration
     * @param {number} attempts - Number of retry attempts
     * @param {number} delay - Base delay between retries
     */
    setRetryConfig(attempts, delay) {
        this.retryAttempts = Math.max(0, attempts);
        this.retryDelay = Math.max(100, delay);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponseHandler;
} else {
    window.ResponseHandler = ResponseHandler;
}