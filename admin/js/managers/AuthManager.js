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

        // Initialize login attempts with safe fallback
        this.loginAttempts = null; // Will be loaded lazily when needed

        // Valid credentials (in production, this should be more secure)
        this.validCredentials = {
            username: 'admin',
            passwordHash: this.hashPassword('nilknarf')
        };

        // Initialize utility classes with error handling
        try {
            this.sessionValidator = window.SessionValidator ? new SessionValidator() : null;
            this.logThrottler = window.LogThrottler ? new LogThrottler() : null;
            this.logger = this.logThrottler ? this.logThrottler.createScopedLogger('AuthManager') : console;
            this.tokenManager = window.TokenManager ? new TokenManager() : null;
            this.securityManager = window.SecurityManager ? new SecurityManager() : null;
        } catch (error) {
            console.warn('Error initializing AuthManager dependencies:', error);
            // Create minimal fallbacks
            this.sessionValidator = null;
            this.logThrottler = null;
            this.logger = console;
            this.tokenManager = null;
            this.securityManager = null;
        }
    }

    /**
     * Safe logging helper
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {string} type - Log type/category
     * @param {string} message - Log message
     */
    safeLog(level, type, message) {
        try {
            if (this.logger && typeof this.logger[level] === 'function') {
                this.logger[level](type, message);
            } else if (console && typeof console[level] === 'function') {
                console[level](`[${type}] ${message}`);
            }
        } catch (error) {
            // Fallback to basic console logging
            console.log(`[${level.toUpperCase()}] [${type}] ${message}`);
        }
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
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    /**
     * Ensure login attempts are initialized
     * @private
     */
    ensureLoginAttemptsInitialized() {
        if (this.loginAttempts === null) {
            this.loginAttempts = this.getLoginAttempts();
        }
    }

    /**
     * Get login attempts from localStorage
     * @returns {Object} Login attempts data
     */
    getLoginAttempts() {
        try {
            const stored = localStorage.getItem('login_attempts');
            if (stored) {
                const data = JSON.parse(stored);

                // Validate data structure
                if (typeof data !== 'object' || data === null) {
                    const defaultData = { count: 0, lockedUntil: null };
                    this.loginAttempts = defaultData;
                    localStorage.removeItem('login_attempts');
                    return defaultData;
                }

                // Ensure count is a number
                if (typeof data.count !== 'number' || isNaN(data.count)) {
                    data.count = 0;
                }

                // Ensure lockedUntil is valid
                if (data.lockedUntil !== null && (typeof data.lockedUntil !== 'number' || isNaN(data.lockedUntil))) {
                    data.lockedUntil = null;
                }

                // Reset if lockout period has expired
                if (data.lockedUntil && Date.now() > data.lockedUntil) {
                    const defaultData = { count: 0, lockedUntil: null };
                    this.loginAttempts = defaultData;
                    localStorage.removeItem('login_attempts');
                    return defaultData;
                }

                return data;
            }
        } catch (error) {
            // If there's any error parsing, clear the data
            const defaultData = { count: 0, lockedUntil: null };
            this.loginAttempts = defaultData;
            localStorage.removeItem('login_attempts');
            return defaultData;
        }

        return { count: 0, lockedUntil: null };
    }

    /**
     * Update login attempts
     * @param {number} count - Number of attempts
     * @param {number|null} lockedUntil - Lockout expiration timestamp
     */
    updateLoginAttempts(count, lockedUntil = null) {
        // Validate inputs
        const validCount = typeof count === 'number' && !isNaN(count) ? Math.max(0, count) : 0;
        const validLockedUntil = lockedUntil !== null && typeof lockedUntil === 'number' && !isNaN(lockedUntil) ? lockedUntil : null;

        this.loginAttempts = { count: validCount, lockedUntil: validLockedUntil };

        try {
            localStorage.setItem('login_attempts', JSON.stringify(this.loginAttempts));
        } catch (error) {
            console.warn('Error saving login attempts to localStorage:', error);
        }
    }

    /**
     * Clear login attempts
     */
    clearLoginAttempts() {
        this.loginAttempts = { count: 0, lockedUntil: null };
        try {
            localStorage.removeItem('login_attempts');
        } catch (error) {
            console.warn('Error clearing login attempts from localStorage:', error);
        }
    }

    /**
     * Reset authentication state completely
     * Useful for debugging and recovery
     */
    resetAuthState() {
        try {
            // Clear all auth-related localStorage items
            localStorage.removeItem('login_attempts');
            localStorage.removeItem(this.sessionKey);
            localStorage.removeItem('admin_session');

            // Reset internal state
            this.loginAttempts = { count: 0, lockedUntil: null };

            console.log('Authentication state reset successfully');
            return true;
        } catch (error) {
            console.error('Error resetting auth state:', error);
            return false;
        }
    }

    /**
     * Diagnostic method to check AuthManager state
     * @returns {Object} Diagnostic information
     */
    getDiagnostics() {
        return {
            loginAttempts: this.loginAttempts,
            isLocked: this.isAccountLocked(),
            lockoutTimeRemaining: this.getLockoutTimeRemaining(),
            sessionKey: this.sessionKey,
            maxLoginAttempts: this.maxLoginAttempts,
            lockoutDuration: this.lockoutDuration,
            dependencies: {
                sessionValidator: !!this.sessionValidator,
                logThrottler: !!this.logThrottler,
                logger: !!this.logger,
                tokenManager: !!this.tokenManager,
                securityManager: !!this.securityManager
            },
            localStorage: {
                loginAttempts: localStorage.getItem('login_attempts'),
                session: localStorage.getItem(this.sessionKey)
            }
        };
    }

    /**
     * Check if account is currently locked
     * @returns {boolean} True if locked
     */
    isAccountLocked() {
        console.log('isAccountLocked called, current loginAttempts:', this.loginAttempts);

        // Ensure loginAttempts is properly initialized
        this.ensureLoginAttemptsInitialized();

        console.log('After initialization, loginAttempts:', this.loginAttempts);

        const isLocked = this.loginAttempts.lockedUntil &&
            typeof this.loginAttempts.lockedUntil === 'number' &&
            Date.now() < this.loginAttempts.lockedUntil;

        console.log('Account lock status:', isLocked);
        return isLocked;
    }

    /**
     * Get remaining lockout time in minutes
     * @returns {number} Minutes remaining
     */
    getLockoutTimeRemaining() {
        console.log('getLockoutTimeRemaining called');

        // Ensure loginAttempts is initialized
        this.ensureLoginAttemptsInitialized();
        console.log('Current loginAttempts:', this.loginAttempts);

        const isLocked = this.isAccountLocked();
        console.log('isAccountLocked result:', isLocked);

        if (!isLocked) {
            console.log('Account not locked, returning 0');
            return 0;
        }

        // Ensure we have valid data
        if (!this.loginAttempts.lockedUntil || typeof this.loginAttempts.lockedUntil !== 'number') {
            console.log('Invalid lockedUntil data, returning 0');
            return 0;
        }

        const remaining = Math.ceil((this.loginAttempts.lockedUntil - Date.now()) / (60 * 1000));
        const result = Math.max(0, remaining);
        console.log('Calculated remaining time:', result);
        return result; // Ensure we never return negative values
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

            // Ensure remaining is a valid number
            const remainingMinutes = typeof remaining === 'number' && !isNaN(remaining) ? remaining : 0;

            return {
                success: false,
                message: `Conta bloqueada. Tente novamente em ${remainingMinutes} minutos.`
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
            this.ensureLoginAttemptsInitialized();
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
        if (this.tokenManager && typeof this.tokenManager.onSessionChange === 'function') {
            this.tokenManager.onSessionChange(session);
        }
        if (this.securityManager && typeof this.securityManager.initializeForSession === 'function') {
            this.securityManager.initializeForSession(session);
        }

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
        if (this.tokenManager && typeof this.tokenManager.onSessionChange === 'function') {
            this.tokenManager.onSessionChange(null);
        }
        if (this.securityManager && typeof this.securityManager.initializeForSession === 'function') {
            this.securityManager.initializeForSession(null);
        }

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
            this.safeLog('error', 'origin_validation_failed', 'Origin validation failed');
            this.logout();
            return false;
        }

        // Use throttled validation to prevent infinite loops
        const validationResult = this.sessionValidator ?
            this.sessionValidator.validateSession(session) :
            { valid: true, throttled: false };

        // Update validation counter
        if (session.validationCount !== undefined) {
            session.validationCount++;
            session.lastValidation = Date.now();
        }

        // If validation is throttled or failed, handle appropriately
        if (!validationResult.valid) {
            if (validationResult.throttled) {
                // Log throttling with throttled logger
                if (this.logger && typeof this.logger.debug === 'function') {
                    this.logger.debug('validation_throttled',
                        `Session validation throttled: ${validationResult.reason}`);
                }

                // If throttled but we have a cached valid result, trust it temporarily
                if (validationResult.cached && validationResult.reason !== 'validation_error') {
                    return session.authenticated;
                }
                // Otherwise, assume invalid to be safe
                return false;
            }

            // Log validation failure
            if (this.logger && typeof this.logger.warn === 'function') {
                this.logger.warn('validation_failed',
                    `Session validation failed: ${validationResult.reason} - ${validationResult.message}`);
            }

            // Session validation failed, clean up silently
            this.silentCleanup();
            return false;
        }

        // Validate session fingerprint for security
        if (!this.validateFingerprint(session)) {
            if (this.logger && typeof this.logger.warn === 'function') {
                this.logger.warn('fingerprint_validation_failed', 'Session fingerprint validation failed');
            }
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
        if (this.tokenManager && typeof this.tokenManager.onSessionChange === 'function') {
            this.tokenManager.onSessionChange(rotatedSession);
        }

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
            const validationResult = this.sessionValidator ?
                this.sessionValidator.validateSession(session) :
                { valid: true, throttled: false };

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
        try {
            if (this.tokenManager && typeof this.tokenManager.onSessionChange === 'function') {
                this.tokenManager.onSessionChange(null);
            }
            if (this.securityManager && typeof this.securityManager.initializeForSession === 'function') {
                this.securityManager.initializeForSession(null);
            }
        } catch (error) {
            // Ignore errors during cleanup
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
                navigator.userAgentData?.platform || navigator.platform || '',
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
            session.sessionId = this.generateSessionId();
            session.lastRotation = now;

            this.logger.info('session_rotated',
                `Session ID rotated after ${Math.round(timeSinceRotation / 60000)} minutes`);

            // Store updated session
            localStorage.setItem(this.sessionKey, JSON.stringify(session));

            // Notify managers of session change
            if (this.tokenManager && typeof this.tokenManager.onSessionChange === 'function') {
                this.tokenManager.onSessionChange(session);
            }
        }

        return session;
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
            tokenStatus: this.tokenManager ? this.tokenManager.getTokenStatus() : null,
            securityStatus: this.securityManager ? this.securityManager.getSecurityStatus() : null,
            loginAttempts: this.loginAttempts,
            validationStats: this.sessionValidator ? this.sessionValidator.getStats() : null,
            loggingStats: this.logThrottler ? this.logThrottler.getStats() : null
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
} else if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}