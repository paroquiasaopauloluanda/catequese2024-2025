/**
 * Sistema de Gestão de Configurações
 * Carrega e gere todas as configurações do sistema
 */

class ConfigManager {
  constructor() {
    this.config = {};
    this.loaded = false;
    this.loadPromise = null;
  }

  /**
   * Carrega todas as configurações
   */
  async load() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadConfigs();
    return this.loadPromise;
  }

  async _loadConfigs() {
    try {
      // Carrega configurações em paralelo
      const [settings, cores, centrosEtapas] = await Promise.all([
        this._fetchConfig('config/settings.json'),
        this._fetchConfig('config/cores-resultados.json'),
        this._fetchConfig('config/centros-etapas.json')
      ]);

      this.config = {
        settings,
        cores: cores.resultados,
        coresConfig: cores.configuracao,
        centros: centrosEtapas.centros.filter(c => c.ativo),
        etapas: centrosEtapas.etapas.filter(e => e.ativo),
        horarios: centrosEtapas.horarios.filter(h => h.ativo)
      };

      this.loaded = true;
      console.log('✅ Configurações carregadas com sucesso');
      return this.config;
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      this._loadDefaults();
      throw error;
    }
  }

  async _fetchConfig(url) {
    const response = await fetch(url + '?v=' + Date.now());
    if (!response.ok) {
      throw new Error(`Erro ao carregar ${url}: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Carrega configurações padrão em caso de erro
   */
  _loadDefaults() {
    this.config = {
      settings: {
        paroquia: {
          nome: "Paróquia de São Paulo de Luanda",
          secretariado: "Secretariado da Catequese",
          ano_catequetico: "2025/2026",
          data_inicio_formatada: "1 de Outubro de 2025"
        },
        arquivos: {
          dados_principais: "data/dados-catequese.xlsx",
          template_export: "data/template-export.xlsx",
          logo: "assets/images/logo-paroquia.jpg"
        }
      },
      cores: {
        aprovado: { cor: "#16a34a", nome: "Aprovado" },
        reprovado: { cor: "#dc2626", nome: "Reprovado" },
        desistente: { cor: "#6b7280", nome: "Desistente" },
        transferido: { cor: "#2563eb", nome: "Transferido" }
      },
      centros: [],
      etapas: [],
      horarios: []
    };
    this.loaded = true;
  }

  /**
   * Obtém uma configuração específica
   */
  get(path) {
    if (!this.loaded) {
      console.warn('⚠️ Configurações ainda não carregadas');
      return null;
    }

    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Obtém informações da paróquia
   */
  getParoquiaInfo() {
    return this.get('settings.paroquia') || {};
  }

  /**
   * Obtém caminhos dos arquivos
   */
  getFilePaths() {
    return this.get('settings.arquivos') || {};
  }

  /**
   * Obtém cores dos resultados
   */
  getResultadoCores() {
    const cores = this.get('cores') || {};
    const colorMap = {};
    
    for (const [key, config] of Object.entries(cores)) {
      const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      colorMap[normalizedKey] = config.cor || '#6b7280';
    }
    
    return colorMap;
  }

  /**
   * Obtém lista de centros ativos
   */
  getCentros() {
    return this.get('centros') || [];
  }

  /**
   * Obtém lista de etapas ativas
   */
  getEtapas() {
    return this.get('etapas') || [];
  }

  /**
   * Obtém lista de horários ativos
   */
  getHorarios() {
    return this.get('horarios') || [];
  }

  /**
   * Valida se os campos obrigatórios estão presentes
   */
  validateRequiredFields(data) {
    const required = this.get('settings.validacao.campos_obrigatorios') || [];
    const errors = [];

    data.forEach((row, index) => {
      required.forEach(field => {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push(`Linha ${index + 2}: Campo '${field}' é obrigatório`);
        }
      });
    });

    return errors;
  }

  /**
   * Obtém configurações de exportação
   */
  getExportConfig() {
    return this.get('settings.exportacao') || {};
  }

  /**
   * Verifica se deve fazer backup automático
   */
  shouldAutoBackup() {
    return this.get('settings.interface.auto_backup') || false;
  }

  /**
   * Obtém intervalo de backup em horas
   */
  getBackupInterval() {
    return this.get('settings.interface.backup_intervalo_horas') || 24;
  }
}

// Instância global do gerenciador de configurações
window.configManager = new ConfigManager();

// Função utilitária para aguardar o carregamento das configurações
window.waitForConfig = async function() {
  if (!window.configManager.loaded) {
    await window.configManager.load();
  }
  return window.configManager;
};