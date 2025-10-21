/**
 * Excel Manager
 * Handles Excel file processing, data management, and synchronization
 */
class ExcelManager {
    constructor() {
        this.currentData = null;
        this.originalData = null;
        this.catechists = new Map();
        this.catechumens = [];
        this.classes = new Map();
        
        // GitHub integration
        this.githubAPI = new GitHubAPI();
    }

    /**
     * Load Excel file from input
     */
    async loadExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    const processedData = this.processExcelData(jsonData);
                    resolve(processedData);
                } catch (error) {
                    reject(new Error('Erro ao processar arquivo Excel: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Process raw Excel data into structured format
     */
    processExcelData(rawData) {
        if (!rawData || rawData.length < 2) {
            throw new Error('Arquivo Excel vazio ou inválido');
        }

        const headers = rawData[0];
        const rows = rawData.slice(1);

        // Find column indices
        const columnMap = this.mapColumns(headers);
        
        // Clear existing data
        this.catechists.clear();
        this.catechumens = [];
        this.classes.clear();

        // Process each row
        rows.forEach((row, index) => {
            if (this.isValidRow(row, columnMap)) {
                const catechumen = this.createCatechumenFromRow(row, columnMap, index + 2); // +2 for header and 1-based indexing
                this.catechumens.push(catechumen);
                this.updateCatechistsAndClasses(catechumen);
            }
        });

        this.currentData = {
            headers,
            rows: rawData,
            processed: {
                catechumens: this.catechumens,
                catechists: Array.from(this.catechists.entries()),
                classes: Array.from(this.classes.entries())
            },
            metadata: {
                totalRows: rows.length,
                validRows: this.catechumens.length,
                processedAt: new Date().toISOString()
            }
        };

        this.originalData = JSON.parse(JSON.stringify(this.currentData));
        return this.currentData;
    }

    /**
     * Map column headers to standard field names
     */
    mapColumns(headers) {
        const map = {};
        
        headers.forEach((header, index) => {
            if (!header) return;
            
            const normalized = header.toLowerCase().trim();
            
            if (normalized.includes('nome')) map.name = index;
            else if (normalized.includes('nascimento') || normalized.includes('data')) map.birthdate = index;
            else if (normalized.includes('centro')) map.center = index;
            else if (normalized.includes('etapa')) map.stage = index;
            else if (normalized.includes('sala')) map.room = index;
            else if (normalized.includes('horário') || normalized.includes('horario')) map.schedule = index;
            else if (normalized.includes('catequista')) map.catechist = index;
            else if (normalized.includes('resultado')) map.result = index;
            else if (normalized.includes('telefone')) map.phone = index;
            else if (normalized.includes('endereço') || normalized.includes('endereco')) map.address = index;
            else if (normalized.includes('pai')) map.father = index;
            else if (normalized.includes('mãe') || normalized.includes('mae')) map.mother = index;
        });

        return map;
    }

    /**
     * Check if row has required data
     */
    isValidRow(row, columnMap) {
        return row && row[columnMap.name] && String(row[columnMap.name]).trim();
    }

    /**
     * Create catechumen object from Excel row
     */
    createCatechumenFromRow(row, columnMap, rowNumber) {
        const catechumen = {
            id: `cat_${rowNumber}`,
            rowNumber,
            name: this.cleanValue(row[columnMap.name]),
            birthdate: this.cleanValue(row[columnMap.birthdate]),
            center: this.cleanValue(row[columnMap.center]),
            stage: this.cleanValue(row[columnMap.stage]),
            room: this.cleanValue(row[columnMap.room]),
            schedule: this.cleanValue(row[columnMap.schedule]),
            catechist: this.cleanValue(row[columnMap.catechist]),
            result: this.cleanValue(row[columnMap.result]),
            phone: this.cleanValue(row[columnMap.phone]),
            address: this.cleanValue(row[columnMap.address]),
            father: this.cleanValue(row[columnMap.father]),
            mother: this.cleanValue(row[columnMap.mother]),
            additionalData: {}
        };

        // Add any additional columns
        row.forEach((value, index) => {
            if (!Object.values(columnMap).includes(index) && value) {
                const header = this.currentData?.headers?.[index] || `col_${index}`;
                catechumen.additionalData[header] = this.cleanValue(value);
            }
        });

        return catechumen;
    }

    /**
     * Clean and normalize cell values
     */
    cleanValue(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    /**
     * Update catechists and classes maps
     */
    updateCatechistsAndClasses(catechumen) {
        const classKey = `${catechumen.center}_${catechumen.stage}_${catechumen.schedule}`;
        
        // Update classes
        if (!this.classes.has(classKey)) {
            this.classes.set(classKey, {
                id: classKey,
                center: catechumen.center,
                stage: catechumen.stage,
                schedule: catechumen.schedule,
                room: catechumen.room,
                catechists: new Set(),
                students: []
            });
        }
        
        const classInfo = this.classes.get(classKey);
        classInfo.students.push(catechumen);
        
        // Update catechists
        if (catechumen.catechist) {
            const catechistNames = catechumen.catechist.split('|').map(name => name.trim());
            
            catechistNames.forEach(name => {
                if (name) {
                    classInfo.catechists.add(name);
                    
                    if (!this.catechists.has(name)) {
                        this.catechists.set(name, {
                            name,
                            classes: new Set(),
                            students: []
                        });
                    }
                    
                    const catechistInfo = this.catechists.get(name);
                    catechistInfo.classes.add(classKey);
                    catechistInfo.students.push(catechumen);
                }
            });
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalCatechumens: this.catechumens.length,
            totalCatechists: this.catechists.size,
            totalClasses: this.classes.size,
            centers: [...new Set(this.catechumens.map(c => c.center))].filter(Boolean),
            stages: [...new Set(this.catechumens.map(c => c.stage))].filter(Boolean),
            schedules: [...new Set(this.catechumens.map(c => c.schedule))].filter(Boolean),
            results: this.getResultsDistribution()
        };
    }

    /**
     * Get results distribution
     */
    getResultsDistribution() {
        const distribution = {};
        this.catechumens.forEach(catechumen => {
            const result = catechumen.result || 'Não informado';
            distribution[result] = (distribution[result] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Add new catechumen
     */
    addCatechumen(data) {
        const newId = `cat_new_${Date.now()}`;
        const catechumen = {
            id: newId,
            rowNumber: this.catechumens.length + 2,
            name: data.name || '',
            birthdate: data.birthdate || '',
            center: data.center || '',
            stage: data.stage || '',
            room: data.room || '',
            schedule: data.schedule || '',
            catechist: data.catechist || '',
            result: data.result || '',
            phone: data.phone || '',
            address: data.address || '',
            father: data.father || '',
            mother: data.mother || '',
            additionalData: data.additionalData || {}
        };

        this.catechumens.push(catechumen);
        this.updateCatechistsAndClasses(catechumen);
        
        return catechumen;
    }

    /**
     * Update catechumen
     */
    updateCatechumen(id, data) {
        const index = this.catechumens.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error('Catecúmeno não encontrado');
        }

        const catechumen = this.catechumens[index];
        Object.assign(catechumen, data);
        
        // Rebuild catechists and classes
        this.rebuildCatechistsAndClasses();
        
        return catechumen;
    }

    /**
     * Remove catechumen
     */
    removeCatechumen(id) {
        const index = this.catechumens.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error('Catecúmeno não encontrado');
        }

        this.catechumens.splice(index, 1);
        this.rebuildCatechistsAndClasses();
        
        return true;
    }

    /**
     * Rebuild catechists and classes after changes
     */
    rebuildCatechistsAndClasses() {
        this.catechists.clear();
        this.classes.clear();
        
        this.catechumens.forEach(catechumen => {
            this.updateCatechistsAndClasses(catechumen);
        });
    }

    /**
     * Generate report
     */
    generateReport(type = 'general') {
        const stats = this.getStatistics();
        
        switch (type) {
            case 'general':
                return this.generateGeneralReport(stats);
            case 'catechists':
                return this.generateCatechistsReport();
            case 'classes':
                return this.generateClassesReport();
            case 'results':
                return this.generateResultsReport(stats);
            default:
                throw new Error('Tipo de relatório não suportado');
        }
    }

    /**
     * Generate general report
     */
    generateGeneralReport(stats) {
        return {
            title: 'Relatório Geral da Catequese',
            generatedAt: new Date().toISOString(),
            summary: {
                totalCatechumens: stats.totalCatechumens,
                totalCatechists: stats.totalCatechists,
                totalClasses: stats.totalClasses,
                centers: stats.centers.length,
                stages: stats.stages.length
            },
            details: {
                centersList: stats.centers,
                stagesList: stats.stages,
                schedulesList: stats.schedules,
                resultsDistribution: stats.results
            },
            data: this.catechumens
        };
    }

    /**
     * Generate catechists report
     */
    generateCatechistsReport() {
        const catechistsData = [];
        
        this.catechists.forEach((info, name) => {
            catechistsData.push({
                name,
                totalStudents: info.students.length,
                classes: Array.from(info.classes),
                students: info.students.map(s => ({
                    name: s.name,
                    center: s.center,
                    stage: s.stage,
                    result: s.result
                }))
            });
        });

        return {
            title: 'Relatório de Catequistas',
            generatedAt: new Date().toISOString(),
            summary: {
                totalCatechists: catechistsData.length,
                averageStudentsPerCatechist: Math.round(this.catechumens.length / catechistsData.length)
            },
            data: catechistsData
        };
    }

    /**
     * Generate classes report
     */
    generateClassesReport() {
        const classesData = [];
        
        this.classes.forEach((info, classKey) => {
            classesData.push({
                id: classKey,
                center: info.center,
                stage: info.stage,
                schedule: info.schedule,
                room: info.room,
                totalStudents: info.students.length,
                catechists: Array.from(info.catechists),
                students: info.students.map(s => ({
                    name: s.name,
                    result: s.result,
                    birthdate: s.birthdate
                }))
            });
        });

        return {
            title: 'Relatório de Turmas',
            generatedAt: new Date().toISOString(),
            summary: {
                totalClasses: classesData.length,
                averageStudentsPerClass: Math.round(this.catechumens.length / classesData.length)
            },
            data: classesData
        };
    }

    /**
     * Generate results report
     */
    generateResultsReport(stats) {
        return {
            title: 'Relatório de Resultados',
            generatedAt: new Date().toISOString(),
            summary: stats.results,
            details: Object.keys(stats.results).map(result => ({
                result,
                count: stats.results[result],
                percentage: Math.round((stats.results[result] / stats.totalCatechumens) * 100),
                students: this.catechumens.filter(c => (c.result || 'Não informado') === result)
            }))
        };
    }

    /**
     * Export to Excel format
     */
    exportToExcel() {
        const headers = this.currentData?.headers || [
            'Nome', 'Nascimento', 'Centro', 'Etapa', 'Sala', 'Horário', 'Catequistas', 'Resultado'
        ];

        const rows = [headers];
        
        this.catechumens.forEach(catechumen => {
            const row = [
                catechumen.name,
                catechumen.birthdate,
                catechumen.center,
                catechumen.stage,
                catechumen.room,
                catechumen.schedule,
                catechumen.catechist,
                catechumen.result
            ];
            
            // Add additional data
            Object.values(catechumen.additionalData).forEach(value => {
                row.push(value);
            });
            
            rows.push(row);
        });

        return rows;
    }

    /**
     * Save to GitHub
     */
    async saveToGitHub() {
        if (!this.githubAPI.isConfigured()) {
            throw new Error('GitHub não está configurado');
        }

        const excelData = this.exportToExcel();
        const jsonData = {
            headers: excelData[0],
            rows: excelData,
            metadata: {
                totalRecords: this.catechumens.length,
                lastUpdated: new Date().toISOString(),
                updatedBy: 'admin-panel'
            },
            statistics: this.getStatistics()
        };

        return await this.githubAPI.saveExcelData(jsonData);
    }
}

// Make available globally
window.ExcelManager = ExcelManager;