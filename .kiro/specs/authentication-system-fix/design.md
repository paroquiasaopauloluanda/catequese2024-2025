# Design Document

## Overview

Este design resolve os problemas críticos do sistema de autenticação através de uma abordagem de refatoração focada em:
1. Eliminação de loops infinitos no AuthManager
2. Correção de erros de parsing no GitHubManager  
3. Implementação de logging inteligente
4. Adição de mecanismos de recuperação de falhas

## Architecture

### Session Management Redesign

O AuthManager será refatorado para usar um padrão de validação em camadas:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Layer      │───▶│  Session Cache   │───▶│  Storage Layer  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Validation      │    │ Throttled Check  │    │ Silent Cleanup  │
│ Throttling      │    │ (max 1/second)   │    │ (no console)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### GitHub API Error Handling

O GitHubManager será melhorado com:
- Verificação de tipo de resposta antes de chamar .json()
- Fallback para modo offline quando API falha
- Cache local para reduzir chamadas desnecessárias

## Components and Interfaces

### 1. SessionValidator

```javascript
class SessionValidator {
    constructor() {
        this.lastCheck = 0;
        this.checkInterval = 1000; // 1 segundo mínimo entre checks
        this.cachedResult = null;
    }
    
    validateSession(sessionData) {
        // Implementa throttling e cache
    }
}
```

### 2. ResponseHandler

```javascript
class ResponseHandler {
    static async safeJsonParse(response) {
        // Verifica se response tem método json antes de chamar
        // Implementa fallbacks para diferentes tipos de resposta
    }
}
```

### 3. LogThrottler

```javascript
class LogThrottler {
    constructor() {
        this.messageCache = new Map();
        this.throttleTime = 5000; // 5 segundos
    }
    
    throttledLog(key, message, level = 'info') {
        // Agrupa mensagens similares
    }
}
```

## Data Models

### SessionData (Enhanced)

```javascript
{
    authenticated: boolean,
    loginTime: number,
    lastActivity: number,
    sessionId: string,
    validationCount: number,    // NEW: track validation attempts
    lastValidation: number,     // NEW: timestamp of last validation
    fingerprint: string         // NEW: browser fingerprint for security
}
```

### APIResponse (New)

```javascript
{
    success: boolean,
    data: any,
    error: string | null,
    cached: boolean,           // NEW: indicates if response is from cache
    timestamp: number          // NEW: when response was generated
}
```

## Error Handling

### 1. Session Loop Prevention

- Implementar throttling de validação (máximo 1 check por segundo)
- Cache de resultado de validação por 500ms
- Contador de tentativas com circuit breaker após 5 falhas consecutivas

### 2. GitHub API Resilience

- Verificação de tipo de resposta antes de parsing
- Fallback para dados locais quando API falha
- Retry com exponential backoff limitado a 3 tentativas

### 3. Graceful Degradation

- Modo offline quando GitHub API não está disponível
- Interface simplificada quando há problemas de autenticação
- Botão de "Reset Sistema" para casos extremos

## Testing Strategy

### Unit Tests (Optional)

- Testes para SessionValidator com diferentes cenários de sessão
- Testes para ResponseHandler com vários tipos de resposta
- Testes para LogThrottler verificando agrupamento de mensagens

### Integration Tests (Optional)

- Teste de fluxo completo de login sem loops
- Teste de recuperação após falha de API
- Teste de comportamento em modo offline

### Manual Testing

- Verificar que não há mais loops infinitos no console
- Confirmar que GitHub API funciona corretamente
- Testar cenários de falha e recuperação

## Performance Considerations

### Memory Management

- Limpeza automática de cache de logs após 1 hora
- Limite de 100 entradas no cache de validação de sessão
- Garbage collection de event listeners não utilizados

### Network Optimization

- Cache de respostas GitHub por 5 minutos
- Debounce de chamadas de API para 500ms
- Compressão de dados quando possível

## Security Enhancements

### Session Security

- Fingerprinting de browser para detectar session hijacking
- Rotação automática de session ID a cada 15 minutos
- Validação de origem de requests

### API Security

- Rate limiting local para evitar abuse
- Sanitização de dados antes de envio para GitHub
- Logs de segurança para tentativas suspeitas