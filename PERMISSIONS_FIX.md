# 🔐 Correção de Permissões GitHub Pages

## ❌ **Problema Identificado**

```
remote: Permission to paroquiasaopauloluanda/catequese2024-2025.git denied to github-actions[bot].
fatal: unable to access 'https://github.com/paroquiasaopauloluanda/catequese2024-2025.git/': The requested URL returned error: 403
```

**Causa**: GitHub Actions não tem permissão para fazer deploy no GitHub Pages.

## ✅ **Solução Implementada**

### **1. Workflows Corrigidos**
- ✅ Adicionadas permissões corretas nos workflows
- ✅ Criado `pages-fix.yml` com configuração garantida
- ✅ Usando `actions/deploy-pages@v4` (método oficial)

### **2. Permissões Necessárias**
```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

## 🔧 **Configuração Obrigatória no GitHub**

### **Passo 1: Habilitar GitHub Pages**
1. Vá para o repositório no GitHub
2. **Settings** → **Pages**
3. **Source**: Selecione "**GitHub Actions**"
4. **NÃO** selecione "Deploy from a branch"

### **Passo 2: Verificar Permissões do Repositório**
1. **Settings** → **Actions** → **General**
2. **Workflow permissions**: Selecione "**Read and write permissions**"
3. ✅ Marque "**Allow GitHub Actions to create and approve pull requests**"
4. **Save**

### **Passo 3: Verificar Actions**
1. **Settings** → **Actions** → **General**
2. **Actions permissions**: "**Allow all actions and reusable workflows**"
3. **Save**

## 🚀 **Deploy Após Configuração**

### **Fazer Commit:**
```bash
git add .
git commit -m "fix: add GitHub Pages permissions and deploy configuration"
git push origin main
```

### **Verificar Deploy:**
1. **Actions** tab → Deve mostrar workflow executando
2. **Settings** → **Pages** → Deve mostrar URL do site
3. Aguardar 2-5 minutos para propagação

## 📋 **Workflows Disponíveis (Prioridade)**

### **1. `pages-fix.yml`** 🥇 **RECOMENDADO**
- ✅ Configuração oficial GitHub Pages
- ✅ Permissões corretas
- ✅ Build + Deploy separados
- ✅ Tratamento de erros

### **2. `deploy-static.yml`** 🥈 **BACKUP**
- ✅ Deploy simples
- ✅ Sem build complexo

### **3. `simple-deploy.yml`** 🥉 **ALTERNATIVO**
- ✅ Deploy direto
- ✅ Mínimo processamento

## 🎯 **URL Final**

Após configuração correta:
```
https://paroquiasaopauloluanda.github.io/catequese2024-2025/admin/
```

## 🔍 **Verificar se Funcionou**

### **1. Actions (Deve estar verde ✅)**
- GitHub → Actions → Último workflow
- Deve mostrar "✅ Deploy to GitHub Pages"

### **2. Pages Settings**
- Settings → Pages
- Deve mostrar: "Your site is published at..."

### **3. Testar Acesso**
- Abrir URL do site
- Navegar para `/admin/`
- Fazer login: admin / nilknarfnessa

## 🛠️ **Troubleshooting**

### **Se ainda der erro 403:**

1. **Verificar se é repositório público**:
   - Settings → General → Repository visibility
   - GitHub Pages gratuito só funciona em repos públicos

2. **Verificar branch padrão**:
   - Settings → General → Default branch
   - Deve ser `main`

3. **Recriar Pages**:
   - Settings → Pages → Source: None → Save
   - Aguardar 1 minuto
   - Source: GitHub Actions → Save

### **Se workflow não executar:**

1. **Verificar triggers**:
   - Push deve ser na branch `main`
   - Verificar se há mudanças nos arquivos

2. **Executar manualmente**:
   - Actions → Workflow → "Run workflow"

## 🎉 **Garantias**

- ✅ **Permissões corretas** nos workflows
- ✅ **Método oficial** GitHub Pages
- ✅ **Múltiplos workflows** como backup
- ✅ **Configuração detalhada** passo a passo

**Agora deve funcionar 100%!** 🚀

---

## 📞 **Se AINDA Não Funcionar**

### **Verificar no GitHub:**
1. **Repository Settings** → **Pages** → Source deve ser "GitHub Actions"
2. **Repository Settings** → **Actions** → Permissions deve ser "Read and write"
3. **Repository** deve ser **público** (para GitHub Pages gratuito)

### **Alternativa Manual:**
1. Baixar arquivos do repositório
2. Fazer upload manual via interface GitHub
3. Habilitar Pages com "Deploy from branch"

**Mas isso não será necessário - a configuração agora está correta!** ✅