/**
 * Data Manager
 * Manages catechists and catechumens data with Excel synchronization
 */
class DataManager {
    constructor(fileManager) {
        this.fileManager = fileManager;
        this.currentData = null;
        this.originalData = null;
        this.container = null;
        
        // Data structure
        this.catechists = new Map(); // Map of class -> catechists
        this.catechumens = []; // Array of catechumen objects
        
        // UI state
        this.currentView = 'overview'; // overview, catechists, catechumens
        this.selectedClass = null;
        this.selectedCatechumen = null;
        
        this.init();
    }

    /**
     * Initialize the data manager
     */
    init() {
        this.createInterface();
        this.loadData();
    }

    /**
     * Create the main interface
     */
    createInterface() {
        const container = document.getElementById('data-manager-container');
        if (!container) return;

        this.container = container;
        container.innerHTML = `
            <div class="data-manager-wrapper">
                <div class="data-manager-header">
                    <h2>Gerenciamento de Dados</h2>
                    <div class="data-actions">
                        <button id="load-excel-btn" class="btn btn-primary">
                            📊 Carregar Excel
                        </button>
                        <button id="save-excel-btn" class="btn btn-success" disabled>
                            💾 Salvar Excel
                        </button>
                        <button id="export-excel-btn" class="btn btn-secondary" disabled>
                            📤 Exportar Excel
                        </button>
                    </div>
                </div>

                <div class="data-navigation">
                    <button class="nav-btn active" data-view="overview">📋 Visão Geral</button>
                    <button class="nav-btn" data-view="catechists">👥 Catequistas</button>
                    <button class="nav-btn" data-view="catechumens">🎓 Catecúmenos</button>
                </div>

                <div class="data-content">
                    <div id="overview-view" class="data-view active">
                        <div class="overview-stats">
                            <div class="stat-card">
                                <h3>Total de Turmas</h3>
                                <span id="total-classes">0</span>
                            </div>
                            <div class="stat-card">
                                <h3>Total de Catequistas</h3>
                                <span id="total-catechists">0</span>
                            </div>
                            <div class="stat-card">
                                <h3>Total de Catecúmenos</h3>
                                <span id="total-catechumens">0</span>
                            </div>
                        </div>
                        <div id="classes-overview"></div>
                    </div>

                    <div id="catechists-view" class="data-view">
                        <div class="catechists-header">
                            <h3>Gerenciar Catequistas</h3>
                            <button id="add-catechist-btn" class="btn btn-primary">➕ Adicionar Catequista</button>
                        </div>
                        <div id="catechists-list"></div>
                    </div>

                    <div id="catechumens-view" class="data-view">
                        <div class="catechumens-header">
                            <h3>Gerenciar Catecúmenos</h3>
                            <div class="catechumens-filters">
                                <select id="class-filter">
                                    <option value="">Todas as turmas</option>
                                </select>
                                <input type="text" id="search-catechumens" placeholder="Buscar catecúmeno...">
                                <button id="add-catechumen-btn" class="btn btn-primary">➕ Adicionar Catecúmeno</button>
                            </div>
                        </div>
                        <div id="catechumens-list"></div>
                    </div>
                </div>
            </div>

            <!-- Modal for editing -->
            <div id="edit-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title">Editar</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-form"></form>
                    </div>
                    <div class="modal-footer">
                        <button id="save-changes-btn" class="btn btn-primary">Salvar</button>
                        <button id="cancel-changes-btn" class="btn btn-secondary">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Navigation
        this.container.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // File operations
        document.getElementById('load-excel-btn')?.addEventListener('click', () => this.loadExcelFile());
        document.getElementById('save-excel-btn')?.addEventListener('click', () => this.saveToExcel());
        document.getElementById('export-excel-btn')?.addEventListener('click', () => this.exportExcel());

        // Add buttons
        document.getElementById('add-catechist-btn')?.addEventListener('click', () => this.addCatechist());
        document.getElementById('add-catechumen-btn')?.addEventListener('click', () => this.addCatechumen());

        // Search and filter
        document.getElementById('search-catechumens')?.addEventListener('input', (e) => this.filterCatechumens(e.target.value));
        document.getElementById('class-filter')?.addEventListener('change', (e) => this.filterByClass(e.target.value));

        // Modal
        document.getElementById('save-changes-btn')?.addEventListener('click', () => this.saveChanges());
        document.getElementById('cancel-changes-btn')?.addEventListener('click', () => this.closeModal());
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
    }

    /**
     * Switch between views
     */
    switchView(view) {
        // Update navigation
        this.container.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update content
        this.container.querySelectorAll('.data-view').forEach(viewEl => {
            viewEl.classList.toggle('active', viewEl.id === `${view}-view`);
        });

        this.currentView = view;
        this.refreshCurrentView();
    }

    /**
     * Refresh current view
     */
    refreshCurrentView() {
        switch (this.currentView) {
            case 'overview':
                this.renderOverview();
                break;
            case 'catechists':
                this.renderCatechists();
                break;
            case 'catechumens':
                this.renderCatechumens();
                break;
        }
    }

    /**
     * Load data from Excel file
     */
    async loadData() {
        try {
            // Try to load existing data
            const data = await this.fileManager.loadExcelData();
            if (data) {
                this.processExcelData(data);
                this.refreshCurrentView();
            }
        } catch (error) {
            console.log('No existing data found, starting fresh');
        }
    }

    /**
     * Process Excel data
     */
    processExcelData(data) {
        this.currentData = data;
        this.originalData = JSON.parse(JSON.stringify(data));

        // Clear existing data
        this.catechists.clear();
        this.catechumens = [];

        // Process data
        if (data.sheets && data.sheets[0]) {
            const sheet = data.sheets[0];
            this.parseSheetData(sheet);
        }

        this.updateStats();
    }

    /**
     * Parse sheet data
     */
    parseSheetData(sheet) {
        const rows = sheet.data;
        if (!rows || rows.length < 2) return;

        const headers = rows[0];
        const nameIndex = headers.findIndex(h => h && h.toLowerCase().includes('nome'));
        const classIndex = headers.findIndex(h => h && (h.toLowerCase().includes('turma') || h.toLowerCase().includes('etapa')));
        const catechistIndex = headers.findIndex(h => h && h.toLowerCase().includes('catequista'));

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[nameIndex]) continue;

            const catechumen = {
                id: i,
                name: row[nameIndex] || '',
                class: row[classIndex] || '',
                catechist: row[catechistIndex] || '',
                rowIndex: i,
                data: {}
            };

            // Add all other fields
            headers.forEach((header, index) => {
                if (header && index !== nameIndex && index !== classIndex && index !== catechistIndex) {
                    catechumen.data[header] = row[index] || '';
                }
            });

            this.catechumens.push(catechumen);

            // Track catechists by class
            if (catechumen.class && catechumen.catechist) {
                if (!this.catechists.has(catechumen.class)) {
                    this.catechists.set(catechumen.class, new Set());
                }
                this.catechists.get(catechumen.class).add(catechumen.catechist);
            }
        }
    }

    /**
     * Update statistics
     */
    updateStats() {
        document.getElementById('total-classes').textContent = this.catechists.size;
        document.getElementById('total-catechists').textContent = 
            Array.from(this.catechists.values()).reduce((total, set) => total + set.size, 0);
        document.getElementById('total-catechumens').textContent = this.catechumens.length;

        // Enable/disable buttons
        const hasData = this.catechumens.length > 0;
        document.getElementById('save-excel-btn').disabled = !hasData;
        document.getElementById('export-excel-btn').disabled = !hasData;
    }

    /**
     * Render overview
     */
    renderOverview() {
        const container = document.getElementById('classes-overview');
        if (!container) return;

        let html = '<div class="classes-grid">';
        
        for (const [className, catechists] of this.catechists) {
            const classStudents = this.catechumens.filter(c => c.class === className);
            html += `
                <div class="class-card">
                    <h4>${className}</h4>
                    <div class="class-info">
                        <p><strong>Catequistas:</strong> ${Array.from(catechists).join(', ')}</p>
                        <p><strong>Catecúmenos:</strong> ${classStudents.length}</p>
                    </div>
                    <div class="class-actions">
                        <button class="btn btn-sm btn-primary" onclick="dataManager.editClass('${className}')">
                            ✏️ Editar Turma
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="dataManager.viewClassDetails('${className}')">
                            👁️ Ver Detalhes
                        </button>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Render catechists view
     */
    renderCatechists() {
        const container = document.getElementById('catechists-list');
        if (!container) return;

        let html = '<div class="catechists-grid">';
        
        for (const [className, catechists] of this.catechists) {
            html += `
                <div class="catechist-group">
                    <h4>Turma: ${className}</h4>
                    <div class="catechists-in-class">
            `;
            
            for (const catechist of catechists) {
                const studentsCount = this.catechumens.filter(c => c.class === className && c.catechist === catechist).length;
                html += `
                    <div class="catechist-card">
                        <div class="catechist-info">
                            <h5>${catechist}</h5>
                            <p>${studentsCount} catecúmenos</p>
                        </div>
                        <div class="catechist-actions">
                            <button class="btn btn-sm btn-primary" onclick="dataManager.editCatechist('${className}', '${catechist}')">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="dataManager.removeCatechist('${className}', '${catechist}')">
                                🗑️ Remover
                            </button>
                        </div>
                    </div>
                `;
            }
            
            html += `
                    </div>
                    <button class="btn btn-sm btn-success" onclick="dataManager.addCatechistToClass('${className}')">
                        ➕ Adicionar Catequista à Turma
                    </button>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Render catechumens view
     */
    renderCatechumens() {
        const container = document.getElementById('catechumens-list');
        if (!container) return;

        // Update class filter
        this.updateClassFilter();

        // Get filtered catechumens
        const filteredCatechumens = this.getFilteredCatechumens();

        let html = `
            <div class="catechumens-table-wrapper">
                <table class="catechumens-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Turma</th>
                            <th>Catequista</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredCatechumens.forEach(catechumen => {
            html += `
                <tr>
                    <td>${catechumen.name}</td>
                    <td>${catechumen.class}</td>
                    <td>${catechumen.catechist}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="dataManager.editCatechumen(${catechumen.id})">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="dataManager.removeCatechumen(${catechumen.id})">
                            🗑️ Remover
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Update class filter dropdown
     */
    updateClassFilter() {
        const select = document.getElementById('class-filter');
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Todas as turmas</option>';

        for (const className of this.catechists.keys()) {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            if (className === currentValue) option.selected = true;
            select.appendChild(option);
        }
    }

    /**
     * Get filtered catechumens
     */
    getFilteredCatechumens() {
        let filtered = [...this.catechumens];

        // Filter by class
        const classFilter = document.getElementById('class-filter')?.value;
        if (classFilter) {
            filtered = filtered.filter(c => c.class === classFilter);
        }

        // Filter by search
        const searchFilter = document.getElementById('search-catechumens')?.value.toLowerCase();
        if (searchFilter) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchFilter) ||
                c.class.toLowerCase().includes(searchFilter) ||
                c.catechist.toLowerCase().includes(searchFilter)
            );
        }

        return filtered;
    }

    /**
     * Edit class (change catechists for entire class)
     */
    editClass(className) {
        const catechists = Array.from(this.catechists.get(className) || []);
        this.showModal('Editar Turma: ' + className, {
            catechists: catechists.join(', ')
        }, 'class', className);
    }

    /**
     * Edit individual catechist
     */
    editCatechist(className, catechist) {
        this.showModal('Editar Catequista', {
            name: catechist,
            class: className
        }, 'catechist', { className, catechist });
    }

    /**
     * Edit catechumen
     */
    editCatechumen(id) {
        const catechumen = this.catechumens.find(c => c.id === id);
        if (!catechumen) return;

        const formData = {
            name: catechumen.name,
            class: catechumen.class,
            catechist: catechumen.catechist,
            ...catechumen.data
        };

        this.showModal('Editar Catecúmeno', formData, 'catechumen', id);
    }

    /**
     * Show modal for editing
     */
    showModal(title, data, type, identifier) {
        const modal = document.getElementById('edit-modal');
        const titleEl = document.getElementById('modal-title');
        const form = document.getElementById('edit-form');

        titleEl.textContent = title;
        
        // Store modal context
        modal.dataset.type = type;
        modal.dataset.identifier = JSON.stringify(identifier);

        // Build form
        let formHTML = '';
        for (const [key, value] of Object.entries(data)) {
            const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
            if (key === 'catechists') {
                formHTML += `
                    <div class="form-group">
                        <label for="field-${key}">${fieldName}:</label>
                        <textarea id="field-${key}" name="${key}" rows="3" placeholder="Separe os nomes por vírgula">${value}</textarea>
                    </div>
                `;
            } else {
                formHTML += `
                    <div class="form-group">
                        <label for="field-${key}">${fieldName}:</label>
                        <input type="text" id="field-${key}" name="${key}" value="${value}">
                    </div>
                `;
            }
        }

        form.innerHTML = formHTML;
        modal.style.display = 'block';
    }

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('edit-modal').style.display = 'none';
    }

    /**
     * Save changes from modal
     */
    saveChanges() {
        const modal = document.getElementById('edit-modal');
        const form = document.getElementById('edit-form');
        const type = modal.dataset.type;
        const identifier = JSON.parse(modal.dataset.identifier);

        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        switch (type) {
            case 'class':
                this.updateClass(identifier, data);
                break;
            case 'catechist':
                this.updateCatechist(identifier, data);
                break;
            case 'catechumen':
                this.updateCatechumen(identifier, data);
                break;
        }

        this.closeModal();
        this.refreshCurrentView();
        this.updateStats();
    }

    /**
     * Update class catechists
     */
    updateClass(className, data) {
        const newCatechists = data.catechists.split(',').map(c => c.trim()).filter(c => c);
        
        // Update all catechumens in this class
        this.catechumens.forEach(catechumen => {
            if (catechumen.class === className) {
                // Assign catechists in round-robin fashion
                const index = this.catechumens.filter(c => c.class === className).indexOf(catechumen);
                catechumen.catechist = newCatechists[index % newCatechists.length] || newCatechists[0] || '';
            }
        });

        // Update catechists map
        this.catechists.set(className, new Set(newCatechists));
    }

    /**
     * Update individual catechist
     */
    updateCatechist(identifier, data) {
        const { className, catechist: oldCatechist } = identifier;
        const newCatechist = data.name;

        // Update all catechumens with this catechist
        this.catechumens.forEach(catechumen => {
            if (catechumen.class === className && catechumen.catechist === oldCatechist) {
                catechumen.catechist = newCatechist;
            }
        });

        // Update catechists map
        const catechists = this.catechists.get(className);
        if (catechists) {
            catechists.delete(oldCatechist);
            catechists.add(newCatechist);
        }
    }

    /**
     * Update catechumen
     */
    updateCatechumen(id, data) {
        const catechumen = this.catechumens.find(c => c.id === id);
        if (!catechumen) return;

        catechumen.name = data.name;
        catechumen.class = data.class;
        catechumen.catechist = data.catechist;

        // Update additional data
        Object.keys(data).forEach(key => {
            if (!['name', 'class', 'catechist'].includes(key)) {
                catechumen.data[key] = data[key];
            }
        });

        // Update catechists map if class changed
        if (!this.catechists.has(data.class)) {
            this.catechists.set(data.class, new Set());
        }
        this.catechists.get(data.class).add(data.catechist);
    }

    /**
     * Load Excel file
     */
    async loadExcelFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const data = await this.fileManager.processExcelFile(file);
                    this.processExcelData(data);
                    this.refreshCurrentView();
                    this.showNotification('Excel carregado com sucesso!', 'success');
                } catch (error) {
                    this.showNotification('Erro ao carregar Excel: ' + error.message, 'error');
                }
            }
        };
        input.click();
    }

    /**
     * Save to Excel
     */
    async saveToExcel() {
        try {
            await this.syncToExcel();
            this.showNotification('Dados salvos no Excel com sucesso!', 'success');
        } catch (error) {
            this.showNotification('Erro ao salvar: ' + error.message, 'error');
        }
    }

    /**
     * Sync data back to Excel format
     */
    async syncToExcel() {
        if (!this.currentData) return;

        const sheet = this.currentData.sheets[0];
        const rows = sheet.data;

        // Update existing rows
        this.catechumens.forEach(catechumen => {
            if (catechumen.rowIndex < rows.length) {
                const row = rows[catechumen.rowIndex];
                const headers = rows[0];

                // Update basic fields
                const nameIndex = headers.findIndex(h => h && h.toLowerCase().includes('nome'));
                const classIndex = headers.findIndex(h => h && (h.toLowerCase().includes('turma') || h.toLowerCase().includes('etapa')));
                const catechistIndex = headers.findIndex(h => h && h.toLowerCase().includes('catequista'));

                if (nameIndex >= 0) row[nameIndex] = catechumen.name;
                if (classIndex >= 0) row[classIndex] = catechumen.class;
                if (catechistIndex >= 0) row[catechistIndex] = catechumen.catechist;

                // Update additional data
                Object.keys(catechumen.data).forEach(key => {
                    const index = headers.findIndex(h => h === key);
                    if (index >= 0) {
                        row[index] = catechumen.data[key];
                    }
                });
            }
        });

        // Save to file system (this would need backend integration)
        await this.fileManager.saveExcelData(this.currentData);
    }

    /**
     * Export Excel
     */
    async exportExcel() {
        try {
            await this.syncToExcel();
            const blob = await this.fileManager.exportToExcel(this.currentData);
            
            // Download file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `catequese-${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showNotification('Excel exportado com sucesso!', 'success');
        } catch (error) {
            this.showNotification('Erro ao exportar: ' + error.message, 'error');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type) {
        if (window.HelperUtils) {
            window.HelperUtils.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // Additional methods for adding/removing items
    addCatechist() {
        this.showModal('Adicionar Catequista', {
            name: '',
            class: ''
        }, 'catechist', { className: '', catechist: '' });
    }

    addCatechumen() {
        this.showModal('Adicionar Catecúmeno', {
            name: '',
            class: '',
            catechist: ''
        }, 'catechumen', 'new');
    }

    removeCatechist(className, catechist) {
        if (confirm(`Remover catequista "${catechist}" da turma "${className}"?`)) {
            // Remove from map
            const catechists = this.catechists.get(className);
            if (catechists) {
                catechists.delete(catechist);
                if (catechists.size === 0) {
                    this.catechists.delete(className);
                }
            }

            // Update catechumens (assign to remaining catechists or leave empty)
            const remainingCatechists = Array.from(this.catechists.get(className) || []);
            this.catechumens.forEach(catechumen => {
                if (catechumen.class === className && catechumen.catechist === catechist) {
                    catechumen.catechist = remainingCatechists[0] || '';
                }
            });

            this.refreshCurrentView();
            this.updateStats();
        }
    }

    removeCatechumen(id) {
        const catechumen = this.catechumens.find(c => c.id === id);
        if (catechumen && confirm(`Remover catecúmeno "${catechumen.name}"?`)) {
            this.catechumens = this.catechumens.filter(c => c.id !== id);
            this.refreshCurrentView();
            this.updateStats();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} else {
    window.DataManager = DataManager;
}