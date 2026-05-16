/**
 * MCP Server Templates
 * Pre-configured templates for popular MCP servers
 */

export interface MCPServerTemplate {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  description: string;
  icon?: string;
}

export const MCPTEMPLATES: MCPServerTemplate[] = [
  {
    id: 'github',
    name: 'GitHub',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-github'],
    env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' },
    description: 'GitHub API - issues, PRs, repos, search, file operations',
    icon: 'GithubOutlined',
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '${BRAVE_API_KEY}' },
    description: 'Web search via Brave Search API',
    icon: 'SearchOutlined',
  },
  {
    id: 'slack',
    name: 'Slack',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: { SLACK_BOT_TOKEN: '${SLACK_BOT_TOKEN}', SLACK_TEAM_ID: '${SLACK_TEAM_ID}' },
    description: 'Slack messaging, channels, and workspace management',
    icon: 'MessageOutlined',
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
    env: { ALLOWED_DIRECTORIES: '${ALLOWED_DIRECTORIES}' },
    description: 'File read/write operations with permission control',
    icon: 'FolderOutlined',
  },
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): MCPServerTemplate | undefined {
  return MCPTEMPLATES.find(t => t.id === id);
}

/**
 * Get all template IDs
 */
export function getTemplateIds(): string[] {
  return MCPTEMPLATES.map(t => t.id);
}