/**
 * Deployment Manager
 * Handles deployment configuration, environment variables, and deployment verification
 */
class DeploymentManager {
    constructor() {
        this.environments = {
            development: {
                name: 'Desenvolvimento',
                githubPages: false,
                baseUrl: 'http://localhost:3000',
                apiEndpoints: {
                    github: 'https://api.github.com'
                },
                features: {
                    debugging: true,
                    analytics: false,
                    errorReporting: false
                }
            },
            staging: {
                name: 'Homologação',
                githubPages: true,
                baseUrl: 'https://username.github.io/repo-name',
                apiEndpoints: {
                    github: 'https://api.github.com'
                },
                features: {
                    debugging: true,
                    analytics: false,
                    errorReporting: true
                }
            },
            production: {
                name: 'Produção',
                githubPages: true,
                baseUrl: 'https://paroquia.github.io/sistema-catequese',
                apiEndpoints: {
                    github: 'https://api.github.com'
                },
                features: {
                    debugging: false,
                    analytics: true,
                    errorReporting: true
                }
            }
        };
        
        this.currentEnvironment = this.detectEnvironment();
        this.deploymentConfig = null;
        this.environmentVariables = new Map();
        
        this.initializeEnvironmentVariables();
    }

    /**
     * Detect current environment based on URL and configuration
     * @returns {string} Environment name
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1' || protocol === 'file:') {
            return 'development';
        }
        
        // GitHub Pages detection
        if (hostname.includes('github.io')) {
            // Check if it's a staging branch or production
            const pathname = window.location.pathname;
            if (pathname.includes('/staging/') || pathname.includes('/dev/')) {
                return 'staging';
            }
            return 'production';
        }
        
        // Custom domain (assume production)
        return 'production';
    }

    /**
     * Initialize environment variables
     */
    initializeEnvironmentVariables() {
        const env = this.environments[this.currentEnvironment];
        
        // Set basic environment variables
        this.setEnvironmentVariable('NODE_ENV', this.currentEnvironment);
        this.setEnvironmentVariable('BASE_URL', env.baseUrl);
        this.setEnvironmentVariable('GITHUB_API_URL', env.apiEndpoints.github);
        this.setEnvironmentVariable('GITHUB_PAGES_ENABLED', env.githubPages.toString());
        
        // Feature flags
        Object.entries(env.features).forEach(([feature, enabled]) => {
            this.setEnvironmentVariable(`FEATURE_${feature.toUpperCase()}`, enabled.toString());
        });
        
        // GitHub-specific variables
        this.setEnvironmentVariable('GITHUB_REPOSITORY', this.getRepositoryFromUrl());
        this.setEnvironmentVariable('GITHUB_BRANCH', this.getBranchFromUrl());
        
        console.log(`Environment detected: ${this.currentEnvironment}`);
        console.log('Environment variables initialized:', Object.fromEntries(this.environmentVariables));
    }

    /**
     * Get repository name from current URL
     * @returns {string} Repository name in format "owner/repo"
     */
    getRepositoryFromUrl() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        
        if (hostname.includes('github.io')) {
            const parts = hostname.split('.');
            const owner = parts[0];
            
            // Extract repo name from pathname
            const pathParts = pathname.split('/').filter(p => p);
            const repo = pathParts[0] || 'github.io';
            
            return `${owner}/${repo}`;
        }
        
        // Default fallback
        return 'paroquia/sistema-catequese';
    }

    /**
     * Get branch name from URL or default
     * @returns {string} Branch name
     */
    getBranchFromUrl() {
        const pathname = window.location.pathname;
        
        if (pathname.includes('/staging/')) {
            return 'staging';
        }
        
        if (pathname.includes('/dev/')) {
            return 'development';
        }
        
        return 'main';
    }

    /**
     * Set environment variable
     * @param {string} key - Variable key
     * @param {string} value - Variable value
     */
    setEnvironmentVariable(key, value) {
        this.environmentVariables.set(key, value);
    }

    /**
     * Get environment variable
     * @param {string} key - Variable key
     * @param {string} defaultValue - Default value if not found
     * @returns {string} Variable value
     */
    getEnvironmentVariable(key, defaultValue = null) {
        return this.environmentVariables.get(key) || defaultValue;
    }

    /**
     * Get all environment variables
     * @returns {Object} All environment variables
     */
    getAllEnvironmentVariables() {
        return Object.fromEntries(this.environmentVariables);
    }

    /**
     * Create production build configuration
     * @returns {Object} Production build configuration
     */
    createProductionBuildConfig() {
        const config = {
            environment: 'production',
            timestamp: new Date().toISOString(),
            version: this.getVersion(),
            build: {
                minify: true,
                sourceMaps: false,
                optimization: true,
                compression: true
            },
            github: {
                repository: this.getEnvironmentVariable('GITHUB_REPOSITORY'),
                branch: 'main',
                pagesEnabled: true,
                customDomain: null
            },
            features: {
                debugging: false,
                analytics: true,
                errorReporting: true,
                performanceMonitoring: true
            },
            security: {
                contentSecurityPolicy: true,
                httpsOnly: true,
                secureHeaders: true
            },
            performance: {
                caching: true,
                compression: true,
                lazyLoading: true,
                imageOptimization: true
            }
        };
        
        return config;
    }

    /**
     * Create staging build configuration
     * @returns {Object} Staging build configuration
     */
    createStagingBuildConfig() {
        const config = {
            environment: 'staging',
            timestamp: new Date().toISOString(),
            version: this.getVersion(),
            build: {
                minify: false,
                sourceMaps: true,
                optimization: false,
                compression: false
            },
            github: {
                repository: this.getEnvironmentVariable('GITHUB_REPOSITORY'),
                branch: 'staging',
                pagesEnabled: true,
                customDomain: null
            },
            features: {
                debugging: true,
                analytics: false,
                errorReporting: true,
                performanceMonitoring: false
            },
            security: {
                contentSecurityPolicy: false,
                httpsOnly: false,
                secureHeaders: false
            },
            performance: {
                caching: false,
                compression: false,
                lazyLoading: false,
                imageOptimization: false
            }
        };
        
        return config;
    }

    /**
     * Get application version
     * @returns {string} Application version
     */
    getVersion() {
        // Try to get version from package.json or use timestamp-based version
        const timestamp = Date.now();
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        return `1.0.${date}.${timestamp % 10000}`;
    }

    /**
     * Verify deployment configuration
     * @param {Object} config - Configuration to verify
     * @returns {Object} Verification result
     */
    verifyDeploymentConfig(config) {
        const errors = [];
        const warnings = [];
        
        // Required fields validation
        if (!config.environment) {
            errors.push('Environment não especificado');
        }
        
        if (!config.github || !config.github.repository) {
            errors.push('Repositório GitHub não configurado');
        }
        
        if (!config.github || !config.github.branch) {
            errors.push('Branch não especificado');
        }
        
        // Environment-specific validations
        if (config.environment === 'production') {
            if (config.features && config.features.debugging) {
                warnings.push('Debug habilitado em produção');
            }
            
            if (!config.security || !config.security.httpsOnly) {
                warnings.push('HTTPS não obrigatório em produção');
            }
            
            if (!config.build || !config.build.minify) {
                warnings.push('Minificação desabilitada em produção');
            }
        }
        
        // GitHub Pages specific validations
        if (config.github && config.github.pagesEnabled) {
            if (!config.github.repository.includes('/')) {
                errors.push('Formato do repositório inválido (deve ser owner/repo)');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Generate deployment manifest
     * @returns {Object} Deployment manifest
     */
    generateDeploymentManifest() {
        const manifest = {
            version: this.getVersion(),
            environment: this.currentEnvironment,
            timestamp: new Date().toISOString(),
            build: {
                date: new Date().toISOString(),
                commit: this.getCommitHash(),
                branch: this.getEnvironmentVariable('GITHUB_BRANCH'),
                repository: this.getEnvironmentVariable('GITHUB_REPOSITORY')
            },
            runtime: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            features: this.getEnabledFeatures(),
            dependencies: this.getDependencies()
        };
        
        return manifest;
    }

    /**
     * Get current commit hash (simulated)
     * @returns {string} Commit hash
     */
    getCommitHash() {
        // In a real deployment, this would be injected during build
        // For now, generate a pseudo-hash based on timestamp
        const timestamp = Date.now().toString();
        let hash = 0;
        for (let i = 0; i < timestamp.length; i++) {
            const char = timestamp.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    /**
     * Get enabled features for current environment
     * @returns {Array} List of enabled features
     */
    getEnabledFeatures() {
        const features = [];
        const env = this.environments[this.currentEnvironment];
        
        Object.entries(env.features).forEach(([feature, enabled]) => {
            if (enabled) {
                features.push(feature);
            }
        });
        
        return features;
    }

    /**
     * Get application dependencies
     * @returns {Object} Dependencies information
     */
    getDependencies() {
        return {
            browser: {
                name: this.getBrowserName(),
                version: this.getBrowserVersion(),
                engine: this.getBrowserEngine()
            },
            apis: {
                github: 'v3/v4',
                fetch: 'native',
                localStorage: 'native',
                fileReader: 'native'
            }
        };
    }

    /**
     * Get browser name
     * @returns {string} Browser name
     */
    getBrowserName() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        
        return 'Unknown';
    }

    /**
     * Get browser version
     * @returns {string} Browser version
     */
    getBrowserVersion() {
        const userAgent = navigator.userAgent;
        const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
        
        return match ? match[2] : 'Unknown';
    }

    /**
     * Get browser engine
     * @returns {string} Browser engine
     */
    getBrowserEngine() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('WebKit')) return 'WebKit';
        if (userAgent.includes('Gecko')) return 'Gecko';
        if (userAgent.includes('Trident')) return 'Trident';
        
        return 'Unknown';
    }

    /**
     * Verify deployment health
     * @returns {Promise<Object>} Health check result
     */
    async verifyDeploymentHealth() {
        const checks = [];
        
        try {
            // Check if all required scripts are loaded
            const requiredClasses = [
                'AuthManager', 'ConfigManager', 'FileManager', 
                'GitHubManager', 'FileOptimizer', 'GitHubOptimizer'
            ];
            
            for (const className of requiredClasses) {
                checks.push({
                    name: `${className} loaded`,
                    status: typeof window[className] !== 'undefined' ? 'pass' : 'fail',
                    message: typeof window[className] !== 'undefined' ? 'OK' : 'Class not found'
                });
            }
            
            // Check localStorage availability
            checks.push({
                name: 'localStorage available',
                status: this.checkLocalStorage() ? 'pass' : 'fail',
                message: this.checkLocalStorage() ? 'OK' : 'localStorage not available'
            });
            
            // Check GitHub API connectivity (if in production)
            if (this.currentEnvironment === 'production') {
                const githubCheck = await this.checkGitHubAPI();
                checks.push({
                    name: 'GitHub API connectivity',
                    status: githubCheck.success ? 'pass' : 'warn',
                    message: githubCheck.message
                });
            }
            
            // Check environment configuration
            const envCheck = this.verifyEnvironmentConfig();
            checks.push({
                name: 'Environment configuration',
                status: envCheck.isValid ? 'pass' : 'fail',
                message: envCheck.isValid ? 'OK' : envCheck.errors.join(', ')
            });
            
            const failedChecks = checks.filter(check => check.status === 'fail');
            const warningChecks = checks.filter(check => check.status === 'warn');
            
            return {
                healthy: failedChecks.length === 0,
                status: failedChecks.length === 0 ? 'healthy' : 'unhealthy',
                checks,
                summary: {
                    total: checks.length,
                    passed: checks.filter(c => c.status === 'pass').length,
                    failed: failedChecks.length,
                    warnings: warningChecks.length
                }
            };
            
        } catch (error) {
            return {
                healthy: false,
                status: 'error',
                error: error.message,
                checks: []
            };
        }
    }

    /**
     * Check localStorage availability
     * @returns {boolean} True if localStorage is available
     */
    checkLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check GitHub API connectivity
     * @returns {Promise<Object>} API check result
     */
    async checkGitHubAPI() {
        try {
            const response = await fetch('https://api.github.com/rate_limit', {
                method: 'GET',
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                return {
                    success: true,
                    message: 'GitHub API accessible'
                };
            } else {
                return {
                    success: false,
                    message: `GitHub API returned ${response.status}`
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `GitHub API error: ${error.message}`
            };
        }
    }

    /**
     * Verify environment configuration
     * @returns {Object} Environment verification result
     */
    verifyEnvironmentConfig() {
        const errors = [];
        
        // Check required environment variables
        const requiredVars = ['NODE_ENV', 'BASE_URL', 'GITHUB_API_URL'];
        
        for (const varName of requiredVars) {
            if (!this.getEnvironmentVariable(varName)) {
                errors.push(`Missing environment variable: ${varName}`);
            }
        }
        
        // Check environment consistency
        const nodeEnv = this.getEnvironmentVariable('NODE_ENV');
        if (nodeEnv !== this.currentEnvironment) {
            errors.push(`Environment mismatch: NODE_ENV=${nodeEnv}, detected=${this.currentEnvironment}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get current environment information
     * @returns {Object} Environment information
     */
    getCurrentEnvironment() {
        return {
            name: this.currentEnvironment,
            config: this.environments[this.currentEnvironment],
            variables: this.getAllEnvironmentVariables(),
            manifest: this.generateDeploymentManifest()
        };
    }

    /**
     * Export deployment configuration
     * @returns {string} JSON configuration
     */
    exportDeploymentConfig() {
        const config = {
            environment: this.currentEnvironment,
            timestamp: new Date().toISOString(),
            configuration: this.environments[this.currentEnvironment],
            variables: this.getAllEnvironmentVariables(),
            manifest: this.generateDeploymentManifest()
        };
        
        return JSON.stringify(config, null, 2);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DeploymentManager = DeploymentManager;
}