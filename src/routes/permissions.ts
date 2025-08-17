import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WinstonLogger } from '../logger-winston';
import { 
  PermissionManager, 
  DefaultPermissions, 
  ActionType, 
  PermissionScope,
  PermissionRule,
  PermissionConfig,
  PermissionContext
} from '../utils/permissions';

const PERMISSIONS_CONFIG_PATH = path.join(process.cwd(), 'permissions-config.json');

// Helper function to read permissions config
async function readPermissionsConfig(): Promise<PermissionConfig> {
  try {
    const data = await fs.readFile(PERMISSIONS_CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return default restrictive config if file doesn't exist
    return DefaultPermissions.restrictive();
  }
}

// Helper function to write permissions config
async function writePermissionsConfig(config: PermissionConfig): Promise<void> {
  try {
    await fs.writeFile(PERMISSIONS_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error writing permissions config:', error);
    throw new Error('Failed to save permissions configuration');
  }
}

export function createPermissionRoutes(logger: WinstonLogger) {
  const router = express.Router();

  // GET /permissions/config - Get permission configuration
  router.get('/config', async (req, res) => {
    try {
      const config = await readPermissionsConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      logger.error('Error fetching permissions config:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch permissions configuration' });
    }
  });

  // PUT /permissions/config - Update permission configuration
  router.put('/config', async (req, res) => {
    try {
      const currentConfig = await readPermissionsConfig();
      const updates = req.body;
      
      const newConfig = {
        ...currentConfig,
        ...updates
      };
      
      await writePermissionsConfig(newConfig);
      logger.info('Updated permissions configuration', updates);
      
      res.json({ success: true, data: newConfig });
    } catch (error) {
      logger.error('Error updating permissions config:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to update permissions configuration' });
    }
  });

  // GET /permissions/rules - Get all permission rules
  router.get('/rules', async (req, res) => {
    try {
      const config = await readPermissionsConfig();
      res.json({ success: true, data: config.rules });
    } catch (error) {
      logger.error('Error fetching permission rules:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch permission rules' });
    }
  });

  // POST /permissions/rules - Create new permission rule
  router.post('/rules', async (req, res) => {
    try {
      const { action, scope, target, allowed, reason, priority } = req.body;
      
      if (!action || !scope || typeof allowed !== 'boolean' || typeof priority !== 'number') {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: action, scope, allowed, priority' 
        });
      }
      
      const config = await readPermissionsConfig();
      const newRule: PermissionRule = {
        id: uuidv4(),
        action,
        scope,
        target,
        allowed,
        reason,
        priority
      };
      
      config.rules.push(newRule);
      // Sort rules by priority (highest first)
      config.rules.sort((a, b) => b.priority - a.priority);
      
      await writePermissionsConfig(config);
      logger.info('Created permission rule:', { ruleId: newRule.id, action, scope, allowed });
      
      res.status(201).json({ success: true, data: newRule });
    } catch (error) {
      logger.error('Error creating permission rule:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to create permission rule' });
    }
  });

  // PUT /permissions/rules/:id - Update permission rule
  router.put('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const config = await readPermissionsConfig();
      const ruleIndex = config.rules.findIndex(rule => rule.id === id);
      
      if (ruleIndex === -1) {
        return res.status(404).json({ success: false, message: 'Permission rule not found' });
      }
      
      const updatedRule = {
        ...config.rules[ruleIndex],
        ...updates,
        id // Ensure ID cannot be changed
      };
      
      config.rules[ruleIndex] = updatedRule;
      // Re-sort rules by priority
      config.rules.sort((a, b) => b.priority - a.priority);
      
      await writePermissionsConfig(config);
      logger.info('Updated permission rule:', { ruleId: id, updates });
      
      res.json({ success: true, data: updatedRule });
    } catch (error) {
      logger.error('Error updating permission rule:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to update permission rule' });
    }
  });

  // DELETE /permissions/rules/:id - Delete permission rule
  router.delete('/rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const config = await readPermissionsConfig();
      const ruleIndex = config.rules.findIndex(rule => rule.id === id);
      
      if (ruleIndex === -1) {
        return res.status(404).json({ success: false, message: 'Permission rule not found' });
      }
      
      const deletedRule = config.rules[ruleIndex];
      config.rules.splice(ruleIndex, 1);
      
      await writePermissionsConfig(config);
      logger.info('Deleted permission rule:', { ruleId: id, action: deletedRule.action });
      
      res.json({ success: true, message: 'Permission rule deleted successfully' });
    } catch (error) {
      logger.error('Error deleting permission rule:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to delete permission rule' });
    }
  });

  // POST /permissions/test - Test permission
  router.post('/test', async (req, res) => {
    try {
      const { action, target, worktreeDir } = req.body;
      
      if (!action) {
        return res.status(400).json({ 
          success: false, 
          message: 'Action is required for permission testing' 
        });
      }
      
      const config = await readPermissionsConfig();
      const permissionManager = new PermissionManager(config, logger);
      
      const context: PermissionContext = {
        action,
        target,
        worktreeDir
      };
      
      const result = permissionManager.checkPermission(context);
      
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Error testing permission:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to test permission' });
    }
  });

  // GET /permissions/defaults - Get default permission configurations
  router.get('/defaults', async (req, res) => {
    try {
      const defaults = {
        restrictive: DefaultPermissions.restrictive(),
        permissive: DefaultPermissions.permissive(),
        development: DefaultPermissions.development()
      };
      
      res.json({ success: true, data: defaults });
    } catch (error) {
      logger.error('Error fetching default permissions:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch default permissions' });
    }
  });

  // GET /permissions/actions - Get available action types
  router.get('/actions', async (req, res) => {
    try {
      const actions = Object.values(ActionType);
      res.json({ success: true, data: actions });
    } catch (error) {
      logger.error('Error fetching action types:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch action types' });
    }
  });

  // GET /permissions/scopes - Get available permission scopes
  router.get('/scopes', async (req, res) => {
    try {
      const scopes = Object.values(PermissionScope);
      res.json({ success: true, data: scopes });
    } catch (error) {
      logger.error('Error fetching permission scopes:', error as Error);
      res.status(500).json({ success: false, message: 'Failed to fetch permission scopes' });
    }
  });

  return router;
}