# Requirements Document

## Introduction

Este documento define os requisitos para um sistema administrativo web que permitirá ao administrador da paróquia gerenciar configurações, fazer upload de arquivos e sincronizar alterações com o repositório GitHub Pages. O sistema deve ser seguro, intuitivo e integrado com o fluxo de trabalho existente do GitHub Pages.

## Requirements

### Requirement 1

**User Story:** Como administrador da paróquia, eu quero acessar um painel administrativo seguro, para que eu possa gerenciar as configurações do sistema sem acesso técnico ao código.

#### Acceptance Criteria

1. WHEN o usuário acessa a página administrativa THEN o sistema SHALL exibir um formulário de login
2. WHEN o usuário insere credenciais válidas (user: "admin", password: "nilknarfnessa") THEN o sistema SHALL autenticar e redirecionar para o painel administrativo
3. WHEN o usuário insere credenciais inválidas THEN o sistema SHALL exibir mensagem de erro e manter na tela de login
4. WHEN o usuário está autenticado THEN o sistema SHALL manter a sessão ativa por tempo determinado
5. WHEN a sessão expira THEN o sistema SHALL redirecionar automaticamente para a tela de login

### Requirement 2

**User Story:** Como administrador, eu quero editar as configurações da paróquia através de uma interface visual, para que eu possa atualizar informações sem editar arquivos JSON manualmente.

#### Acceptance Criteria

1. WHEN o administrador acessa o painel THEN o sistema SHALL carregar e exibir os valores atuais do settings.json
2. WHEN o administrador modifica um campo de configuração THEN o sistema SHALL validar o formato dos dados inseridos
3. WHEN o administrador salva as alterações THEN o sistema SHALL atualizar o arquivo settings.json no repositório GitHub
4. WHEN as configurações são salvas THEN o sistema SHALL exibir confirmação de sucesso
5. IF ocorrer erro na validação THEN o sistema SHALL destacar os campos com erro e exibir mensagens explicativas

### Requirement 3

**User Story:** Como administrador, eu quero fazer upload de arquivos Excel, templates e logotipos, para que eu possa atualizar os dados e visual do sistema facilmente.

#### Acceptance Criteria

1. WHEN o administrador seleciona um arquivo Excel THEN o sistema SHALL validar se é um arquivo .xlsx ou .xls válido
2. WHEN o administrador faz upload do arquivo de dados principais THEN o sistema SHALL substituir o arquivo existente em data/dados-catequese.xlsx
3. WHEN o administrador faz upload de template de exportação THEN o sistema SHALL substituir o arquivo existente em templates/
4. WHEN o administrador faz upload de logotipo THEN o sistema SHALL validar se é JPG ou PNG e substituir em assets/images/
5. WHEN qualquer upload é realizado THEN o sistema SHALL mostrar preview do arquivo antes da confirmação

### Requirement 4

**User Story:** Como administrador, eu quero ver o progresso das alterações sendo aplicadas ao GitHub, para que eu saiba quando as mudanças estarão disponíveis no site.

#### Acceptance Criteria

1. WHEN o administrador inicia uma operação de salvamento THEN o sistema SHALL exibir uma barra de progresso
2. WHEN a operação está em andamento THEN o sistema SHALL mostrar o percentual de conclusão em tempo real
3. WHEN a operação é concluída com sucesso THEN o sistema SHALL exibir mensagem de confirmação e ocultar a barra de progresso
4. WHEN ocorre erro durante a operação THEN o sistema SHALL exibir mensagem de erro detalhada
5. WHEN há múltiplas operações THEN o sistema SHALL enfileirar e processar sequencialmente

### Requirement 5

**User Story:** Como administrador, eu quero que as alterações sejam automaticamente sincronizadas com o GitHub Pages, para que o site seja atualizado sem intervenção técnica.

#### Acceptance Criteria

1. WHEN arquivos são modificados THEN o sistema SHALL fazer commit automático no repositório GitHub
2. WHEN o commit é realizado THEN o sistema SHALL aguardar o deploy automático do GitHub Pages
3. WHEN o deploy é concluído THEN o sistema SHALL verificar se as alterações estão refletidas no site
4. WHEN há conflitos no repositório THEN o sistema SHALL notificar o administrador e sugerir ações
5. IF a API do GitHub estiver indisponível THEN o sistema SHALL tentar novamente após intervalo definido

### Requirement 6

**User Story:** Como administrador, eu quero visualizar logs das operações realizadas, para que eu possa acompanhar o histórico de alterações e identificar problemas.

#### Acceptance Criteria

1. WHEN uma operação é realizada THEN o sistema SHALL registrar timestamp, tipo de operação e resultado
2. WHEN o administrador acessa a seção de logs THEN o sistema SHALL exibir histórico das últimas 50 operações
3. WHEN há erro em uma operação THEN o sistema SHALL registrar detalhes do erro no log
4. WHEN o administrador filtra logs THEN o sistema SHALL permitir filtrar por data, tipo de operação e status
5. WHEN os logs excedem limite definido THEN o sistema SHALL manter apenas os mais recentes

### Requirement 7

**User Story:** Como administrador, eu quero ter backup automático das configurações, para que eu possa recuperar versões anteriores em caso de problemas.

#### Acceptance Criteria

1. WHEN configurações são alteradas THEN o sistema SHALL criar backup da versão anterior
2. WHEN o administrador solicita restauração THEN o sistema SHALL listar backups disponíveis com timestamps
3. WHEN um backup é selecionado para restauração THEN o sistema SHALL confirmar a ação antes de executar
4. WHEN a restauração é executada THEN o sistema SHALL aplicar as configurações do backup selecionado
5. WHEN há mais de 10 backups THEN o sistema SHALL manter apenas os 10 mais recentes

### Requirement 8

**User Story:** Como sistema, eu preciso garantir segurança adequada, para que apenas usuários autorizados possam acessar funcionalidades administrativas.

#### Acceptance Criteria

1. WHEN há tentativas de acesso não autorizado THEN o sistema SHALL registrar e bloquear temporariamente o IP
2. WHEN operações sensíveis são realizadas THEN o sistema SHALL requerer reconfirmação da senha
3. WHEN a sessão está inativa por mais de 30 minutos THEN o sistema SHALL fazer logout automático
4. WHEN há múltiplas tentativas de login falhadas THEN o sistema SHALL implementar delay progressivo
5. WHEN dados sensíveis são transmitidos THEN o sistema SHALL usar conexões seguras (HTTPS)