/**
 * GitHub Manager
 * Handles GitHub API integration for repository operations
 */
class GitHubManager {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.token = null;
        this.repository = null;
        this.branch = 'main';
        this.rateLimitRemaining = 5000;
        this.rateLimitReset = null;
        
        // Initialize token manager and security manager
        this.tokenManager = new TokenManager();
        this.securityManager = new SecurityManager();
        
        // Initialize GitHub optimizer
        this.githubOptimizer = new GitHubOptimizer();
        
        // Initialize response handler for safe API response processing
        this.responseHandler = new ResponseHandler();
        
        // Initialize offline mode and caching
        this.offlineMode = false;
        this.localCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
        this.lastOnlineCheck = 0;
        this.onlineCheckInterval = 60000; // 1 minute
        
        // Initialize local rate limiting
        this.requestQueue = [];
        this.requestHistory = [];
        this.maxRequestsPerMinute = 60; // Conservative limit
        this.maxRequestsPerHour = 1000; // Well below GitHub's 5000/hour
        this.requestDelay = 100; // Minimum delay between requests (ms)
        this.lastRequestTime = 0;
    }

    /**
     * Check if GitHub manager is properly configured
     * @returns {boolean} True if configured with token and repository
     */
    isConfigured() {
        return !!(this.token && this.repository);
    }

    /**
     * Initialize GitHub manager with configuration
     * @param {GitHubConfig} config - GitHub configuration
     */
    init(config) {
        // Use token from TokenManager if available, otherwise use provided token
        this.token = this.tokenManager.getToken() || config.token;
        this.repository = config.repository;
        this.branch = config.branch || 'main';
        
        // Store token securely if provided in config
        if (config.token && !this.tokenManager.hasValidToken()) {
            this.tokenManager.storeToken(config.token).then(result => {
                if (result.success) {
                    console.log('Token stored securely');
                } else {
                    console.warn('Failed to store token:', result.message);
                }
            });
        }
    }

    /**
     * Set authentication token
     * @param {string} token - GitHub personal access token
     */
    async setToken(token) {
        // Store token securely using TokenManager
        const result = await this.tokenManager.storeToken(token);
        if (result.success) {
            this.token = token;
            return result;
        } else {
            throw new Error(result.message);
        }
    }

    /**
     * Set repository
     * @param {string} repository - Repository in format "owner/repo"
     */
    setRepository(repository) {
        this.repository = repository;
    }

    /**
     * Make authenticated request to GitHub API with rate limiting
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Response>} API response
     */
    async makeRequest(endpoint, options = {}) {
        // Get token from TokenManager
        this.token = this.tokenManager.getToken();
        
        if (!this.token) {
            throw new Error('GitHub token não configurado');
        }
        
        // Refresh token validation if needed
        if (this.tokenManager.needsValidationRefresh()) {
            const refreshResult = await this.tokenManager.refreshTokenValidation();
            if (!refreshResult.success) {
                throw new Error(`Token inválido: ${refreshResult.message}`);
            }
        }

        // Check rate limit before making request
        await this.checkAndWaitForRateLimit();
        
        // Apply local rate limiting
        await this.applyLocalRateLimit();

        const url = endpoint.startsWith('http') ? endpoint : `${this.apiBase}${endpoint}`;
        
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Admin-Panel/1.0',
            ...options.headers
        };
        
        // Add security headers
        const secureOptions = this.securityManager.addSecurityHeaders({
            ...options,
            headers
        });

        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;
        
        while (retryCount < maxRetries) {
            try {
                // Check if we should try to go back online
                if (this.offlineMode) {
                    await this.checkOnlineStatus();
                    if (this.offlineMode) {
                        throw new Error('Sistema em modo offline - sem conectividade com GitHub');
                    }
                }

                const response = await fetch(url, secureOptions);

                // Update rate limit info
                this.rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0');
                this.rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000;

                if (!response.ok) {
                    // Handle rate limiting with intelligent backoff
                    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
                        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000;
                        const waitTime = Math.max(0, resetTime - Date.now()) + 1000; // Add 1 second buffer
                        
                        console.warn(`Rate limit exceeded. Waiting ${waitTime}ms until reset.`);
                        await this.sleep(waitTime);
                        retryCount++;
                        continue;
                    }

                    // Handle secondary rate limiting (abuse detection)
                    if (response.status === 403 && response.headers.get('Retry-After')) {
                        const retryAfter = parseInt(response.headers.get('Retry-After')) * 1000;
                        console.warn(`Secondary rate limit hit. Waiting ${retryAfter}ms.`);
                        await this.sleep(retryAfter);
                        retryCount++;
                        continue;
                    }
                    
                    // Handle other API errors using safe parsing
                    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    try {
                        const errorData = await ResponseHandler.safeJsonParse(response);
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } catch (parseError) {
                        // If parsing fails, use the default message
                        console.warn('Failed to parse error response:', parseError.message);
                    }
                    
                    const apiError = new Error(`GitHub API Error: ${errorMessage}`);
                    apiError.status = response.status;
                    apiError.response = response;
                    throw apiError;
                }

                return response;
                
            } catch (error) {
                lastError = error;
                retryCount++;
                
                // Don't retry on certain errors
                if (this.shouldNotRetryError(error) || retryCount >= maxRetries) {
                    // Check if we should enter offline mode
                    if (this.shouldEnterOfflineMode(error)) {
                        await this.enterOfflineMode();
                    }
                    throw error;
                }
                
                // Calculate intelligent backoff based on error type
                const backoffTime = this.calculateRetryDelay(retryCount, error);
                console.warn(`Request failed, retrying in ${backoffTime}ms. Attempt ${retryCount}/${maxRetries}. Error: ${error.message}`);
                await this.sleep(backoffTime);
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * Check rate limit and wait if necessary
     * @private
     */
    async checkAndWaitForRateLimit() {
        if (this.rateLimitRemaining <= 10 && this.rateLimitReset) {
            const waitTime = Math.max(0, this.rateLimitReset - Date.now()) + 1000;
            if (waitTime > 0) {
                console.warn(`Rate limit low (${this.rateLimitRemaining} remaining). Waiting ${waitTime}ms.`);
                await this.sleep(waitTime);
            }
        }
    }

    /**
     * Apply local rate limiting to prevent API abuse
     * @private
     */
    async applyLocalRateLimit() {
        const now = Date.now();
        
        // Clean old request history (older than 1 hour)
        this.requestHistory = this.requestHistory.filter(time => now - time < 3600000);
        
        // Check hourly limit
        if (this.requestHistory.length >= this.maxRequestsPerHour) {
            const oldestRequest = Math.min(...this.requestHistory);
            const waitTime = 3600000 - (now - oldestRequest) + 1000; // Wait until oldest request is 1 hour old
            console.warn(`Hourly rate limit reached. Waiting ${waitTime}ms.`);
            await this.sleep(waitTime);
        }

        // Check per-minute limit
        const recentRequests = this.requestHistory.filter(time => now - time < 60000);
        if (recentRequests.length >= this.maxRequestsPerMinute) {
            const oldestRecentRequest = Math.min(...recentRequests);
            const waitTime = 60000 - (now - oldestRecentRequest) + 1000; // Wait until oldest recent request is 1 minute old
            console.warn(`Per-minute rate limit reached. Waiting ${waitTime}ms.`);
            await this.sleep(waitTime);
        }

        // Ensure minimum delay between requests
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            const waitTime = this.requestDelay - timeSinceLastRequest;
            await this.sleep(waitTime);
        }

        // Record this request
        this.requestHistory.push(Date.now());
        this.lastRequestTime = Date.now();
    }

    /**
     * Get rate limiting statistics
     * @returns {Object} Rate limiting statistics
     */
    getRateLimitStats() {
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(time => now - time < 60000);
        const hourlyRequests = this.requestHistory.filter(time => now - time < 3600000);

        return {
            requestsLastMinute: recentRequests.length,
            requestsLastHour: hourlyRequests.length,
            maxRequestsPerMinute: this.maxRequestsPerMinute,
            maxRequestsPerHour: this.maxRequestsPerHour,
            githubRateLimitRemaining: this.rateLimitRemaining,
            githubRateLimitReset: this.rateLimitReset,
            lastRequestTime: this.lastRequestTime,
            requestDelay: this.requestDelay
        };
    }

    /**
     * Adjust local rate limiting parameters
     * @param {Object} config - Rate limiting configuration
     */
    configureRateLimit(config = {}) {
        if (config.maxRequestsPerMinute !== undefined) {
            this.maxRequestsPerMinute = Math.max(1, config.maxRequestsPerMinute);
        }
        if (config.maxRequestsPerHour !== undefined) {
            this.maxRequestsPerHour = Math.max(1, config.maxRequestsPerHour);
        }
        if (config.requestDelay !== undefined) {
            this.requestDelay = Math.max(0, config.requestDelay);
        }
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if should enter offline mode based on error
     * @param {Error} error - The error that occurred
     * @returns {boolean} True if should enter offline mode
     * @private
     */
    shouldEnterOfflineMode(error) {
        const message = error.message.toLowerCase();
        
        // Network errors
        if (message.includes('network') || 
            message.includes('fetch') || 
            message.includes('timeout') ||
            message.includes('connection')) {
            return true;
        }

        // Rate limiting (temporary)
        if (message.includes('rate limit') || message.includes('403')) {
            return true;
        }

        // Server errors (5xx)
        if (message.includes('http 5')) {
            return true;
        }

        return false;
    }

    /**
     * Enter offline mode
     * @private
     */
    async enterOfflineMode() {
        if (!this.offlineMode) {
            console.warn('Entrando no modo offline devido a problemas de conectividade');
            this.offlineMode = true;
            this.lastOnlineCheck = Date.now();
            
            // Dispatch event for UI updates
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('github-offline', {
                    detail: { manager: this, timestamp: Date.now() }
                }));
            }
        }
    }

    /**
     * Exit offline mode
     * @private
     */
    async exitOfflineMode() {
        if (this.offlineMode) {
            console.log('Saindo do modo offline - conectividade restaurada');
            this.offlineMode = false;
            
            // Dispatch event for UI updates
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('github-online', {
                    detail: { manager: this, timestamp: Date.now() }
                }));
            }
        }
    }

    /**
     * Check if we should try to go back online
     * @returns {Promise<boolean>} True if back online
     */
    async checkOnlineStatus() {
        if (!this.offlineMode) {
            return true;
        }

        // Don't check too frequently
        if (Date.now() - this.lastOnlineCheck < this.onlineCheckInterval) {
            return false;
        }

        this.lastOnlineCheck = Date.now();

        try {
            // Try a simple API call to check connectivity
            const response = await fetch(`${this.apiBase}/rate_limit`, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 5000
            });

            if (response.ok) {
                await this.exitOfflineMode();
                return true;
            }
        } catch (error) {
            // Still offline
        }

        return false;
    }

    /**
     * Get data from local cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null
     * @private
     */
    getFromLocalCache(key) {
        const cached = this.localCache.get(key);
        
        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.localCache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Set data in local cache
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @private
     */
    setLocalCache(key, data) {
        // Limit cache size
        if (this.localCache.size >= 50) {
            // Remove oldest entries
            const entries = Array.from(this.localCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, 10);
            toRemove.forEach(([cacheKey]) => this.localCache.delete(cacheKey));
        }

        this.localCache.set(key, {
            data: JSON.parse(JSON.stringify(data)), // Deep clone
            timestamp: Date.now()
        });
    }

    /**
     * Clear local cache
     */
    clearLocalCache() {
        this.localCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [, entry] of this.localCache.entries()) {
            if (now - entry.timestamp > this.cacheTimeout) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.localCache.size,
            validEntries,
            expiredEntries,
            offlineMode: this.offlineMode,
            lastOnlineCheck: this.lastOnlineCheck
        };
    }

    /**
     * Check if error should not trigger a retry
     * @param {Error} error - Error object
     * @returns {boolean} True if should not retry
     * @private
     */
    shouldNotRetryError(error) {
        // Don't retry on client errors (4xx except rate limiting)
        if (error.status >= 400 && error.status < 500 && error.status !== 403) {
            return true;
        }

        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
            // Unless it's rate limiting, which we handle separately
            if (!error.message.includes('rate limit')) {
                return true;
            }
        }

        // Don't retry on validation errors
        if (error.status === 422) {
            return true;
        }

        const message = error.message.toLowerCase();
        
        // Don't retry on parsing errors (likely not transient)
        if (message.includes('parsing error') || message.includes('invalid json')) {
            return true;
        }

        return false;
    }

    /**
     * Calculate intelligent retry delay based on error type
     * @param {number} attempt - Current attempt number
     * @param {Error} error - The error that occurred
     * @returns {number} Delay in milliseconds
     * @private
     */
    calculateRetryDelay(attempt, error) {
        const baseDelay = 1000; // 1 second
        let multiplier = 2;

        // Adjust multiplier based on error type
        if (error.message.includes('rate limit')) {
            multiplier = 1.5; // Slower backoff for rate limiting
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            multiplier = 2.5; // Faster backoff for network issues
        } else if (error.status >= 500) {
            multiplier = 3; // Aggressive backoff for server errors
        }

        const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        
        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }

    /**
     * Load fallback data when GitHub API is unavailable
     * @param {string} dataType - Type of data to load ('config', 'files', 'repository')
     * @param {Object} options - Options for fallback data
     * @returns {Promise<Object>} Fallback data
     */
    async loadFallbackData(dataType, options = {}) {
        const fallbackData = {
            config: {
                repository: this.repository || 'unknown/repository',
                branch: this.branch || 'main',
                lastSync: null,
                offlineMode: true,
                message: 'Dados de configuração padrão (modo offline)'
            },
            files: {
                content: null,
                sha: null,
                size: 0,
                encoding: null,
                downloadUrl: null,
                offlineMode: true,
                message: 'Arquivo não disponível no modo offline'
            },
            repository: {
                name: this.repository ? this.repository.split('/')[1] : 'unknown',
                full_name: this.repository || 'unknown/repository',
                private: false,
                permissions: {
                    admin: false,
                    push: false,
                    pull: true
                },
                offlineMode: true,
                message: 'Informações do repositório não disponíveis (modo offline)'
            }
        };

        // Try to load from localStorage if available
        if (typeof localStorage !== 'undefined') {
            try {
                const storageKey = `github_fallback_${dataType}_${this.repository}`;
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const parsedData = JSON.parse(stored);
                    // Check if data is not too old (max 24 hours)
                    if (Date.now() - parsedData.timestamp < 86400000) {
                        return {
                            ...parsedData.data,
                            fromStorage: true,
                            offlineMode: true
                        };
                    }
                }
            } catch (error) {
                console.warn('Failed to load fallback data from storage:', error.message);
            }
        }

        return fallbackData[dataType] || fallbackData.config;
    }

    /**
     * Store data for offline fallback
     * @param {string} dataType - Type of data to store
     * @param {Object} data - Data to store
     * @private
     */
    storeFallbackData(dataType, data) {
        if (typeof localStorage !== 'undefined') {
            try {
                const storageKey = `github_fallback_${dataType}_${this.repository}`;
                const storageData = {
                    data: JSON.parse(JSON.stringify(data)), // Deep clone
                    timestamp: Date.now()
                };
                localStorage.setItem(storageKey, JSON.stringify(storageData));
            } catch (error) {
                console.warn('Failed to store fallback data:', error.message);
            }
        }
    }

    /**
     * Get repository information with offline fallback
     * @returns {Promise<Object>} Repository information
     */
    async getRepositoryInfo() {
        try {
            if (this.offlineMode) {
                return await this.loadFallbackData('repository');
            }

            const response = await this.makeRequest(`/repos/${this.repository}`);
            const data = await ResponseHandler.safeJsonParse(response);
            
            // Store for offline use
            this.storeFallbackData('repository', data);
            
            return data;
            
        } catch (error) {
            if (this.shouldEnterOfflineMode(error)) {
                await this.enterOfflineMode();
                return await this.loadFallbackData('repository');
            }
            throw error;
        }
    }

    /**
     * Get system status including offline mode and cache information
     * @returns {Object} System status
     */
    getSystemStatus() {
        return {
            online: !this.offlineMode,
            offlineMode: this.offlineMode,
            lastOnlineCheck: this.lastOnlineCheck,
            rateLimit: this.getRateLimitStats(),
            cache: this.getCacheStats(),
            responseHandler: this.responseHandler.getStats(),
            repository: this.repository,
            branch: this.branch,
            configured: this.isConfigured()
        };
    }

    /**
     * Get file content from repository
     * @param {string} path - File path in repository
     * @param {string} ref - Branch or commit reference (optional)
     * @returns {Promise<{content: string, sha: string, size: number, encoding: string}>} File content and metadata
     */
    async getFileContent(path, ref = null) {
        try {
            // Check offline mode and cache first
            const cacheKey = `file:${this.repository}:${path}:${ref || this.branch}`;
            if (this.offlineMode) {
                const cached = this.getFromLocalCache(cacheKey);
                if (cached) {
                    return { ...cached, fromCache: true };
                }
                throw new Error('Arquivo não disponível no modo offline');
            }

            const refParam = ref || this.branch;
            const response = await this.makeRequest(
                `/repos/${this.repository}/contents/${path}?ref=${refParam}`
            );
            
            // Use safe JSON parsing
            const data = await ResponseHandler.safeJsonParse(response);
            
            // Handle directory case
            if (Array.isArray(data)) {
                throw new Error(`Path ${path} is a directory, not a file`);
            }
            
            let content = null;
            if (data.content) {
                // Decode base64 content
                content = atob(data.content.replace(/\n/g, ''));
            }
            
            const result = {
                content,
                sha: data.sha,
                size: data.size,
                encoding: data.encoding,
                downloadUrl: data.download_url
            };

            // Cache successful result
            this.setLocalCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            // Check for offline fallback
            if (this.shouldEnterOfflineMode(error)) {
                await this.enterOfflineMode();
                const cached = this.getFromLocalCache(`file:${this.repository}:${path}:${ref || this.branch}`);
                if (cached) {
                    return { ...cached, fromCache: true, offline: true };
                }
            }

            if (error.message.includes('404')) {
                return { 
                    content: null, 
                    sha: null, 
                    size: 0, 
                    encoding: null,
                    downloadUrl: null 
                }; // File doesn't exist
            }
            throw error;
        }
    }

    /**
     * Get multiple files content in batch
     * @param {string[]} paths - Array of file paths
     * @param {string} ref - Branch or commit reference (optional)
     * @returns {Promise<Object>} Object with file paths as keys and content data as values
     */
    async getMultipleFiles(paths, ref = null) {
        const results = {};
        const errors = [];
        
        // Process files in batches to respect rate limits
        const batchSize = 5;
        for (let i = 0; i < paths.length; i += batchSize) {
            const batch = paths.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (path) => {
                try {
                    const fileData = await this.getFileContent(path, ref);
                    results[path] = fileData;
                } catch (error) {
                    errors.push({ path, error: error.message });
                    results[path] = { error: error.message };
                }
            });
            
            await Promise.all(batchPromises);
            
            // Small delay between batches to be respectful to API
            if (i + batchSize < paths.length) {
                await this.sleep(100);
            }
        }
        
        if (errors.length > 0) {
            console.warn('Some files could not be retrieved:', errors);
        }
        
        return results;
    }

    /**
     * Check if file exists in repository
     * @param {string} path - File path in repository
     * @param {string} ref - Branch or commit reference (optional)
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(path, ref = null) {
        try {
            const fileData = await this.getFileContent(path, ref);
            return fileData.content !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Commit file to repository
     * @param {string} path - File path in repository
     * @param {string} content - File content (base64 for binary files)
     * @param {string} message - Commit message
     * @param {boolean} isBinary - Whether content is binary (base64 encoded)
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<{success: boolean, sha: string, message: string, commitUrl: string}>}
     */
    async commitFile(path, content, message, isBinary = false, progressCallback = null) {
        try {
            if (progressCallback) progressCallback(10, 'Verificando arquivo existente...');
            
            // Get current file SHA if it exists
            const existing = await this.getFileContent(path);
            
            if (progressCallback) progressCallback(30, 'Preparando conteúdo...');
            
            // Prepare content
            const encodedContent = isBinary ? content : btoa(unescape(encodeURIComponent(content)));
            
            // Validate content size (GitHub has a 100MB limit)
            const contentSize = encodedContent.length * 0.75; // Approximate decoded size
            if (contentSize > 100 * 1024 * 1024) {
                throw new Error('Arquivo muito grande. Limite do GitHub é 100MB.');
            }
            
            const requestBody = {
                message,
                content: encodedContent,
                branch: this.branch
            };
            
            // Include SHA if updating existing file
            if (existing.sha) {
                requestBody.sha = existing.sha;
            }
            
            if (progressCallback) progressCallback(60, 'Enviando para GitHub...');
            
            const response = await this.makeRequest(
                `/repos/${this.repository}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }
            );
            
            // Use safe JSON parsing
            const data = await ResponseHandler.safeJsonParse(response);
            
            if (progressCallback) progressCallback(100, 'Commit realizado com sucesso');
            
            return {
                success: true,
                sha: data.content.sha,
                commitSha: data.commit.sha,
                commitUrl: data.commit.html_url,
                message: `Arquivo ${path} commitado com sucesso`
            };
            
        } catch (error) {
            console.error('Error committing file:', error);
            
            if (progressCallback) progressCallback(0, `Erro: ${error.message}`);
            
            return {
                success: false,
                sha: null,
                commitSha: null,
                commitUrl: null,
                message: `Erro ao commitar arquivo: ${error.message}`
            };
        }
    }

    /**
     * Commit file with automatic retry on conflicts
     * @param {string} path - File path in repository
     * @param {string} content - File content
     * @param {string} message - Commit message
     * @param {boolean} isBinary - Whether content is binary
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<{success: boolean, sha: string, message: string}>}
     */
    async commitFileWithRetry(path, content, message, isBinary = false, progressCallback = null) {
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (progressCallback && attempt > 1) {
                    progressCallback(0, `Tentativa ${attempt}/${maxRetries}...`);
                }
                
                const result = await this.commitFile(path, content, message, isBinary, progressCallback);
                
                if (result.success) {
                    return result;
                }
                
                lastError = new Error(result.message);
                
                // If it's a conflict, wait a bit and try again
                if (result.message.includes('conflict') || result.message.includes('409')) {
                    await this.sleep(1000 * attempt); // Exponential backoff
                    continue;
                }
                
                // For other errors, don't retry
                break;
                
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    await this.sleep(1000 * attempt);
                }
            }
        }
        
        return {
            success: false,
            sha: null,
            commitSha: null,
            commitUrl: null,
            message: `Falha após ${maxRetries} tentativas: ${lastError.message}`
        };
    }

    /**
     * Commit multiple files in a single commit
     * @param {GitHubCommitData[]} files - Array of files to commit
     * @param {string} message - Commit message
     * @returns {Promise<{success: boolean, sha: string, message: string}>}
     */
    async commitMultipleFiles(files, message) {
        try {
            // Get current branch SHA
            const branchResponse = await this.makeRequest(
                `/repos/${this.repository}/git/refs/heads/${this.branch}`
            );
            const branchData = await ResponseHandler.safeJsonParse(branchResponse);
            const baseSha = branchData.object.sha;
            
            // Get base tree
            const baseTreeResponse = await this.makeRequest(
                `/repos/${this.repository}/git/commits/${baseSha}`
            );
            const baseTreeData = await ResponseHandler.safeJsonParse(baseTreeResponse);
            const baseTreeSha = baseTreeData.tree.sha;
            
            // Create tree with new files
            const tree = files.map(file => ({
                path: file.path,
                mode: '100644',
                type: 'blob',
                content: file.content
            }));
            
            const treeResponse = await this.makeRequest(
                `/repos/${this.repository}/git/trees`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        base_tree: baseTreeSha,
                        tree
                    })
                }
            );
            const treeData = await ResponseHandler.safeJsonParse(treeResponse);
            
            // Create commit
            const commitResponse = await this.makeRequest(
                `/repos/${this.repository}/git/commits`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message,
                        tree: treeData.sha,
                        parents: [baseSha]
                    })
                }
            );
            const commitData = await ResponseHandler.safeJsonParse(commitResponse);
            
            // Update branch reference
            await this.makeRequest(
                `/repos/${this.repository}/git/refs/heads/${this.branch}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sha: commitData.sha
                    })
                }
            );
            
            return {
                success: true,
                sha: commitData.sha,
                message: `${files.length} arquivos commitados com sucesso`
            };
            
        } catch (error) {
            console.error('Error committing multiple files:', error);
            return {
                success: false,
                sha: null,
                message: `Erro ao commitar arquivos: ${error.message}`
            };
        }
    }

    /**
     * Check GitHub Pages deployment status
     * @returns {Promise<{status: string, url: string, message: string, lastDeployment: Object}>}
     */
    async checkDeploymentStatus() {
        try {
            const response = await this.makeRequest(
                `/repos/${this.repository}/pages`
            );
            
            const data = await ResponseHandler.safeJsonParse(response);
            
            // Get latest deployment info
            const deploymentInfo = await this.getLatestDeployment();
            
            return {
                status: data.status,
                url: data.html_url,
                source: data.source,
                lastDeployment: deploymentInfo,
                message: `GitHub Pages está ${data.status}`,
                buildType: data.build_type || 'legacy'
            };
            
        } catch (error) {
            console.error('Error checking deployment status:', error);
            return {
                status: 'unknown',
                url: null,
                source: null,
                lastDeployment: null,
                message: `Erro ao verificar status do deploy: ${error.message}`,
                buildType: null
            };
        }
    }

    /**
     * Get latest GitHub Pages deployment information
     * @returns {Promise<Object|null>} Latest deployment info
     */
    async getLatestDeployment() {
        try {
            const response = await this.makeRequest(
                `/repos/${this.repository}/pages/deployments`
            );
            
            const deployments = await ResponseHandler.safeJsonParse(response);
            
            if (deployments.length === 0) {
                return null;
            }
            
            const latest = deployments[0];
            
            return {
                id: latest.id,
                sha: latest.sha,
                status: latest.status_url ? 'in_progress' : 'completed',
                createdAt: new Date(latest.created_at).toLocaleString('pt-BR'),
                updatedAt: new Date(latest.updated_at).toLocaleString('pt-BR'),
                url: latest.page_url,
                previewUrl: latest.preview_url
            };
            
        } catch (error) {
            console.error('Error getting latest deployment:', error);
            return null;
        }
    }

    /**
     * Monitor deployment progress with polling
     * @param {string} commitSha - Commit SHA to monitor
     * @param {Function} progressCallback - Progress callback function
     * @param {number} maxWaitTime - Maximum wait time in milliseconds
     * @returns {Promise<{success: boolean, deployment: Object, message: string}>}
     */
    async monitorDeployment(commitSha, progressCallback = null, maxWaitTime = 300000) {
        const startTime = Date.now();
        const pollInterval = 10000; // 10 seconds
        let attempts = 0;
        const maxAttempts = Math.floor(maxWaitTime / pollInterval);
        
        if (progressCallback) {
            progressCallback(0, 'Iniciando monitoramento do deploy...');
        }
        
        while (attempts < maxAttempts) {
            try {
                const deployment = await this.getLatestDeployment();
                const elapsed = Date.now() - startTime;
                const progress = Math.min(90, (elapsed / maxWaitTime) * 100);
                
                if (deployment && deployment.sha.startsWith(commitSha.substring(0, 7))) {
                    if (deployment.status === 'completed') {
                        if (progressCallback) {
                            progressCallback(100, 'Deploy concluído com sucesso!');
                        }
                        
                        return {
                            success: true,
                            deployment,
                            message: 'Deploy concluído com sucesso',
                            duration: elapsed
                        };
                    }
                    
                    if (progressCallback) {
                        progressCallback(progress, `Deploy em andamento... (${Math.floor(elapsed / 1000)}s)`);
                    }
                } else {
                    if (progressCallback) {
                        progressCallback(progress, `Aguardando início do deploy... (${Math.floor(elapsed / 1000)}s)`);
                    }
                }
                
                // Wait before next poll
                await this.sleep(pollInterval);
                attempts++;
                
            } catch (error) {
                console.error('Error monitoring deployment:', error);
                
                if (progressCallback) {
                    progressCallback(0, `Erro no monitoramento: ${error.message}`);
                }
                
                return {
                    success: false,
                    deployment: null,
                    message: `Erro no monitoramento: ${error.message}`,
                    duration: Date.now() - startTime
                };
            }
        }
        
        // Timeout reached
        if (progressCallback) {
            progressCallback(0, 'Timeout no monitoramento do deploy');
        }
        
        return {
            success: false,
            deployment: null,
            message: 'Timeout no monitoramento do deploy',
            duration: Date.now() - startTime
        };
    }

    /**
     * Verify deployment by checking if changes are live
     * @param {string} expectedContent - Content to verify on the live site
     * @param {string} testPath - Path to test (optional)
     * @returns {Promise<{verified: boolean, message: string, responseTime: number}>}
     */
    async verifyDeployment(expectedContent = null, testPath = '') {
        try {
            const deploymentStatus = await this.checkDeploymentStatus();
            
            if (!deploymentStatus.url) {
                return {
                    verified: false,
                    message: 'URL do GitHub Pages não disponível',
                    responseTime: 0
                };
            }
            
            const testUrl = `${deploymentStatus.url}${testPath}`;
            const startTime = Date.now();
            
            const response = await fetch(testUrl, {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (!response.ok) {
                return {
                    verified: false,
                    message: `Site não acessível (HTTP ${response.status})`,
                    responseTime
                };
            }
            
            if (expectedContent) {
                const content = await response.text();
                const hasExpectedContent = content.includes(expectedContent);
                
                return {
                    verified: hasExpectedContent,
                    message: hasExpectedContent 
                        ? 'Alterações verificadas no site'
                        : 'Alterações ainda não refletidas no site',
                    responseTime
                };
            }
            
            return {
                verified: true,
                message: 'Site acessível e funcionando',
                responseTime
            };
            
        } catch (error) {
            console.error('Error verifying deployment:', error);
            return {
                verified: false,
                message: `Erro na verificação: ${error.message}`,
                responseTime: 0
            };
        }
    }

    /**
     * Simulate webhook notifications for deployment events
     * @param {string} event - Event type ('deployment', 'deployment_status')
     * @param {Object} data - Event data
     * @param {Function} callback - Callback function to handle the event
     */
    simulateWebhook(event, data, callback) {
        const webhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            repository: this.repository,
            data
        };
        
        // Simulate webhook delay
        setTimeout(() => {
            if (typeof callback === 'function') {
                callback(webhookPayload);
            }
            
            // Dispatch custom event for other listeners
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('github-webhook', {
                    detail: webhookPayload
                }));
            }
        }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds
    }

    /**
     * Complete deployment workflow with monitoring and verification
     * @param {string} commitSha - Commit SHA that triggered deployment
     * @param {Function} progressCallback - Progress callback
     * @param {string} expectedContent - Content to verify (optional)
     * @returns {Promise<{success: boolean, message: string, details: Object}>}
     */
    async completeDeploymentWorkflow(commitSha, progressCallback = null, expectedContent = null) {
        try {
            if (progressCallback) {
                progressCallback(10, 'Iniciando workflow de deploy...');
            }
            
            // Step 1: Monitor deployment
            const monitorResult = await this.monitorDeployment(commitSha, (progress, message) => {
                if (progressCallback) {
                    // Scale progress to 10-80%
                    const scaledProgress = 10 + (progress * 0.7);
                    progressCallback(scaledProgress, message);
                }
            });
            
            if (!monitorResult.success) {
                return {
                    success: false,
                    message: monitorResult.message,
                    details: { monitorResult }
                };
            }
            
            if (progressCallback) {
                progressCallback(85, 'Verificando se alterações estão ativas...');
            }
            
            // Step 2: Verify deployment
            const verificationResult = await this.verifyDeployment(expectedContent);
            
            if (progressCallback) {
                progressCallback(95, 'Finalizando verificação...');
            }
            
            // Step 3: Simulate webhook notification
            this.simulateWebhook('deployment_status', {
                state: verificationResult.verified ? 'success' : 'failure',
                deployment: monitorResult.deployment,
                verification: verificationResult
            }, (payload) => {
                console.log('Webhook simulado:', payload);
            });
            
            if (progressCallback) {
                progressCallback(100, verificationResult.message);
            }
            
            return {
                success: verificationResult.verified,
                message: verificationResult.message,
                details: {
                    monitorResult,
                    verificationResult,
                    totalDuration: monitorResult.duration
                }
            };
            
        } catch (error) {
            console.error('Error in deployment workflow:', error);
            
            if (progressCallback) {
                progressCallback(0, `Erro no workflow: ${error.message}`);
            }
            
            return {
                success: false,
                message: `Erro no workflow de deploy: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Get recent commits
     * @param {number} count - Number of commits to retrieve
     * @returns {Promise<Array>} Recent commits
     */
    async getRecentCommits(count = 10) {
        try {
            const response = await this.makeRequest(
                `/repos/${this.repository}/commits?per_page=${count}&sha=${this.branch}`
            );
            
            const commits = await ResponseHandler.safeJsonParse(response);
            
            return commits.map(commit => ({
                sha: commit.sha.substring(0, 7),
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: new Date(commit.commit.author.date).toLocaleString('pt-BR'),
                url: commit.html_url
            }));
            
        } catch (error) {
            console.error('Error getting recent commits:', error);
            return [];
        }
    }

    /**
     * Create a pull request
     * @param {string} title - PR title
     * @param {string} body - PR description
     * @param {string} head - Source branch
     * @param {string} base - Target branch
     * @returns {Promise<{success: boolean, url: string, message: string}>}
     */
    async createPullRequest(title, body, head, base = 'main') {
        try {
            const response = await this.makeRequest(
                `/repos/${this.repository}/pulls`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title,
                        body,
                        head,
                        base
                    })
                }
            );
            
            const data = await ResponseHandler.safeJsonParse(response);
            
            return {
                success: true,
                url: data.html_url,
                message: `Pull request criado: ${data.html_url}`
            };
            
        } catch (error) {
            console.error('Error creating pull request:', error);
            return {
                success: false,
                url: null,
                message: `Erro ao criar pull request: ${error.message}`
            };
        }
    }

    /**
     * Check rate limit status
     * @returns {Promise<{remaining: number, reset: Date, message: string}>}
     */
    async checkRateLimit() {
        try {
            const response = await this.makeRequest('/rate_limit');
            const data = await ResponseHandler.safeJsonParse(response);
            
            return {
                remaining: data.rate.remaining,
                reset: new Date(data.rate.reset * 1000),
                message: `${data.rate.remaining} requisições restantes até ${new Date(data.rate.reset * 1000).toLocaleTimeString('pt-BR')}`
            };
            
        } catch (error) {
            return {
                remaining: this.rateLimitRemaining,
                reset: new Date(this.rateLimitReset),
                message: 'Não foi possível verificar rate limit'
            };
        }
    }

    /**
     * Validate GitHub token and repository access
     * @returns {Promise<{valid: boolean, permissions: Array, message: string, user: Object}>}
     */
    async validateAccess() {
        try {
            // Check token validity and get user info
            const userResponse = await this.makeRequest('/user');
            const userData = await ResponseHandler.safeJsonParse(userResponse);
            
            if (!this.repository) {
                return {
                    valid: false,
                    permissions: [],
                    user: userData,
                    message: 'Repositório não configurado'
                };
            }
            
            // Check repository access
            const repoResponse = await this.makeRequest(`/repos/${this.repository}`);
            const repoData = await ResponseHandler.safeJsonParse(repoResponse);
            
            const permissions = [];
            if (repoData.permissions.admin) permissions.push('admin');
            if (repoData.permissions.push) permissions.push('push');
            if (repoData.permissions.pull) permissions.push('pull');
            
            // Verify minimum required permissions
            const hasRequiredPermissions = permissions.includes('push') || permissions.includes('admin');
            
            return {
                valid: hasRequiredPermissions,
                permissions,
                user: userData,
                message: hasRequiredPermissions 
                    ? `Acesso válido como ${userData.login} com permissões: ${permissions.join(', ')}`
                    : `Permissões insuficientes. Necessário acesso de escrita ao repositório.`
            };
            
        } catch (error) {
            console.error('Error validating access:', error);
            return {
                valid: false,
                permissions: [],
                user: null,
                message: `Erro de acesso: ${error.message}`
            };
        }
    }

    /**
     * Test GitHub API connection and authentication
     * @returns {Promise<{success: boolean, message: string, details: Object}>}
     */
    async testConnection() {
        try {
            const startTime = Date.now();
            
            // Test basic API access
            const rateLimit = await this.checkRateLimit();
            
            // Test authentication
            const accessValidation = await this.validateAccess();
            
            const responseTime = Date.now() - startTime;
            
            return {
                success: accessValidation.valid,
                message: accessValidation.valid 
                    ? `Conexão estabelecida com sucesso em ${responseTime}ms`
                    : accessValidation.message,
                details: {
                    responseTime,
                    rateLimit,
                    user: accessValidation.user,
                    permissions: accessValidation.permissions
                }
            };
            
        } catch (error) {
            console.error('Error testing connection:', error);
            return {
                success: false,
                message: `Falha na conexão: ${error.message}`,
                details: { error: error.message }
            };
        }
    }

    /**
     * Get repository information
     * @returns {Promise<Object>} Repository information
     */
    async getRepositoryInfo() {
        try {
            const response = await this.makeRequest(`/repos/${this.repository}`);
            const data = await ResponseHandler.safeJsonParse(response);
            
            return {
                name: data.name,
                fullName: data.full_name,
                description: data.description,
                private: data.private,
                defaultBranch: data.default_branch,
                size: data.size,
                language: data.language,
                updatedAt: new Date(data.updated_at).toLocaleString('pt-BR'),
                url: data.html_url,
                hasPages: data.has_pages,
                pagesUrl: data.has_pages ? `https://${data.owner.login}.github.io/${data.name}` : null
            };
            
        } catch (error) {
            console.error('Error getting repository info:', error);
            return null;
        }
    }

    /**
     * Check GitHub API availability and status
     * @returns {Promise<{available: boolean, status: string, message: string}>}
     */
    async checkAPIAvailability() {
        try {
            const startTime = Date.now();
            
            // Try to access GitHub API status endpoint
            const response = await fetch('https://api.github.com/status', {
                method: 'GET',
                headers: {
                    'User-Agent': 'Admin-Panel/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                const data = await ResponseHandler.safeJsonParse(response);
                return {
                    available: true,
                    status: data.status || 'good',
                    message: `GitHub API disponível (${responseTime}ms)`,
                    responseTime
                };
            } else {
                return {
                    available: false,
                    status: 'error',
                    message: `GitHub API indisponível (HTTP ${response.status})`,
                    responseTime
                };
            }
            
        } catch (error) {
            return {
                available: false,
                status: 'error',
                message: `Erro ao verificar GitHub API: ${error.message}`,
                responseTime: null
            };
        }
    }

    /**
     * Execute operation with automatic retry when GitHub API is unavailable
     * @param {Function} operation - Async function to execute
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise<any>} Operation result
     */
    async executeWithRetry(operation, maxRetries = 3, baseDelay = 5000) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check API availability before attempting operation
                const apiStatus = await this.checkAPIAvailability();
                
                if (!apiStatus.available && attempt === 1) {
                    console.warn('GitHub API appears to be unavailable, but attempting operation anyway...');
                }
                
                // Execute the operation
                const result = await operation();
                return result;
                
            } catch (error) {
                lastError = error;
                console.error(`Operation failed on attempt ${attempt}:`, error.message);
                
                if (attempt < maxRetries) {
                    // Calculate delay with exponential backoff
                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
                    await this.sleep(delay);
                } else {
                    console.error(`Operation failed after ${maxRetries} attempts`);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Detect potential conflicts in repository
     * @param {string} branch - Branch to check for conflicts (optional)
     * @returns {Promise<{hasConflicts: boolean, conflicts: Array, message: string}>}
     */
    async detectConflicts(branch = null) {
        try {
            const targetBranch = branch || this.branch;
            
            // Get current branch info
            const branchResponse = await this.makeRequest(
                `/repos/${this.repository}/branches/${targetBranch}`
            );
            const branchData = await ResponseHandler.safeJsonParse(branchResponse);
            
            // Check if branch is behind the default branch
            const repoInfo = await this.getRepositoryInfo();
            const defaultBranch = repoInfo.defaultBranch;
            
            if (targetBranch !== defaultBranch) {
                const compareResponse = await this.makeRequest(
                    `/repos/${this.repository}/compare/${defaultBranch}...${targetBranch}`
                );
                const compareData = await ResponseHandler.safeJsonParse(compareResponse);
                
                const conflicts = [];
                
                if (compareData.behind_by > 0) {
                    conflicts.push({
                        type: 'behind',
                        message: `Branch está ${compareData.behind_by} commits atrás de ${defaultBranch}`,
                        severity: 'warning',
                        commits: compareData.behind_by
                    });
                }
                
                if (compareData.status === 'diverged') {
                    conflicts.push({
                        type: 'diverged',
                        message: `Branch divergiu de ${defaultBranch}`,
                        severity: 'error',
                        aheadBy: compareData.ahead_by,
                        behindBy: compareData.behind_by
                    });
                }
                
                return {
                    hasConflicts: conflicts.length > 0,
                    conflicts,
                    message: conflicts.length > 0 
                        ? `${conflicts.length} conflito(s) detectado(s)`
                        : 'Nenhum conflito detectado'
                };
            }
            
            // For main branch, check for uncommitted changes or pending PRs
            const pullsResponse = await this.makeRequest(
                `/repos/${this.repository}/pulls?state=open&base=${targetBranch}`
            );
            const openPRs = await ResponseHandler.safeJsonParse(pullsResponse);
            
            const conflicts = [];
            
            if (openPRs.length > 0) {
                conflicts.push({
                    type: 'open_prs',
                    message: `${openPRs.length} pull request(s) aberto(s) podem causar conflitos`,
                    severity: 'info',
                    pullRequests: openPRs.map(pr => ({
                        number: pr.number,
                        title: pr.title,
                        author: pr.user.login,
                        url: pr.html_url
                    }))
                });
            }
            
            return {
                hasConflicts: conflicts.some(c => c.severity === 'error'),
                conflicts,
                message: conflicts.length > 0 
                    ? `${conflicts.length} potencial(is) conflito(s) detectado(s)`
                    : 'Nenhum conflito detectado'
            };
            
        } catch (error) {
            console.error('Error detecting conflicts:', error);
            return {
                hasConflicts: false,
                conflicts: [],
                message: `Erro ao detectar conflitos: ${error.message}`
            };
        }
    }

    /**
     * Get conflict resolution suggestions
     * @param {Array} conflicts - Array of detected conflicts
     * @returns {Array} Array of resolution suggestions
     */
    getConflictResolutions(conflicts) {
        const resolutions = [];
        
        conflicts.forEach(conflict => {
            switch (conflict.type) {
                case 'behind':
                    resolutions.push({
                        conflictType: conflict.type,
                        action: 'merge',
                        title: 'Atualizar branch',
                        description: 'Fazer merge das alterações mais recentes',
                        risk: 'low',
                        steps: [
                            'Fazer backup das alterações locais',
                            'Fazer merge do branch principal',
                            'Resolver conflitos se necessário',
                            'Testar as alterações'
                        ]
                    });
                    break;
                    
                case 'diverged':
                    resolutions.push({
                        conflictType: conflict.type,
                        action: 'rebase',
                        title: 'Rebase do branch',
                        description: 'Reorganizar commits para resolver divergência',
                        risk: 'medium',
                        steps: [
                            'Criar backup do branch atual',
                            'Fazer rebase interativo',
                            'Resolver conflitos manualmente',
                            'Forçar push (com cuidado)'
                        ]
                    });
                    
                    resolutions.push({
                        conflictType: conflict.type,
                        action: 'new_branch',
                        title: 'Criar novo branch',
                        description: 'Criar branch separado para as alterações',
                        risk: 'low',
                        steps: [
                            'Criar novo branch a partir do principal',
                            'Aplicar alterações no novo branch',
                            'Criar pull request',
                            'Revisar e fazer merge'
                        ]
                    });
                    break;
                    
                case 'open_prs':
                    resolutions.push({
                        conflictType: conflict.type,
                        action: 'coordinate',
                        title: 'Coordenar com PRs abertos',
                        description: 'Coordenar alterações com pull requests existentes',
                        risk: 'low',
                        steps: [
                            'Revisar pull requests abertos',
                            'Comunicar com outros desenvolvedores',
                            'Aguardar merge dos PRs ou coordenar alterações',
                            'Proceder com commit após coordenação'
                        ]
                    });
                    break;
                    
                default:
                    resolutions.push({
                        conflictType: conflict.type,
                        action: 'manual',
                        title: 'Resolução manual',
                        description: 'Resolver conflito manualmente',
                        risk: 'medium',
                        steps: [
                            'Analisar o conflito detalhadamente',
                            'Fazer backup das alterações',
                            'Resolver conflito manualmente',
                            'Testar a resolução'
                        ]
                    });
            }
        });
        
        return resolutions;
    }

    /**
     * Create a backup branch before resolving conflicts
     * @param {string} baseBranch - Base branch to backup
     * @param {string} backupName - Name for backup branch (optional)
     * @returns {Promise<{success: boolean, branchName: string, message: string}>}
     */
    async createBackupBranch(baseBranch = null, backupName = null) {
        try {
            const sourceBranch = baseBranch || this.branch;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const branchName = backupName || `backup-${sourceBranch}-${timestamp}`;
            
            // Get current branch SHA
            const branchResponse = await this.makeRequest(
                `/repos/${this.repository}/git/refs/heads/${sourceBranch}`
            );
            const branchData = await ResponseHandler.safeJsonParse(branchResponse);
            const sha = branchData.object.sha;
            
            // Create backup branch
            await this.makeRequest(
                `/repos/${this.repository}/git/refs`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ref: `refs/heads/${branchName}`,
                        sha: sha
                    })
                }
            );
            
            return {
                success: true,
                branchName,
                message: `Branch de backup criado: ${branchName}`
            };
            
        } catch (error) {
            console.error('Error creating backup branch:', error);
            return {
                success: false,
                branchName: null,
                message: `Erro ao criar backup: ${error.message}`
            };
        }
    }

    /**
     * Attempt automatic conflict resolution
     * @param {Array} conflicts - Array of conflicts to resolve
     * @param {Object} options - Resolution options
     * @returns {Promise<{success: boolean, resolved: Array, failed: Array, message: string}>}
     */
    async attemptAutoResolution(conflicts, options = {}) {
        const resolved = [];
        const failed = [];
        
        try {
            // Create backup before attempting resolution
            if (options.createBackup !== false) {
                const backup = await this.createBackupBranch();
                if (!backup.success) {
                    console.warn('Could not create backup branch:', backup.message);
                }
            }
            
            for (const conflict of conflicts) {
                try {
                    switch (conflict.type) {
                        case 'behind':
                            // For "behind" conflicts, we can attempt to merge
                            if (options.autoMerge) {
                                const mergeResult = await this.mergeBranch(
                                    this.getRepositoryInfo().defaultBranch,
                                    this.branch
                                );
                                
                                if (mergeResult.success) {
                                    resolved.push({
                                        conflict,
                                        resolution: 'merged',
                                        message: 'Branch atualizado com merge automático'
                                    });
                                } else {
                                    failed.push({
                                        conflict,
                                        error: mergeResult.message
                                    });
                                }
                            } else {
                                failed.push({
                                    conflict,
                                    error: 'Merge automático não habilitado'
                                });
                            }
                            break;
                            
                        case 'open_prs':
                            // For open PRs, we can only notify
                            resolved.push({
                                conflict,
                                resolution: 'notified',
                                message: 'Conflito identificado, intervenção manual necessária'
                            });
                            break;
                            
                        default:
                            failed.push({
                                conflict,
                                error: 'Tipo de conflito não suportado para resolução automática'
                            });
                    }
                } catch (error) {
                    failed.push({
                        conflict,
                        error: error.message
                    });
                }
            }
            
            return {
                success: failed.length === 0,
                resolved,
                failed,
                message: `${resolved.length} conflito(s) resolvido(s), ${failed.length} falharam`
            };
            
        } catch (error) {
            console.error('Error in auto resolution:', error);
            return {
                success: false,
                resolved,
                failed: conflicts.map(c => ({ conflict: c, error: error.message })),
                message: `Erro na resolução automática: ${error.message}`
            };
        }
    }

    /**
     * Merge one branch into another
     * @param {string} sourceBranch - Source branch to merge from
     * @param {string} targetBranch - Target branch to merge into
     * @returns {Promise<{success: boolean, sha: string, message: string}>}
     */
    async mergeBranch(sourceBranch, targetBranch) {
        try {
            const response = await this.makeRequest(
                `/repos/${this.repository}/merges`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        base: targetBranch,
                        head: sourceBranch,
                        commit_message: `Merge ${sourceBranch} into ${targetBranch}`
                    })
                }
            );
            
            const data = await ResponseHandler.safeJsonParse(response);
            
            return {
                success: true,
                sha: data.sha,
                message: `Merge realizado com sucesso: ${data.sha}`
            };
            
        } catch (error) {
            console.error('Error merging branches:', error);
            return {
                success: false,
                sha: null,
                message: `Erro no merge: ${error.message}`
            };
        }
    }

    /**
     * Get conflict notification for user interface
     * @param {Array} conflicts - Array of conflicts
     * @returns {Object} Notification object for UI
     */
    getConflictNotification(conflicts) {
        if (conflicts.length === 0) {
            return {
                type: 'success',
                title: 'Sem Conflitos',
                message: 'Nenhum conflito detectado no repositório',
                actions: []
            };
        }
        
        const hasErrors = conflicts.some(c => c.severity === 'error');
        const hasWarnings = conflicts.some(c => c.severity === 'warning');
        
        const type = hasErrors ? 'error' : hasWarnings ? 'warning' : 'info';
        const title = hasErrors ? 'Conflitos Críticos' : hasWarnings ? 'Atenção Necessária' : 'Informação';
        
        const message = conflicts.map(c => c.message).join('; ');
        
        const actions = [
            {
                label: 'Ver Detalhes',
                action: 'show_details',
                primary: false
            },
            {
                label: 'Resolver Automaticamente',
                action: 'auto_resolve',
                primary: true,
                enabled: conflicts.some(c => c.type === 'behind')
            },
            {
                label: 'Resolver Manualmente',
                action: 'manual_resolve',
                primary: false
            }
        ];
        
        return {
            type,
            title,
            message,
            actions,
            conflicts
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubManager;
} else {
    window.GitHubManager = GitHubManager;
}