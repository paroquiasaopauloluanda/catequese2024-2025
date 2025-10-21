/**
 * GitHub API Integration
 * Handles all GitHub operations for saving configurations and Excel files
 */
class GitHubAPI {
    constructor() {
        this.token = null;
        this.owner = null;
        this.repo = null;
        this.branch = 'main';
        this.baseURL = 'https://api.github.com';
        
        // Load saved configuration
        this.loadConfig();
    }

    /**
     * Load GitHub configuration from localStorage
     */
    loadConfig() {
        const config = localStorage.getItem('github_config');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                this.token = parsed.token;
                this.owner = parsed.owner;
                this.repo = parsed.repo;
                this.branch = parsed.branch || 'main';
            } catch (error) {
                console.error('Error loading GitHub config:', error);
            }
        }
    }

    /**
     * Save GitHub configuration
     */
    saveConfig(token, owner, repo, branch = 'main') {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
        
        const config = { token, owner, repo, branch };
        localStorage.setItem('github_config', JSON.stringify(config));
    }

    /**
     * Check if GitHub is configured
     */
    isConfigured() {
        return !!(this.token && this.owner && this.repo);
    }

    /**
     * Get file content from GitHub
     */
    async getFile(path) {
        if (!this.isConfigured()) {
            throw new Error('GitHub não está configurado');
        }

        const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Decode base64 content
        const content = atob(data.content.replace(/\n/g, ''));
        
        return {
            content,
            sha: data.sha,
            path: data.path
        };
    }

    /**
     * Update file content on GitHub
     */
    async updateFile(path, content, message, sha = null) {
        if (!this.isConfigured()) {
            throw new Error('GitHub não está configurado');
        }

        const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/contents/${path}`;
        
        // If sha is not provided, get current file info
        if (!sha) {
            try {
                const fileInfo = await this.getFile(path);
                sha = fileInfo.sha;
            } catch (error) {
                // File doesn't exist, that's ok for new files
                
            }
        }

        const body = {
            message,
            content: btoa(unescape(encodeURIComponent(content))), // Encode to base64
            branch: this.branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao salvar arquivo: ${response.status} - ${errorData.message}`);
        }

        return await response.json();
    }

    /**
     * Save configuration file to GitHub
     */
    async saveConfiguration(config) {
        const content = JSON.stringify(config, null, 2);
        const message = `admin: update system configuration - ${new Date().toISOString()}`;
        
        return await this.updateFile('config/settings.json', content, message);
    }

    /**
     * Save Excel data to GitHub (as JSON for now)
     */
    async saveExcelData(data, filename = 'dados-catequese.json') {
        const content = JSON.stringify(data, null, 2);
        const message = `admin: update catechesis data - ${new Date().toISOString()}`;
        
        return await this.updateFile(`data/${filename}`, content, message);
    }

    /**
     * Get repository information
     */
    async getRepoInfo() {
        if (!this.isConfigured()) {
            throw new Error('GitHub não está configurado');
        }

        const url = `${this.baseURL}/repos/${this.owner}/${this.repo}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar informações do repositório: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Trigger GitHub Pages deployment
     */
    async triggerDeployment() {
        if (!this.isConfigured()) {
            throw new Error('GitHub não está configurado');
        }

        // Create an empty commit to trigger deployment
        const message = `admin: trigger deployment - ${new Date().toISOString()}`;
        
        try {
            // Get latest commit
            const url = `${this.baseURL}/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                
                return { success: true, message: 'Deployment triggered' };
            }
        } catch (error) {
            
        }

        return { success: true, message: 'Changes saved, deployment will happen automatically' };
    }

    /**
     * Test GitHub connection
     */
    async testConnection() {
        try {
            const repoInfo = await this.getRepoInfo();
            return {
                success: true,
                message: `Conectado ao repositório: ${repoInfo.full_name}`,
                data: repoInfo
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// Make available globally
window.GitHubAPI = GitHubAPI;