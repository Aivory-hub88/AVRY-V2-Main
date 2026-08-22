/**
 * Agents Repository
 * JSON-file based storage for agents (similar to workflows/blueprints pattern)
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../logger');

const AGENTS_FILE = path.join(__dirname, '../data/agents.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(AGENTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load all agents from file
function loadAgents() {
  try {
    ensureDataDir();
    if (!fs.existsSync(AGENTS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(AGENTS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    logger.error('Failed to load agents', { error: error.message });
    return [];
  }
}

// Save agents to file
function saveAgents(agents) {
  try {
    ensureDataDir();
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Failed to save agents', { error: error.message });
    throw error;
  }
}

// Get all agents for a workspace (excluding soft-deleted)
function getAgentsByWorkspace(workspaceId, filters = {}) {
  const agents = loadAgents();
  
  let filtered = agents.filter(a => 
    a.workspaceId === workspaceId && !a.deletedAt
  );

  // Apply status filter if provided
  if (filters.status) {
    filtered = filtered.filter(a => a.status === filters.status);
  }

  // Apply search filter if provided
  if (filters.q) {
    const q = filters.q.toLowerCase();
    filtered = filtered.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.description && a.description.toLowerCase().includes(q))
    );
  }

  return filtered;
}

// Get agent by ID
function getAgentById(id, workspaceId) {
  const agents = loadAgents();
  return agents.find(a => a.id === id && a.workspaceId === workspaceId && !a.deletedAt);
}

// Create new agent
function createAgent(workspaceId, data) {
  const agent = {
    id: uuidv4(),
    workspaceId,
    name: data.name,
    description: data.description || '',
    model: data.model,
    provider: data.provider,
    runtime: data.runtime || 'zeroclaw',
    status: data.status || 'draft',
    config: data.config || {},
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()) : []),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null
  };

  const agents = loadAgents();
  agents.push(agent);
  saveAgents(agents);

  return agent;
}

// Update agent
function updateAgent(id, workspaceId, updates) {
  const agents = loadAgents();
  const index = agents.findIndex(a => a.id === id && a.workspaceId === workspaceId && !a.deletedAt);

  if (index === -1) {
    return null;
  }

  const agent = agents[index];
  
  // Only allow updating specific fields
  const allowedFields = ['name', 'description', 'status', 'model', 'provider', 'runtime', 'tags', 'config'];
  allowedFields.forEach(field => {
    if (field in updates) {
      if (field === 'tags' && typeof updates[field] === 'string') {
        agent[field] = updates[field].split(',').map(t => t.trim());
      } else {
        agent[field] = updates[field];
      }
    }
  });

  agent.updatedAt = new Date().toISOString();
  agents[index] = agent;
  saveAgents(agents);

  return agent;
}

// Soft delete agent
function deleteAgent(id, workspaceId) {
  const agents = loadAgents();
  const index = agents.findIndex(a => a.id === id && a.workspaceId === workspaceId && !a.deletedAt);

  if (index === -1) {
    return false;
  }

  agents[index].deletedAt = new Date().toISOString();
  agents[index].status = 'disabled';
  saveAgents(agents);

  return true;
}

module.exports = {
  getAgentsByWorkspace,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent
};
