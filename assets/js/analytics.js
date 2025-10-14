// Sistema de Analytics
class Analytics {
    constructor() {
        this.storageKey = 'siteAnalytics';
        this.currentPeriod = 7;
        this.chart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Seletor de período
        document.querySelectorAll('[data-period]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = parseInt(e.target.dataset.period);
                this.updateDisplay();
            });
        });
    }

    // Registra uma visita (chamado pelas outras páginas)
    recordVisit(page = window.location.pathname) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const data = this.getData();
        
        // Gera um ID único para o visitante (baseado em localStorage)
        let visitorId = localStorage.getItem('visitorId');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitorId', visitorId);
        }

        // Inicializa dados do dia se não existir
        if (!data.daily[today]) {
            data.daily[today] = {
                visitors: new Set(),
                visits: 0,
                pages: {},
                sessions: []
            };
        }

        // Registra a visita
        data.daily[today].visitors.add(visitorId);
        data.daily[today].visits++;
        
        // Registra a página
        if (!data.daily[today].pages[page]) {
            data.daily[today].pages[page] = 0;
        }
        data.daily[today].pages[page]++;

        // Registra sessão
        data.daily[today].sessions.push({
            visitorId,
            page,
            timestamp: now.toISOString(),
            userAgent: navigator.userAgent
        });

        // Converte Set para Array para armazenamento
        const dataToStore = JSON.parse(JSON.stringify(data));
        Object.keys(dataToStore.daily).forEach(date => {
            dataToStore.daily[date].visitors = Array.from(data.daily[date].visitors);
        });

        localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
    }

    getData() {
        const stored = localStorage.getItem(this.storageKey);
        if (!stored) {
            return {
                daily: {},
                totalVisitors: new Set(),
                totalVisits: 0
            };
        }

        const data = JSON.parse(stored);
        
        // Converte Arrays de volta para Sets
        Object.keys(data.daily).forEach(date => {
            data.daily[date].visitors = new Set(data.daily[date].visitors);
        });

        return data;
    }

    getFilteredData() {
        const data = this.getData();
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - this.currentPeriod);

        const filtered = {};
        Object.keys(data.daily).forEach(dateStr => {
            const date = new Date(dateStr);
            if (date >= startDate && date <= endDate) {
                filtered[dateStr] = data.daily[dateStr];
            }
        });

        return filtered;
    }

    updateDisplay() {
        const data = this.getFilteredData();
        this.updateStats(data);
        this.updateChart(data);
        this.updateTopPages(data);
        this.updateDetailsTable(data);
    }

    updateStats(data) {
        let totalVisitors = new Set();
        let totalVisits = 0;
        let todayVisits = 0;
        
        const today = new Date().toISOString().split('T')[0];

        Object.keys(data).forEach(date => {
            const dayData = data[date];
            dayData.visitors.forEach(visitor => totalVisitors.add(visitor));
            totalVisits += dayData.visits;
            
            if (date === today) {
                todayVisits = dayData.visits;
            }
        });

        const avgDaily = Object.keys(data).length > 0 ? 
            Math.round(totalVisits / Object.keys(data).length) : 0;

        document.getElementById('totalVisitors').textContent = totalVisitors.size;
        document.getElementById('totalViews').textContent = totalVisits;
        document.getElementById('todayViews').textContent = todayVisits;
        document.getElementById('avgDaily').textContent = avgDaily;
    }

    updateChart(data) {
        const ctx = document.getElementById('visitsChart').getContext('2d');
        
        // Prepara dados para o gráfico
        const dates = [];
        const visits = [];
        const visitors = [];

        // Gera todas as datas no período
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - this.currentPeriod);

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dates.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            
            if (data[dateStr]) {
                visits.push(data[dateStr].visits);
                visitors.push(data[dateStr].visitors.size);
            } else {
                visits.push(0);
                visitors.push(0);
            }
        }

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Visitas',
                    data: visits,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Visitantes Únicos',
                    data: visitors,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateTopPages(data) {
        const pageStats = {};
        
        Object.keys(data).forEach(date => {
            const dayData = data[date];
            Object.keys(dayData.pages || {}).forEach(page => {
                if (!pageStats[page]) {
                    pageStats[page] = 0;
                }
                pageStats[page] += dayData.pages[page];
            });
        });

        const sortedPages = Object.entries(pageStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);

        const container = document.getElementById('topPages');
        container.innerHTML = '';

        if (sortedPages.length === 0) {
            container.innerHTML = '<p class="text-muted">Nenhum dado disponível</p>';
            return;
        }

        sortedPages.forEach(([page, visits]) => {
            const pageName = this.getPageName(page);
            const percentage = Math.round((visits / Object.values(pageStats).reduce((a, b) => a + b, 0)) * 100);
            
            container.innerHTML += `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong>${pageName}</strong>
                        <br>
                        <small class="text-muted">${page}</small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-primary">${visits}</span>
                        <br>
                        <small class="text-muted">${percentage}%</small>
                    </div>
                </div>
                <div class="progress mb-3" style="height: 4px;">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                </div>
            `;
        });
    }

    updateDetailsTable(data) {
        const tbody = document.getElementById('detailsTable');
        tbody.innerHTML = '';

        const sortedDates = Object.keys(data).sort().reverse();

        if (sortedDates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum dado disponível</td></tr>';
            return;
        }

        sortedDates.forEach(date => {
            const dayData = data[date];
            const formattedDate = new Date(date).toLocaleDateString('pt-BR');
            
            Object.keys(dayData.pages || {}).forEach(page => {
                const visits = dayData.pages[page];
                const uniqueVisitors = dayData.visitors.size;
                const avgTime = '2m 30s'; // Placeholder - seria calculado com dados reais
                
                tbody.innerHTML += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${this.getPageName(page)}</td>
                        <td>${uniqueVisitors}</td>
                        <td>${visits}</td>
                        <td>${avgTime}</td>
                    </tr>
                `;
            });
        });
    }

    getPageName(path) {
        const pageNames = {
            '/': 'Página Inicial',
            '/index.html': 'Página Inicial',
            '/dashboard.html': 'Dashboard',
            '/lista-catequistas.html': 'Lista de Catequistas',
            '/aniversarios.html': 'Aniversários',
            '/analytics.html': 'Analytics'
        };
        
        return pageNames[path] || path.split('/').pop() || 'Página Inicial';
    }

    // Método para limpar dados (útil para testes)
    clearData() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('visitorId');
        this.updateDisplay();
    }

    // Método para exportar dados
    exportData() {
        const data = this.getData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    loadData() {
        // Simula alguns dados iniciais se não houver dados
        const data = this.getData();
        if (Object.keys(data.daily).length === 0) {
            this.generateSampleData();
        }
    }

    generateSampleData() {
        // Gera dados de exemplo para demonstração
        const pages = ['/', '/dashboard.html', '/lista-catequistas.html', '/aniversarios.html'];
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const visits = Math.floor(Math.random() * 20) + 5;
            const visitors = Math.floor(visits * 0.7) + 1;
            
            for (let v = 0; v < visits; v++) {
                const randomPage = pages[Math.floor(Math.random() * pages.length)];
                this.recordVisit(randomPage);
            }
        }
    }
}

// Inicializa o sistema de analytics
const analytics = new Analytics();

// Função global para registrar visitas (chamada pelas outras páginas)
window.recordPageVisit = function(page) {
    analytics.recordVisit(page);
};

// Adiciona botões de ação (apenas na página de analytics)
if (window.location.pathname.includes('analytics.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        // Adiciona botões de ação no cabeçalho
        const header = document.querySelector('h1').parentElement;
        header.innerHTML += `
            <div class="col-12 mt-3">
                <button class="btn btn-outline-danger btn-sm me-2" onclick="analytics.clearData()">
                    <i class="fas fa-trash"></i> Limpar Dados
                </button>
                <button class="btn btn-outline-success btn-sm" onclick="analytics.exportData()">
                    <i class="fas fa-download"></i> Exportar Dados
                </button>
            </div>
        `;
    });
}