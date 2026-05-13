/**
 * Agent Registry for Custom Agent Registration
 * Manages custom agent definitions with IndexedDB persistence
 */

const DB_NAME = 'ai-subscription';
const DB_VERSION = 1;
const STORE_NAME = 'custom_agents';

export interface CustomAgentDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];  // e.g., ['summarization', 'translation', 'custom']
  executeCode: string;      // Stored as string, eval at runtime
  validateCode?: string;   // Optional validation function code
}

export interface SerializedAgentDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  executeCode: string;
  validateCode?: string;
}

/**
 * AgentRegistry - Singleton registry for custom agents
 * Provides persistence via IndexedDB
 */
export class AgentRegistry {
  private agents: Map<string, CustomAgentDefinition> = new Map();
  private static instance: AgentRegistry | null = null;
  private dbReady: Promise<void>;

  private constructor() {
    this.dbReady = this.initDB();
    this.loadFromStorage();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        // Ensure store exists
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Need upgrade - reopen with version bump
          db.close();
          const upgradeReq = indexedDB.open(DB_NAME, DB_VERSION + 1);
          upgradeReq.onerror = () => reject(upgradeReq.error);
          upgradeReq.onsuccess = () => {
            const newDb = upgradeReq.result;
            if (!newDb.objectStoreNames.contains(STORE_NAME)) {
              newDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            newDb.close();
          };
        }
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Register a new agent
   */
  register(agent: CustomAgentDefinition): void {
    if (!agent.id || !agent.name) {
      throw new Error('Agent must have id and name');
    }
    this.agents.set(agent.id, { ...agent });
  }

  /**
   * Unregister an agent by ID
   */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): CustomAgentDefinition | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all registered agents
   */
  listAgents(): CustomAgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: string): CustomAgentDefinition[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Execute a custom agent by ID
   */
  async execute(agentId: string, input: unknown): Promise<unknown> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return this.executeAgent(agent, input);
  }

  /**
   * Execute agent from definition
   */
  private async executeAgent(agent: CustomAgentDefinition, input: unknown): Promise<unknown> {
    // Validate input if validation code exists
    if (agent.validateCode) {
      const validateFn = this.createValidateFunction(agent.validateCode);
      if (validateFn && !validateFn(input)) {
        throw new Error('Input validation failed');
      }
    }

    // Create and execute the function
    const fn = this.createExecuteFunction(agent.executeCode);
    return fn(input);
  }

  /**
   * Create execute function from code string
   */
  private createExecuteFunction(code: string): (input: unknown) => Promise<unknown> {
    try {
      // Wrap in async function and execute
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('input', `
        "use strict";
        return (async () => {
          ${code}
        })();
      `);
      return fn;
    } catch (error) {
      throw new Error(`Failed to create execute function: ${error}`);
    }
  }

  /**
   * Create validation function from code string
   */
  private createValidateFunction(code: string): ((input: unknown) => boolean) | null {
    try {
      const fn = new Function('input', `
        "use strict";
        ${code}
      `);
      return fn;
    } catch {
      return null;
    }
  }

  /**
   * Save agents to IndexedDB storage
   */
  async saveToStorage(): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = async () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        // Clear existing and save all
        store.clear();

        const agents = this.listAgents();
        for (const agent of agents) {
          const serialized: SerializedAgentDefinition = {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            capabilities: agent.capabilities,
            executeCode: agent.executeCode,
            validateCode: agent.validateCode,
          };
          store.put(serialized);
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Load agents from IndexedDB storage
   */
  async loadFromStorage(): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getAllReq = store.getAll();

        getAllReq.onsuccess = () => {
          const agents = getAllReq.result as SerializedAgentDefinition[];
          agents.forEach(agent => {
            this.agents.set(agent.id, {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              capabilities: agent.capabilities,
              executeCode: agent.executeCode,
              validateCode: agent.validateCode,
            });
          });
          db.close();
          resolve();
        };

        getAllReq.onerror = () => {
          db.close();
          reject(getAllReq.error);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
}

// Singleton instance getter
let registryInstance: AgentRegistry | null = null;

export function getAgentRegistry(): AgentRegistry {
  if (!registryInstance) {
    registryInstance = AgentRegistry.getInstance();
  }
  return registryInstance;
}
