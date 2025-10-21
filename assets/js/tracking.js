// Script de Rastreamento - Incluir em todas as páginas
(function() {
    'use strict';
    
    // Função para registrar visita
    function recordVisit() {
        const storageKey = 'siteAnalytics';
        const page = window.location.pathname || '/';
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Gera um ID único para o visitante baseado em múltiplos fatores
        let visitorId = localStorage.getItem('visitorId');
        if (!visitorId) {
            // Cria um ID mais robusto baseado em características do navegador
            const fingerprint = [
                navigator.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                navigator.platform
            ].join('|');
            
            const hash = btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
            visitorId = 'visitor_' + hash + '_' + Date.now().toString(36);
            
            try {
                localStorage.setItem('visitorId', visitorId);
            } catch (e) {
                // Se localStorage não estiver disponível (modo privado), usa sessionStorage
                try {
                    sessionStorage.setItem('visitorId', visitorId);
                } catch (e2) {
                    // Se nenhum storage estiver disponível, usa apenas o hash
                    visitorId = 'visitor_' + hash;
                }
            }
        }
        
        // Obtém dados existentes (tenta localStorage primeiro, depois sessionStorage)
        let data = {};
        try {
            let stored = localStorage.getItem(storageKey);
            if (!stored) {
                // Se não encontrar no localStorage, tenta sessionStorage
                stored = sessionStorage.getItem(storageKey);
            }
            if (stored) {
                data = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Erro ao carregar dados de analytics:', e);
            // Tenta recuperar de sessionStorage como fallback
            try {
                const sessionStored = sessionStorage.getItem(storageKey);
                if (sessionStored) {
                    data = JSON.parse(sessionStored);
                }
            } catch (e2) {
                console.warn('Erro ao carregar dados de sessionStorage:', e2);
            }
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
        
        // Salva dados (tenta localStorage primeiro, depois sessionStorage)
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
            // Também salva no sessionStorage como backup
            sessionStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Erro ao salvar no localStorage:', e);
            // Se localStorage falhar, usa apenas sessionStorage
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(data));
            } catch (e2) {
                console.warn('Erro ao salvar dados de analytics:', e2);
            }
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