/**
 * TypeScript-style interfaces defined as JSDoc comments for JavaScript
 * These interfaces define the data models used throughout the admin panel
 */

/**
 * @typedef {Object} ParoquiaConfig
 * @property {string} nome - Nome da paróquia
 * @property {string} secretariado - Nome do secretariado
 * @property {string} ano_catequetico - Ano catequético atual
 * @property {string} data_inicio - Data de início (ISO format)
 * @property {string} data_inicio_formatada - Data formatada para exibição
 */

/**
 * @typedef {Object} ArquivosConfig
 * @property {string} dados_principais - Caminho para o arquivo de dados principais
 * @property {string} template_export - Caminho para o template de exportação
 * @property {string} logo - Caminho para o logotipo
 */

/**
 * @typedef {Object} GitHubConfig
 * @property {string} repository - Nome do repositório GitHub
 * @property {string} branch - Branch principal
 * @property {string} token - Token de acesso (criptografado)
 */

/**
 * @typedef {Object} ValidacaoConfig
 * @property {string[]} campos_obrigatorios - Lista de campos obrigatórios
 */

/**
 * @typedef {Object} ExportacaoConfig
 * @property {string} nome_arquivo_padrao - Nome padrão para arquivos exportados
 */

/**
 * @typedef {Object} SettingsConfig
 * @property {ParoquiaConfig} paroquia - Configurações da paróquia
 * @property {ArquivosConfig} arquivos - Configurações de arquivos
 * @property {GitHubConfig} github - Configurações do GitHub
 * @property {ValidacaoConfig} validacao - Configurações de validação
 * @property {ExportacaoConfig} exportacao - Configurações de exportação
 */

/**
 * @typedef {Object} SessionData
 * @property {boolean} authenticated - Status de autenticação
 * @property {number} loginTime - Timestamp do login
 * @property {number} lastActivity - Timestamp da última atividade
 * @property {string} sessionId - ID único da sessão
 */

/**
 * @typedef {Object} OperationLog
 * @property {string} id - ID único da operação
 * @property {string} timestamp - Data/hora da operação
 * @property {string} type - Tipo de operação (config, upload, backup, etc.)
 * @property {'success'|'error'|'pending'} status - Status da operação
 * @property {string} details - Detalhes da operação
 * @property {string[]} files - Arquivos envolvidos na operação
 * @property {number} duration - Duração da operação em ms
 */

/**
 * @typedef {Object} FileUploadData
 * @property {File} file - Arquivo selecionado
 * @property {'excel'|'image'|'template'} type - Tipo do arquivo
 * @property {string} targetPath - Caminho de destino no repositório
 * @property {boolean} isValid - Se o arquivo passou na validação
 * @property {string[]} errors - Lista de erros de validação
 */

/**
 * @typedef {Object} ProgressState
 * @property {string} operationId - ID da operação
 * @property {number} percentage - Percentual de conclusão (0-100)
 * @property {string} message - Mensagem atual do progresso
 * @property {'idle'|'running'|'completed'|'error'} status - Status da operação
 * @property {string|null} error - Mensagem de erro, se houver
 */

/**
 * @typedef {Object} BackupData
 * @property {string} id - ID único do backup
 * @property {string} timestamp - Data/hora do backup
 * @property {SettingsConfig} config - Configuração salva no backup
 * @property {string} description - Descrição do backup
 * @property {number} size - Tamanho do backup em bytes
 */

/**
 * @typedef {Object} GitHubCommitData
 * @property {string} path - Caminho do arquivo no repositório
 * @property {string} content - Conteúdo do arquivo (base64 para binários)
 * @property {string} message - Mensagem do commit
 * @property {string} sha - SHA do arquivo atual (para updates)
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Se a validação passou
 * @property {string[]} errors - Lista de erros encontrados
 * @property {string[]} warnings - Lista de avisos
 */

/**
 * @typedef {Object} NotificationData
 * @property {string} id - ID único da notificação
 * @property {'success'|'error'|'warning'|'info'} type - Tipo da notificação
 * @property {string} title - Título da notificação
 * @property {string} message - Mensagem da notificação
 * @property {number} duration - Duração em ms (0 = permanente)
 * @property {boolean} dismissible - Se pode ser fechada pelo usuário
 */

/**
 * @typedef {Object} AuthCredentials
 * @property {string} username - Nome de usuário
 * @property {string} password - Senha
 */

/**
 * @typedef {Object} SecurityConfig
 * @property {number} sessionTimeout - Timeout da sessão em ms
 * @property {number} maxLoginAttempts - Máximo de tentativas de login
 * @property {number} lockoutDuration - Duração do bloqueio em ms
 * @property {boolean} requireReauth - Se requer reautenticação para operações sensíveis
 */

// Export interfaces for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Type definitions are available through JSDoc comments
        // No runtime exports needed for type-only interfaces
    };
}

// Global type validation functions
window.TypeValidators = {
    /**
     * Validates if an object matches the SettingsConfig interface
     * @param {any} obj - Object to validate
     * @returns {ValidationResult}
     */
    validateSettingsConfig(obj) {
        const errors = [];
        
        if (!obj || typeof obj !== 'object') {
            errors.push('Configuração deve ser um objeto válido');
            return { isValid: false, errors, warnings: [] };
        }

        // Validate paroquia section
        if (!obj.paroquia || typeof obj.paroquia !== 'object') {
            errors.push('Seção "paroquia" é obrigatória');
        } else {
            if (!obj.paroquia.nome || typeof obj.paroquia.nome !== 'string') {
                errors.push('Nome da paróquia é obrigatório');
            }
            if (!obj.paroquia.secretariado || typeof obj.paroquia.secretariado !== 'string') {
                errors.push('Secretariado é obrigatório');
            }
            if (!obj.paroquia.ano_catequetico || typeof obj.paroquia.ano_catequetico !== 'string') {
                errors.push('Ano catequético é obrigatório');
            }
        }

        // Validate arquivos section
        if (!obj.arquivos || typeof obj.arquivos !== 'object') {
            errors.push('Seção "arquivos" é obrigatória');
        }

        // Validate github section
        if (!obj.github || typeof obj.github !== 'object') {
            errors.push('Seção "github" é obrigatória');
        } else {
            if (!obj.github.repository || typeof obj.github.repository !== 'string') {
                errors.push('Repositório GitHub é obrigatório');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    },

    /**
     * Validates if an object matches the SessionData interface
     * @param {any} obj - Object to validate
     * @returns {ValidationResult}
     */
    validateSessionData(obj) {
        const errors = [];
        
        if (!obj || typeof obj !== 'object') {
            errors.push('Dados de sessão devem ser um objeto válido');
            return { isValid: false, errors, warnings: [] };
        }

        if (typeof obj.authenticated !== 'boolean') {
            errors.push('Campo "authenticated" deve ser boolean');
        }
        
        if (typeof obj.loginTime !== 'number') {
            errors.push('Campo "loginTime" deve ser um timestamp válido');
        }
        
        if (typeof obj.lastActivity !== 'number') {
            errors.push('Campo "lastActivity" deve ser um timestamp válido');
        }
        
        if (!obj.sessionId || typeof obj.sessionId !== 'string') {
            errors.push('Campo "sessionId" é obrigatório');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: []
        };
    }
};