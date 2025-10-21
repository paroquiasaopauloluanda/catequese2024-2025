# Sistema de Analytics

## Visão Geral

O sistema de analytics foi criado para monitorar os acessos ao seu projeto de forma simples e eficiente. Ele rastreia visitantes únicos, páginas visitadas e permite visualizar estatísticas por diferentes períodos.

## Funcionalidades

### 📊 Métricas Principais
- **Visitantes Únicos**: Número de pessoas diferentes que visitaram o site
- **Total de Visitas**: Número total de páginas visualizadas
- **Visitas Hoje**: Acessos do dia atual
- **Média Diária**: Média de visitas por dia no período selecionado

### 📈 Visualizações
- **Gráfico de Visitas**: Mostra a evolução das visitas ao longo do tempo
- **Páginas Mais Visitadas**: Ranking das páginas com mais acessos
- **Dados Detalhados**: Tabela com informações completas por data e página

### ⏱️ Períodos de Análise
- 7 dias
- 30 dias
- 90 dias
- 1 ano

## Como Acessar

1. Navegue até `analytics.html` no seu navegador
2. A página é destinada apenas ao administrador (não há links nas outras páginas)
3. Os dados são armazenados localmente no navegador

## Como Funciona

### Rastreamento Automático
- O script `tracking.js` é incluído em todas as páginas principais
- Registra automaticamente cada visita quando a página carrega
- Identifica visitantes únicos usando localStorage
- Não coleta informações pessoais sensíveis

### Armazenamento de Dados
- Os dados são salvos no localStorage do navegador
- Cada visitante recebe um ID único anônimo
- As informações incluem:
  - Data e hora da visita
  - Página visitada
  - ID do visitante (anônimo)
  - User Agent (limitado)

## Páginas Monitoradas

O sistema rastreia automaticamente as seguintes páginas:
- `index.html` - Lista de Catecúmenos
- `dashboard.html` - Dashboard
- `lista-catequistas.html` - Lista de Catequistas
- `aniversarios.html` - Aniversários

## Funcionalidades Administrativas

### Limpar Dados
- Botão "Limpar Dados" remove todas as estatísticas
- Útil para recomeçar o rastreamento ou para testes

### Exportar Dados
- Botão "Exportar Dados" baixa um arquivo JSON com todas as estatísticas
- Permite backup ou análise externa dos dados

### Dados de Exemplo
- Se não houver dados, o sistema gera automaticamente dados de exemplo
- Facilita a demonstração e teste das funcionalidades

## Privacidade e Segurança

### O que é Coletado
- ✅ Páginas visitadas
- ✅ Data e hora das visitas
- ✅ ID anônimo do visitante
- ✅ User Agent (limitado a 100 caracteres)

### O que NÃO é Coletado
- ❌ Informações pessoais
- ❌ Endereços IP
- ❌ Dados de formulários
- ❌ Cookies de terceiros
- ❌ Localização geográfica

### Conformidade
- Os dados ficam apenas no navegador local
- Não há envio para servidores externos
- O visitante pode limpar os dados a qualquer momento
- Respeita a privacidade dos usuários

## Personalização

### Adicionar Novas Páginas
Para monitorar uma nova página:

1. Adicione o script de rastreamento antes do `</body>`:
```html
<script src="assets/js/tracking.js"></script>
```

2. Opcionalmente, adicione o nome da página em `analytics.js`:
```javascript
const pageNames = {
    '/nova-pagina.html': 'Nome da Nova Página',
    // ...
};
```

### Modificar Períodos
Para adicionar novos períodos de análise, edite o HTML em `analytics.html`:
```html
<button type="button" class="btn btn-outline-primary" data-period="180">6 meses</button>
```

## Resolução de Problemas

### Dados Não Aparecem
1. Verifique se o script `tracking.js` está incluído nas páginas
2. Confirme que o JavaScript está habilitado no navegador
3. Verifique o console do navegador para erros

### Performance
- O sistema é otimizado para não impactar a velocidade das páginas
- Os dados são salvos de forma assíncrona
- Limite automático de dados para evitar sobrecarga

### Compatibilidade
- Funciona em todos os navegadores modernos
- Requer JavaScript habilitado
- Usa localStorage (disponível desde IE8+)

## Estrutura de Arquivos

```
assets/
├── js/
│   ├── analytics.js     # Lógica principal do analytics
│   └── tracking.js      # Script de rastreamento
└── css/
    └── analytics.css    # Estilos da página de analytics

analytics.html           # Página principal do analytics
```

## Suporte

Para dúvidas ou problemas:
1. Verifique este README
2. Consulte o console do navegador para erros
3. Teste com dados de exemplo usando o botão "Limpar Dados"

---

**Nota**: Este sistema foi desenvolvido para ser simples, privado e eficiente. Todos os dados permanecem no navegador do usuário, garantindo máxima privacidade.