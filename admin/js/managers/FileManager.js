/**
 * File Manager
 * Handles file uploads, validation, and processing
 */
class FileManager {
    constructor() {
        this.allowedTypes = {
            excel: ['.xlsx', '.xls'],
            image: ['.jpg', '.jpeg', '.png'],
            template: ['.xlsx']
        };
        
        this.maxFileSizes = {
            excel: 10 * 1024 * 1024, // 10MB
            image: 5 * 1024 * 1024,  // 5MB
            template: 5 * 1024 * 1024 // 5MB
        };
        
        // Initialize optimizers
        this.fileOptimizer = new FileOptimizer();
        this.githubOptimizer = new GitHubOptimizer();
        
        // Progress tracker
        this.progressTracker = null;
    }

    /**
     * Set progress tracker instance
     * @param {ProgressTracker} progressTracker - Progress tracker instance
     */
    setProgressTracker(progressTracker) {
        this.progressTracker = progressTracker;
    }

    /**
     * Validate file type and size
     * @param {File} file - File to validate
     * @param {'excel'|'image'|'template'} type - Expected file type
     * @returns {ValidationResult} Validation result
     */
    validateFile(file, type) {
        const errors = [];
        const warnings = [];

        if (!file) {
            errors.push('Nenhum arquivo selecionado');
            return { isValid: false, errors, warnings };
        }

        // Check file type
        const allowedExtensions = this.allowedTypes[type];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            errors.push(`Tipo de arquivo não permitido. Tipos aceitos: ${allowedExtensions.join(', ')}`);
        }

        // Check file size
        const maxSize = this.maxFileSizes[type];
        if (file.size > maxSize) {
            errors.push(`Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(maxSize)}`);
        }

        // Check if file is empty
        if (file.size === 0) {
            errors.push('Arquivo está vazio');
        }

        // Type-specific validations
        if (type === 'excel' || type === 'template') {
            // Excel file validation
            const validation = this.validateExcelFile(file);
            errors.push(...validation.errors);
            warnings.push(...validation.warnings);
        }

        if (type === 'image') {
            // Image file validation
            const validation = this.validateImageFile(file);
            errors.push(...validation.errors);
            warnings.push(...validation.warnings);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate Excel file structure and content
     * @param {File} file - Excel file to validate
     * @returns {ValidationResult} Validation result
     */
    validateExcelFile(file) {
        const errors = [];
        const warnings = [];

        // Check file size (Excel files should be at least 1KB)
        if (file.size < 1024) {
            warnings.push('Arquivo Excel muito pequeno, pode estar corrompido');
        }

        // Check MIME type
        const validMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/excel'
        ];

        if (file.type && !validMimeTypes.includes(file.type)) {
            warnings.push('Tipo MIME do arquivo pode não ser compatível');
        }

        // Check file name for suspicious characters
        const suspiciousChars = /[<>:"/\\|?*]/;
        if (suspiciousChars.test(file.name)) {
            errors.push('Nome do arquivo contém caracteres inválidos');
        }

        // Check for very large files that might cause memory issues
        if (file.size > 50 * 1024 * 1024) { // 50MB
            warnings.push('Arquivo muito grande, processamento pode ser lento');
        }

        return { errors, warnings };
    }

    /**
     * Validate image file format and properties
     * @param {File} file - Image file to validate
     * @returns {ValidationResult} Validation result
     */
    validateImageFile(file) {
        const errors = [];
        const warnings = [];

        // Check MIME type
        if (!file.type.startsWith('image/')) {
            errors.push('Arquivo não é uma imagem válida');
            return { errors, warnings };
        }

        // Check specific image formats
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validImageTypes.includes(file.type)) {
            errors.push('Formato de imagem não suportado. Use JPG ou PNG');
        }

        // Check image dimensions (will be validated after loading)
        if (file.size > 10 * 1024 * 1024) { // 10MB
            warnings.push('Imagem muito grande, será redimensionada automaticamente');
        }

        // Check for very small images
        if (file.size < 1024) { // 1KB
            warnings.push('Imagem muito pequena, qualidade pode ser baixa');
        }

        return { errors, warnings };
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Convert file to base64 for GitHub API with optimization
     * @param {File} file - File to convert
     * @param {boolean} optimize - Whether to optimize the file before conversion
     * @returns {Promise<string>} Base64 encoded file
     */
    async fileToBase64(file, optimize = false) {
        try {
            if (optimize) {
                // Use FileOptimizer for compression and optimization
                const fileType = this.getFileType(file);
                const compressionResult = await this.fileOptimizer.compressFile(file, fileType);
                
                // Log compression results
                if (compressionResult.compressionRatio > 0) {
                    console.log(`File compressed: ${compressionResult.compressionRatio.toFixed(1)}% reduction`);
                    console.log(`Original: ${this.formatFileSize(compressionResult.originalSize)}, Compressed: ${this.formatFileSize(compressionResult.compressedSize)}`);
                }
                
                return compressionResult.compressed;
            }
            
            // Fallback to original method for non-optimized conversion
            let processedFile = file;
            
            // Optimize image files if requested
            if (optimize && file.type.startsWith('image/')) {
                const optimizedBlob = await this.optimizeImage(file);
                processedFile = new File([optimizedBlob], file.name, {
                    type: optimizedBlob.type,
                    lastModified: file.lastModified
                });
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = () => {
                    try {
                        // Remove data URL prefix to get just the base64 data
                        const result = reader.result;
                        if (typeof result !== 'string') {
                            reject(new Error('Resultado da leitura não é uma string'));
                            return;
                        }
                        
                        const base64 = result.split(',')[1];
                        if (!base64) {
                            reject(new Error('Não foi possível extrair dados base64'));
                            return;
                        }
                        
                        resolve(base64);
                    } catch (error) {
                        reject(new Error('Erro ao processar dados base64: ' + error.message));
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('Erro ao ler o arquivo: ' + (reader.error?.message || 'Erro desconhecido')));
                };
                
                reader.readAsDataURL(processedFile);
            });
            
        } catch (error) {
            throw new Error('Erro na conversão para base64: ' + error.message);
        }
    }

    /**
     * Get file type for optimization
     * @param {File} file - File to analyze
     * @returns {string} File type ('image', 'excel', 'template')
     */
    getFileType(file) {
        if (file.type.startsWith('image/')) {
            return 'image';
        }
        
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        if (this.allowedTypes.excel.includes(extension)) {
            return file.name.includes('template') ? 'template' : 'excel';
        }
        
        return 'generic';
    }

    /**
     * Process file for GitHub upload
     * @param {File} file - File to process
     * @param {'excel'|'image'|'template'} type - File type
     * @returns {Promise<Object>} Processing result
     */
    async processFileForUpload(file, type) {
        try {
            // Validate file first
            const validation = this.validateFile(file, type);
            if (!validation.isValid) {
                return {
                    success: false,
                    errors: validation.errors,
                    warnings: validation.warnings
                };
            }

            let processResult;
            
            switch (type) {
                case 'excel':
                case 'template':
                    processResult = await this.processExcelFile(file, type);
                    break;
                    
                case 'image':
                    processResult = await this.processImageFile(file);
                    break;
                    
                default:
                    throw new Error('Tipo de arquivo não suportado: ' + type);
            }

            if (!processResult.success) {
                return processResult;
            }

            return {
                success: true,
                base64Content: processResult.base64Content,
                metadata: processResult.metadata,
                analysis: processResult.analysis,
                warnings: [...validation.warnings, ...(processResult.warnings || [])]
            };
            
        } catch (error) {
            return {
                success: false,
                errors: [error.message]
            };
        }
    }

    /**
     * Process image file for upload
     * @param {File} file - Image file to process
     * @returns {Promise<Object>} Processing result
     */
    async processImageFile(file) {
        try {
            // Optimize image for upload
            const base64Content = await this.fileToBase64(file, true);
            
            return {
                success: true,
                base64Content,
                warnings: [],
                metadata: {
                    originalName: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create file preview
     * @param {File} file - File to preview
     * @param {'excel'|'image'|'template'} type - File type
     * @returns {Promise<{preview: string, metadata: Object}>}
     */
    async createFilePreview(file, type) {
        const metadata = {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString('pt-BR')
        };

        let preview = '';

        try {
            if (type === 'image') {
                // Create image preview
                preview = await this.createImagePreview(file);
            } else if (type === 'excel' || type === 'template') {
                // Create Excel file info preview
                preview = await this.createExcelPreview(file);
            }
        } catch (error) {
            console.error('Error creating preview:', error);
            preview = 'Não foi possível gerar preview do arquivo';
        }

        return { preview, metadata };
    }

    /**
     * Create image preview with optimization
     * @param {File} file - Image file
     * @returns {Promise<string>} Image data URL
     */
    async createImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // Validate image dimensions
                        const validation = this.validateImageDimensions(img.width, img.height);
                        if (validation.errors.length > 0) {
                            reject(new Error(validation.errors.join(', ')));
                            return;
                        }

                        // Create optimized preview
                        const canvas = this.createOptimizedImageCanvas(img, 300);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                        
                    } catch (error) {
                        reject(new Error('Erro ao processar imagem: ' + error.message));
                    }
                };
                
                img.onerror = () => reject(new Error('Erro ao carregar imagem'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Validate image dimensions
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {ValidationResult} Validation result
     */
    validateImageDimensions(width, height) {
        const errors = [];
        const warnings = [];

        // Check minimum dimensions
        if (width < 50 || height < 50) {
            errors.push('Imagem muito pequena (mínimo 50x50 pixels)');
        }

        // Check maximum dimensions
        if (width > 5000 || height > 5000) {
            warnings.push('Imagem muito grande, será redimensionada');
        }

        // Check aspect ratio for logos (should be reasonable)
        const aspectRatio = width / height;
        if (aspectRatio > 5 || aspectRatio < 0.2) {
            warnings.push('Proporção da imagem pode não ser ideal para logotipo');
        }

        return { errors, warnings };
    }

    /**
     * Create optimized canvas for image
     * @param {HTMLImageElement} img - Source image
     * @param {number} maxSize - Maximum dimension
     * @returns {HTMLCanvasElement} Optimized canvas
     */
    createOptimizedImageCanvas(img, maxSize = 300) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate optimal dimensions
        let { width, height } = img;
        
        if (width > height) {
            if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw optimized image
        ctx.drawImage(img, 0, 0, width, height);
        
        return canvas;
    }

    /**
     * Optimize image for upload
     * @param {File} file - Original image file
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<Blob>} Optimized image blob
     */
    async optimizeImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Calculate new dimensions
                        let { width, height } = img;
                        
                        if (width > maxWidth || height > maxHeight) {
                            const ratio = Math.min(maxWidth / width, maxHeight / height);
                            width *= ratio;
                            height *= ratio;
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Enable high-quality rendering
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // Draw and compress
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob(resolve, 'image/jpeg', quality);
                        
                    } catch (error) {
                        reject(new Error('Erro ao otimizar imagem: ' + error.message));
                    }
                };
                
                img.onerror = () => reject(new Error('Erro ao carregar imagem para otimização'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo para otimização'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Create Excel file preview with structure analysis
     * @param {File} file - Excel file
     * @returns {Promise<string>} Preview HTML
     */
    async createExcelPreview(file) {
        try {
            // Analyze Excel file structure
            const analysis = await this.analyzeExcelStructure(file);
            
            return `
                <div class="excel-preview">
                    <div class="file-icon">📊</div>
                    <div class="file-info">
                        <strong>${file.name}</strong><br>
                        Tamanho: ${this.formatFileSize(file.size)}<br>
                        Tipo: ${file.type || 'Excel Spreadsheet'}<br>
                        ${analysis.sheets ? `Planilhas: ${analysis.sheets}` : ''}
                        ${analysis.estimatedRows ? `<br>Linhas estimadas: ${analysis.estimatedRows}` : ''}
                    </div>
                    ${analysis.warnings.length > 0 ? `
                        <div class="excel-warnings">
                            <small>⚠️ ${analysis.warnings.join(', ')}</small>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            console.warn('Could not analyze Excel file:', error);
            return `
                <div class="excel-preview">
                    <div class="file-icon">📊</div>
                    <div class="file-info">
                        <strong>${file.name}</strong><br>
                        Tamanho: ${this.formatFileSize(file.size)}<br>
                        Tipo: ${file.type || 'Excel Spreadsheet'}
                    </div>
                </div>
            `;
        }
    }

    /**
     * Analyze Excel file structure (basic analysis without external libraries)
     * @param {File} file - Excel file to analyze
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeExcelStructure(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const analysis = {
                        sheets: null,
                        estimatedRows: null,
                        warnings: []
                    };

                    // Basic file size analysis
                    if (file.size < 5000) {
                        analysis.warnings.push('Arquivo muito pequeno');
                    } else if (file.size > 10 * 1024 * 1024) {
                        analysis.warnings.push('Arquivo muito grande');
                    }

                    // Estimate content based on file size (rough approximation)
                    if (file.size > 10000) {
                        analysis.estimatedRows = Math.floor(file.size / 100); // Very rough estimate
                        if (analysis.estimatedRows > 10000) {
                            analysis.estimatedRows = '10000+';
                        }
                    }

                    // Check for Excel file signature (basic validation)
                    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 8));
                    const signature = Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
                    
                    if (signature.startsWith('504b0304')) {
                        // ZIP-based format (XLSX)
                        analysis.sheets = 'Múltiplas (XLSX)';
                    } else if (signature.startsWith('d0cf11e0')) {
                        // OLE format (XLS)
                        analysis.sheets = 'Múltiplas (XLS)';
                    } else {
                        analysis.warnings.push('Formato pode não ser válido');
                    }

                    resolve(analysis);
                    
                } catch (error) {
                    resolve({
                        sheets: null,
                        estimatedRows: null,
                        warnings: ['Não foi possível analisar o arquivo']
                    });
                }
            };
            
            reader.onerror = () => {
                resolve({
                    sheets: null,
                    estimatedRows: null,
                    warnings: ['Erro ao ler arquivo']
                });
            };
            
            // Read first 1KB for analysis
            reader.readAsArrayBuffer(file.slice(0, 1024));
        });
    }

    /**
     * Process Excel file for upload
     * @param {File} file - Excel file to process
     * @param {'excel'|'template'} type - File type
     * @returns {Promise<Object>} Processing result
     */
    async processExcelFile(file, type) {
        try {
            // Validate file structure
            const validation = this.validateExcelFile(file);
            if (validation.errors.length > 0) {
                throw new Error(validation.errors.join(', '));
            }

            // Convert to base64 for GitHub API
            const base64Content = await this.fileToBase64(file);
            
            // Get file analysis
            const analysis = await this.analyzeExcelStructure(file);
            
            return {
                success: true,
                base64Content,
                analysis,
                warnings: validation.warnings,
                metadata: {
                    originalName: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload file to GitHub repository
     * @param {File} file - File to upload
     * @param {string} targetPath - Target path in repository
     * @param {'excel'|'image'|'template'} type - File type
     * @returns {Promise<{success: boolean, message: string, warnings?: string[]}>}
     */
    async uploadFile(file, targetPath, type) {
        const startTime = Date.now();
        
        try {
            // Log upload attempt
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logInfo('file', `Iniciando upload do arquivo: ${file.name}`, {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: type,
                    targetPath: targetPath
                });
            }
            
            // Process file for upload
            const processResult = await this.processFileForUpload(file, type);
            
            if (!processResult.success) {
                const errorMessage = `Erro no processamento: ${processResult.errors?.join(', ') || 'Erro desconhecido'}`;
                
                // Log processing error
                if (window.adminApp && window.adminApp.logManager) {
                    window.adminApp.logManager.logError('file', `Erro no processamento do arquivo: ${file.name}`, {
                        fileName: file.name,
                        error: errorMessage,
                        duration: Date.now() - startTime
                    });
                }
                
                return {
                    success: false,
                    message: errorMessage
                };
            }

            // Simulate GitHub upload (placeholder for real implementation)
            await this.simulateGitHubUpload(targetPath, processResult.base64Content, file.name, processResult.metadata);
            
            const warnings = processResult.warnings && processResult.warnings.length > 0 
                ? processResult.warnings 
                : undefined;
            
            const duration = Date.now() - startTime;
            const successMessage = `Arquivo ${file.name} enviado com sucesso para ${targetPath}`;
            
            // Log successful upload
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logSuccess('file', successMessage, {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: type,
                    targetPath: targetPath,
                    duration: duration,
                    files: [targetPath],
                    warnings: warnings
                });
            }
            
            return {
                success: true,
                message: successMessage,
                warnings
            };
            
        } catch (error) {
            console.error('Error uploading file:', error);
            const duration = Date.now() - startTime;
            const errorMessage = `Erro ao enviar arquivo: ${error.message}`;
            
            // Log upload error
            if (window.adminApp && window.adminApp.logManager) {
                window.adminApp.logManager.logError('file', errorMessage, {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: type,
                    targetPath: targetPath,
                    duration: duration,
                    error: error.message,
                    stack: error.stack
                });
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Simulate GitHub file upload (placeholder for real implementation)
     * @param {string} path - File path in repository
     * @param {string} content - Base64 encoded content
     * @param {string} filename - Original filename
     * @param {Object} metadata - File metadata
     * @returns {Promise<void>}
     */
    async simulateGitHubUpload(path, content, filename, metadata = {}) {
        // Simulate network delay based on file size
        const delay = Math.min(3000, Math.max(1000, content.length / 1000));
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // In real implementation, this would:
        // 1. Check if file exists (get SHA if updating)
        // 2. Create commit with file content
        // 3. Push to repository
        // 4. Trigger GitHub Pages rebuild
        
        console.log(`File upload simulation:`);
        console.log(`- Path: ${path}`);
        console.log(`- Filename: ${filename}`);
        console.log(`- Content size: ${content.length} characters (base64)`);
        console.log(`- Original size: ${this.formatFileSize(metadata.size || 0)}`);
        console.log(`- Type: ${metadata.type || 'unknown'}`);
        
        // Simulate potential upload errors (5% chance)
        if (Math.random() < 0.05) {
            throw new Error('Simulação de erro de rede durante upload');
        }
    }

    /**
     * Get target path for file type
     * @param {'excel'|'image'|'template'} type - File type
     * @param {string} filename - Original filename
     * @returns {string} Target path in repository
     */
    getTargetPath(type, filename) {
        const paths = {
            excel: 'data/dados-catequese.xlsx',
            template: 'data/template-export.xlsx',
            image: `assets/images/${this.sanitizeFilename(filename)}`
        };
        
        return paths[type] || filename;
    }

    /**
     * Sanitize filename for safe storage
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    sanitizeFilename(filename) {
        if (!filename || typeof filename !== 'string') {
            return 'unnamed-file';
        }

        // Extract name and extension
        const lastDotIndex = filename.lastIndexOf('.');
        let name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
        const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';

        // Sanitize the name part
        name = name
            .toLowerCase()
            .trim()
            // Remove or replace dangerous characters
            .replace(/[<>:"/\\|?*]/g, '')
            // Replace spaces and special chars with hyphens
            .replace(/[^a-z0-9.-]/g, '-')
            // Remove multiple consecutive hyphens
            .replace(/-+/g, '-')
            // Remove leading/trailing hyphens
            .replace(/^-|-$/g, '');

        // Ensure name is not empty
        if (!name) {
            name = 'file';
        }

        // Limit length to prevent filesystem issues
        if (name.length > 50) {
            name = name.substring(0, 50);
        }

        // Sanitize extension
        const sanitizedExtension = extension
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, '');

        return name + sanitizedExtension;
    }

    /**
     * Validate and repair corrupted files
     * @param {File} file - File to validate
     * @param {'excel'|'image'|'template'} type - Expected file type
     * @returns {Promise<{isValid: boolean, canRepair: boolean, errors: string[], suggestions: string[]}>}
     */
    async validateFileIntegrity(file, type) {
        const result = {
            isValid: true,
            canRepair: false,
            errors: [],
            suggestions: []
        };

        try {
            switch (type) {
                case 'excel':
                case 'template':
                    return await this.validateExcelIntegrity(file);
                    
                case 'image':
                    return await this.validateImageIntegrity(file);
                    
                default:
                    result.errors.push('Tipo de arquivo não suportado para validação');
                    result.isValid = false;
            }
        } catch (error) {
            result.errors.push(`Erro durante validação: ${error.message}`);
            result.isValid = false;
        }

        return result;
    }

    /**
     * Validate Excel file integrity
     * @param {File} file - Excel file to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateExcelIntegrity(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const result = {
                    isValid: true,
                    canRepair: false,
                    errors: [],
                    suggestions: []
                };

                try {
                    const arrayBuffer = e.target.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    // Check file signature
                    if (uint8Array.length < 8) {
                        result.errors.push('Arquivo muito pequeno ou corrompido');
                        result.isValid = false;
                        resolve(result);
                        return;
                    }

                    // Check for ZIP signature (XLSX files)
                    const zipSignature = [0x50, 0x4B, 0x03, 0x04];
                    const oleSignature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
                    
                    const hasZipSignature = zipSignature.every((byte, index) => uint8Array[index] === byte);
                    const hasOleSignature = oleSignature.every((byte, index) => uint8Array[index] === byte);
                    
                    if (!hasZipSignature && !hasOleSignature) {
                        result.errors.push('Assinatura de arquivo Excel não encontrada');
                        result.isValid = false;
                        result.suggestions.push('Verifique se o arquivo não está corrompido');
                        result.suggestions.push('Tente salvar novamente no Excel');
                    }

                    // Check for minimum viable size
                    if (file.size < 1024) {
                        result.errors.push('Arquivo muito pequeno para ser um Excel válido');
                        result.isValid = false;
                    }

                    // Check for suspicious size patterns
                    if (file.size > 100 * 1024 * 1024) { // 100MB
                        result.suggestions.push('Arquivo muito grande, considere otimizar');
                    }

                    // Additional integrity checks for XLSX
                    if (hasZipSignature) {
                        // Look for central directory signature
                        const centralDirSignature = [0x50, 0x4B, 0x01, 0x02];
                        let foundCentralDir = false;
                        
                        for (let i = uint8Array.length - 1024; i >= 0 && i < uint8Array.length - 4; i++) {
                            if (centralDirSignature.every((byte, index) => uint8Array[i + index] === byte)) {
                                foundCentralDir = true;
                                break;
                            }
                        }
                        
                        if (!foundCentralDir) {
                            result.errors.push('Estrutura ZIP corrompida');
                            result.isValid = false;
                            result.canRepair = true;
                            result.suggestions.push('Tente abrir e salvar novamente no Excel');
                        }
                    }

                } catch (error) {
                    result.errors.push(`Erro na validação: ${error.message}`);
                    result.isValid = false;
                }

                resolve(result);
            };
            
            reader.onerror = () => {
                resolve({
                    isValid: false,
                    canRepair: false,
                    errors: ['Erro ao ler arquivo para validação'],
                    suggestions: ['Verifique se o arquivo não está corrompido']
                });
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Validate image file integrity
     * @param {File} file - Image file to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateImageIntegrity(file) {
        return new Promise((resolve) => {
            const result = {
                isValid: true,
                canRepair: false,
                errors: [],
                suggestions: []
            };

            const img = new Image();
            
            img.onload = () => {
                // Image loaded successfully
                if (img.width === 0 || img.height === 0) {
                    result.errors.push('Imagem com dimensões inválidas');
                    result.isValid = false;
                } else {
                    // Check for reasonable dimensions
                    if (img.width < 10 || img.height < 10) {
                        result.suggestions.push('Imagem muito pequena');
                    }
                    
                    if (img.width > 10000 || img.height > 10000) {
                        result.suggestions.push('Imagem muito grande, será redimensionada');
                        result.canRepair = true;
                    }
                }
                
                resolve(result);
            };
            
            img.onerror = () => {
                result.errors.push('Não foi possível carregar a imagem');
                result.isValid = false;
                result.suggestions.push('Verifique se o arquivo é uma imagem válida');
                result.suggestions.push('Tente converter para JPG ou PNG');
                resolve(result);
            };
            
            // Create object URL for image loading
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
            // Cleanup after a timeout
            setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 5000);
        });
    }

    /**
     * Repair corrupted files when possible
     * @param {File} file - File to repair
     * @param {'excel'|'image'|'template'} type - File type
     * @returns {Promise<{success: boolean, repairedFile?: File, message: string}>}
     */
    async repairFile(file, type) {
        try {
            switch (type) {
                case 'image':
                    return await this.repairImageFile(file);
                    
                case 'excel':
                case 'template':
                    return {
                        success: false,
                        message: 'Reparo automático de arquivos Excel não implementado. Tente abrir e salvar novamente no Excel.'
                    };
                    
                default:
                    return {
                        success: false,
                        message: 'Tipo de arquivo não suportado para reparo'
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `Erro durante reparo: ${error.message}`
            };
        }
    }

    /**
     * Repair image file by reprocessing
     * @param {File} file - Image file to repair
     * @returns {Promise<Object>} Repair result
     */
    async repairImageFile(file) {
        try {
            // Try to load and reprocess the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    try {
                        // Set canvas dimensions
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        // Draw image to canvas (this can fix some corruption)
                        ctx.drawImage(img, 0, 0);
                        
                        // Convert back to blob
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const repairedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                
                                resolve({
                                    success: true,
                                    repairedFile,
                                    message: 'Imagem reparada com sucesso'
                                });
                            } else {
                                resolve({
                                    success: false,
                                    message: 'Não foi possível reparar a imagem'
                                });
                            }
                        }, 'image/jpeg', 0.9);
                        
                    } catch (error) {
                        resolve({
                            success: false,
                            message: `Erro ao reparar imagem: ${error.message}`
                        });
                    }
                };
                
                img.onerror = () => {
                    resolve({
                        success: false,
                        message: 'Imagem muito corrompida para reparo'
                    });
                };
                
                const objectUrl = URL.createObjectURL(file);
                img.src = objectUrl;
                
                // Cleanup
                setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
            });
            
        } catch (error) {
            return {
                success: false,
                message: `Erro no reparo: ${error.message}`
            };
        }
    }

    /**
     * Get comprehensive file information
     * @param {File} file - File to analyze
     * @returns {Promise<Object>} File information
     */
    async getFileInfo(file) {
        const info = {
            name: file.name,
            size: file.size,
            formattedSize: this.formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified),
            extension: this.getFileExtension(file.name),
            sanitizedName: this.sanitizeFilename(file.name)
        };

        // Add type-specific information
        if (file.type.startsWith('image/')) {
            try {
                const imageInfo = await this.getImageInfo(file);
                info.imageInfo = imageInfo;
            } catch (error) {
                info.imageInfo = { error: error.message };
            }
        }

        return info;
    }

    /**
     * Get image-specific information
     * @param {File} file - Image file
     * @returns {Promise<Object>} Image information
     */
    async getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height,
                    megapixels: (img.width * img.height / 1000000).toFixed(2)
                });
            };
            
            img.onerror = () => {
                reject(new Error('Não foi possível carregar informações da imagem'));
            };
            
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
            
            setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
        });
    }

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} File extension (with dot)
     */
    getFileExtension(filename) {
        if (!filename || typeof filename !== 'string') {
            return '';
        }
        
        const lastDotIndex = filename.lastIndexOf('.');
        return lastDotIndex > 0 ? filename.substring(lastDotIndex).toLowerCase() : '';
    }

    /**
     * Check if file type matches extension
     * @param {File} file - File to check
     * @returns {boolean} True if type matches extension
     */
    isFileTypeConsistent(file) {
        const extension = this.getFileExtension(file.name);
        const mimeType = file.type;
        
        const typeMap = {
            '.jpg': ['image/jpeg'],
            '.jpeg': ['image/jpeg'],
            '.png': ['image/png'],
            '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            '.xls': ['application/vnd.ms-excel', 'application/excel']
        };
        
        const expectedTypes = typeMap[extension];
        return expectedTypes ? expectedTypes.includes(mimeType) : true;
    }

    /**
     * Batch upload multiple files with enhanced error handling
     * @param {FileUploadData[]} files - Array of files to upload
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<{success: boolean, results: Array, message: string, summary: Object}>}
     */
    async batchUpload(files, progressCallback = null) {
        const results = [];
        let successCount = 0;
        let warningCount = 0;
        let errorCount = 0;
        const totalFiles = files.length;
        
        // Pre-validate all files
        const preValidationResults = await this.preValidateBatch(files);
        if (preValidationResults.criticalErrors.length > 0) {
            return {
                success: false,
                results: preValidationResults.criticalErrors,
                message: 'Validação prévia falhou',
                summary: {
                    total: totalFiles,
                    success: 0,
                    warnings: 0,
                    errors: preValidationResults.criticalErrors.length
                }
            };
        }
        
        for (let i = 0; i < files.length; i++) {
            const fileData = files[i];
            
            try {
                // Update progress
                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: totalFiles,
                        percentage: Math.round(((i + 1) / totalFiles) * 100),
                        currentFile: fileData.file.name
                    });
                }
                
                const targetPath = this.getTargetPath(fileData.type, fileData.file.name);
                const result = await this.uploadFile(fileData.file, targetPath, fileData.type);
                
                const fileResult = {
                    filename: fileData.file.name,
                    type: fileData.type,
                    targetPath,
                    ...result
                };
                
                results.push(fileResult);
                
                if (result.success) {
                    successCount++;
                    if (result.warnings && result.warnings.length > 0) {
                        warningCount++;
                    }
                } else {
                    errorCount++;
                }
                
            } catch (error) {
                errorCount++;
                results.push({
                    filename: fileData.file.name,
                    type: fileData.type,
                    success: false,
                    message: `Erro inesperado: ${error.message}`
                });
            }
        }
        
        const summary = {
            total: totalFiles,
            success: successCount,
            warnings: warningCount,
            errors: errorCount
        };
        
        return {
            success: successCount === files.length,
            results,
            message: this.generateBatchSummaryMessage(summary),
            summary
        };
    }

    /**
     * Pre-validate batch of files
     * @param {FileUploadData[]} files - Files to validate
     * @returns {Promise<Object>} Validation results
     */
    async preValidateBatch(files) {
        const criticalErrors = [];
        const warnings = [];
        
        // Check for duplicate file types
        const typeCount = {};
        files.forEach(fileData => {
            typeCount[fileData.type] = (typeCount[fileData.type] || 0) + 1;
        });
        
        // Warn about multiple files of same type
        Object.entries(typeCount).forEach(([type, count]) => {
            if (count > 1) {
                warnings.push(`Múltiplos arquivos do tipo ${type} detectados`);
            }
        });
        
        // Check total batch size
        const totalSize = files.reduce((sum, fileData) => sum + fileData.file.size, 0);
        if (totalSize > 100 * 1024 * 1024) { // 100MB
            warnings.push('Lote muito grande, upload pode ser lento');
        }
        
        // Validate each file quickly
        for (const fileData of files) {
            const quickValidation = this.validateFile(fileData.file, fileData.type);
            if (!quickValidation.isValid) {
                criticalErrors.push({
                    filename: fileData.file.name,
                    type: fileData.type,
                    success: false,
                    message: `Validação falhou: ${quickValidation.errors.join(', ')}`
                });
            }
        }
        
        return { criticalErrors, warnings };
    }

    /**
     * Generate batch summary message
     * @param {Object} summary - Upload summary
     * @returns {string} Summary message
     */
    generateBatchSummaryMessage(summary) {
        const { total, success, warnings, errors } = summary;
        
        if (success === total) {
            if (warnings > 0) {
                return `${success} arquivos enviados com sucesso (${warnings} com avisos)`;
            }
            return `Todos os ${success} arquivos enviados com sucesso`;
        }
        
        if (success === 0) {
            return `Falha no envio de todos os ${total} arquivos`;
        }
        
        return `${success} de ${total} arquivos enviados com sucesso (${errors} falharam)`;
    }

    /**
     * Handle file processing errors with recovery suggestions
     * @param {Error} error - Error that occurred
     * @param {File} file - File being processed
     * @param {'excel'|'image'|'template'} type - File type
     * @returns {Object} Error handling result
     */
    handleFileError(error, file, type) {
        const errorInfo = {
            originalError: error.message,
            suggestions: [],
            canRetry: false,
            canRepair: false
        };
        
        // Categorize error types and provide suggestions
        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorInfo.suggestions.push('Verifique sua conexão com a internet');
            errorInfo.suggestions.push('Tente novamente em alguns minutos');
            errorInfo.canRetry = true;
        }
        
        if (error.message.includes('size') || error.message.includes('large')) {
            errorInfo.suggestions.push('Arquivo muito grande');
            if (type === 'image') {
                errorInfo.suggestions.push('Tente redimensionar a imagem');
                errorInfo.canRepair = true;
            } else {
                errorInfo.suggestions.push('Tente compactar o arquivo');
            }
        }
        
        if (error.message.includes('format') || error.message.includes('type')) {
            errorInfo.suggestions.push('Formato de arquivo não suportado');
            errorInfo.suggestions.push(`Converta para um formato válido para ${type}`);
        }
        
        if (error.message.includes('corrupt') || error.message.includes('invalid')) {
            errorInfo.suggestions.push('Arquivo pode estar corrompido');
            if (type === 'image') {
                errorInfo.canRepair = true;
                errorInfo.suggestions.push('Tentativa de reparo automático disponível');
            } else {
                errorInfo.suggestions.push('Tente abrir e salvar novamente no aplicativo original');
            }
        }
        
        if (error.message.includes('permission') || error.message.includes('access')) {
            errorInfo.suggestions.push('Problema de permissão');
            errorInfo.suggestions.push('Verifique se você tem acesso ao arquivo');
        }
        
        // Generic suggestions if no specific category matched
        if (errorInfo.suggestions.length === 0) {
            errorInfo.suggestions.push('Erro inesperado durante processamento');
            errorInfo.suggestions.push('Tente novamente ou contate o suporte');
            errorInfo.canRetry = true;
        }
        
        return errorInfo;
    }

    /**
     * Retry failed file operation with exponential backoff
     * @param {Function} operation - Operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise<any>} Operation result
     */
    async retryOperation(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break;
                }
                
                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error(`Operação falhou após ${maxRetries + 1} tentativas: ${lastError.message}`);
    }

    /**
     * Check if file exists in repository
     * @param {string} path - File path to check
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(path) {
        // Placeholder for GitHub API call
        // In real implementation, this would check if file exists in repository
        return false;
    }

    /**
     * Delete file from repository
     * @param {string} path - File path to delete
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async deleteFile(path) {
        try {
            // Simulate GitHub delete operation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`File ${path} would be deleted from repository`);
            
            return {
                success: true,
                message: `Arquivo ${path} removido com sucesso`
            };
            
        } catch (error) {
            console.error('Error deleting file:', error);
            return {
                success: false,
                message: `Erro ao remover arquivo: ${error.message}`
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
} else {
    window.FileManager = FileManager;
}