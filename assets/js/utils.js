/**
 * Utilitários Comuns do Sistema de Catequese
 */

// Normalização de texto para pesquisa
const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Criação de chave de pesquisa (apenas letras e números)
const key = (s) => norm(s).replace(/[^a-z0-9]/g, '');

// Formatação de datas
const fmtDate = (s) => {
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  
  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  
  const m = s.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${dd}/${mm}/${m[3]}`;
  }
  
  return s;
};

// Timestamp atual formatado
const nowStamp = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
};

// Função para obter valores únicos e ordenados
const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));

// Mapeamento de cabeçalhos do Excel
function mapHeaders(cols) {
  const wanted = {
    nome: ['nome', 'nomecompleto'],
    nascimento: ['nascimento', 'datanascimento', 'data', 'dn'],
    centro: ['centro', 'centrodecatequese', 'paroquia', 'comunidade'],
    etapa: ['etapa', 'etapacatequese', 'nivel', 'ano', 'classe'],
    sala: ['sala', 'numerosala', 'turma', 'salaaula'],
    horario: ['horario', 'hora', 'turno', 'periodo', 'diaehora', 'diahora'],
    catequistas: ['catequistas', 'catequista', 'responsaveis', 'responsavel'],
    resultado: ['resultado', 'situacao', 'status']
  };
  
  const idx = {};
  cols.forEach((c, i) => {
    const k = key(c);
    for (const [t, aliases] of Object.entries(wanted)) {
      if (aliases.includes(k)) idx[t] = i;
    }
  });
  
  return idx;
}

// Debounce para otimizar pesquisas
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Validação de email
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validação de telefone (formato brasileiro/angolano)
const isValidPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 9 && cleaned.length <= 15;
};

// Cálculo de idade a partir da data de nascimento
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(birth)) return null;
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Formatação de números
const formatNumber = (num, decimals = 0) => {
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// Geração de ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Cópia para clipboard
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

// Notificações toast
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }
  
  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    document.body.appendChild(this.container);
  }
  
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease;
      cursor: pointer;
    `;
    
    const colors = {
      success: '#16a34a',
      error: '#dc2626',
      warning: '#f59e0b',
      info: '#2563eb'
    };
    
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.textContent = message;
    
    // Adiciona animação CSS
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    this.container.appendChild(toast);
    
    // Remove ao clicar
    toast.addEventListener('click', () => this.remove(toast));
    
    // Remove automaticamente
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }
    
    return toast;
  }
  
  remove(toast) {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
  
  success(message, duration) { return this.show(message, 'success', duration); }
  error(message, duration) { return this.show(message, 'error', duration); }
  warning(message, duration) { return this.show(message, 'warning', duration); }
  info(message, duration) { return this.show(message, 'info', duration); }
}

// Instância global do toast
window.toast = new ToastManager();

// Gerenciador de loading
class LoadingManager {
  constructor() {
    this.overlay = null;
    this.count = 0;
  }
  
  show(message = 'A carregar...') {
    this.count++;
    
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'loading-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
      `;
      
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      `;
      
      const spinner = document.createElement('div');
      spinner.className = 'loading';
      
      const text = document.createElement('span');
      text.textContent = message;
      text.style.fontWeight = '600';
      
      content.appendChild(spinner);
      content.appendChild(text);
      this.overlay.appendChild(content);
      document.body.appendChild(this.overlay);
    }
  }
  
  hide() {
    this.count = Math.max(0, this.count - 1);
    
    if (this.count === 0 && this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}

// Instância global do loading
window.loading = new LoadingManager();

// Exporta utilitários para uso global
window.utils = {
  norm,
  key,
  fmtDate,
  nowStamp,
  uniq,
  mapHeaders,
  debounce,
  isValidEmail,
  isValidPhone,
  calculateAge,
  formatNumber,
  generateId,
  copyToClipboard
};