import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';

export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  tags: string[];
  files: string[];
  path?: string;
}

export interface Template {
  manifest: TemplateManifest;
  content: Record<string, string>;
}

class GitLabService {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, Template> = new Map();
  private listCache: TemplateManifest[] | null = null;
  private cacheTTL = 1000 * 60 * 5; // 5 minutes cache
  private lastFetch: number = 0;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: `${config.GITLAB_URL}/api/v4/projects/${config.GITLAB_PROJECT_ID}`,
      headers: {
        'PRIVATE-TOKEN': config.GITLAB_PAT,
      },
    });
  }

  private async fetchFile(path: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(`/repository/files/${encodeURIComponent(path)}/raw?ref=main`, {
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      process.stderr.write(`Error fetching file ${path}: ${error instanceof Error ? error.message : String(error)}\n`);
      return '';
    }
  }

  async listTemplates(): Promise<TemplateManifest[]> {
    const now = Date.now();
    if (this.listCache && now - this.lastFetch < this.cacheTTL) {
      return this.listCache;
    }

    try {
      // List directories in GITLAB_TEMPLATES_PATH with pagination support
      const manifests: TemplateManifest[] = [];
      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await this.axiosInstance.get('/repository/tree', {
          params: {
            path: config.GITLAB_TEMPLATES_PATH,
            ref: 'main',
            per_page: 100,
            page: page,
          },
        });

        const directories = response.data.filter((item: any) => item.type === 'tree');

        for (const dir of directories) {
          const manifestContent = await this.fetchFile(`${dir.path}/manifest.json`);
          if (manifestContent) {
            try {
              const manifest = JSON.parse(manifestContent);
              manifests.push({
                ...manifest,
                id: dir.name,
                path: dir.path
              });
            } catch (e) {
              process.stderr.write(`Error parsing manifest.json for ${dir.name}: ${e instanceof Error ? e.message : String(e)}\n`);
            }
          }
        }

        if (response.data.length < 100) {
          hasNextPage = false;
        } else {
          page++;
        }
      }

      this.listCache = manifests;
      this.lastFetch = now;
      return manifests;
    } catch (error) {
      process.stderr.write(`Error listing templates: ${error instanceof Error ? error.message : String(error)}\n`);
      return [];
    }
  }

  async getTemplate(id: string): Promise<Template | null> {
    const now = Date.now();
    if (this.cache.has(id)) {
      // Simplistic cache - in real world would check expiration
      return this.cache.get(id) || null;
    }

    const templates = await this.listTemplates();
    const manifest = templates.find(t => t.id === id);

    if (!manifest || !manifest.path) {
      return null;
    }

    const templatePath = manifest.path;
    const content: Record<string, string> = {};

    for (const fileName of manifest.files) {
      const fileContent = await this.fetchFile(`${templatePath}/${fileName}`);
      content[fileName] = fileContent;
    }

    // Also try to fetch README.md if it exists and not in files
    if (!manifest.files.includes('README.md')) {
        const readme = await this.fetchFile(`${templatePath}/README.md`);
        if (readme) {
            content['README.md'] = readme;
        }
    }

    const template = { manifest, content };
    this.cache.set(id, template);
    return template;
  }

  async searchTemplates(query: string): Promise<TemplateManifest[]> {
    const templates = await this.listTemplates();
    const q = query.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }
}

export const gitLabService = new GitLabService();
