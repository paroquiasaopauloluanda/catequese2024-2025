# 🚀 Configuração do GitHub para o Painel Administrativo

## ✅ **Problemas Resolvidos**

1. **Erro `actions/upload-artifact: v3`** - Atualizado para v4
2. **Erro `npm ci` sem package-lock.json** - Criado package-lock.json e fallback para npm install

Atualizações feitas:
- ✅ `actions/checkout@v4`
- ✅ `actions/setup-node@v4` 
- ✅ `actions/upload-artifact@v4`
- ✅ `peaceiris/actions-gh-pages@v4`
- ✅ Criado `admin/package-lock.json`
- ✅ Fallback para `npm install` se `npm ci` falhar

## 🔧 **Configuração Passo a Passo**

### 1. **Configurar GitHub Pages**

No seu repositório GitHub:

1. Vá para **Settings** → **Pages**
2. Configure:
   - **Source**: GitHub Actions
   - **Branch**: Deixe como está (será gerenciado pelo workflow)

### 2. **Criar Personal Access Token**

1. GitHub.com → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Configurações:
   - **Note**: "Admin Panel Token"
   - **Expiration**: 90 days
   - **Scopes**:
     - ✅ `repo` (Full control)
     - ✅ `workflow` (Update workflows)
     - ✅ `write:packages`

4. **Copie o token** (guarde em local seguro!)

### 3. **Configurar Repository Secrets**

No GitHub: **Settings** → **Secrets and variables** → **Actions**

Adicione:
- **Name**: `ADMIN_TOKEN`
- **Secret**: Cole o token criado acima

### 4. **Atualizar Configurações do Projeto**

Edite o arquivo `admin/deployment.config.json`:

```json
{
  "github": {
    "repository": "SEU_USUARIO/SEU_REPOSITORIO",
    "branches": {
      "production": "main"
    }
  },
  "environments": {
    "production": {
      "baseUrl": "https://SEU_USUARIO.github.io/SEU_REPOSITORIO"
    }
  }
}
```

### 5. **Fazer Deploy**

Agora você pode fazer commit e push:

```bash
git add .
git commit -m "fix: update GitHub Actions to latest versions"
git push origin main
```

## 📋 **Workflows Criados**

### **1. simple-deploy.yml** (Recomendado)
- Deploy direto sem build
- Mais simples e confiável
- Não depende de npm/node

### **2. deploy-admin.yml**
- Executa quando há mudanças na pasta `admin/`
- Faz build e deploy do painel administrativo
- Cria artifacts para backup

### **3. pages.yml** 
- Deploy geral para GitHub Pages
- Usa as actions mais recentes
- Configuração com build

## 🎯 **Como Usar Após Deploy**

### **Acessar o Painel:**
```
https://SEU_USUARIO.github.io/SEU_REPOSITORIO/admin/
```

### **Login:**
- **Usuário**: `admin`
- **Senha**: `nilknarfnessa`

### **Primeira Configuração:**
1. Faça login no painel
2. Vá para "Configurações"
3. Cole o GitHub token
4. Salve as configurações

## 🔍 **Verificar se Funcionou**

### **1. Verificar Actions:**
- GitHub → **Actions** tab
- Deve mostrar workflows executando/concluídos

### **2. Verificar Pages:**
- GitHub → **Settings** → **Pages**
- Deve mostrar: "Your site is published at..."

### **3. Testar o Painel:**
- Acesse a URL do painel
- Faça login
- Teste upload de um arquivo pequeno

## 🛠️ **Troubleshooting**

### **Workflow falha:**
```bash
# Verificar logs no GitHub Actions
# Comum: problemas de permissão ou token inválido
```

### **Painel não carrega:**
```bash
# Verificar se GitHub Pages está habilitado
# Aguardar 5-10 minutos após primeiro deploy
```

### **Token não funciona:**
```bash
# Verificar se token tem scopes corretos
# Verificar se não expirou
# Recriar se necessário
```

### **Upload falha:**
```bash
# Verificar se token está configurado no painel
# Verificar permissões do repositório
# Verificar rate limits da API
```

## 📊 **Monitoramento**

O painel inclui:
- **Logs detalhados** de todas operações
- **Status do GitHub** em tempo real
- **Verificação de deploy** automática
- **Backup automático** antes de mudanças

## 🔐 **Segurança**

- ✅ Token armazenado como secret
- ✅ Sessão com timeout automático
- ✅ Validação de arquivos
- ✅ Logs de auditoria
- ✅ Backup automático

## 📞 **Suporte**

Se ainda tiver problemas:

1. **Verificar logs** no GitHub Actions
2. **Verificar console** do navegador (F12)
3. **Verificar logs** no painel administrativo
4. **Verificar permissões** do token GitHub

---

**🎉 Agora o sistema está pronto para uso!**