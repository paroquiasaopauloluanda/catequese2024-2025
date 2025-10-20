/**
 * Authentication Manager
 * Handles user authentication, session management, and security features
 */
class AuthManager {
    constructor() {
        this.sessionKey = 'admin_session';
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.loginAttempts = this.getLoginAttempts();

        // Valid credentials (in production, this should be more secure)
        this.validCredentials = {
            username: 'admin',
            passwordHash: this.hashPassword('nilknarf')
        };

        // Initialize utility classes
        this.sessionValidator = new SessionValidator();
        this.logThrottler = new LogThrottler();
        this.logger = this.logThrottler.createScopedLogger('AuthManager');
        this.tokenManager = new TokenManager();
        this.securityManager = new SecurityManager();
    }

    /**
     * Simple hash function for password validation
     * @param {string} password - Password to hash
     * @returns {string} Hashed password
     */
    hashPassword(password) {
        // Simple hash for demo - in production use proper crypto
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Generate a unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get login attempts from localStorage
     * @returns {Object} Login attempts data
     */
    getLoginAttempts() {
        const stored = localStorage.getItem('login_attempts');
        if (stored) {
            const data = JSON.parse(stored);
            // Reset if lockout period has expired
            if (data.lockedUntil && Date.now() > data.lockedUntil) {
                this.clearLoginAttempts();
                return { count: 0, lockedUntil: null };
            }
            return data;
        }
        return { count: 0, lockedUntil: null };
    }

    /**
     * Update login attempts
     * @param {number} count - Number of attempts
     * @param {number|null} lockedUntil - Lockout expiration timestamp
     */
    updateLoginAttempts(count, lockedUntil = null) {
        this.loginAttempts = { count, lockedUntil };
        localStorage.setItem('login_attempts', JSON.stringify(this.loginAttempts));
    }

    /**
     * Clear login attempts
     */
    clearLoginAttempts() {
        this.loginAttempts = { count: 0, lockedUntil: null };
        localStorage.removeItem('login_attempts');
    }

    /**
     * Check if account is currently locked
     * @returns {boolean} True if locked
     */
    isAccountLocked() {
        return this.loginAttempts.lockedUntil && Date.now() < this.loginAttempts.lockedUntil;
    }

    /**
     * Get remaining lockout time in minutes
     * @returns {number} Minutes remaining
     */
    getLockoutTimeRemaining() {
        if (!this.isAccountLocked()) return 0;
        return Math.ceil((this.loginAttempts.lockedUntil - Date.now()) / (60 * 1000));
    }

    /**
     * Attempt to log in with provided credentials
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<{success: boolean, message: string, session?: SessionData}>}
     */
    async login(username, password) {
        // Check if account is locked
        if (this.isAccountLocked()) {
            const remaining = this.getLockoutTimeRemaining();
            return {
                success: false,
                message: `Conta bloqueada. Tente novamente em ${remaining} minutos.`
            };
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Validate credentials
        const passwordHash = this.hashPassword(password);
        const isValid = username === this.validCredentials.username &&
            passwordHash === this.validCredentials.passwordHash;

        if (!isValid) {
            // Increment failed attempts
            const newCount = this.loginAttempts.count + 1;

            if (newCount >= this.maxLoginAttempts) {
                // Lock account
                const lockedUntil = Date.now() + this.lockoutDuration;
                this.updateLoginAttempts(newCount, lockedUntil);
                return {
                    success: false,
                    message: `Muitas tentativas falhadas. Conta bloqueada por ${this.lockoutDuration / (60 * 1000)} minutos.`
                };
            } else {
                this.updateLoginAttempts(newCount);
                const remaining = this.maxLoginAttempts - newCount;
                return {
                    success: false,
                    message: `Credenciais inválidas. ${remaining} tentativas restantes.`
                };
            }
        }

        // Successful login
        this.clearLoginAttempts();

        const session = {
            authenticated: true,
            loginTime: Date.now(),
            lastActivity: Date.now(),
            sessionId: this.generateSessionId(),
            validationCount: 0,
            lastValidation: Date.now(),
            fingerprint: this.generateFingerprint(),
            lastRotation: Date.now(),
            origin: window.location.origin
        };

        localStorage.setItem(this.sessionKey, JSON.stringify(session));

        // Notify managers of session change
        this.tokenManager.onSessionChange(session);
        this.securityManager.initializeForSession(session);

        return {
            success: true,
            message: 'Login realizado com sucesso!',
            session
        };
    }

    /**
     * Log out the current user
     */
    logout() {
        // Notify managers of session end
        this.tokenManager.onSessionChange(null);
        this.securityManager.initializeForSession(null);

        localStorage.removeItem(this.sessionKey);
        // Redirect to login or refresh page
        window.location.reload();
    }

    /**
     * Check if user is currently authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        const session = this.getSession();
        if (!session) return false;

        // Validate origin first
        if (!this.validateOrigin()) {
            this.logger.error('origin_validation_failed', 'Origin validation failed');
            this.logout();
            return false;
        }

        // Use throttled validation to prevent infinite loops
        const validationResult = this.sessionValidator.validateSession(session);
        
        // Update validation counter
        if (session.validationCount !== undefined) {
            session.validationCount++;
            session.lastValidation = Date.now();
        }
        
        // If validation is throttled or failed, handle appropriately
        if (!validationResult.valid) {
            if (validationResult.throttled) {
                // Log throttling with throttled logger
                this.logger.debug('validation_throttled', 
                    `Session validation throttled: ${validationResult.reason}`);
                
                // If throttled but we have a cached valid result, trust it temporarily
                if (validationResult.cached && validationResult.reason !== 'validation_error') {
                    return session.authenticated;
                }
                // Otherwise, assume invalid to be safe
                return false;
            }
            
            // Log validation failure
            this.logger.warn('validation_failed', 
                `Session validation failed: ${validationResult.reason} - ${validationResult.message}`);
            
            // Session validation failed, clean up silently
            this.silentCleanup();
            return false;
        }

        // Validate session fingerprint for security
        if (!this.validateFingerprint(session)) {
            this.logger.warn('fingerprint_validation_failed', 'Session fingerprint validation failed');
            this.logout();
            return false;
        }

        // Check session timeout
        const now = Date.now();
        const timeSinceActivity = now - session.lastActivity;

        if (timeSinceActivity > this.sessionTimeout) {
            this.logout();
            return false;
        }

        // Update last activity
        session.lastActivity = now;
        
        // Rotate session ID if needed
        const rotatedSession = this.rotateSessionId(session);
        
        // Store updated session
        localStorage.setItem(this.sessionKey, JSON.stringify(rotatedSession));

        // Ensure managers have current session
        this.tokenManager.onSessionChange(rotatedSession);

        return rotatedSession.authenticated;
    }

    /**
     * Get current session data
     * @returns {SessionData|null} Session data or null if not authenticated
     */
    getSession() {
        const stored = localStorage.getItem(this.sessionKey);
        if (!stored) return null;

        try {
            const session = JSON.parse(stored);
            
            // Use throttled validation instead of basic checks
            const validationResult = this.sessionValidator.validateSession(session);
            
            if (validationResult.valid) {
                return session;
            }
            
            // If validation is throttled, return session if it exists and has basic structure
            if (validationResult.throttled && session && session.authenticated === true) {
                return session;
            }
            
            // Session is invalid, clean up silently
            this.silentCleanup();
            return null;
        } catch (error) {
            // Parse error, clean up silently
            this.silentCleanup();
            return null;
        }
    }

    /**
     * Extend the current session
     */
    extendSession() {
        const session = this.getSession();
        if (session) {
            session.lastActivity = Date.now();
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
        }
    }

    /**
     * Get session time remaining in minutes
     * @returns {number} Minutes remaining
     */
    getSessionTimeRemaining() {
        const session = this.getSession();
        if (!session) return 0;

        const elapsed = Date.now() - session.lastActivity;
        const remaining = this.sessionTimeout - elapsed;

        return Math.max(0, Math.ceil(remaining / (60 * 1000)));
    }

    /**
     * Silent cleanup of invalid session without logging
     * Used to prevent console spam during validation failures
     * @private
     */
    silentCleanup() {
        localStorage.removeItem(this.sessionKey);
        
        // Use throttled logging for cleanup events
        this.logger.debug('session_cleanup', 'Invalid session cleaned up silently');
        
        // Notify managers of session end without logging
        if (this.tokenManager && typeof this.tokenManager.onSessionChange === 'function') {
            this.tokenManager.onSessionChange(null);
        }
        if (this.securityManager && typeof this.securityManager.initializeForSession === 'function') {
            this.securityManager.initializeForSession(null);
        }
    }

    /**
     * Generate comprehensive browser fingerprint for session security
     * @returns {string} Browser fingerprint
     * @private
     */
    generateFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser fingerprint', 2, 2);
            
            const fingerprint = [
                navigator.userAgent || '',
                navigator.language || '',
                navigator.languages ? navigator.languages.join(',') : '',
                screen.width + 'x' + screen.height,
                screen.colorDepth || '',
                new Date().getTimezoneOffset(),
                navigator.platform || '',
                navigator.cookieEnabled ? '1' : '0',
                navigator.doNotTrack || '',
                window.location.origin || '',
                canvas.toDataURL()
            ].join('|');
            
            return this.hashPassword(fingerprint);
        } catch (error) {
            // Fallback fingerprint if canvas or other features fail
            this.logger.warn('fingerprint_error', `Failed to generate full fingerprint: ${error.message}`);
            
            const basicFingerprint = [
                navigator.userAgent || 'unknown',
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                window.location.origin || 'unknown'
            ].join('|');
            
            return this.hashPassword(basicFingerprint);
        }
    }

    /**
     * Validate session fingerprint
     * @param {Object} session - Session data
     * @returns {boolean} True if fingerprint is valid
     * @private
     */
    validateFingerprint(session) {
        if (!session || !session.fingerprint) {
            this.logger.warn('fingerprint_missing', 'Session missing fingerprint');
            return false;
        }

        const currentFingerprint = this.generateFingerprint();
        const isValid = session.fingerprint === currentFingerprint;
        
        if (!isValid) {
            this.logger.warn('fingerprint_mismatch', 
                'Session fingerprint mismatch - possible session hijacking');
        }
        
        return isValid;
    }

    /**
     * Validate request origin
     * @returns {boolean} True if origin is valid
     * @private
     */
    validateOrigin() {
        const allowedOrigins = [
            window.location.origin,
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'https://localhost:3000'
        ];

        const currentOrigin = window.location.origin;
        const isValid = allowedOrigins.includes(currentOrigin);
        
        if (!isValid) {
            this.logger.error('origin_invalid', 
                `Invalid origin detected: ${currentOrigin}`);
        }
        
        return isValid;
    }

    /**
     * Rotate session ID for security
     * @param {Object} session - Current session
     * @returns {Object} Session with new ID
     * @private
     */
    rotateSessionId(session) {
        if (!session) return null;

        const now = Date.now();
        const sessionAge = now - session.loginTime;
        const timeSinceRotation = session.lastRotation ? now - session.lastRotation : sessionAge;
        
        // Rotate every 15 minutes or if forced
        const shouldRotate = timeSinceRotation > (15 * 60 * 1000);
        
        if (shouldRotate) {
            const oldSessionId = session.sessionId;
            session.sessionId = this.generateSessionId();
            session.lastRotation = now;
            
            this.logger.info('session_rotated', 
                `Session ID rotated after ${Math.round(timeSinceRotation / 60000)} minutes`);
            
            // Store updated session
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            
            // Notify managers of session change
            this.tokenManager.onSessionChange(session);
        }
        
        return session;
    }

    /**
     * Check if validation should be skipped to prevent excessive checks
     * @returns {boolean} True if validation should be skipped
     * @private
     */
    shouldSkipValidation() {
        const session = this.getRawSession();
        if (!session || !session.validationCount || !session.lastValidation) {
            return false;
        }

        const now = Date.now();
        const timeSinceLastValidation = now - session.lastValidation;
        const validationsPerMinute = session.validationCount / ((now - session.loginTime) / 60000);

        // Skip if too many validations in a short time
        if (validationsPerMinute > 30 && timeSinceLastValidation < 2000) {
            this.logger.debug('validation_skipped', 
                `Skipping validation due to excessive checks: ${validationsPerMinute.toFixed(1)}/min`);
            return true;
        }

        return false;
    }

    /**
     * Get raw session data without validation
     * @returns {Object|null} Raw session data
     * @private
     */
    getRawSession() {
        const stored = localStorage.getItem(this.sessionKey);
        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get security status
     * @returns {Object} Security status information
     */
    getSecurityStatus() {
        return {
            authenticated: this.isAuthenticated(),
            sessionTimeRemaining: this.getSessionTimeRemaining(),
            tokenStatus: this.tokenManager.getTokenStatus(),
            securityStatus: this.securityManager.getSecurityStatus(),
            loginAttempts: this.loginAttempts,
            validationStats: this.sessionValidator.getStats(),
            loggingStats: this.logThrottler.getStats()
        };
    }

    /**
     * Initialize authentication system
     */
    init() {
        // Set up session monitoring
        setInterval(() => {
            if (this.isAuthenticated()) {
                // Session is still valid, extend it
                this.extendSession();
            }
        }, 60000); // Check every minute

        // Set up activity monitoring
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                if (this.isAuthenticated()) {
                    this.extendSession();
                }
            }, { passive: true });
        });

        // Set up security event listeners
        window.addEventListener('security-threat', (event) => {
            // Use throttled logging for security events
            this.logger.warn('security_threat', 
                `Security threat detected: ${event.detail.type || 'unknown'}`);

            // Log security event with additional details
            if (event.detail) {
                this.logger.info('security_details', 
                    `Security threat details: ${JSON.stringify(event.detail)}`);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
} else {
    window.AuthManager = AuthManager;
}