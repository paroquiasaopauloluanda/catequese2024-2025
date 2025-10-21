/**
 * File Optimizer
 * Handles file compression, caching, and optimization for uploads
 */
class FileOptimizer {
    constructor() {
        this.compressionCache = new Map();
        this.configCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.maxCacheSize = 50; // Maximum cached items
        
        // Compression settings
        this.compressionSettings = {
            image: {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.8,
                format: 'image/jpeg'
            },
            excel: {
                enableCompression: true,
                chunkSize: 64 * 1024 // 64KB chunks for large files
            }
        };
    }

    /**
     * Compress file for upload with caching
     * @param {File} file - File to compress
     * @param {string} type - File type ('image', 'excel', 'template')
     * @returns {Promise<{compressed: string, originalSize: number, compressedSize: number, compressionRatio: number}>}
     */
    async compressFile(file, type) {
        // Generate cache key based on file content
        const cacheKey = await this.generateFileHash(file);
        
        // Check cache first
        const cached = this.getCachedCompression(cacheKey);
        if (cached) {
            return cached;
        }

        let result;
        switch (type) {
            case 'image':
                result = await this.compressImage(file);
                break;
            case 'excel':
            case 'template':
                result = await this.compressExcel(file);
                break;
            default:
                result = await this.compressGeneric(file);
        }

        // Cache the result
        this.setCachedCompression(cacheKey, result);
        
        return result;
    }

    /**
     * Compress image file with optimization
     * @param {File} file - Image file to compress
     * @returns {Promise<Object>} Compression result
     */
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Calculate optimal dimensions
                        const { width, height } = this.calculateOptimalDimensions(
                            img.width, 
                            img.height, 
                            this.compressionSettings.image.maxWidth,
                            this.compressionSettings.image.maxHeight
                        );           
             
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Enable high-quality rendering
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // Draw optimized image
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Convert to compressed format
                        canvas.toBlob((blob) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const base64 = reader.result.split(',')[1];
                                const originalSize = file.size;
                                const compressedSize = blob.size;
                                
                                resolve({
                                    compressed: base64,
                                    originalSize,
                                    compressedSize,
                                    compressionRatio: (1 - compressedSize / originalSize) * 100,
                                    dimensions: { width, height },
                                    format: this.compressionSettings.image.format
                                });
                            };
                            reader.readAsDataURL(blob);
                        }, this.compressionSettings.image.format, this.compressionSettings.image.quality);
                        
                    } catch (error) {
                        reject(new Error('Erro ao comprimir imagem: ' + error.message));
                    }
                };
                
                img.onerror = () => reject(new Error('Erro ao carregar imagem para compressão'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress Excel file using chunked processing
     * @param {File} file - Excel file to compress
     * @returns {Promise<Object>} Compression result
     */
    async compressExcel(file) {
        try {
            // For Excel files, we'll use base64 encoding with chunked processing
            const base64 = await this.fileToBase64Chunked(file);
            
            // Simulate compression by removing unnecessary whitespace and optimizing base64
            const compressed = this.optimizeBase64(base64);
            
            const originalSize = file.size;
            const compressedSize = Math.floor(compressed.length * 0.75); // Approximate decoded size
            
            return {
                compressed,
                originalSize,
                compressedSize,
                compressionRatio: Math.max(0, (1 - compressedSize / originalSize) * 100),
                method: 'base64_optimized'
            };
            
        } catch (error) {
            throw new Error('Erro ao comprimir arquivo Excel: ' + error.message);
        }
    }

    /**
     * Generic file compression
     * @param {File} file - File to compress
     * @returns {Promise<Object>} Compression result
     */
    async compressGeneric(file) {
        try {
            const base64 = await this.fileToBase64Chunked(file);
            const compressed = this.optimizeBase64(base64);
            
            return {
                compressed,
                originalSize: file.size,
                compressedSize: Math.floor(compressed.length * 0.75),
                compressionRatio: 0,
                method: 'base64'
            };
            
        } catch (error) {
            throw new Error('Erro ao processar arquivo: ' + error.message);
        }
    }

    /**
     * Convert file to base64 using chunked processing for large files
     * @param {File} file - File to convert
     * @returns {Promise<string>} Base64 encoded file
     */
    async fileToBase64Chunked(file) {
        const chunkSize = this.compressionSettings.excel.chunkSize;
        
        if (file.size <= chunkSize) {
            // Small file, process normally
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
                reader.readAsDataURL(file);
            });
        }

        // Large file, process in chunks
        const chunks = [];
        let offset = 0;

        while (offset < file.size) {
            const chunk = file.slice(offset, offset + chunkSize);
            const chunkBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    // Remove data URL prefix for chunks after the first
                    const base64 = offset === 0 ? result.split(',')[1] : btoa(result);
                    resolve(base64);
                };
                reader.onerror = () => reject(new Error('Erro ao ler chunk do arquivo'));
                
                if (offset === 0) {
                    reader.readAsDataURL(chunk);
                } else {
                    reader.readAsBinaryString(chunk);
                }
            });
            
            chunks.push(chunkBase64);
            offset += chunkSize;
        }

        return chunks.join('');
    }

    /**
     * Optimize base64 string by removing unnecessary characters
     * @param {string} base64 - Base64 string to optimize
     * @returns {string} Optimized base64 string
     */
    optimizeBase64(base64) {
        // Remove any whitespace and line breaks
        return base64.replace(/\s/g, '');
    }

    /**
     * Calculate optimal dimensions for image resizing
     * @param {number} originalWidth - Original image width
     * @param {number} originalHeight - Original image height
     * @param {number} maxWidth - Maximum allowed width
     * @param {number} maxHeight - Maximum allowed height
     * @returns {Object} Optimal dimensions
     */
    calculateOptimalDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;

        // Calculate scaling factor
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio, 1); // Don't upscale

        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);

        return { width, height };
    }

    /**
     * Generate hash for file caching
     * @param {File} file - File to hash
     * @returns {Promise<string>} File hash
     */
    async generateFileHash(file) {
        // Simple hash based on file properties and a sample of content
        const sample = file.slice(0, 1024); // First 1KB
        const sampleText = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsText(sample);
        });

        const hashInput = `${file.name}_${file.size}_${file.lastModified}_${sampleText}`;
        
        // Simple hash function (for production, consider using crypto.subtle.digest)
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
            const char = hashInput.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * Get cached compression result
     * @param {string} key - Cache key
     * @returns {Object|null} Cached result or null
     */
    getCachedCompression(key) {
        const cached = this.compressionCache.get(key);
        
        if (!cached) return null;
        
        // Check if cache entry has expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.compressionCache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    /**
     * Set cached compression result
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    setCachedCompression(key, data) {
        // Clean up old entries if cache is full
        if (this.compressionCache.size >= this.maxCacheSize) {
            const oldestKey = this.compressionCache.keys().next().value;
            this.compressionCache.delete(oldestKey);
        }
        
        this.compressionCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Cache configuration data
     * @param {string} key - Cache key
     * @param {Object} config - Configuration to cache
     */
    cacheConfig(key, config) {
        this.configCache.set(key, {
            data: JSON.parse(JSON.stringify(config)), // Deep copy
            timestamp: Date.now()
        });
    }

    /**
     * Get cached configuration
     * @param {string} key - Cache key
     * @returns {Object|null} Cached configuration or null
     */
    getCachedConfig(key) {
        const cached = this.configCache.get(key);
        
        if (!cached) return null;
        
        // Check if cache entry has expired
        if (Date.now() - cached.timestamp > this.cacheExpiry) {
            this.configCache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.compressionCache.clear();
        this.configCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            compressionCache: {
                size: this.compressionCache.size,
                maxSize: this.maxCacheSize
            },
            configCache: {
                size: this.configCache.size,
                maxSize: this.maxCacheSize
            },
            cacheExpiry: this.cacheExpiry
        };
    }

    /**
     * Optimize GitHub API usage by batching requests
     * @param {Array} operations - Array of operations to batch
     * @param {number} batchSize - Size of each batch
     * @returns {Promise<Array>} Results of batched operations
     */
    async batchGitHubOperations(operations, batchSize = 3) {
        const results = [];
        
        for (let i = 0; i < operations.length; i += batchSize) {
            const batch = operations.slice(i, i + batchSize);
            
            // Execute batch in parallel
            const batchResults = await Promise.allSettled(
                batch.map(operation => operation())
            );
            
            results.push(...batchResults);
            
            // Add delay between batches to respect rate limits
            if (i + batchSize < operations.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    /**
     * Estimate upload time based on file size and connection
     * @param {number} fileSize - File size in bytes
     * @param {number} connectionSpeed - Connection speed in bytes per second (optional)
     * @returns {Object} Time estimation
     */
    estimateUploadTime(fileSize, connectionSpeed = 1024 * 1024) { // Default 1MB/s
        const estimatedSeconds = fileSize / connectionSpeed;
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = Math.floor(estimatedSeconds % 60);
        
        return {
            totalSeconds: estimatedSeconds,
            formatted: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
            category: estimatedSeconds < 10 ? 'fast' : 
                     estimatedSeconds < 30 ? 'medium' : 'slow'
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FileOptimizer = FileOptimizer;
}