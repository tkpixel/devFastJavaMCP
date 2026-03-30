import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { gitLabService } from './gitlab.js';

const server = new Server(
  {
    name: 'devfast-java-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_templates',
        description: 'Search for JavaFX templates by query (name, description, or tags)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_template_code',
        description: 'Get raw code for a specific component template',
        inputSchema: {
          type: 'object',
          properties: {
            componentId: { type: 'string', description: 'The ID (folder name) of the template' },
          },
          required: ['componentId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'search_templates') {
    const query = String(args?.query || '');
    const results = await gitLabService.searchTemplates(query);
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
  }

  if (name === 'get_template_code') {
    const componentId = String(args?.componentId || '');
    const template = await gitLabService.getTemplate(componentId);
    if (!template) {
      throw new McpError(ErrorCode.InvalidRequest, `Template ${componentId} not found`);
    }
    return {
      content: Object.entries(template.content).map(([fileName, content]) => ({
        type: 'text',
        text: `File: ${fileName}\n\n${content}`,
      })),
    };
  }

  throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
});

// Resources Handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const templates = await gitLabService.listTemplates();
  const resources = [];

  for (const t of templates) {
    resources.push({
      uri: `gitlab://templates/${t.id}/README.md`,
      name: `${t.name} Documentation`,
      mimeType: 'text/markdown',
    });
    for (const f of t.files) {
      resources.push({
        uri: `gitlab://templates/${t.id}/${f}`,
        name: `${t.name} - ${f}`,
        mimeType: f.endsWith('.java') ? 'text/x-java' : f.endsWith('.xml') ? 'application/xml' : 'text/plain',
      });
    }
  }

  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  if (url.protocol !== 'gitlab:') {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid protocol');
  }

  const pathParts = url.pathname.replace(/^\/\//, '').split('/');
  // expected format: templates/<id>/<filename>
  if (pathParts[0] !== 'templates' || pathParts.length < 3) {
    throw new McpError(ErrorCode.InvalidRequest, 'Invalid resource URI format');
  }

  const componentId = pathParts[1];
  const fileName = pathParts.slice(2).join('/');

  const template = await gitLabService.getTemplate(componentId);
  if (!template || !template.content[fileName]) {
    throw new McpError(ErrorCode.InvalidRequest, `Resource ${request.params.uri} not found`);
  }

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: fileName.endsWith('.java') ? 'text/x-java' : fileName.endsWith('.xml') ? 'application/xml' : 'text/plain',
        text: template.content[fileName],
      },
    ],
  };
});

// Prompts Handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'generate_javafx_component',
        description: 'Generate a new JavaFX component following corporate standards',
        arguments: [
          {
            name: 'description',
            description: 'What component do you want to build?',
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== 'generate_javafx_component') {
    throw new McpError(ErrorCode.InvalidRequest, 'Prompt not found');
  }

  const description = String(request.params.arguments?.description || '');

  return {
    description: 'Generate a JavaFX component',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are a JavaFX expert for our company. Use the get_template_code tool to understand our architecture, then generate a component based on this description: ${description}`,
        },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('DevFast Java MCP Server running on stdio');
}

main().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
