# Requirements Document

## Introduction

O sistema de catequese está enfrentando problemas críticos de autenticação que causam loops infinitos e degradação de performance. O AuthManager está executando "Invalid session format, clearing..." repetidamente, e o GitHubManager está falhando com "response.json is not a function". Estes problemas impedem o funcionamento normal do painel administrativo e precisam ser resolvidos imediatamente.

## Requirements

### Requirement 1

**User Story:** Como administrador do sistema, eu quero que o sistema de autenticação funcione sem loops infinitos, para que eu possa acessar o painel administrativo normalmente.

#### Acceptance Criteria

1. WHEN o sistema verifica a sessão THEN ele SHALL validar o formato sem entrar em loop infinito
2. WHEN uma sessão inválida é detectada THEN o sistema SHALL limpar silenciosamente sem spam de logs
3. WHEN o usuário acessa o painel THEN o sistema SHALL carregar sem repetir verificações desnecessárias
4. WHEN a validação de sessão falha THEN o sistema SHALL redirecionar para login uma única vez

### Requirement 2

**User Story:** Como administrador do sistema, eu quero que as chamadas para a API do GitHub funcionem corretamente, para que eu possa gerenciar configurações e arquivos.

#### Acceptance Criteria

1. WHEN o sistema faz uma requisição para GitHub THEN ele SHALL receber uma resposta válida
2. WHEN a resposta do GitHub é processada THEN o sistema SHALL usar métodos corretos para parsing JSON
3. WHEN não há token configurado THEN o sistema SHALL falhar graciosamente sem causar loops
4. WHEN há erro de rede THEN o sistema SHALL implementar retry com backoff apropriado

### Requirement 3

**User Story:** Como administrador do sistema, eu quero que o sistema de logs seja otimizado, para que não haja spam de mensagens repetitivas no console.

#### Acceptance Criteria

1. WHEN há erro de sessão THEN o sistema SHALL logar apenas uma vez por ciclo
2. WHEN há tentativas de retry THEN o sistema SHALL logar com frequência controlada
3. WHEN há warnings de token THEN o sistema SHALL agrupar mensagens similares
4. WHEN o sistema está funcionando normalmente THEN ele SHALL minimizar logs desnecessários

### Requirement 4

**User Story:** Como administrador do sistema, eu quero que o sistema seja resiliente a falhas, para que problemas temporários não causem travamentos permanentes.

#### Acceptance Criteria

1. WHEN há falha de rede THEN o sistema SHALL continuar funcionando com funcionalidade reduzida
2. WHEN há erro de parsing THEN o sistema SHALL recuperar graciosamente
3. WHEN há problema de token THEN o sistema SHALL permitir reconfiguração
4. WHEN há erro crítico THEN o sistema SHALL oferecer opção de reset