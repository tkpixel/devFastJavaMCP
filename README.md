# DevFast Java MCP Server

A standalone Model Context Protocol (MCP) server that provides JavaFX and MVVM templates from a private GitLab repository to AI assistants like GitHub Copilot and Claude.

## Features

- **Tools**:
  - `search_templates(query)`: Find relevant JavaFX templates by name, description, or tags.
  - `get_template_code(componentId)`: Retrieve the full source code (Java, FXML, CSS) for a specific component.
- **Resources**:
  - Direct access to template files via `gitlab://templates/<id>/<filename>` URIs.
- **Prompts**:
  - `generate_javafx_component`: Guided prompt to help the AI generate new components following internal standards.

## Prerequisites

- Node.js (v18 or higher)
- A GitLab Personal Access Token (PAT) with `read_repository` and `api` scopes.

## Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables. Create a `.env` file in the root directory:
   ```env
   GITLAB_URL=https://your-gitlab-instance.com
   GITLAB_PAT=your_personal_access_token
   GITLAB_PROJECT_ID=your_project_id
   GITLAB_TEMPLATES_PATH=templates
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration in IDEs

### GitHub Copilot (VS Code)

To use this server with GitHub Copilot, you need to register it as an MCP server. (Note: Ensure your Copilot extension supports MCP or use an MCP bridge).

Add the following to your MCP settings (usually in `mcp_config.json` for supported clients):

```json
{
  "mcpServers": {
    "devfast-java": {
      "command": "node",
      "args": ["/path/to/devfast-java-mcp/dist/index.js"],
      "env": {
        "GITLAB_URL": "https://gitlab.com",
        "GITLAB_PAT": "...",
        "GITLAB_PROJECT_ID": "..."
      }
    }
  }
}
```

### Claude Desktop

Add the server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devfast-java": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

## Development

- `npm run dev`: Start in development mode with auto-reload.
- `npm run build`: Build the production-ready executable in `dist/`.
- `npm run lint`: Check for TypeScript errors.

## Logging

All logs are directed to `stderr` to prevent interference with the MCP protocol on `stdout`.
