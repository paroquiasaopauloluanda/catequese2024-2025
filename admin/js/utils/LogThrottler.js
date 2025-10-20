/**
 * Log Throttler Utility
 * Provides intelligent logging with throttling to prevent spam
 */
class LogThrottler {
    constructor() {
        this.messageCache = new Map();
        this.throttleTime = 5000; // 5 seconds default throttle
        this.maxCacheSize = 100;
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLogLevel = this.logLevels.info;
        this.groupedMessages = new Map();
        this.groupTimeout = 10000; // 10 seconds to group similar messages
        this.stats = {
            totalMessages: 0,
            throttledMessages: 0,
            groupedMessages: 0
        };
    }

    /**
     * Log a message with throttling
     * @param {string} key - Unique key for the message type
     * @param {string} message - Message to log
     * @param {string} level - Log level (error, warn, info, debug)
     * @param {Object} options - Additional options
     * @returns {boolean} True if message was logged, false if throttled
     */
    throttledLog(key, message, level = 'info', options = {}) {
        const now = Date.now();
        const logLevel = this.logLevels[level] || this.logLevels.info;
        
        // Check if log level is enabled
        if (logLevel > this.currentLogLevel) {
            return false;
        }

        // Clean up old cache entries
        this.cleanupCache(now);

        // Check if message should be throttled
        const cacheEntry = this.messageCache.get(key);
        if (cacheEntry) {
            const timeSinceLastLog = now - cacheEntry.lastLogged;
            
            if (timeSinceLastLog < this.throttleTime) {
                // Increment throttled count
                cacheEntry.throttledCount++;
                this.stats.throttledMessages++;
                
                // Check if we should group this message
                if (options.allowGrouping !== false) {
                    this.addToGroup(key, message, level, now);
                }
                
                return false;
            }
        }

        // Log the message
        this.performLog(message, level, options);
        
        // Update cache
        this.messageCache.set(key, {
            lastLogged: now,
            message: message,
            level: level,
            count: (cacheEntry?.count || 0) + 1,
            throttledCount: cacheEntry?.throttledCount || 0
        });

        // Log throttled summary if there were throttled messages
        if (cacheEntry?.throttledCount > 0) {
            this.logThrottledSummary(key, cacheEntry.throttledCount, level);
            // Reset throttled count
            this.messageCache.get(key).throttledCount = 0;
        }

        this.stats.totalMessages++;
        return true;
    }

    /**
     * Add message to grouping system
     * @param {string} key - Message key
     * @param {string} message - Message content
     * @param {string} level - Log level
     * @param {number} timestamp - Current timestamp
     * @private
     */
    addToGroup(key, message, level, timestamp) {
        const groupKey = `${key}_${level}`;
        
        if (!this.groupedMessages.has(groupKey)) {
            this.groupedMessages.set(groupKey, {
                messages: [],
                firstSeen: timestamp,
                lastSeen: timestamp,
                count: 0
            });
            
            // Set timeout to flush this group
            setTimeout(() => {
                this.flushGroup(groupKey);
            }, this.groupTimeout);
        }

        const group = this.groupedMessages.get(groupKey);
        group.messages.push({ message, timestamp });
        group.lastSeen = timestamp;
        group.count++;
    }

    /**
     * Flush a group of messages
     * @param {string} groupKey - Group key to flush
     * @private
     */
    flushGroup(groupKey) {
        const group = this.groupedMessages.get(groupKey);
        if (!group || group.count === 0) {
            this.groupedMessages.delete(groupKey);
            return;
        }

        const [key, level] = groupKey.split('_');
        const duration = group.lastSeen - group.firstSeen;
        
        this.performLog(
            `[GROUPED] ${group.count} similar messages over ${Math.round(duration / 1000)}s: "${group.messages[0].message}"`,
            level,
            { grouped: true }
        );

        this.stats.groupedMessages += group.count;
        this.groupedMessages.delete(groupKey);
    }

    /**
     * Perform the actual logging
     * @param {string} message - Message to log
     * @param {string} level - Log level
     * @param {Object} options - Additional options
     * @private
     */
    performLog(message, level, options = {}) {
        const timestamp = new Date().toISOString();
        const prefix = options.grouped ? '[THROTTLED]' : '[LOG]';
        const formattedMessage = `${prefix} ${timestamp} [${level.toUpperCase()}] ${message}`;

        // Use appropriate console method
        switch (level) {
            case 'error':
                console.error(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'debug':
                console.debug(formattedMessage);
                break;
            case 'info':
            default:
                console.log(formattedMessage);
                break;
        }

        // Dispatch custom event for log listeners
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('throttled-log', {
                detail: {
                    message,
                    level,
                    timestamp: Date.now(),
                    options
                }
            }));
        }
    }

    /**
     * Log summary of throttled messages
     * @param {string} key - Message key
     * @param {number} count - Number of throttled messages
     * @param {string} level - Log level
     * @private
     */
    logThrottledSummary(key, count, level) {
        const summaryMessage = `${count} similar messages were throttled for key: ${key}`;
        this.performLog(summaryMessage, level, { summary: true });
    }

    /**
     * Clean up old cache entries
     * @param {number} now - Current timestamp
     * @private
     */
    cleanupCache(now) {
        // Remove entries older than throttle time * 2
        const maxAge = this.throttleTime * 2;
        
        for (const [key, entry] of this.messageCache.entries()) {
            if (now - entry.lastLogged > maxAge) {
                this.messageCache.delete(key);
            }
        }

        // Limit cache size
        if (this.messageCache.size > this.maxCacheSize) {
            const entries = Array.from(this.messageCache.entries());
            entries.sort((a, b) => a[1].lastLogged - b[1].lastLogged);
            
            // Remove oldest entries
            const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
            toRemove.forEach(([key]) => this.messageCache.delete(key));
        }
    }

    /**
     * Log an error with throttling
     * @param {string} key - Unique key for the error
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @returns {boolean} True if logged
     */
    error(key, message, options = {}) {
        return this.throttledLog(key, message, 'error', options);
    }

    /**
     * Log a warning with throttling
     * @param {string} key - Unique key for the warning
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @returns {boolean} True if logged
     */
    warn(key, message, options = {}) {
        return this.throttledLog(key, message, 'warn', options);
    }

    /**
     * Log an info message with throttling
     * @param {string} key - Unique key for the message
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     * @returns {boolean} True if logged
     */
    info(key, message, options = {}) {
        return this.throttledLog(key, message, 'info', options);
    }

    /**
     * Log a debug message with throttling
     * @param {string} key - Unique key for the message
     * @param {string} message - Debug message
     * @param {Object} options - Additional options
     * @returns {boolean} True if logged
     */
    debug(key, message, options = {}) {
        return this.throttledLog(key, message, 'debug', options);
    }

    /**
     * Set the current log level
     * @param {string} level - Log level (error, warn, info, debug)
     */
    setLogLevel(level) {
        if (level in this.logLevels) {
            this.currentLogLevel = this.logLevels[level];
        }
    }

    /**
     * Set throttle time for messages
     * @param {number} milliseconds - Throttle time in milliseconds
     */
    setThrottleTime(milliseconds) {
        this.throttleTime = Math.max(1000, milliseconds); // Minimum 1 second
    }

    /**
     * Get logging statistics
     * @returns {Object} Logging statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.messageCache.size,
            activeGroups: this.groupedMessages.size,
            currentLogLevel: Object.keys(this.logLevels)[this.currentLogLevel],
            throttleTime: this.throttleTime
        };
    }

    /**
     * Get cache information for debugging
     * @returns {Array} Array of cache entries
     */
    getCacheInfo() {
        return Array.from(this.messageCache.entries()).map(([key, entry]) => ({
            key,
            lastLogged: new Date(entry.lastLogged).toISOString(),
            message: entry.message,
            level: entry.level,
            count: entry.count,
            throttledCount: entry.throttledCount
        }));
    }

    /**
     * Clear all cached messages and reset stats
     */
    clear() {
        this.messageCache.clear();
        this.groupedMessages.clear();
        this.stats = {
            totalMessages: 0,
            throttledMessages: 0,
            groupedMessages: 0
        };
    }

    /**
     * Force flush all grouped messages
     */
    flushAllGroups() {
        const groupKeys = Array.from(this.groupedMessages.keys());
        groupKeys.forEach(groupKey => this.flushGroup(groupKey));
    }

    /**
     * Create a scoped logger with a prefix
     * @param {string} prefix - Prefix for all log keys
     * @returns {Object} Scoped logger object
     */
    createScopedLogger(prefix) {
        return {
            error: (key, message, options) => this.error(`${prefix}.${key}`, message, options),
            warn: (key, message, options) => this.warn(`${prefix}.${key}`, message, options),
            info: (key, message, options) => this.info(`${prefix}.${key}`, message, options),
            debug: (key, message, options) => this.debug(`${prefix}.${key}`, message, options),
            log: (key, message, level, options) => this.throttledLog(`${prefix}.${key}`, message, level, options)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogThrottler;
} else {
    window.LogThrottler = LogThrottler;
}