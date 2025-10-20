/**
 * GitHub API Optimizer
 * Handles GitHub API rate limiting, request batching, and optimization
 */
class GitHubOptimizer {
    constructor() {
        this.requestQueue = [];
        this.isProcessing = false;
        this.rateLimitInfo = {
            remaining: 5000,
            reset: null,
            limit: 5000
        };
        
        // Request batching settings
        this.batchSettings = {
            maxBatchSize: 5,
            batchDelay: 1000, // 1 second between batches
            retryDelay: 2000, // 2 seconds for retries
            maxRetries: 3
        };
        
        // Request cache for GET operations
        this.requestCache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minutes
    }

    /**
     * Add request to optimized queue
     * @param {Function} requestFn - Function that returns a Promise for the request
     * @param {Object} options - Request options
     * @returns {Promise} Promise that resolves when request is completed
     */
    async queueRequest(requestFn, options = {}) {
        return new Promise((resolve, reject) => {
            const request = {
                id: this.generateRequestId(),
                fn: requestFn,
                options: {
                    priority: options.priority || 'normal', // 'high', 'normal', 'low'
                    cacheable: options.cacheable || false,
                    cacheKey: options.cacheKey || null,
                    retries: 0,
                    maxRetries: options.maxRetries || this.batchSettings.maxRetries
                },
                resolve,
                reject,
                timestamp: Date.now()
            };

            // Check cache for GET requests
            if (request.options.cacheable && request.options.cacheKey) {
                const cached = this.getCachedResponse(request.options.cacheKey);
                if (cached) {
                    resolve(cached);
                    return;
                }
            }

            // Add to queue based on priority
            if (request.options.priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }

            // Start processing if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process the request queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.requestQueue.length > 0) {
                // Check rate limit before processing
                await this.checkRateLimit();

                // Get batch of requests
                const batch = this.getBatch();
                
                if (batch.length === 0) {
                    break;
                }

                // Process batch
                await this.processBatch(batch);

                // Delay between batches
                if (this.requestQueue.length > 0) {
                    await this.sleep(this.batchSettings.batchDelay);
                }
            }
        } catch (error) {
            console.error('Error processing request queue:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get next batch of requests to process
     * @returns {Array} Batch of requests
     */
    getBatch() {
        const batchSize = Math.min(this.batchSettings.maxBatchSize, this.requestQueue.length);
        return this.requestQueue.splice(0, batchSize);
    }

    /**
     * Process a batch of requests
     * @param {Array} batch - Batch of requests to process
     */
    async processBatch(batch) {
        const promises = batch.map(request => this.executeRequest(request));
        
        // Wait for all requests in batch to complete
        const results = await Promise.allSettled(promises);
        
        // Handle results
        results.forEach((result, index) => {
            const request = batch[index];
            
            if (result.status === 'fulfilled') {
                // Cache successful GET requests
                if (request.options.cacheable && request.options.cacheKey) {
                    this.cacheResponse(request.options.cacheKey, result.value);
                }
                
                request.resolve(result.value);
            } else {
                // Handle failures with retry logic
                this.handleRequestFailure(request, result.reason);
            }
        });
    }

    /**
     * Execute a single request with error handling
     * @param {Object} request - Request to execute
     * @returns {Promise} Request result
     */
    async executeRequest(request) {
        try {
            const startTime = Date.now();
            const result = await request.fn();
            
            // Update rate limit info if available in response
            if (result && result.headers) {
                this.updateRateLimitInfo(result.headers);
            }
            
            const duration = Date.now() - startTime;
            console.log(`GitHub API request completed in ${duration}ms`);
            
            return result;
            
        } catch (error) {
            // Check if it's a rate limit error
            if (error.message.includes('rate limit') || error.message.includes('403')) {
                // Extract rate limit info from error if available
                this.handleRateLimitError(error);
            }
            
            throw error;
        }
    }

    /**
     * Handle request failure with retry logic
     * @param {Object} request - Failed request
     * @param {Error} error - Error that occurred
     */
    async handleRequestFailure(request, error) {
        request.options.retries++;
        
        // Check if we should retry
        if (request.options.retries <= request.options.maxRetries) {
            console.warn(`Request failed, retrying (${request.options.retries}/${request.options.maxRetries}):`, error.message);
            
            // Add back to queue with delay
            setTimeout(() => {
                this.requestQueue.unshift(request); // High priority for retries
                if (!this.isProcessing) {
                    this.processQueue();
                }
            }, this.batchSettings.retryDelay * request.options.retries);
            
        } else {
            // Max retries exceeded, reject the request
            request.reject(new Error(`Request failed after ${request.options.maxRetries} retries: ${error.message}`));
        }
    }

    /**
     * Check rate limit and wait if necessary
     */
    async checkRateLimit() {
        // If we're close to the rate limit, wait
        if (this.rateLimitInfo.remaining <= 10 && this.rateLimitInfo.reset) {
            const waitTime = Math.max(0, this.rateLimitInfo.reset - Date.now()) + 1000;
            
            if (waitTime > 0) {
                console.warn(`Rate limit low (${this.rateLimitInfo.remaining} remaining). Waiting ${waitTime}ms.`);
                await this.sleep(waitTime);
            }
        }
    }

    /**
     * Update rate limit information from response headers
     * @param {Headers} headers - Response headers
     */
    updateRateLimitInfo(headers) {
        const remaining = headers.get('X-RateLimit-Remaining');
        const reset = headers.get('X-RateLimit-Reset');
        const limit = headers.get('X-RateLimit-Limit');
        
        if (remaining !== null) {
            this.rateLimitInfo.remaining = parseInt(remaining);
        }
        
        if (reset !== null) {
            this.rateLimitInfo.reset = parseInt(reset) * 1000; // Convert to milliseconds
        }
        
        if (limit !== null) {
            this.rateLimitInfo.limit = parseInt(limit);
        }
    }

    /**
     * Handle rate limit error
     * @param {Error} error - Rate limit error
     */
    handleRateLimitError(error) {
        // Set rate limit to 0 to trigger waiting
        this.rateLimitInfo.remaining = 0;
        
        // Try to extract reset time from error message or set a default
        const resetMatch = error.message.match(/reset.*?(\d+)/);
        if (resetMatch) {
            this.rateLimitInfo.reset = parseInt(resetMatch[1]) * 1000;
        } else {
            // Default to 1 hour from now
            this.rateLimitInfo.reset = Date.now() + (60 * 60 * 1000);
        }
    }

    /**
     * Cache response for GET requests
     * @param {string} key - Cache key
     * @param {any} response - Response to cache
     */
    cacheResponse(key, response) {
        // Clean up expired entries
        this.cleanupCache();
        
        this.requestCache.set(key, {
            data: response,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached response
     * @param {string} key - Cache key
     * @returns {any|null} Cached response or null
     */
    getCachedResponse(key) {
        const cached = this.requestCache.get(key);
        
        if (!cached) return null;
        
        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.requestCache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        
        for (const [key, entry] of this.requestCache.entries()) {
            if (now - entry.timestamp > this.cacheExpiry) {
                this.requestCache.delete(key);
            }
        }
    }

    /**
     * Generate unique request ID
     * @returns {string} Unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get queue statistics
     * @returns {Object} Queue statistics
     */
    getQueueStats() {
        return {
            queueLength: this.requestQueue.length,
            isProcessing: this.isProcessing,
            rateLimitInfo: { ...this.rateLimitInfo },
            cacheSize: this.requestCache.size,
            highPriorityRequests: this.requestQueue.filter(r => r.options.priority === 'high').length
        };
    }

    /**
     * Clear request queue and cache
     */
    clear() {
        this.requestQueue = [];
        this.requestCache.clear();
        this.isProcessing = false;
    }

    /**
     * Optimize file upload by splitting large files
     * @param {string} content - Base64 content
     * @param {string} path - File path
     * @param {string} message - Commit message
     * @param {Function} githubCommitFn - GitHub commit function
     * @returns {Promise} Upload result
     */
    async optimizeFileUpload(content, path, message, githubCommitFn) {
        const maxSize = 50 * 1024 * 1024; // 50MB GitHub limit
        const contentSize = content.length * 0.75; // Approximate decoded size
        
        if (contentSize <= maxSize) {
            // File is small enough, upload normally
            return await this.queueRequest(
                () => githubCommitFn(path, content, message),
                { priority: 'high' }
            );
        }
        
        // File is too large, need to handle differently
        throw new Error(`Arquivo muito grande (${Math.round(contentSize / 1024 / 1024)}MB). Limite do GitHub é 50MB.`);
    }

    /**
     * Batch multiple file operations
     * @param {Array} operations - Array of file operations
     * @returns {Promise<Array>} Results of all operations
     */
    async batchFileOperations(operations) {
        const results = [];
        
        // Group operations by priority
        const highPriority = operations.filter(op => op.priority === 'high');
        const normalPriority = operations.filter(op => op.priority !== 'high');
        
        // Process high priority first
        for (const operation of highPriority) {
            const result = await this.queueRequest(operation.fn, operation.options);
            results.push(result);
        }
        
        // Process normal priority in batches
        for (let i = 0; i < normalPriority.length; i += this.batchSettings.maxBatchSize) {
            const batch = normalPriority.slice(i, i + this.batchSettings.maxBatchSize);
            
            const batchPromises = batch.map(operation => 
                this.queueRequest(operation.fn, operation.options)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GitHubOptimizer = GitHubOptimizer;
}