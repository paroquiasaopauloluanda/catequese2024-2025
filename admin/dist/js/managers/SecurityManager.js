/**
 * Security Manager
 * Handles CSRF protection, secure data transmission, and session hijacking protection
 */
class SecurityManager {
    constructor() {
        this.csrfTokenKey = 'csrf_token';
        this.sessionFingerprintKey = 'session_fingerprint';
        this.securityHeaders = {
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };
        
        // Initialize security features
        this.initializeSecurity();
    }

    /**
     * Initialize security features
     * @private
     */
    initializeSecurity() {
        this.generateCSRFToken();
        this.generateSessionFingerprint();
        this.setupSecurityEventListeners();
    }

    /**
     * Generate CSRF token
     * @returns {string} CSRF token
     */
    generateCSRFToken() {
        const token = this.generateSecureToken(32);
        sessionStorage.setItem(this.csrfTokenKey, token);
        return token;
    }

    /**
     * Get current CSRF token
     * @returns {string|null} CSRF token
     */
    getCSRFToken() {
        let token = sessionStorage.getItem(this.csrfTokenKey);
        if (!token) {
            token = this.generateCSRFToken();
        }
        return token;
    }

    /**
     * Validate CSRF token
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid
     */
    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem(this.csrfTokenKey);
        return storedToken && token === storedToken;
    }

    /**
     * Generate secure random token
     * @param {number} length - Token length
     * @returns {string} Secure token
     * @private
     */
    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        // Use crypto.getRandomValues if available
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < length; i++) {
                result += chars[array[i] % chars.length];
            }
        } else {
            // Fallback to Math.random (less secure)
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        
        return result;
    }

    /**
     * Generate session fingerprint based on browser characteristics
     * @returns {string} Session fingerprint
     */
    generateSessionFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.cookieEnabled ? '1' : '0'
        ];
        
        // Simple hash of components
        let hash = 0;
        const combined = components.join('|');
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        const fingerprint = Math.abs(hash).toString(36);
        sessionStorage.setItem(this.sessionFingerprintKey, fingerprint);
        return fingerprint;
    }

    /**
     * Get current session fingerprint
     * @returns {string|null} Session fingerprint
     */
    getSessionFingerprint() {
        return sessionStorage.getItem(this.sessionFingerprintKey);
    }

    /**
     * Validate session fingerprint to detect session hijacking
     * @returns {boolean} True if fingerprint is valid
     */
    validateSessionFingerprint() {
        const storedFingerprint = this.getSessionFingerprint();
        if (!storedFingerprint) {
            return false;
        }
        
        const currentFingerprint = this.generateSessionFingerprint();
        return storedFingerprint === currentFingerprint;
    }

    /**
     * Add security headers to request options
     * @param {Object} options - Request options
     * @returns {Object} Options with security headers
     */
    addSecurityHeaders(options = {}) {
        const headers = {
            ...this.securityHeaders,
            'X-CSRF-Token': this.getCSRFToken(),
            'X-Session-Fingerprint': this.getSessionFingerprint(),
            ...options.headers
        };
        
        return {
            ...options,
            headers
        };
    }

    /**
     * Secure fetch wrapper with CSRF and fingerprint protection
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Response>} Fetch response
     */
    async secureFetch(url, options = {}) {
        // Validate session fingerprint before making request
        if (!this.validateSessionFingerprint()) {
            throw new Error('Sessão inválida detectada. Faça login novamente.');
        }
        
        // Add security headers
        const secureOptions = this.addSecurityHeaders(options);
        
        // Ensure HTTPS for sensitive operations
        if (url.startsWith('http://') && window.location.protocol === 'https:') {
            console.warn('Attempting HTTP request from HTTPS context');
        }
        
        try {
            const response = await fetch(url, secureOptions);
            
            // Check for security-related response headers
            this.validateResponseSecurity(response);
            
            return response;
        } catch (error) {
            console.error('Secure fetch error:', error);
            throw error;
        }
    }

    /**
     * Validate response security headers
     * @param {Response} response - Fetch response
     * @private
     */
    validateResponseSecurity(response) {
        // Check for security headers in response
        const securityHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ];
        
        securityHeaders.forEach(header => {
            if (!response.headers.get(header)) {
                console.warn(`Missing security header: ${header}`);
            }
        });
    }

    /**
     * Sanitize data to prevent XSS attacks
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        // Basic XSS prevention
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Validate and sanitize form data
     * @param {FormData|Object} data - Form data to validate
     * @returns {Object} Sanitized data
     */
    sanitizeFormData(data) {
        const sanitized = {};
        
        if (data instanceof FormData) {
            for (const [key, value] of data.entries()) {
                sanitized[key] = this.sanitizeInput(value);
            }
        } else if (typeof data === 'object' && data !== null) {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'string') {
                    sanitized[key] = this.sanitizeInput(value);
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = this.sanitizeFormData(value);
                } else {
                    sanitized[key] = value;
                }
            }
        }
        
        return sanitized;
    }

    /**
     * Setup security event listeners
     * @private
     */
    setupSecurityEventListeners() {
        // Monitor for potential session hijacking
        let lastFingerprint = this.getSessionFingerprint();
        
        setInterval(() => {
            const currentFingerprint = this.generateSessionFingerprint();
            if (lastFingerprint && currentFingerprint !== lastFingerprint) {
                console.warn('Session fingerprint changed, potential hijacking detected');
                this.handleSecurityThreat('fingerprint_mismatch');
            }
            lastFingerprint = currentFingerprint;
        }, 60000); // Check every minute
        
        // Monitor for suspicious activity
        this.setupActivityMonitoring();
        
        // Setup page visibility change handler
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, refresh CSRF token when it becomes visible again
                setTimeout(() => {
                    if (!document.hidden) {
                        this.generateCSRFToken();
                    }
                }, 100);
            }
        });
    }

    /**
     * Setup activity monitoring for suspicious behavior
     * @private
     */
    setupActivityMonitoring() {
        let rapidClickCount = 0;
        let lastClickTime = 0;
        
        document.addEventListener('click', (event) => {
            const now = Date.now();
            
            // Detect rapid clicking (potential bot behavior)
            if (now - lastClickTime < 100) {
                rapidClickCount++;
                if (rapidClickCount > 10) {
                    console.warn('Rapid clicking detected, potential bot activity');
                    this.handleSecurityThreat('rapid_clicking');
                    rapidClickCount = 0;
                }
            } else {
                rapidClickCount = 0;
            }
            
            lastClickTime = now;
        });
        
        // Monitor for console access (developer tools)
        let devtools = {
            open: false,
            orientation: null
        };
        
        // Detecção de DevTools desabilitada para desenvolvimento
        // Reabilitar em produção se necessário
        
    }

    /**
     * Handle security threats
     * @param {string} threatType - Type of threat detected
     * @private
     */
    handleSecurityThreat(threatType) {
        const threats = {
            fingerprint_mismatch: 'Possível sequestro de sessão detectado',
            rapid_clicking: 'Atividade suspeita de bot detectada',
            devtools_opened: 'Ferramentas de desenvolvedor abertas',
            csrf_validation_failed: 'Falha na validação CSRF'
        };
        
        const message = threats[threatType] || 'Ameaça de segurança detectada';
        
        // Log security event
        console.warn(`Security threat detected: ${threatType} - ${message}`);
        
        // Dispatch security event for other components to handle
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('security-threat', {
                detail: {
                    type: threatType,
                    message,
                    timestamp: new Date().toISOString()
                }
            }));
        }
        
        // For critical threats, force re-authentication
        const criticalThreats = ['fingerprint_mismatch', 'csrf_validation_failed'];
        if (criticalThreats.includes(threatType)) {
            this.forceReauthentication(message);
        }
    }

    /**
     * Force user re-authentication
     * @param {string} reason - Reason for re-authentication
     */
    forceReauthentication(reason) {
        // Clear session data
        sessionStorage.clear();
        localStorage.removeItem('admin_session');
        
        // Show security warning
        alert(`Ameaça de segurança detectada: ${reason}\n\nVocê será redirecionado para fazer login novamente.`);
        
        // Redirect to login
        window.location.reload();
    }

    /**
     * Encrypt sensitive data for transmission
     * @param {string} data - Data to encrypt
     * @param {string} key - Encryption key
     * @returns {string} Encrypted data
     */
    encryptData(data, key) {
        // Simple XOR encryption for demo purposes
        // In production, use proper encryption like AES
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result);
    }

    /**
     * Decrypt sensitive data
     * @param {string} encryptedData - Encrypted data
     * @param {string} key - Decryption key
     * @returns {string} Decrypted data
     */
    decryptData(encryptedData, key) {
        try {
            const data = atob(encryptedData);
            let result = '';
            for (let i = 0; i < data.length; i++) {
                result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (error) {
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Secure local storage wrapper
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @param {boolean} encrypt - Whether to encrypt the value
     */
    secureSetItem(key, value, encrypt = false) {
        let dataToStore = value;
        
        if (encrypt) {
            const encryptionKey = this.getSessionFingerprint() || 'default_key';
            dataToStore = this.encryptData(value, encryptionKey);
        }
        
        localStorage.setItem(key, dataToStore);
    }

    /**
     * Secure local storage retrieval
     * @param {string} key - Storage key
     * @param {boolean} decrypt - Whether to decrypt the value
     * @returns {string|null} Retrieved value
     */
    secureGetItem(key, decrypt = false) {
        const storedValue = localStorage.getItem(key);
        
        if (!storedValue) {
            return null;
        }
        
        if (decrypt) {
            try {
                const encryptionKey = this.getSessionFingerprint() || 'default_key';
                return this.decryptData(storedValue, encryptionKey);
            } catch (error) {
                console.error('Failed to decrypt stored data:', error);
                return null;
            }
        }
        
        return storedValue;
    }

    /**
     * Clear all security tokens and fingerprints
     */
    clearSecurityData() {
        sessionStorage.removeItem(this.csrfTokenKey);
        sessionStorage.removeItem(this.sessionFingerprintKey);
    }

    /**
     * Get security status
     * @returns {Object} Security status information
     */
    getSecurityStatus() {
        return {
            hasCSRFToken: !!this.getCSRFToken(),
            hasFingerprint: !!this.getSessionFingerprint(),
            fingerprintValid: this.validateSessionFingerprint(),
            isSecureContext: window.isSecureContext || false,
            protocol: window.location.protocol
        };
    }

    /**
     * Initialize security for new session
     * @param {Object} session - Session data
     */
    initializeForSession(session) {
        if (session) {
            this.generateCSRFToken();
            this.generateSessionFingerprint();
        } else {
            this.clearSecurityData();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
} else {
    window.SecurityManager = SecurityManager;
}