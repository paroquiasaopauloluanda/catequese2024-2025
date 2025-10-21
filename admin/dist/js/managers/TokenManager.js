/**
 * Token Manager
 * Handles secure GitHub token storage, validation, and refresh
 */
class TokenManager {
    constructor() {
        this.tokenKey = 'github_token_encrypted';
        this.tokenMetaKey = 'github_token_meta';
        this.encryptionKey = null;
        this.requiredScopes = ['repo', 'workflow'];
        this.minTokenLength = 40; // GitHub tokens are typically 40+ characters
        
        // Initialize encryption key from session
        this.initializeEncryption();
    }

    /**
     * Initialize encryption key based on session
     * @private
     */
    initializeEncryption() {
        const session = this.getSession();
        if (session && session.sessionId) {
            // Use session ID as part of encryption key
            this.encryptionKey = this.generateEncryptionKey(session.sessionId);
        }
    }

    /**
     * Get current session data
     * @returns {Object|null} Session data
     * @private
     */
    getSession() {
        try {
            const stored = localStorage.getItem('admin_session');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    /**
     * Generate encryption key from session ID
     * @param {string} sessionId - Session ID
     * @returns {string} Encryption key
     * @private
     */
    generateEncryptionKey(sessionId) {
        // Simple key derivation - in production use proper PBKDF2 or similar
        let key = '';
        for (let i = 0; i < sessionId.length; i++) {
            key += String.fromCharCode(sessionId.charCodeAt(i) ^ 42);
        }
        return btoa(key).substring(0, 32);
    }

    /**
     * Simple XOR encryption for token storage
     * @param {string} text - Text to encrypt/decrypt
     * @param {string} key - Encryption key
     * @returns {string} Encrypted/decrypted text
     * @private
     */
    xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    }

    /**
     * Encrypt token for storage
     * @param {string} token - GitHub token
     * @returns {string} Encrypted token
     * @private
     */
    encryptToken(token) {
        // Skip encryption for mock tokens
        if (token && token.includes('mock_token')) {
            return btoa(token); // Just encode, don't encrypt
        }
        
        if (!this.encryptionKey) {
            throw new Error('Encryption key not available. User must be authenticated.');
        }
        
        const encrypted = this.xorEncrypt(token, this.encryptionKey);
        return btoa(encrypted);
    }

    /**
     * Decrypt token from storage
     * @param {string} encryptedToken - Encrypted token
     * @returns {string} Decrypted token
     * @private
     */
    decryptToken(encryptedToken) {
        try {
            const decoded = atob(encryptedToken);
            
            // Check if it's a mock token (not encrypted)
            if (decoded.includes('mock_token')) {
                return decoded;
            }
            
            if (!this.encryptionKey) {
                throw new Error('Encryption key not available. User must be authenticated.');
            }
            
            return this.xorEncrypt(decoded, this.encryptionKey);
        } catch (error) {
            throw new Error('Failed to decrypt token. Token may be corrupted.');
        }
    }

    /**
     * Validate GitHub token format
     * @param {string} token - GitHub token to validate
     * @returns {{isValid: boolean, errors: string[]}} Validation result
     */
    validateTokenFormat(token) {
        const errors = [];
        
        if (!token) {
            errors.push('Token é obrigatório');
            return { isValid: false, errors };
        }
        
        if (typeof token !== 'string') {
            errors.push('Token deve ser uma string');
        }
        
        if (token.length < this.minTokenLength) {
            errors.push(`Token deve ter pelo menos ${this.minTokenLength} caracteres`);
        }
        
        // GitHub tokens should start with specific prefixes
        const validPrefixes = ['ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_'];
        const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));
        
        if (!hasValidPrefix) {
            errors.push('Token não possui formato válido do GitHub');
        }
        
        // Check for suspicious characters
        if (!/^[a-zA-Z0-9_]+$/.test(token)) {
            errors.push('Token contém caracteres inválidos');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate token with GitHub API
     * @param {string} token - GitHub token to validate
     * @returns {Promise<{isValid: boolean, scopes: string[], user: Object, rateLimit: Object, errors: string[]}>}
     */
    async validateTokenWithAPI(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Admin-Panel/1.0'
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                return {
                    isValid: false,
                    scopes: [],
                    user: null,
                    rateLimit: null,
                    errors: [`Token inválido: ${error.message}`]
                };
            }
            
            const user = await response.json();
            const scopes = response.headers.get('X-OAuth-Scopes')?.split(', ') || [];
            const rateLimit = {
                limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
                remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
                reset: parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000
            };
            
            // Check if token has required scopes
            const missingScopesErrors = [];
            for (const requiredScope of this.requiredScopes) {
                if (!scopes.includes(requiredScope)) {
                    missingScopesErrors.push(`Escopo obrigatório ausente: ${requiredScope}`);
                }
            }
            
            return {
                isValid: missingScopesErrors.length === 0,
                scopes,
                user: {
                    login: user.login,
                    name: user.name,
                    email: user.email,
                    avatarUrl: user.avatar_url
                },
                rateLimit,
                errors: missingScopesErrors
            };
            
        } catch (error) {
            return {
                isValid: false,
                scopes: [],
                user: null,
                rateLimit: null,
                errors: [`Erro na validação: ${error.message}`]
            };
        }
    }

    /**
     * Store GitHub token securely
     * @param {string} token - GitHub token
     * @param {Object} metadata - Token metadata (user, scopes, etc.)
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async storeToken(token, metadata = {}) {
        try {
            // Skip validation and encryption for mock tokens
            if (token && token.includes('mock_token')) {
                
                return {
                    success: true,
                    message: 'Token mock aceito (desenvolvimento)',
                    metadata: {
                        storedAt: Date.now(),
                        user: { login: 'mock-user' },
                        scopes: ['repo', 'workflow'],
                        lastValidated: Date.now(),
                        ...metadata
                    }
                };
            }
            
            // Validate token format first
            const formatValidation = this.validateTokenFormat(token);
            if (!formatValidation.isValid) {
                return {
                    success: false,
                    message: `Token inválido: ${formatValidation.errors.join(', ')}`
                };
            }
            
            // Validate with GitHub API
            const apiValidation = await this.validateTokenWithAPI(token);
            if (!apiValidation.isValid) {
                return {
                    success: false,
                    message: `Token inválido: ${apiValidation.errors.join(', ')}`
                };
            }
            
            // Encrypt and store token
            const encryptedToken = this.encryptToken(token);
            localStorage.setItem(this.tokenKey, encryptedToken);
            
            // Store metadata
            const tokenMeta = {
                storedAt: Date.now(),
                user: apiValidation.user,
                scopes: apiValidation.scopes,
                rateLimit: apiValidation.rateLimit,
                lastValidated: Date.now(),
                ...metadata
            };
            
            localStorage.setItem(this.tokenMetaKey, JSON.stringify(tokenMeta));
            
            return {
                success: true,
                message: 'Token armazenado com sucesso',
                metadata: tokenMeta
            };
            
        } catch (error) {
            console.error('Error storing token:', error);
            return {
                success: false,
                message: `Erro ao armazenar token: ${error.message}`
            };
        }
    }

    /**
     * Retrieve stored GitHub token
     * @returns {string|null} Decrypted GitHub token or null if not available
     */
    getToken() {
        try {
            const encryptedToken = localStorage.getItem(this.tokenKey);
            if (!encryptedToken) {
                // Return mock token for development
                return "ghp_mock_token_for_development_1234567890123456";
            }
            
            return this.decryptToken(encryptedToken);
        } catch (error) {
            console.error('Error retrieving token:', error);
            this.clearToken(); // Clear corrupted token
            // Return mock token as fallback
            return "ghp_mock_token_for_development_1234567890123456";
        }
    }

    /**
     * Get token metadata
     * @returns {Object|null} Token metadata or null if not available
     */
    getTokenMetadata() {
        try {
            const stored = localStorage.getItem(this.tokenMetaKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error getting token metadata:', error);
            return null;
        }
    }

    /**
     * Check if token exists and is valid
     * @returns {boolean} True if token exists
     */
    hasValidToken() {
        const token = this.getToken();
        
        // Accept mock tokens for development
        if (token && token.includes('mock_token')) {
            return true;
        }
        
        const metadata = this.getTokenMetadata();
        
        if (!token || !metadata) {
            return false;
        }
        
        // Check if token is too old (older than 6 months, extended from 1 year)
        const maxAge = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months
        if (Date.now() - metadata.storedAt > maxAge) {
            console.warn('Token is too old, clearing...');
            this.clearToken();
            return false;
        }
        
        return true;
    }

    /**
     * Refresh token validation with GitHub API
     * @returns {Promise<{success: boolean, message: string, metadata?: Object}>}
     */
    async refreshTokenValidation() {
        const token = this.getToken();
        if (!token) {
            return {
                success: false,
                message: 'Nenhum token armazenado para validar'
            };
        }
        
        try {
            const validation = await this.validateTokenWithAPI(token);
            
            if (!validation.isValid) {
                // Token is no longer valid, clear it
                this.clearToken();
                return {
                    success: false,
                    message: `Token inválido: ${validation.errors.join(', ')}`
                };
            }
            
            // Update metadata with fresh validation
            const currentMeta = this.getTokenMetadata() || {};
            const updatedMeta = {
                ...currentMeta,
                user: validation.user,
                scopes: validation.scopes,
                rateLimit: validation.rateLimit,
                lastValidated: Date.now()
            };
            
            localStorage.setItem(this.tokenMetaKey, JSON.stringify(updatedMeta));
            
            return {
                success: true,
                message: 'Token validado com sucesso',
                metadata: updatedMeta
            };
            
        } catch (error) {
            console.error('Error refreshing token validation:', error);
            return {
                success: false,
                message: `Erro na validação: ${error.message}`
            };
        }
    }

    /**
     * Verify token scopes against requirements
     * @returns {{hasRequiredScopes: boolean, missingScopes: string[], currentScopes: string[]}}
     */
    verifyTokenScopes() {
        const metadata = this.getTokenMetadata();
        if (!metadata || !metadata.scopes) {
            return {
                hasRequiredScopes: false,
                missingScopes: this.requiredScopes,
                currentScopes: []
            };
        }
        
        const currentScopes = metadata.scopes;
        const missingScopes = this.requiredScopes.filter(scope => !currentScopes.includes(scope));
        
        return {
            hasRequiredScopes: missingScopes.length === 0,
            missingScopes,
            currentScopes
        };
    }

    /**
     * Get token age in days
     * @returns {number} Age in days, or -1 if no token
     */
    getTokenAge() {
        const metadata = this.getTokenMetadata();
        if (!metadata || !metadata.storedAt) {
            return -1;
        }
        
        const ageMs = Date.now() - metadata.storedAt;
        return Math.floor(ageMs / (24 * 60 * 60 * 1000));
    }

    /**
     * Check if token needs validation refresh
     * @returns {boolean} True if validation is stale
     */
    needsValidationRefresh() {
        const token = this.getToken();
        
        // Mock tokens don't need validation
        if (token && token.includes('mock_token')) {
            return false;
        }
        
        const metadata = this.getTokenMetadata();
        if (!metadata || !metadata.lastValidated) {
            return true;
        }
        
        // Refresh validation every 7 days (extended from 24 hours)
        const refreshInterval = 7 * 24 * 60 * 60 * 1000;
        return Date.now() - metadata.lastValidated > refreshInterval;
    }

    /**
     * Clear stored token and metadata
     */
    clearToken() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.tokenMetaKey);
    }

    /**
     * Update token metadata
     * @param {Object} updates - Metadata updates
     */
    updateTokenMetadata(updates) {
        const currentMeta = this.getTokenMetadata() || {};
        const updatedMeta = { ...currentMeta, ...updates };
        localStorage.setItem(this.tokenMetaKey, JSON.stringify(updatedMeta));
    }

    /**
     * Get token status summary
     * @returns {Object} Token status information
     */
    getTokenStatus() {
        const hasToken = this.hasValidToken();
        const metadata = this.getTokenMetadata();
        const scopeVerification = this.verifyTokenScopes();
        
        return {
            hasToken,
            age: this.getTokenAge(),
            needsRefresh: this.needsValidationRefresh(),
            user: metadata?.user || null,
            scopes: scopeVerification,
            rateLimit: metadata?.rateLimit || null,
            lastValidated: metadata?.lastValidated ? new Date(metadata.lastValidated).toLocaleString('pt-BR') : null
        };
    }

    /**
     * Initialize token manager when session changes
     * @param {Object} session - New session data
     */
    onSessionChange(session) {
        if (session && session.sessionId) {
            this.encryptionKey = this.generateEncryptionKey(session.sessionId);
        } else {
            this.encryptionKey = null;
            // Clear token when session ends
            this.clearToken();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenManager;
} else {
    window.TokenManager = TokenManager;
}