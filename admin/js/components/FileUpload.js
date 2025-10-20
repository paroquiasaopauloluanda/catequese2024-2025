/**
 * File Upload Component
 * Handles drag-and-drop file upload interface with preview functionality
 */
class FileUpload {
    constructor(fileManager) {
        this.fileManager = fileManager;
        this.uploadAreas = new Map();
        this.currentPreviews = new Map();
        this.pendingUploads = new Map();
        this.progressTracker = null;
        this.progressBar = null;
        this.activeOperations = new Map();
    }

    /**
     * Set progress tracker and progress bar instances
     */
    setProgressComponents(progressTracker, progressBar) {
        this.progressTracker = progressTracker;
        this.progressBar = progressBar;
    }

    /**
     * Initialize file upload interface
     */
    init() {
        this.createUploadInterface();
        this.attachEventListeners();
    }

    /**
     * Create the main file upload interface
     */
    createUploadInterface() {
        const container = document.getElementById('file-upload-container');
        if (!container) return;

        container.innerHTML = `
            <div class="file-upload-wrapper">
                <div class="upload-sections">
                    ${this.createUploadSection('excel', 'Dados Principais', 'Arquivo Excel com dados da catequese (.xlsx, .xls)', '📊')}
                    ${this.createUploadSection('template', 'Template de Exportação', 'Template Excel para exportação (.xlsx)', '📋')}
                    ${this.createUploadSection('image', 'Logotipo', 'Imagem do logotipo (.jpg, .png)', '🖼️')}
                </div>
                
                <div class="upload-actions">
                    <button id="upload-all-btn" class="btn btn-primary" disabled>
                        Enviar Todos os Arquivos
                    </button>
                    <button id="clear-all-btn" class="btn btn-secondary">
                        Limpar Tudo
                    </button>
                </div>
                
                <div id="upload-results" class="upload-results hidden">
                    <h3>Resultados do Upload</h3>
                    <div id="results-list"></div>
                </div>
            </div>
        `;

        this.initializeUploadAreas();
    }

    /**
     * Create upload section HTML for a specific file type
     */
    createUploadSection(type, title, description, icon) {
        return `
            <div class="upload-section" data-type="${type}">
                <div class="upload-header">
                    <span class="upload-icon">${icon}</span>
                    <div class="upload-info">
                        <h3>${title}</h3>
                        <p>${description}</p>
                    </div>
                </div>
                
                <div class="upload-area" id="upload-area-${type}">
                    <div class="upload-placeholder">
                        <div class="upload-icon-large">${icon}</div>
                        <p class="upload-text">
                            Arraste o arquivo aqui ou 
                            <button class="upload-browse-btn" data-type="${type}">clique para selecionar</button>
                        </p>
                        <small class="upload-hint">${description}</small>
                    </div>
                    
                    <input type="file" id="file-input-${type}" class="file-input" 
                           accept="${this.getAcceptAttribute(type)}" style="display: none;">
                </div>
                
                <div class="file-preview" id="preview-${type}" style="display: none;">
                    <div class="preview-header">
                        <h4>Preview do Arquivo</h4>
                        <button class="btn-remove" data-type="${type}" title="Remover arquivo">×</button>
                    </div>
                    <div class="preview-content" id="preview-content-${type}"></div>
                    <div class="preview-actions">
                        <button class="btn btn-primary btn-upload-single" data-type="${type}">
                            Enviar Arquivo
                        </button>
                    </div>
                </div>
                
                <div class="upload-status" id="status-${type}" style="display: none;">
                    <div class="status-content"></div>
                </div>
            </div>
        `;
    }

    /**
     * Get accept attribute for file input based on type
     */
    getAcceptAttribute(type) {
        const accepts = {
            excel: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
            template: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            image: '.jpg,.jpeg,.png,image/jpeg,image/png'
        };
        return accepts[type] || '';
    }

    /**
     * Initialize drag-and-drop areas
     */
    initializeUploadAreas() {
        const uploadAreas = document.querySelectorAll('.upload-area');
        
        uploadAreas.forEach(area => {
            const type = area.closest('.upload-section').dataset.type;
            this.uploadAreas.set(type, area);
            
            // Drag and drop events
            area.addEventListener('dragover', (e) => this.handleDragOver(e, type));
            area.addEventListener('dragleave', (e) => this.handleDragLeave(e, type));
            area.addEventListener('drop', (e) => this.handleDrop(e, type));
            
            // Click to browse
            const browseBtn = area.querySelector('.upload-browse-btn');
            const fileInput = document.getElementById(`file-input-${type}`);
            
            browseBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e, type));
        });
    }

    /**
     * Attach event listeners for upload actions
     */
    attachEventListeners() {
        // Upload all button
        const uploadAllBtn = document.getElementById('upload-all-btn');
        uploadAllBtn?.addEventListener('click', () => this.uploadAllFiles());
        
        // Clear all button
        const clearAllBtn = document.getElementById('clear-all-btn');
        clearAllBtn?.addEventListener('click', () => this.clearAllFiles());
        
        // Individual upload buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-upload-single')) {
                const type = e.target.dataset.type;
                this.uploadSingleFile(type);
            }
            
            if (e.target.classList.contains('btn-remove')) {
                const type = e.target.dataset.type;
                this.removeFile(type);
            }
        });
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e, type) {
        e.preventDefault();
        e.stopPropagation();
        
        const area = this.uploadAreas.get(type);
        area.classList.add('drag-over');
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e, type) {
        e.preventDefault();
        e.stopPropagation();
        
        const area = this.uploadAreas.get(type);
        if (!area.contains(e.relatedTarget)) {
            area.classList.remove('drag-over');
        }
    }

    /**
     * Handle file drop event
     */
    handleDrop(e, type) {
        e.preventDefault();
        e.stopPropagation();
        
        const area = this.uploadAreas.get(type);
        area.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            this.processFile(files[0], type);
        }
    }

    /**
     * Handle file selection from input
     */
    handleFileSelect(e, type) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFile(files[0], type);
        }
    }

    /**
     * Process selected file
     */
    async processFile(file, type) {
        try {
            // Show loading state
            this.showLoadingState(type);
            
            // Validate file
            const validation = this.fileManager.validateFile(file, type);
            
            if (!validation.isValid) {
                this.showValidationErrors(type, validation.errors);
                return;
            }
            
            // Show warnings if any
            if (validation.warnings.length > 0) {
                this.showValidationWarnings(type, validation.warnings);
            }
            
            // Create preview
            const { preview, metadata } = await this.fileManager.createFilePreview(file, type);
            
            // Store file for later upload
            this.pendingUploads.set(type, file);
            
            // Show preview
            this.showFilePreview(type, preview, metadata);
            
            // Update upload all button state
            this.updateUploadAllButton();
            
        } catch (error) {
            console.error('Error processing file:', error);
            this.showError(type, `Erro ao processar arquivo: ${error.message}`);
        }
    }

    /**
     * Show loading state for upload area
     */
    showLoadingState(type) {
        const area = this.uploadAreas.get(type);
        const placeholder = area.querySelector('.upload-placeholder');
        
        placeholder.innerHTML = `
            <div class="upload-loading">
                <div class="loading-spinner"></div>
                <p>Processando arquivo...</p>
            </div>
        `;
    }

    /**
     * Show validation errors
     */
    showValidationErrors(type, errors) {
        const statusDiv = document.getElementById(`status-${type}`);
        statusDiv.style.display = 'block';
        const errorList = Array.isArray(errors) ? errors : ['Erro de validação desconhecido'];
        statusDiv.innerHTML = `
            <div class="status-error">
                <h4>Erro de Validação</h4>
                <ul>
                    ${errorList.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
        
        // Reset upload area
        this.resetUploadArea(type);
    }

    /**
     * Show validation warnings
     */
    showValidationWarnings(type, warnings) {
        const statusDiv = document.getElementById(`status-${type}`);
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div class="status-warning">
                <h4>Avisos</h4>
                <ul>
                    ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * Show file preview
     */
    showFilePreview(type, preview, metadata) {
        const area = this.uploadAreas.get(type);
        const previewDiv = document.getElementById(`preview-${type}`);
        const previewContent = document.getElementById(`preview-content-${type}`);
        
        // Hide upload area and show preview
        area.style.display = 'none';
        previewDiv.style.display = 'block';
        
        // Set preview content
        previewContent.innerHTML = `
            <div class="file-metadata">
                <div class="metadata-item">
                    <strong>Nome:</strong> ${metadata.name}
                </div>
                <div class="metadata-item">
                    <strong>Tamanho:</strong> ${metadata.size}
                </div>
                <div class="metadata-item">
                    <strong>Tipo:</strong> ${metadata.type}
                </div>
                <div class="metadata-item">
                    <strong>Modificado:</strong> ${metadata.lastModified}
                </div>
            </div>
            <div class="file-preview-content">
                ${preview}
            </div>
        `;
        
        // Store preview for later reference
        this.currentPreviews.set(type, { preview, metadata });
    }

    /**
     * Show error message
     */
    showError(type, message) {
        const statusDiv = document.getElementById(`status-${type}`);
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div class="status-error">
                <h4>Erro</h4>
                <p>${message}</p>
            </div>
        `;
        
        this.resetUploadArea(type);
    }

    /**
     * Reset upload area to initial state
     */
    resetUploadArea(type) {
        const section = document.querySelector(`[data-type="${type}"]`);
        const area = section.querySelector('.upload-area');
        const placeholder = area.querySelector('.upload-placeholder');
        
        // Reset placeholder content
        const { title, description, icon } = this.getUploadAreaInfo(type);
        placeholder.innerHTML = `
            <div class="upload-icon-large">${icon}</div>
            <p class="upload-text">
                Arraste o arquivo aqui ou 
                <button class="upload-browse-btn" data-type="${type}">clique para selecionar</button>
            </p>
            <small class="upload-hint">${description}</small>
        `;
        
        // Re-attach browse button event
        const browseBtn = placeholder.querySelector('.upload-browse-btn');
        const fileInput = document.getElementById(`file-input-${type}`);
        browseBtn.addEventListener('click', () => fileInput.click());
    }

    /**
     * Get upload area info for type
     */
    getUploadAreaInfo(type) {
        const info = {
            excel: {
                title: 'Dados Principais',
                description: 'Arquivo Excel com dados da catequese (.xlsx, .xls)',
                icon: '📊'
            },
            template: {
                title: 'Template de Exportação',
                description: 'Template Excel para exportação (.xlsx)',
                icon: '📋'
            },
            image: {
                title: 'Logotipo',
                description: 'Imagem do logotipo (.jpg, .png)',
                icon: '🖼️'
            }
        };
        return info[type] || {};
    }

    /**
     * Remove file from upload queue
     */
    removeFile(type) {
        // Remove from pending uploads
        this.pendingUploads.delete(type);
        this.currentPreviews.delete(type);
        
        // Hide preview and show upload area
        const area = this.uploadAreas.get(type);
        const previewDiv = document.getElementById(`preview-${type}`);
        const statusDiv = document.getElementById(`status-${type}`);
        
        area.style.display = 'block';
        previewDiv.style.display = 'none';
        statusDiv.style.display = 'none';
        
        // Reset file input
        const fileInput = document.getElementById(`file-input-${type}`);
        fileInput.value = '';
        
        // Reset upload area
        this.resetUploadArea(type);
        
        // Update upload all button
        this.updateUploadAllButton();
    }

    /**
     * Upload single file
     */
    async uploadSingleFile(type) {
        const file = this.pendingUploads.get(type);
        if (!file) return;
        
        const operationId = `upload-${type}-${Date.now()}`;
        
        try {
            // Start progress tracking if available
            if (this.progressTracker) {
                this.progressTracker.startOperation(operationId, `Upload: ${file.name}`, 'Iniciando upload...');
                
                // Create inline progress bar in the upload section
                if (this.progressBar) {
                    const section = document.querySelector(`[data-type="${type}"]`);
                    const progressContainer = section.querySelector('.upload-status') || section;
                    
                    this.progressBar.createInlineProgressBar(progressContainer, operationId, {
                        title: `Enviando ${file.name}`,
                        showCancel: true,
                        showPercentage: true
                    });
                }
                
                // Create file upload tracker
                const tracker = this.progressTracker.createFileUploadTracker(operationId, [file.name]);
                
                // Store operation reference
                this.activeOperations.set(type, operationId);
                
                // Validate files
                tracker.validateFiles();
                await this.delay(500);
                
                // Prepare upload
                tracker.prepareUpload();
                await this.delay(500);
                
                // Upload file
                tracker.uploadFiles(1, 1);
            }
            
            const targetPath = this.fileManager.getTargetPath(type, file.name);
            const result = await this.fileManager.uploadFile(file, targetPath, type);
            
            if (result.success) {
                // Complete progress tracking
                if (this.progressTracker) {
                    this.progressTracker.completeOperation(operationId, `Upload de ${file.name} concluído com sucesso!`);
                }
                
                this.showUploadSuccess(type, result.message);
                // Remove from pending after successful upload
                this.pendingUploads.delete(type);
                this.updateUploadAllButton();
            } else {
                // Fail progress tracking with retry capability
                if (this.progressTracker) {
                    const retryFunction = () => this.uploadSingleFile(type);
                    
                    this.progressTracker.failOperation(operationId, result.message, {
                        canRetry: true,
                        retryFunction,
                        showNotification: true
                    });
                }
                
                this.showUploadError(type, result.message);
            }
            
        } catch (error) {
            console.error('Error uploading file:', error);
            
            // Fail progress tracking with retry capability
            if (this.progressTracker) {
                const retryFunction = () => this.uploadSingleFile(type);
                
                this.progressTracker.failOperation(operationId, error.message, {
                    canRetry: true,
                    retryFunction,
                    showNotification: true
                });
            }
            
            this.showUploadError(type, `Erro ao enviar arquivo: ${error.message}`);
        } finally {
            // Clean up operation reference
            this.activeOperations.delete(type);
        }
    }

    /**
     * Upload all pending files
     */
    async uploadAllFiles() {
        const files = Array.from(this.pendingUploads.entries()).map(([type, file]) => ({
            type,
            file
        }));
        
        if (files.length === 0) return;
        
        const operationId = `batch-upload-${Date.now()}`;
        
        try {
            // Disable upload button during process
            const uploadAllBtn = document.getElementById('upload-all-btn');
            uploadAllBtn.disabled = true;
            
            // Start progress tracking
            if (this.progressTracker && this.progressBar) {
                this.progressTracker.startOperation(operationId, 'Upload em Lote', 'Iniciando upload de múltiplos arquivos...');
                
                // Show main progress overlay
                this.progressBar.showOverlay(operationId, 'Upload em Lote');
                
                // Create button progress
                this.progressBar.createButtonProgress(uploadAllBtn, operationId);
                
                // Set up steps for batch upload
                const steps = [
                    'Validando arquivos...',
                    'Preparando uploads...',
                    'Enviando arquivos...',
                    'Aguardando confirmação...',
                    'Finalizando processo...'
                ];
                
                this.progressTracker.setOperationSteps(operationId, steps);
                
                // Create step progress in results area
                const resultsDiv = document.getElementById('upload-results');
                resultsDiv.classList.remove('hidden');
                this.progressBar.createStepProgress(resultsDiv, operationId, steps);
            }
            
            // Simulate progress through steps
            if (this.progressTracker) {
                // Step 1: Validating
                this.progressTracker.nextStep(operationId, `Validando ${files.length} arquivo(s)...`);
                await this.delay(800);
                
                // Step 2: Preparing
                this.progressTracker.nextStep(operationId, 'Preparando arquivos para upload...');
                await this.delay(600);
                
                // Step 3: Uploading
                this.progressTracker.nextStep(operationId, 'Enviando arquivos para o GitHub...');
            }
            
            const result = await this.fileManager.batchUpload(files);
            
            // Step 4: Confirmation
            if (this.progressTracker) {
                this.progressTracker.nextStep(operationId, 'Aguardando confirmação do GitHub...');
                await this.delay(1000);
                
                // Step 5: Finalizing
                this.progressTracker.nextStep(operationId, 'Finalizando processo...');
                await this.delay(500);
            }
            
            // Complete or fail based on results
            if (this.progressTracker) {
                const successCount = result.results.filter(r => r.success).length;
                const totalCount = result.results.length;
                
                if (successCount === totalCount) {
                    this.progressTracker.completeOperation(operationId, `Todos os ${totalCount} arquivo(s) foram enviados com sucesso!`);
                } else if (successCount > 0) {
                    this.progressTracker.completeOperation(operationId, `${successCount} de ${totalCount} arquivo(s) enviados com sucesso.`);
                } else {
                    this.progressTracker.failOperation(operationId, 'Falha no upload de todos os arquivos.');
                }
            }
            
            // Show results
            this.showUploadResults(result);
            
            // Clear successful uploads
            result.results.forEach(fileResult => {
                if (fileResult.success) {
                    const type = fileResult.type;
                    this.pendingUploads.delete(type);
                    this.removeFile(type);
                }
            });
            
        } catch (error) {
            console.error('Error in batch upload:', error);
            
            if (this.progressTracker) {
                this.progressTracker.failOperation(operationId, `Erro no upload em lote: ${error.message}`);
            }
            
            this.showError('general', `Erro no upload em lote: ${error.message}`);
        } finally {
            // Re-enable button
            const uploadAllBtn = document.getElementById('upload-all-btn');
            uploadAllBtn.disabled = false;
            uploadAllBtn.textContent = 'Enviar Todos os Arquivos';
            this.updateUploadAllButton();
        }
    }

    /**
     * Clear all files
     */
    clearAllFiles() {
        const types = ['excel', 'template', 'image'];
        types.forEach(type => this.removeFile(type));
        
        // Hide results
        const resultsDiv = document.getElementById('upload-results');
        resultsDiv.classList.add('hidden');
    }

    /**
     * Show upload success
     */
    showUploadSuccess(type, message) {
        const statusDiv = document.getElementById(`status-${type}`);
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div class="status-success">
                <h4>Upload Concluído</h4>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Show upload error
     */
    showUploadError(type, message) {
        const statusDiv = document.getElementById(`status-${type}`);
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div class="status-error">
                <h4>Erro no Upload</h4>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Show batch upload results
     */
    showUploadResults(result) {
        const resultsDiv = document.getElementById('upload-results');
        const resultsList = document.getElementById('results-list');
        
        resultsList.innerHTML = `
            <div class="results-summary">
                <p>${result.message}</p>
            </div>
            <div class="results-details">
                ${result.results.map(fileResult => `
                    <div class="result-item ${fileResult.success ? 'success' : 'error'}">
                        <span class="result-icon">${fileResult.success ? '✅' : '❌'}</span>
                        <span class="result-filename">${fileResult.filename}</span>
                        <span class="result-message">${fileResult.message}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        resultsDiv.classList.remove('hidden');
    }

    /**
     * Update upload all button state
     */
    updateUploadAllButton() {
        const uploadAllBtn = document.getElementById('upload-all-btn');
        const hasPendingFiles = this.pendingUploads.size > 0;
        
        uploadAllBtn.disabled = !hasPendingFiles;
        uploadAllBtn.textContent = hasPendingFiles 
            ? `Enviar ${this.pendingUploads.size} Arquivo(s)`
            : 'Enviar Todos os Arquivos';
    }

    /**
     * Utility method to create delays for progress simulation
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cancel active upload operation
     */
    cancelUpload(type) {
        const operationId = this.activeOperations.get(type);
        if (operationId && this.progressTracker) {
            this.progressTracker.cancelOperation(operationId);
            this.activeOperations.delete(type);
        }
    }

    /**
     * Get active upload operations
     */
    getActiveOperations() {
        return Array.from(this.activeOperations.entries());
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUpload;
} else {
    window.FileUpload = FileUpload;
}