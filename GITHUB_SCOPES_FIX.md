# 🔧 Correção dos Scopes do GitHub Token

## ❌ **Problema Anterior**

```
Erro ao salvar token: Token inválido: Escopo obrigatório ausente: pages:write
```

**Causa**: O sistema estava pedindo `pages:write` que não existe em tokens clássicos.

## ✅ **Problema Corrigido**

### **Scopes Atualizados no Sistema:**
- ✅ `repo` (Full control of repositories)
- ✅ `workflow` (Update GitHub Action workflows)
- ❌ ~~`pages:write`~~ (removido - não existe em tokens clássicos)

## 🎯 **Configuração Correta do Token**

### **Na página do GitHub que você está:**

**Marque apenas estes scopes:**

1. ✅ **`repo`** 
   - Marcar a caixa principal "repo"
   - Isso inclui acesso completo ao repositório

2. ✅ **`workflow`**
   - Já está marcado
   - Permite atualizar GitHub Actions

3. ✅ **`write:packages`** (opcional)
   - Se disponível, marque para upload de packages

### **NÃO marque:**
- ❌ Outros scopes desnecessários
- ❌ `pages:write` (não existe)
- ❌ `contents:write` (não existe separadamente)

## 🚀 **Passos para Corrigir**

### **1. Atualizar Token (se necessário):**
1. Na página que você está aberta
2. Marcar apenas `repo` e `workflow`
3. Clicar "Update token"
4. Copiar o token (se regenerado)

### **2. Testar no Painel:**
1. Voltar ao painel administrativo
2. Ir para "Configurações"
3. Colar o token no campo
4. Clicar "💾 Salvar Token"
5. Deve mostrar: "✅ Token configurado com sucesso!"

## 📋 **Scopes Explicados**

### **`repo` (Obrigatório)**
- Acesso completo ao repositório
- Permite ler e escrever arquivos
- Inclui acesso a issues, PRs, etc.

### **`workflow` (Obrigatório)**
- Permite atualizar GitHub Actions
- Necessário para deploy automático
- Permite modificar workflows

### **`write:packages` (Opcional)**
- Upload de packages
- Não essencial para funcionamento básico

## 🎉 **Resultado Esperado**

### **Após configurar corretamente:**
```javascript
✅ Token configurado com sucesso! GitHub conectado.
✅ [GITHUB] INFO: Conexão com repositório estabelecida
✅ Repositório: paroquiasaopauloluanda/catequese2024-2025
```

### **Funcionalidades que funcionarão:**
- ✅ Upload de arquivos Excel
- ✅ Upload de imagens (logo)
- ✅ Sincronização automática
- ✅ Backup de configurações
- ✅ Deploy automático

## 🛠️ **Troubleshooting**

### **Se ainda der erro:**

1. **Verificar scopes marcados**:
   - Apenas `repo` e `workflow`
   - Não marcar scopes extras

2. **Regenerar token**:
   - Clicar "Regenerate token"
   - Copiar novo token
   - Configurar no painel

3. **Verificar permissões**:
   - Você deve ser owner/admin do repositório
   - Repositório deve existir e estar acessível

## 📁 **Arquivo Corrigido**

- ✅ `admin/js/managers/TokenManager.js` - Scopes atualizados
- ✅ `admin/index.html` - Instruções corrigidas

---

**Agora o token deve funcionar perfeitamente com os scopes corretos!** 🚀

### **Próximo Passo:**
1. ✅ Marcar apenas `repo` e `workflow` no GitHub
2. ✅ Copiar o token
3. ✅ Configurar no painel
4. ✅ Testar funcionalidades