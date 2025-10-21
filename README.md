# Sistema de Gestão da Catequese 2025/2026

Sistema web completo e funcional para gestão e visualização dos dados da catequese da Paróquia de São Paulo de Luanda.

## ✅ Funcionalidades 100% Operacionais

- **Dashboard Interativo**: Estatísticas em tempo real com gráficos de distribuição
- **Lista de Catecúmenos**: Visualização completa com filtros avançados e pesquisa
- **Gestão de Catequistas**: Organização por turmas com modal de detalhes
- **Exportação Completa**: Relatórios em Excel diretamente do navegador
- **Interface Responsiva**: Funciona perfeitamente em todos os dispositivos
- **Sistema Robusto**: Funciona sem dependências externas de configuração

## 📁 Estrutura do Projeto

```
catequese2025-2026/
├── index.html              # Lista principal de catecúmenos
├── dashboard.html          # Dashboard com estatísticas
├── lista-catequistas.html  # Gestão de catequistas
├── lista-alunos.html      # Redirecionamento (compatibilidade)
├── config/                # Arquivos de configuração
│   ├── settings.json      # Configurações gerais
│   ├── cores-resultados.json # Cores dos resultados
│   └── centros-etapas.json   # Centros, etapas e horários
├── assets/                # Recursos estáticos
│   ├── css/
│   │   └── common.css     # Estilos comuns
│   ├── js/
│   │   ├── config-manager.js # Gerenciador de configurações
│   │   └── utils.js       # Utilitários comuns
│   └── images/
│       └── logo-paroquia.jpg # Logo da paróquia
└── data/                  # Dados
    ├── dados-catequese.xlsx    # Dados principais
    ├── template-export.xlsx    # Template para exportação
    └── backups/               # Backups automáticos
```

## ⚙️ Configuração Simples

O sistema funciona **imediatamente** sem necessidade de configuração adicional:

1. **Coloque o arquivo Excel** em `data/dados-catequese.xlsx`
2. **Abra qualquer página** no navegador
3. **Tudo funciona automaticamente**

### Configurações Opcionais (Avançado)
- `config/settings.json` - Informações da paróquia
- `config/cores-resultados.json` - Cores personalizadas
- `config/centros-etapas.json` - Centros e etapas

## 🎯 Como Usar

1. **Dashboard**: Acesse `dashboard.html` para ver estatísticas gerais
2. **Lista de Catecúmenos**: Use `index.html` para pesquisar e filtrar alunos
3. **Catequistas**: Acesse `lista-catequistas.html` para gerir turmas

### Funcionalidades de Pesquisa
- Pesquisa por nome completo
- Filtros por centro, etapa, horário e resultado
- Pesquisa por sala e catequista
- Exportação de dados filtrados

## 📊 Dados

O sistema lê dados do arquivo Excel `data/dados-catequese.xlsx` que deve conter as seguintes colunas:
- **Nome**: Nome completo do catecúmeno
- **Nascimento**: Data de nascimento
- **Centro**: Centro de catequese
- **Etapa**: Etapa da catequese
- **Sala**: Número da sala
- **Horário**: Horário das aulas
- **Catequistas**: Nome dos catequistas (separados por |)
- **Resultado**: Situação do catecúmeno

## 🔧 Tecnologias Utilizadas

- **HTML5/CSS3**: Interface moderna e responsiva
- **JavaScript ES6+**: Lógica da aplicação
- **SheetJS**: Leitura e escrita de arquivos Excel
- **Sistema de Configuração**: Gestão centralizada
- **PWA Ready**: Preparado para funcionar offline

## 📱 Compatibilidade

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari (iOS/macOS)
- ✅ Dispositivos móveis
- ✅ Tablets

## 🚀 Funcionalidades Implementadas

### ✅ Todas as Páginas 100% Funcionais
- **index.html** - Lista completa de catecúmenos com filtros
- **dashboard.html** - Estatísticas e gráficos em tempo real  
- **lista-catequistas.html** - Gestão de catequistas por turmas

### ✅ Recursos Avançados
- **Carregamento automático** do Excel
- **Filtros inteligentes** por centro, etapa, horário, resultado
- **Pesquisa em tempo real** por nome, sala, catequista
- **Exportação direta** para Excel
- **Modal de detalhes** para visualizar alunos por turma
- **Interface responsiva** para mobile e desktop
- **Navegação integrada** entre todas as páginas

## 📄 Licença

© Paróquia de São Paulo de Luanda — Secretariado da Catequese
