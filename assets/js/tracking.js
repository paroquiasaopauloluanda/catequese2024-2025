// Script de Rastreamento - Incluir em todas as páginas
(function() {
    'use strict';
    
    // Função para registrar visita
    function recordVisit() {
        const storageKey = 'siteAnalytics';
        const page = window.location.pathname || '/';
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Gera um ID único para o visitante
        let visitorId = localStorage.getItem('visitorId');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitorId', visitorId);
        }
        
        // Obtém dados existentes
        let data = {};
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                data = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Erro ao carregar dados de analytics:', e);
        }
        
        // Inicializa estrutura se necessário
        if (!data.daily) {
            data.daily = {};
        }
        
        if (!data.daily[today]) {
            data.daily[today] = {
                visitors: [],
                visits: 0,
                pages: {},
                sessions: []
            };
        }
        
        // Registra visitante único
        if (!data.daily[today].visitors.includes(visitorId)) {
            data.daily[today].visitors.push(visitorId);
        }
        
        // Incrementa visitas
        data.daily[today].visits++;
        
        // Registra página
        if (!data.daily[today].pages[page]) {
            data.daily[today].pages[page] = 0;
        }
        data.daily[today].pages[page]++;
        
        // Registra sessão
        data.daily[today].sessions.push({
            visitorId: visitorId,
            page: page,
            timestamp: now.toISOString(),
            userAgent: navigator.userAgent.substring(0, 100), // Limita tamanho
            referrer: document.referrer || 'direct'
        });
        
        // Salva dados
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Erro ao salvar dados de analytics:', e);
        }
    }
    
    // Registra a visita quando a página carrega
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', recordVisit);
    } else {
        recordVisit();
    }
    
    // Registra tempo na página (opcional)
    let startTime = Date.now();
    
    window.addEventListener('beforeunload', function() {
        const timeSpent = Date.now() - startTime;
        
        // Salva tempo gasto na página (para futuras análises)
        try {
            const storageKey = 'siteAnalytics';
            const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const today = new Date().toISOString().split('T')[0];
            
            if (data.daily && data.daily[today] && data.daily[today].sessions) {
                const lastSession = data.daily[today].sessions[data.daily[today].sessions.length - 1];
                if (lastSession) {
                    lastSession.timeSpent = timeSpent;
                    localStorage.setItem(storageKey, JSON.stringify(data));
                }
            }
        } catch (e) {
            // Ignora erros silenciosamente
        }
    });
    
})();