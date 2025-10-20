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

        // Initialize token manager and security manager
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
            sessionId: this.generateSessionId()
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

        // Validate session fingerprint for security (desabilitado temporariamente)
        // if (!this.securityManager.validateSessionFingerprint()) {
        //     console.warn('Session fingerprint validation failed');
        //     this.logout();
        //     return false;
        // }

        // Check session timeout
        const now = Date.now();
        const timeSinceActivity = now - session.lastActivity;

        if (timeSinceActivity > this.sessionTimeout) {
            this.logout();
            return false;
        }

        // Update last activity
        session.lastActivity = now;
        localStorage.setItem(this.sessionKey, JSON.stringify(session));

        // Ensure managers have current session
        this.tokenManager.onSessionChange(session);

        return session.authenticated;
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
            
            // Validação simplificada para evitar loops
            if (session && typeof session === 'object' && session.authenticated) {
                return session;
            } else {
                console.warn('Invalid session format, clearing...');
                localStorage.removeItem(this.sessionKey);
                return null;
            }
        } catch (error) {
            console.error('Error parsing session data:', error);
            localStorage.removeItem(this.sessionKey);
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
     * Get security status
     * @returns {Object} Security status information
     */
    getSecurityStatus() {
        return {
            authenticated: this.isAuthenticated(),
            sessionTimeRemaining: this.getSessionTimeRemaining(),
            tokenStatus: this.tokenManager.getTokenStatus(),
            securityStatus: this.securityManager.getSecurityStatus(),
            loginAttempts: this.loginAttempts
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
            console.warn('Security threat detected:', event.detail);

            // Log security event
            if (window.logManager) {
                window.logManager.log('security', `Security threat: ${event.detail.type}`, 'warning');
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