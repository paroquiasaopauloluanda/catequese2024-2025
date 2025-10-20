# Design Document

## Overview

O painel administrativo será uma aplicação web single-page que permitirá ao administrador gerenciar configurações e arquivos do sistema da paróquia. Devido às limitações do GitHub Pages (ambiente estático), utilizaremos uma abordagem híbrida com GitHub API para operações de repositório e localStorage para gerenciamento de sessão.

## Architecture

### Arquitetura Geral
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Panel   │────│   GitHub API     │────│  GitHub Pages   │
│   (Frontend)    │    │   (Operations)   │    │   (Deploy)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────────┐         ┌──────────┐
    │Browser  │            │GitHub Token │         │Live Site │
    │Storage  │            │Management   │         │Updates   │
    └─────────┘            └─────────────┘         └──────────┘
```

### Limitações do GitHub Pages
- **Sem backend**: Todas as operações devem ser client-side
- **Sem processamento de arquivos**: Upload direto via GitHub API
- **Rate limiting**: GitHub API tem limites de requisições
- **Segurança**: Tokens devem ser gerenciados cuidadosamente

### Soluções Propostas
1. **Autenticação**: Sistema baseado em hash local + sessão temporária
2. **GitHub Integration**: Uso da GitHub API v4 (GraphQL) e v3 (REST)
3. **File Upload**: Conversão para base64 e commit via API
4. **Progress Tracking**: WebSockets simulados com polling

## Components and Interfaces

### 1. Authentication Component
```javascript
class AuthManager {
    // Gerencia login/logout e validação de sessão
    login(username, password)
    logout()
    isAuthenticated()
    validateSession()
}
```

**Funcionalidades:**
- Hash das credenciais para validação local
- Gerenciamento de sessão com timeout
- Proteção contra força bruta

### 2. Configuration Manager
```javascript
class ConfigManager {
    // Gerencia settings.json
    loadSettings()
    updateSettings(newConfig)
    validateConfig(config)
    backupConfig()
}
```

**Funcionalidades:**
- Carregamento do settings.json atual
- Validação de campos obrigatórios
- Interface de edição com formulários dinâmicos
- Backup automático antes de alterações

### 3. File Upload Manager
```javascript
class FileManager {
    // Gerencia upload de arquivos
    uploadExcel(file, type)
    uploadImage(file)
    uploadTemplate(file)
    validateFile(file, type)
}
```

**Tipos de arquivo suportados:**
- **Excel**: .xlsx, .xls (dados principais)
- **Imagens**: .jpg, .png (logotipo)
- **Templates**: .xlsx (template de exportação)

### 4. GitHub Integration
```javascript
class GitHubManager {
    // Integração com GitHub API
    commitFile(path, content, message)
    getFileContent(path)
    createPullRequest()
    checkDeployStatus()
}
```

**Operações suportadas:**
- Commit de arquivos individuais
- Verificação de status de deploy
- Gerenciamento de branches
- Tratamento de conflitos

### 5. Progress Tracker
```javascript
class ProgressTracker {
    // Acompanha progresso das operações
    startOperation(operationId)
    updateProgress(operationId, percentage)
    completeOperation(operationId)
    handleError(operationId, error)
}
```

**Estados de operação:**
- Iniciando (0-10%)
- Validando arquivos (10-30%)
- Fazendo upload (30-70%)
- Aguardando deploy (70-90%)
- Concluído (100%)

## Data Models

### Settings Configuration
```json
{
  "paroquia": {
    "nome": "string",
    "secretariado": "string",
    "ano_catequetico": "string",
    "data_inicio": "date",
    "data_inicio_formatada": "string"
  },
  "arquivos": {
    "dados_principais": "path",
    "template_export": "path",
    "logo": "path"
  },
  "github": {
    "repository": "string",
    "branch": "string",
    "token": "encrypted_string"
  },
  "validacao": {
    "campos_obrigatorios": ["array"]
  },
  "exportacao": {
    "nome_arquivo_padrao": "string"
  }
}
```

### Session Data
```json
{
  "authenticated": "boolean",
  "loginTime": "timestamp",
  "lastActivity": "timestamp",
  "sessionId": "string"
}
```

### Operation Log
```json
{
  "id": "string",
  "timestamp": "datetime",
  "type": "string",
  "status": "success|error|pending",
  "details": "string",
  "files": ["array"],
  "duration": "number"
}
```

## Error Handling

### Tipos de Erro
1. **Authentication Errors**: Credenciais inválidas, sessão expirada
2. **Validation Errors**: Arquivos inválidos, configurações incorretas
3. **GitHub API Errors**: Rate limiting, permissões, conflitos
4. **Network Errors**: Conectividade, timeouts

### Estratégias de Recuperação
- **Retry Logic**: Tentativas automáticas com backoff exponencial
- **Fallback Options**: Operações alternativas quando possível
- **User Feedback**: Mensagens claras sobre erros e soluções
- **Rollback**: Restauração de estado anterior em caso de falha

## Testing Strategy

### Testes Unitários
- Validação de configurações
- Processamento de arquivos
- Gerenciamento de sessão
- Integração com GitHub API

### Testes de Integração
- Fluxo completo de upload
- Sincronização com GitHub
- Atualização de configurações
- Sistema de backup/restore

### Testes de Segurança
- Tentativas de acesso não autorizado
- Validação de tokens
- Proteção contra XSS/CSRF
- Gerenciamento seguro de credenciais

### Testes de Performance
- Upload de arquivos grandes
- Múltiplas operações simultâneas
- Rate limiting da GitHub API
- Responsividade da interface

## Security Considerations

### Autenticação
- Hash das credenciais no client-side
- Sessões com timeout automático
- Proteção contra força bruta
- Logout automático por inatividade

### GitHub Token Management
- Token armazenado de forma segura
- Escopo mínimo necessário
- Rotação periódica recomendada
- Validação de permissões

### File Upload Security
- Validação rigorosa de tipos de arquivo
- Verificação de conteúdo (não apenas extensão)
- Limite de tamanho de arquivo
- Sanitização de nomes de arquivo

### Data Protection
- Configurações sensíveis criptografadas
- Logs sem informações sensíveis
- Backup seguro de configurações
- Limpeza automática de dados temporários

## Implementation Notes

### GitHub Pages Limitations
- Não é possível executar código server-side
- Todas as operações devem ser client-side
- Dependência da GitHub API para modificações
- Deploy automático pode levar alguns minutos

### Recommended Approach
1. **Phase 1**: Interface básica com configurações
2. **Phase 2**: Upload de arquivos via GitHub API
3. **Phase 3**: Sistema de progresso e logs
4. **Phase 4**: Backup/restore e funcionalidades avançadas

### Alternative Solutions
Se as limitações do GitHub Pages forem muito restritivas:
- **Netlify Functions**: Para processamento server-side
- **Vercel Edge Functions**: Para operações complexas
- **GitHub Actions**: Para automação de deploy
- **External API**: Serviço dedicado para operações administrativas