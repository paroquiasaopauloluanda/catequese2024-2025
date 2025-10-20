/**
 * Simple Build Script for Production Deployment
 * This script optimizes the admin panel for production deployment
 */

const fs = require('fs');
const path = require('path');

class BuildOptimizer {
    constructor() {
        this.config = null;
        this.environment = process.env.NODE_ENV || 'production';
        this.buildDir = path.join(__dirname, 'dist');
        this.sourceDir = __dirname;
    }

    /**
     * Load deployment configuration
     */
    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'deployment.config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            this.config = JSON.parse(configData);
            console.log(`Configuration loaded for environment: ${this.environment}`);
        } catch (error) {
            console.error('Failed to load deployment configuration:', error.message);
            process.exit(1);
        }
    }

    /**
     * Create build directory
     */
    createBuildDir() {
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.buildDir, { recursive: true });
        console.log('Build directory created');
    }

    /**
     * Copy and optimize files
     */
    async optimizeFiles() {
        const filesToCopy = [
            'index.html',
            'styles/',
            'js/',
            'deployment.config.json'
        ];

        for (const file of filesToCopy) {
            const sourcePath = path.join(this.sourceDir, file);
            const destPath = path.join(this.buildDir, file);

            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, destPath);
            } else {
                this.copyFile(sourcePath, destPath);
            }
        }

        console.log('Files copied and optimized');
    }

    /**
     * Copy directory recursively
     */
    copyDirectory(source, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const files = fs.readdirSync(source);
        
        for (const file of files) {
            const sourcePath = path.join(source, file);
            const destPath = path.join(dest, file);

            if (fs.statSync(sourcePath).isDirectory()) {
                this.copyDirectory(sourcePath, destPath);
            } else {
                this.copyFile(sourcePath, destPath);
            }
        }
    }

    /**
     * Copy and optimize individual file
     */
    copyFile(source, dest) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        let content = fs.readFileSync(source, 'utf8');
        const ext = path.extname(source);

        // Optimize based on file type
        if (ext === '.html') {
            content = this.optimizeHTML(content);
        } else if (ext === '.js') {
            content = this.optimizeJS(content);
        } else if (ext === '.css') {
            content = this.optimizeCSS(content);
        }

        fs.writeFileSync(dest, content);
    }

    /**
     * Optimize HTML content
     */
    optimizeHTML(content) {
        if (this.environment === 'production') {
            // Remove comments and extra whitespace
            content = content
                .replace(/<!--[\s\S]*?-->/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Inject environment-specific configuration
            const envConfig = this.config.environments[this.environment];
            content = content.replace(
                '<!-- ENVIRONMENT_CONFIG -->',
                `<script>window.ENV_CONFIG = ${JSON.stringify(envConfig)};</script>`
            );
        }

        return content;
    }

    /**
     * Optimize JavaScript content
     */
    optimizeJS(content) {
        if (this.environment === 'production') {
            // Remove console.log statements
            content = content.replace(/console\.log\([^)]*\);?/g, '');
            
            // Remove debug comments
            content = content.replace(/\/\/ DEBUG:.*$/gm, '');
            content = content.replace(/\/\* DEBUG:[\s\S]*?\*\//g, '');
        }

        return content;
    }

    /**
     * Optimize CSS content
     */
    optimizeCSS(content) {
        if (this.environment === 'production') {
            // Remove comments and extra whitespace
            content = content
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s+/g, ' ')
                .replace(/;\s*}/g, '}')
                .trim();
        }

        return content;
    }

    /**
     * Generate build manifest
     */
    generateManifest() {
        const manifest = {
            version: this.config.version,
            environment: this.environment,
            buildTime: new Date().toISOString(),
            files: this.getFileList(this.buildDir),
            config: this.config.environments[this.environment]
        };

        const manifestPath = path.join(this.buildDir, 'build-manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('Build manifest generated');
        return manifest;
    }

    /**
     * Get list of files in directory
     */
    getFileList(dir, baseDir = dir) {
        const files = [];
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.relative(baseDir, fullPath);

            if (fs.statSync(fullPath).isDirectory()) {
                files.push(...this.getFileList(fullPath, baseDir));
            } else {
                const stats = fs.statSync(fullPath);
                files.push({
                    path: relativePath.replace(/\\/g, '/'),
                    size: stats.size,
                    modified: stats.mtime.toISOString()
                });
            }
        }

        return files;
    }

    /**
     * Validate build
     */
    validateBuild() {
        const requiredFiles = [
            'index.html',
            'js/app.js',
            'styles/main.css',
            'build-manifest.json'
        ];

        const missing = [];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.buildDir, file);
            if (!fs.existsSync(filePath)) {
                missing.push(file);
            }
        }

        if (missing.length > 0) {
            console.error('Build validation failed. Missing files:', missing);
            return false;
        }

        console.log('Build validation passed');
        return true;
    }

    /**
     * Run the complete build process
     */
    async build() {
        console.log(`Starting build for environment: ${this.environment}`);
        
        try {
            this.loadConfig();
            this.createBuildDir();
            await this.optimizeFiles();
            const manifest = this.generateManifest();
            
            if (this.validateBuild()) {
                console.log('Build completed successfully!');
                console.log(`Build output: ${this.buildDir}`);
                console.log(`Build version: ${manifest.version}`);
                return true;
            } else {
                console.error('Build failed validation');
                return false;
            }
            
        } catch (error) {
            console.error('Build failed:', error.message);
            return false;
        }
    }
}

// Run build if this script is executed directly
if (require.main === module) {
    const builder = new BuildOptimizer();
    builder.build().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = BuildOptimizer;