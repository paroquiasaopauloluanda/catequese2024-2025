# 🔑 Configuração do GitHub Token

## ❌ **Problema Atual**

```
Erro na sincronização com GitHub. Verifique as configurações
GitHub token não configurado
```

## ✅ **Solução Rápida**

### **1. Você já tem o ADMIN_TOKEN configurado no GitHub** ✅
- Vejo que está na página correta: `github.com/paroquiasaopauloluanda/catequese2024-2025/settings/secrets/actions`
- O secret `ADMIN_TOKEN` está criado (1 hour ago)

### **2. Agora precisa configurar no painel administrativo**

## 🔧 **Como Configurar o Token no Painel**

### **Método 1: Via Console (Temporário)**

1. **Abrir console** do navegador (F12)
2. **Executar comando**:
```javascript
// Configurar token temporariamente
localStorage.setItem('github_token', 'SEU_PERSONAL_ACCESS_TOKEN_AQUI');
location.reload();
```

### **Método 2: Via Interface (Recomendado)**

Vou criar uma interface simples para isso...

## 🎯 **Personal Access Token**

### **Criar Token GitHub:**

1. **GitHub.com** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. **Configurações**:
   - **Note**: "Admin Panel Token"
   - **Expiration**: 90 days
   - **Scopes**:
     - ✅ `repo` (Full control)
     - ✅ `workflow` (Update workflows)
     - ✅ `contents:write` (Write access to code)

4. **Copiar o token** (você só verá uma vez!)

### **Usar o Token:**

**Opção A - Console:**
```javascript
localStorage.setItem('github_token', 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
location.reload();
```

**Opção B - Interface (em desenvolvimento):**
- Ir para seção "Configurações"
- Campo "GitHub Token"
- Colar token e salvar

## 🔍 **Verificar se Funcionou**

### **Console deve mostrar:**
```javascript
✅ [GITHUB] INFO: Token configurado com sucesso
✅ [GITHUB] INFO: Conexão com repositório estabelecida
```

### **Interface deve mostrar:**
- ✅ Status GitHub: Conectado
- ✅ Repositório: paroquiasaopauloluanda/catequese2024-2025
- ✅ Sincronização: Ativa

## 🛠️ **Troubleshooting**

### **Se token não funcionar:**

1. **Verificar scopes** do token
2. **Verificar se não expirou**
3. **Verificar permissões** do repositório
4. **Tentar recriar** o token

### **Se ainda houver erro:**

1. **Limpar storage**:
```javascript
localStorage.clear();
sessionStorage.clear();
```

2. **Recarregar página**
3. **Fazer login novamente**
4. **Configurar token novamente**

## 📋 **Checklist de Configuração**

- ✅ **ADMIN_TOKEN** criado no GitHub (feito)
- ✅ **Personal Access Token** criado
- ⏳ **Token configurado** no painel
- ⏳ **Teste de sincronização** realizado

## 🎉 **Resultado Esperado**

Após configurar o token:
- ✅ **Sem erros** de sincronização
- ✅ **GitHub conectado** e funcional
- ✅ **Upload de arquivos** funcionando
- ✅ **Sincronização automática** ativa

---

**Vou criar uma interface mais amigável para configurar o token!** 🚀