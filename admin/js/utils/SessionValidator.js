/**
 * Session Validator Utility
 * Provides throttled session validation to prevent infinite loops
 */
class SessionValidator {
    constructor() {
        this.lastCheck = 0;
        this.checkInterval = 1000; // 1 second minimum between checks
        this.cachedResult = null;
        this.cacheTimeout = 500; // Cache result for 500ms
        this.validationCount = 0;
        this.maxValidationsPerMinute = 60;
        this.validationHistory = [];
        this.circuitBreakerThreshold = 5;
        this.circuitBreakerTimeout = 30000; // 30 seconds
        this.circuitBreakerState = 'closed'; // closed, open, half-open
        this.lastCircuitBreakerOpen = 0;
    }

    /**
     * Validate session with throttling mechanism
     * @param {Object} sessionData - Session data to validate
     * @returns {Object} Validation result with throttling info
     */
    validateSession(sessionData) {
        const now = Date.now();
        
        // Check circuit breaker
        if (this.circuitBreakerState === 'open') {
            if (now - this.lastCircuitBreakerOpen > this.circuitBreakerTimeout) {
                this.circuitBreakerState = 'half-open';
            } else {
                return {
                    valid: false,
                    throttled: true,
                    reason: 'circuit_breaker_open',
                    message: 'Session validation temporarily disabled due to repeated failures',
                    nextCheckAllowed: this.lastCircuitBreakerOpen + this.circuitBreakerTimeout
                };
            }
        }

        // Check throttling
        if (now - this.lastCheck < this.checkInterval) {
            // Return cached result if available and still valid
            if (this.cachedResult && now - this.cachedResult.timestamp < this.cacheTimeout) {
                return {
                    ...this.cachedResult.result,
                    cached: true,
                    throttled: true
                };
            }
            
            return {
                valid: false,
                throttled: true,
                reason: 'rate_limited',
                message: 'Session validation rate limited',
                nextCheckAllowed: this.lastCheck + this.checkInterval
            };
        }

        // Check validation rate limit
        this.cleanupValidationHistory(now);
        if (this.validationHistory.length >= this.maxValidationsPerMinute) {
            return {
                valid: false,
                throttled: true,
                reason: 'rate_limit_exceeded',
                message: 'Too many validation attempts per minute',
                nextCheckAllowed: this.validationHistory[0] + 60000
            };
        }

        // Perform actual validation
        this.lastCheck = now;
        this.validationCount++;
        this.validationHistory.push(now);

        const result = this.performValidation(sessionData);
        
        // Handle circuit breaker logic
        if (!result.valid && result.reason === 'validation_error') {
            this.handleValidationFailure();
        } else if (result.valid && this.circuitBreakerState === 'half-open') {
            this.circuitBreakerState = 'closed';
        }

        // Cache the result
        this.cachedResult = {
            result: { ...result, cached: false, throttled: false },
            timestamp: now
        };

        return this.cachedResult.result;
    }

    /**
     * Perform the actual session validation logic
     * @param {Object} sessionData - Session data to validate
     * @returns {Object} Validation result
     * @private
     */
    performValidation(sessionData) {
        try {
            // Basic validation checks
            if (!sessionData) {
                return {
                    valid: false,
                    reason: 'no_session_data',
                    message: 'No session data provided'
                };
            }

            // Check if sessionData is a valid object
            if (typeof sessionData !== 'object') {
                return {
                    valid: false,
                    reason: 'invalid_session_format',
                    message: 'Session data is not an object'
                };
            }

            // Check required fields
            const requiredFields = ['authenticated', 'loginTime', 'lastActivity', 'sessionId'];
            for (const field of requiredFields) {
                if (!(field in sessionData)) {
                    return {
                        valid: false,
                        reason: 'missing_required_field',
                        message: `Missing required field: ${field}`,
                        missingField: field
                    };
                }
            }

            // Validate field types
            if (typeof sessionData.authenticated !== 'boolean') {
                return {
                    valid: false,
                    reason: 'invalid_field_type',
                    message: 'authenticated field must be boolean'
                };
            }

            if (typeof sessionData.loginTime !== 'number' || sessionData.loginTime <= 0) {
                return {
                    valid: false,
                    reason: 'invalid_field_type',
                    message: 'loginTime must be a positive number'
                };
            }

            if (typeof sessionData.lastActivity !== 'number' || sessionData.lastActivity <= 0) {
                return {
                    valid: false,
                    reason: 'invalid_field_type',
                    message: 'lastActivity must be a positive number'
                };
            }

            if (typeof sessionData.sessionId !== 'string' || sessionData.sessionId.length === 0) {
                return {
                    valid: false,
                    reason: 'invalid_field_type',
                    message: 'sessionId must be a non-empty string'
                };
            }

            // Validate session timing
            const now = Date.now();
            if (sessionData.loginTime > now) {
                return {
                    valid: false,
                    reason: 'invalid_timing',
                    message: 'loginTime cannot be in the future'
                };
            }

            if (sessionData.lastActivity > now) {
                return {
                    valid: false,
                    reason: 'invalid_timing',
                    message: 'lastActivity cannot be in the future'
                };
            }

            if (sessionData.lastActivity < sessionData.loginTime) {
                return {
                    valid: false,
                    reason: 'invalid_timing',
                    message: 'lastActivity cannot be before loginTime'
                };
            }

            // Check if authenticated flag matches session state
            if (!sessionData.authenticated) {
                return {
                    valid: false,
                    reason: 'not_authenticated',
                    message: 'Session is not authenticated'
                };
            }

            // All validations passed
            return {
                valid: true,
                reason: 'valid_session',
                message: 'Session is valid',
                sessionAge: now - sessionData.loginTime,
                timeSinceActivity: now - sessionData.lastActivity
            };

        } catch (error) {
            return {
                valid: false,
                reason: 'validation_error',
                message: `Validation error: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle validation failure for circuit breaker
     * @private
     */
    handleValidationFailure() {
        // Count recent failures
        const now = Date.now();
        const recentFailures = this.validationHistory.filter(
            timestamp => now - timestamp < 60000 // Last minute
        ).length;

        if (recentFailures >= this.circuitBreakerThreshold) {
            this.circuitBreakerState = 'open';
            this.lastCircuitBreakerOpen = now;
        }
    }

    /**
     * Clean up old validation history entries
     * @param {number} now - Current timestamp
     * @private
     */
    cleanupValidationHistory(now) {
        // Remove entries older than 1 minute
        this.validationHistory = this.validationHistory.filter(
            timestamp => now - timestamp < 60000
        );
    }

    /**
     * Get validation statistics
     * @returns {Object} Validation statistics
     */
    getStats() {
        const now = Date.now();
        this.cleanupValidationHistory(now);

        return {
            totalValidations: this.validationCount,
            recentValidations: this.validationHistory.length,
            lastCheck: this.lastCheck,
            timeSinceLastCheck: now - this.lastCheck,
            circuitBreakerState: this.circuitBreakerState,
            hasCachedResult: !!this.cachedResult,
            cacheAge: this.cachedResult ? now - this.cachedResult.timestamp : 0
        };
    }

    /**
     * Reset validation state (for testing or recovery)
     */
    reset() {
        this.lastCheck = 0;
        this.cachedResult = null;
        this.validationCount = 0;
        this.validationHistory = [];
        this.circuitBreakerState = 'closed';
        this.lastCircuitBreakerOpen = 0;
    }

    /**
     * Force circuit breaker to close (for recovery)
     */
    resetCircuitBreaker() {
        this.circuitBreakerState = 'closed';
        this.lastCircuitBreakerOpen = 0;
    }

    /**
     * Check if validation is currently allowed
     * @returns {boolean} True if validation is allowed
     */
    isValidationAllowed() {
        const now = Date.now();
        
        // Check circuit breaker
        if (this.circuitBreakerState === 'open') {
            return now - this.lastCircuitBreakerOpen > this.circuitBreakerTimeout;
        }

        // Check throttling
        if (now - this.lastCheck < this.checkInterval) {
            return false;
        }

        // Check rate limit
        this.cleanupValidationHistory(now);
        return this.validationHistory.length < this.maxValidationsPerMinute;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionValidator;
} else {
    window.SessionValidator = SessionValidator;
}