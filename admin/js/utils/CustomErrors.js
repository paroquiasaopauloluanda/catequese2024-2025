/**
 * Custom Error Classes
 * Specific error types for better error handling and user feedback
 */

/**
 * Base application error
 */
class AppError extends Error {
    constructor(message, code = null, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Authentication related errors
 */
class AuthenticationError extends AppError {
    constructor(message, code = 'AUTH_ERROR', details = null) {
        super(message, code, details);
    }
}

/**
 * Session expired error
 */
class SessionExpiredError extends AuthenticationError {
    constructor(message = 'Sua sessão expirou. Faça login novamente.') {
        super(message, 'SESSION_EXPIRED');
    }
}

/**
 * Invalid credentials error
 */
class InvalidCredentialsError extends AuthenticationError {
    constructor(message = 'Credenciais inválidas. Verifique usuário e senha.') {
        super(message, 'INVALID_CREDENTIALS');
    }
}

/**
 * Account locked error
 */
class AccountLockedError extends AuthenticationError {
    constructor(message = 'Conta temporariamente bloqueada devido a múltiplas tentativas.', lockoutTime = null) {
        super(message, 'ACCOUNT_LOCKED', { lockoutTime });
    }
}

/**
 * Validation related errors
 */
class ValidationError extends AppError {
    constructor(message, field = null, value = null) {
        super(message, 'VALIDATION_ERROR', { field, value });
    }
}

/**
 * Required field error
 */
class RequiredFieldError extends ValidationError {
    constructor(field, message = null) {
        const defaultMessage = `Campo obrigatório não preenchido: ${field}`;
        super(message || defaultMessage, 'REQUIRED_FIELD', field);
        this.field = field;
    }
}

/**
 * Invalid format error
 */
class InvalidFormatError extends ValidationError {
    constructor(field, expectedFormat, actualValue = null) {
        const message = `Formato inválido para ${field}. Esperado: ${expectedFormat}`;
        super(message, 'INVALID_FORMAT', { field, expectedFormat, actualValue });
        this.field = field;
        this.expectedFormat = expectedFormat;
    }
}

/**
 * Network related errors
 */
class NetworkError extends AppError {
    constructor(message, statusCode = null, url = null) {
        super(message, 'NETWORK_ERROR', { statusCode, url });
        this.statusCode = statusCode;
        this.url = url;
    }
}

/**
 * Timeout error
 */
class TimeoutError extends NetworkError {
    constructor(message = 'Operação demorou muito para responder. Tente novamente.', timeout = null) {
        super(message, 'TIMEOUT', { timeout });
    }
}

/**
 * Offline error
 */
class OfflineError extends NetworkError {
    constructor(message = 'Você está offline. Verifique sua conexão.') {
        super(message, 'OFFLINE');
    }
}

/**
 * File upload related errors
 */
class FileUploadError extends AppError {
    constructor(message, fileName = null, fileSize = null) {
        super(message, 'FILE_UPLOAD_ERROR', { fileName, fileSize });
        this.fileName = fileName;
        this.fileSize = fileSize;
    }
}

/**
 * Invalid file type error
 */
class InvalidFileTypeError extends FileUploadError {
    constructor(fileName, actualType, allowedTypes) {
        const message = `Tipo de arquivo não permitido: ${actualType}. Tipos aceitos: ${allowedTypes.join(', ')}`;
        super(message, 'INVALID_FILE_TYPE', fileName);
        this.actualType = actualType;
        this.allowedTypes = allowedTypes;
    }
}

/**
 * File too large error
 */
class FileTooLargeError extends FileUploadError {
    constructor(fileName, actualSize, maxSize) {
        const message = `Arquivo muito grande: ${this.formatFileSize(actualSize)}. Tamanho máximo: ${this.formatFileSize(maxSize)}`;
        super(message, 'FILE_TOO_LARGE', fileName);
        this.actualSize = actualSize;
        this.maxSize = maxSize;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

/**
 * Corrupted file error
 */
class CorruptedFileError extends FileUploadError {
    constructor(fileName, message = 'Arquivo pode estar corrompido ou danificado.') {
        super(message, 'CORRUPTED_FILE', fileName);
    }
}

/**
 * GitHub API related errors
 */
class GitHubAPIError extends AppError {
    constructor(message, statusCode = null, apiEndpoint = null) {
        super(message, 'GITHUB_API_ERROR', { statusCode, apiEndpoint });
        this.statusCode = statusCode;
        this.apiEndpoint = apiEndpoint;
    }
}

/**
 * Rate limit error
 */
class RateLimitError extends GitHubAPIError {
    constructor(message = 'Limite de requisições atingido. Aguarde alguns minutos.', resetTime = null) {
        super(message, 'RATE_LIMIT', null);
        this.resetTime = resetTime;
    }
}

/**
 * Permission denied error
 */
class PermissionDeniedError extends GitHubAPIError {
    constructor(message = 'Permissões insuficientes no GitHub.', resource = null) {
        super(message, 'PERMISSION_DENIED', { resource });
        this.resource = resource;
    }
}

/**
 * Repository not found error
 */
class RepositoryNotFoundError extends GitHubAPIError {
    constructor(repository, message = null) {
        const defaultMessage = `Repositório não encontrado: ${repository}`;
        super(message || defaultMessage, 'REPOSITORY_NOT_FOUND', { repository });
        this.repository = repository;
    }
}

/**
 * Invalid token error
 */
class InvalidTokenError extends GitHubAPIError {
    constructor(message = 'Token GitHub inválido ou expirado.') {
        super(message, 'INVALID_TOKEN');
    }
}

/**
 * Configuration related errors
 */
class ConfigurationError extends AppError {
    constructor(message, configKey = null, configValue = null) {
        super(message, 'CONFIGURATION_ERROR', { configKey, configValue });
        this.configKey = configKey;
        this.configValue = configValue;
    }
}

/**
 * Missing configuration error
 */
class MissingConfigurationError extends ConfigurationError {
    constructor(configKey, message = null) {
        const defaultMessage = `Configuração obrigatória não encontrada: ${configKey}`;
        super(message || defaultMessage, 'MISSING_CONFIGURATION', configKey);
    }
}

/**
 * Invalid configuration error
 */
class InvalidConfigurationError extends ConfigurationError {
    constructor(configKey, expectedType, actualValue) {
        const message = `Configuração inválida para ${configKey}. Esperado: ${expectedType}`;
        super(message, 'INVALID_CONFIGURATION', configKey);
        this.expectedType = expectedType;
        this.actualValue = actualValue;
    }
}

/**
 * System related errors
 */
class SystemError extends AppError {
    constructor(message, component = null, operation = null) {
        super(message, 'SYSTEM_ERROR', { component, operation });
        this.component = component;
        this.operation = operation;
    }
}

/**
 * Component initialization error
 */
class ComponentInitializationError extends SystemError {
    constructor(componentName, message = null) {
        const defaultMessage = `Falha ao inicializar componente: ${componentName}`;
        super(message || defaultMessage, 'COMPONENT_INIT_ERROR', componentName);
        this.componentName = componentName;
    }
}

/**
 * Temporary error (retryable)
 */
class TemporaryError extends AppError {
    constructor(message, retryAfter = null) {
        super(message, 'TEMPORARY_ERROR', { retryAfter });
        this.retryAfter = retryAfter;
    }
}

/**
 * Critical error (requires immediate attention)
 */
class CriticalError extends AppError {
    constructor(message, component = null, action = null) {
        super(message, 'CRITICAL_ERROR', { component, action });
        this.component = component;
        this.action = action;
    }
}

// Export all error classes
if (typeof window !== 'undefined') {
    // Browser environment
    window.AppError = AppError;
    window.AuthenticationError = AuthenticationError;
    window.SessionExpiredError = SessionExpiredError;
    window.InvalidCredentialsError = InvalidCredentialsError;
    window.AccountLockedError = AccountLockedError;
    window.ValidationError = ValidationError;
    window.RequiredFieldError = RequiredFieldError;
    window.InvalidFormatError = InvalidFormatError;
    window.NetworkError = NetworkError;
    window.TimeoutError = TimeoutError;
    window.OfflineError = OfflineError;
    window.FileUploadError = FileUploadError;
    window.InvalidFileTypeError = InvalidFileTypeError;
    window.FileTooLargeError = FileTooLargeError;
    window.CorruptedFileError = CorruptedFileError;
    window.GitHubAPIError = GitHubAPIError;
    window.RateLimitError = RateLimitError;
    window.PermissionDeniedError = PermissionDeniedError;
    window.RepositoryNotFoundError = RepositoryNotFoundError;
    window.InvalidTokenError = InvalidTokenError;
    window.ConfigurationError = ConfigurationError;
    window.MissingConfigurationError = MissingConfigurationError;
    window.InvalidConfigurationError = InvalidConfigurationError;
    window.SystemError = SystemError;
    window.ComponentInitializationError = ComponentInitializationError;
    window.TemporaryError = TemporaryError;
    window.CriticalError = CriticalError;
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        AppError,
        AuthenticationError,
        SessionExpiredError,
        InvalidCredentialsError,
        AccountLockedError,
        ValidationError,
        RequiredFieldError,
        InvalidFormatError,
        NetworkError,
        TimeoutError,
        OfflineError,
        FileUploadError,
        InvalidFileTypeError,
        FileTooLargeError,
        CorruptedFileError,
        GitHubAPIError,
        RateLimitError,
        PermissionDeniedError,
        RepositoryNotFoundError,
        InvalidTokenError,
        ConfigurationError,
        MissingConfigurationError,
        InvalidConfigurationError,
        SystemError,
        ComponentInitializationError,
        TemporaryError,
        CriticalError
    };
}