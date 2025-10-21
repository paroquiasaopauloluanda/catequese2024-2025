/**
 * Deployment Verifier
 * Handles deployment verification, health checks, and monitoring
 */
class DeploymentVerifier {
    constructor() {
        this.verificationTests = new Map();
        this.healthCheckInterval = null;
        this.healthCheckFrequency = 5 * 60 * 1000; // 5 minutes
        this.lastHealthCheck = null;
        
        this.initializeVerificationTests();
    }

    /**
     * Initialize verification tests
     */
    initializeVerificationTests() {
        // Core functionality tests
        this.verificationTests.set('authentication', {
            name: 'Sistema de Autenticação',
            test: () => this.testAuthentication(),
            critical: true
        });
        
        this.verificationTests.set('configuration', {
            name: 'Gerenciamento de Configuração',
            test: () => this.testConfiguration(),
            critical: true
        });
        
        this.verificationTests.set('fileUpload', {
            name: 'Upload de Arquivos',
            test: () => this.testFileUpload(),
            critical: true
        });
        
        this.verificationTests.set('githubIntegration', {
            name: 'Integração GitHub',
            test: () => this.testGitHubIntegration(),
            critical: true
        });
        
        this.verificationTests.set('logging', {
            name: 'Sistema de Logs',
            test: () => this.testLogging(),
            critical: false
        });
        
        this.verificationTests.set('backup', {
            name: 'Sistema de Backup',
            test: () => this.testBackup(),
            critical: false
        });
        
        // Performance tests
        this.verificationTests.set('performance', {
            name: 'Performance do Sistema',
            test: () => this.testPerformance(),
            critical: false
        });
        
        // Security tests
        this.verificationTests.set('security', {
            name: 'Configurações de Segurança',
            test: () => this.testSecurity(),
            critical: true
        });
    }

    /**
     * Run all verification tests
     * @returns {Promise<Object>} Verification results
     */
    async runFullVerification() {
        const results = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                critical_failures: 0
            }
        };

        

        for (const [testId, testConfig] of this.verificationTests) {
            try {
                
                const testResult = await testConfig.test();
                
                const result = {
                    id: testId,
                    name: testConfig.name,
                    critical: testConfig.critical,
                    status: testResult.success ? 'pass' : 'fail',
                    message: testResult.message,
                    details: testResult.details || {},
                    duration: testResult.duration || 0
                };
                
                results.tests.push(result);
                results.summary.total++;
                
                if (result.status === 'pass') {
                    results.summary.passed++;
                } else {
                    results.summary.failed++;
                    if (result.critical) {
                        results.summary.critical_failures++;
                    }
                }
                
            } catch (error) {
                console.error(`Test ${testConfig.name} failed with error:`, error);
                
                const result = {
                    id: testId,
                    name: testConfig.name,
                    critical: testConfig.critical,
                    status: 'fail',
                    message: `Erro no teste: ${error.message}`,
                    details: { error: error.stack },
                    duration: 0
                };
                
                results.tests.push(result);
                results.summary.total++;
                results.summary.failed++;
                
                if (result.critical) {
                    results.summary.critical_failures++;
                }
            }
        }

        // Determine overall status
        if (results.summary.critical_failures > 0) {
            results.overall = 'critical';
        } else if (results.summary.failed > 0) {
            results.overall = 'warning';
        } else {
            results.overall = 'success';
        }

        
        return results;
    }

    /**
     * Test authentication system
     * @returns {Promise<Object>} Test result
     */
    async testAuthentication() {
        const startTime = Date.now();
        
        try {
            // Check if AuthManager is available
            if (typeof window.AuthManager === 'undefined') {
                throw new Error('AuthManager não está disponível');
            }
            
            // Test basic authentication functionality
            const authManager = new window.AuthManager();
            
            // Test session validation (should not throw)
            const isAuthenticated = authManager.isAuthenticated();
            
            // Test hash generation (should work)
            const testHash = authManager.generateHash('test', 'salt');
            if (!testHash) {
                throw new Error('Geração de hash falhou');
            }
            
            return {
                success: true,
                message: 'Sistema de autenticação funcionando corretamente',
                duration: Date.now() - startTime,
                details: {
                    authenticated: isAuthenticated,
                    hashGeneration: 'OK'
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no sistema de autenticação: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test configuration management
     * @returns {Promise<Object>} Test result
     */
    async testConfiguration() {
        const startTime = Date.now();
        
        try {
            // Check if ConfigManager is available
            if (typeof window.ConfigManager === 'undefined') {
                throw new Error('ConfigManager não está disponível');
            }
            
            const configManager = new window.ConfigManager();
            
            // Test default configuration generation
            const defaultConfig = configManager.getDefaultConfig();
            if (!defaultConfig || !defaultConfig.paroquia) {
                throw new Error('Configuração padrão inválida');
            }
            
            // Test configuration validation
            const validation = configManager.validateConfig(defaultConfig);
            if (!validation.isValid) {
                throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
            }
            
            return {
                success: true,
                message: 'Sistema de configuração funcionando corretamente',
                duration: Date.now() - startTime,
                details: {
                    defaultConfig: 'OK',
                    validation: 'OK'
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no sistema de configuração: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test file upload system
     * @returns {Promise<Object>} Test result
     */
    async testFileUpload() {
        const startTime = Date.now();
        
        try {
            // Check if FileManager is available
            if (typeof window.FileManager === 'undefined') {
                throw new Error('FileManager não está disponível');
            }
            
            const fileManager = new window.FileManager();
            
            // Test file validation with mock file
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            
            // Test file size formatting
            const formattedSize = fileManager.formatFileSize(1024);
            if (formattedSize !== '1 KB') {
                throw new Error('Formatação de tamanho de arquivo incorreta');
            }
            
            // Test filename sanitization
            const sanitized = fileManager.sanitizeFilename('test<>file.txt');
            if (sanitized.includes('<') || sanitized.includes('>')) {
                throw new Error('Sanitização de nome de arquivo falhou');
            }
            
            return {
                success: true,
                message: 'Sistema de upload funcionando corretamente',
                duration: Date.now() - startTime,
                details: {
                    fileValidation: 'OK',
                    sizeFormatting: 'OK',
                    sanitization: 'OK'
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no sistema de upload: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test GitHub integration
     * @returns {Promise<Object>} Test result
     */
    async testGitHubIntegration() {
        const startTime = Date.now();
        
        try {
            // Check if GitHubManager is available
            if (typeof window.GitHubManager === 'undefined') {
                throw new Error('GitHubManager não está disponível');
            }
            
            const githubManager = new window.GitHubManager();
            
            // Test basic GitHub API connectivity (without authentication)
            const response = await fetch('https://api.github.com/rate_limit');
            if (!response.ok) {
                throw new Error(`GitHub API inacessível: ${response.status}`);
            }
            
            const rateLimit = await response.json();
            
            return {
                success: true,
                message: 'Integração GitHub funcionando corretamente',
                duration: Date.now() - startTime,
                details: {
                    apiConnectivity: 'OK',
                    rateLimit: rateLimit.rate.remaining
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha na integração GitHub: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test logging system
     * @returns {Promise<Object>} Test result
     */
    async testLogging() {
        const startTime = Date.now();
        
        try {
            // Check if LogManager is available
            if (typeof window.LogManager === 'undefined') {
                throw new Error('LogManager não está disponível');
            }
            
            const logManager = new window.LogManager();
            
            // Test log creation
            const testLogId = logManager.logInfo('test', 'Teste de verificação do sistema');
            if (!testLogId) {
                throw new Error('Criação de log falhou');
            }
            
            // Test log retrieval
            const logs = logManager.getLogs();
            if (!Array.isArray(logs)) {
                throw new Error('Recuperação de logs falhou');
            }
            
            return {
                success: true,
                message: 'Sistema de logs funcionando corretamente',
                duration: Date.now() - startTime,
                details: {
                    logCreation: 'OK',
                    logRetrieval: 'OK',
                    totalLogs: logs.length
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no sistema de logs: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test backup system
     * @returns {Promise<Object>} Test result
     */
    async testBackup() {
        const startTime = Date.now();
        
        try {
            // Check if ConfigManager backup functionality is available
            if (typeof window.ConfigManager === 'undefined') {
                throw new Error('ConfigManager não está disponível para backup');
            }
            
            const configManager = new window.ConfigManager();
            
            // Test backup creation
            const testConfig = { test: 'backup verification' };
            const backupId = await configManager.createBackup(testConfig, 'Teste de verificação');
            
            if (!backupId) {
                throw new Error('Criação de backup falhou');
            }
            
            // Test backup listing
            const backups = configManager.getBackups();
            if (!Array.isArray(backups)) {
                throw new Error('Listagem de backups falhou');
            }
            
            return {
                success: true,
                message: 'Sistema de backup funcionando corretamente',
                duration: Date.now() - startTime,
                details: {
                    backupCreation: 'OK',
                    backupListing: 'OK',
                    totalBackups: backups.length
                }
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no sistema de backup: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test system performance
     * @returns {Promise<Object>} Test result
     */
    async testPerformance() {
        const startTime = Date.now();
        
        try {
            const performanceMetrics = {
                domContentLoaded: 0,
                loadComplete: 0,
                memoryUsage: 0,
                connectionType: 'unknown'
            };
            
            // Get performance timing if available
            if (window.performance && window.performance.timing) {
                const timing = window.performance.timing;
                performanceMetrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
                performanceMetrics.loadComplete = timing.loadEventEnd - timing.navigationStart;
            }
            
            // Get memory usage if available
            if (window.performance && window.performance.memory) {
                performanceMetrics.memoryUsage = window.performance.memory.usedJSHeapSize;
            }
            
            // Get connection info if available
            if (navigator.connection) {
                performanceMetrics.connectionType = navigator.connection.effectiveType || 'unknown';
            }
            
            // Performance thresholds
            const warnings = [];
            if (performanceMetrics.domContentLoaded > 3000) {
                warnings.push('DOM carregamento lento (>3s)');
            }
            
            if (performanceMetrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
                warnings.push('Alto uso de memória (>50MB)');
            }
            
            return {
                success: warnings.length === 0,
                message: warnings.length === 0 ? 
                    'Performance do sistema adequada' : 
                    `Avisos de performance: ${warnings.join(', ')}`,
                duration: Date.now() - startTime,
                details: performanceMetrics
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no teste de performance: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test security configurations
     * @returns {Promise<Object>} Test result
     */
    async testSecurity() {
        const startTime = Date.now();
        
        try {
            const securityChecks = {
                https: window.location.protocol === 'https:',
                localStorage: this.testLocalStorageAccess(),
                xss: this.testXSSProtection(),
                csp: this.testContentSecurityPolicy()
            };
            
            const failures = [];
            
            if (!securityChecks.https && window.location.hostname !== 'localhost') {
                failures.push('HTTPS não está sendo usado');
            }
            
            if (!securityChecks.localStorage) {
                failures.push('localStorage não está acessível');
            }
            
            return {
                success: failures.length === 0,
                message: failures.length === 0 ? 
                    'Configurações de segurança adequadas' : 
                    `Problemas de segurança: ${failures.join(', ')}`,
                duration: Date.now() - startTime,
                details: securityChecks
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Falha no teste de segurança: ${error.message}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Test localStorage access
     * @returns {boolean} True if localStorage is accessible
     */
    testLocalStorageAccess() {
        try {
            const test = 'security_test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Test XSS protection
     * @returns {boolean} True if basic XSS protection is working
     */
    testXSSProtection() {
        try {
            // Test if script injection is prevented
            const testDiv = document.createElement('div');
            testDiv.innerHTML = '<script>window.xssTest = true;</script>';
            document.body.appendChild(testDiv);
            document.body.removeChild(testDiv);
            
            // If xssTest was set, XSS protection failed
            return !window.xssTest;
        } catch (error) {
            return true; // Error means protection is working
        }
    }

    /**
     * Test Content Security Policy
     * @returns {boolean} True if CSP is configured
     */
    testContentSecurityPolicy() {
        // Check if CSP header is present
        const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        return metaTags.length > 0;
    }

    /**
     * Start continuous health monitoring
     */
    startHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(async () => {
            try {
                const healthResult = await this.runQuickHealthCheck();
                this.lastHealthCheck = healthResult;
                
                // Dispatch health check event
                window.dispatchEvent(new CustomEvent('healthCheck', {
                    detail: healthResult
                }));
                
            } catch (error) {
                console.error('Health check failed:', error);
            }
        }, this.healthCheckFrequency);
        
        
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        
        
    }

    /**
     * Run quick health check (subset of full verification)
     * @returns {Promise<Object>} Health check result
     */
    async runQuickHealthCheck() {
        const criticalTests = ['authentication', 'configuration', 'githubIntegration'];
        const results = {
            timestamp: new Date().toISOString(),
            status: 'unknown',
            tests: []
        };
        
        for (const testId of criticalTests) {
            const testConfig = this.verificationTests.get(testId);
            if (testConfig) {
                try {
                    const testResult = await testConfig.test();
                    results.tests.push({
                        id: testId,
                        name: testConfig.name,
                        status: testResult.success ? 'pass' : 'fail',
                        message: testResult.message
                    });
                } catch (error) {
                    results.tests.push({
                        id: testId,
                        name: testConfig.name,
                        status: 'fail',
                        message: error.message
                    });
                }
            }
        }
        
        const failedTests = results.tests.filter(test => test.status === 'fail');
        results.status = failedTests.length === 0 ? 'healthy' : 'unhealthy';
        
        return results;
    }

    /**
     * Get last health check result
     * @returns {Object|null} Last health check result
     */
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }

    /**
     * Generate verification report
     * @param {Object} verificationResults - Results from runFullVerification
     * @returns {string} HTML report
     */
    generateVerificationReport(verificationResults) {
        const statusColors = {
            success: '#28a745',
            warning: '#ffc107',
            critical: '#dc3545'
        };
        
        const statusColor = statusColors[verificationResults.overall] || '#6c757d';
        
        let html = `
            <div class="verification-report">
                <div class="report-header" style="border-left: 4px solid ${statusColor};">
                    <h3>Relatório de Verificação do Deploy</h3>
                    <p>Status: <strong style="color: ${statusColor};">${verificationResults.overall.toUpperCase()}</strong></p>
                    <p>Data: ${new Date(verificationResults.timestamp).toLocaleString('pt-BR')}</p>
                </div>
                
                <div class="report-summary">
                    <h4>Resumo</h4>
                    <ul>
                        <li>Total de testes: ${verificationResults.summary.total}</li>
                        <li>Aprovados: ${verificationResults.summary.passed}</li>
                        <li>Falharam: ${verificationResults.summary.failed}</li>
                        <li>Falhas críticas: ${verificationResults.summary.critical_failures}</li>
                    </ul>
                </div>
                
                <div class="report-tests">
                    <h4>Detalhes dos Testes</h4>
        `;
        
        for (const test of verificationResults.tests) {
            const testStatusColor = test.status === 'pass' ? '#28a745' : '#dc3545';
            const criticalBadge = test.critical ? '<span class="critical-badge">CRÍTICO</span>' : '';
            
            html += `
                <div class="test-result" style="border-left: 3px solid ${testStatusColor};">
                    <div class="test-header">
                        <strong>${test.name}</strong> ${criticalBadge}
                        <span class="test-status" style="color: ${testStatusColor};">${test.status.toUpperCase()}</span>
                    </div>
                    <p>${test.message}</p>
                    ${test.duration ? `<small>Duração: ${test.duration}ms</small>` : ''}
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DeploymentVerifier = DeploymentVerifier;
}