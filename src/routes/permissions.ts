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
  PermissionContext,
} from '../utils/permissions';
import { validateRequest, validateParams } from '../middleware/validate';
import {
  UpdatePermissionConfigRequestSchema,
  CreatePermissionRuleRequestSchema,
  UpdatePermissionRuleParamsSchema,
  UpdatePermissionRuleRequestSchema,
  DeletePermissionRuleParamsSchema,
  TestPermissionRequestSchema,
} from '../shared/schemas';

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Priority constants
const PRIORITY_CONSTANTS = {
  IMPORTED_RULE_BASE: 900,
} as const;

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
      res.json(config);
    } catch (error) {
      logger.error('Error fetching permissions config:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch permissions configuration' });
    }
  });

  // PUT /permissions/config - Update permission configuration
  router.put('/config', validateRequest(UpdatePermissionConfigRequestSchema), async (req, res) => {
    try {
      const currentConfig = await readPermissionsConfig();
      const updates = req.body;

      const newConfig = {
        ...currentConfig,
        ...updates,
      };

      await writePermissionsConfig(newConfig);
      logger.info('Updated permissions configuration', updates);

      res.json(newConfig);
    } catch (error) {
      logger.error('Error updating permissions config:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to update permissions configuration' });
    }
  });

  // GET /permissions/rules - Get all permission rules
  router.get('/rules', async (req, res) => {
    try {
      const config = await readPermissionsConfig();
      res.json(config.rules);
    } catch (error) {
      logger.error('Error fetching permission rules:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch permission rules' });
    }
  });

  // POST /permissions/rules - Create new permission rule
  router.post('/rules', validateRequest(CreatePermissionRuleRequestSchema), async (req, res) => {
    try {
      const { action, scope, target, allowed, reason, priority } = req.body;

      const config = await readPermissionsConfig();
      const newRule: PermissionRule = {
        id: uuidv4(),
        action,
        scope,
        target,
        allowed,
        reason,
        priority,
      };

      config.rules.push(newRule);
      // Sort rules by priority (highest first)
      config.rules.sort((a, b) => b.priority - a.priority);

      await writePermissionsConfig(config);
      logger.info('Created permission rule:', { ruleId: newRule.id, action, scope, allowed });

      res.status(HTTP_STATUS.CREATED).json(newRule);
    } catch (error) {
      logger.error('Error creating permission rule:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to create permission rule' });
    }
  });

  // PUT /permissions/rules/:id - Update permission rule
  router.put(
    '/rules/:id',
    validateParams(UpdatePermissionRuleParamsSchema),
    validateRequest(UpdatePermissionRuleRequestSchema),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;

        const config = await readPermissionsConfig();
        const ruleIndex = config.rules.findIndex(rule => rule.id === id);

        if (ruleIndex === -1) {
          return res
            .status(HTTP_STATUS.NOT_FOUND)
            .json({ success: false, message: 'Permission rule not found' });
        }

        const updatedRule = {
          ...config.rules[ruleIndex],
          ...updates,
          id, // Ensure ID cannot be changed
        };

        config.rules[ruleIndex] = updatedRule;
        // Re-sort rules by priority
        config.rules.sort((a, b) => b.priority - a.priority);

        await writePermissionsConfig(config);
        logger.info('Updated permission rule:', { ruleId: id, updates });

        res.json(updatedRule);
      } catch (error) {
        logger.error('Error updating permission rule:', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: 'Failed to update permission rule' });
      }
    }
  );

  // DELETE /permissions/rules/:id - Delete permission rule
  router.delete(
    '/rules/:id',
    validateParams(DeletePermissionRuleParamsSchema),
    async (req, res) => {
      try {
        const { id } = req.params;

        const config = await readPermissionsConfig();
        const ruleIndex = config.rules.findIndex(rule => rule.id === id);

        if (ruleIndex === -1) {
          return res
            .status(HTTP_STATUS.NOT_FOUND)
            .json({ success: false, message: 'Permission rule not found' });
        }

        const deletedRule = config.rules[ruleIndex];
        config.rules.splice(ruleIndex, 1);

        await writePermissionsConfig(config);
        logger.info('Deleted permission rule:', { ruleId: id, action: deletedRule.action });

        res.json({ success: true, message: 'Permission rule deleted successfully' });
      } catch (error) {
        logger.error('Error deleting permission rule:', error as Error);
        res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: 'Failed to delete permission rule' });
      }
    }
  );

  // POST /permissions/test - Test permission
  router.post('/test', validateRequest(TestPermissionRequestSchema), async (req, res) => {
    try {
      const { action, target, worktreeDir } = req.body;

      const config = await readPermissionsConfig();
      const permissionManager = new PermissionManager(config, logger);

      const context: PermissionContext = {
        action,
        target,
        worktreeDir,
      };

      const result = permissionManager.checkPermission(context);

      res.json(result);
    } catch (error) {
      logger.error('Error testing permission:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to test permission' });
    }
  });

  // GET /permissions/default-configs - Get default permission configurations
  router.get('/default-configs', (req, res) => {
    try {
      const defaults = {
        restrictive: DefaultPermissions.restrictive(),
        permissive: DefaultPermissions.permissive(),
        development: DefaultPermissions.development(),
      };

      res.json(defaults);
    } catch (error) {
      logger.error('Error fetching default permissions:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch default permissions' });
    }
  });

  // GET /permissions/actions - Get available action types
  router.get('/actions', (req, res) => {
    try {
      const actions = Object.values(ActionType);
      res.json(actions);
    } catch (error) {
      logger.error('Error fetching action types:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch action types' });
    }
  });

  // GET /permissions/scopes - Get available permission scopes
  router.get('/scopes', (req, res) => {
    try {
      const scopes = Object.values(PermissionScope);
      res.json(scopes);
    } catch (error) {
      logger.error('Error fetching permission scopes:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to fetch permission scopes' });
    }
  });

  // POST /permissions/import-claude-settings - Import permissions from .claude/settings.json
  router.post('/import-claude-settings', async (req, res) => {
    try {
      const claudeSettingsPath = path.join(process.cwd(), '.claude/settings.json');

      let claudeSettings;
      try {
        const data = await fs.readFile(claudeSettingsPath, 'utf-8');
        claudeSettings = JSON.parse(data);
      } catch {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: '.claude/settings.json not found or invalid JSON',
        });
      }

      if (!claudeSettings.permissions?.deny || !Array.isArray(claudeSettings.permissions.deny)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'No permissions.deny array found in .claude/settings.json',
        });
      }

      // Convert .claude/settings deny list to permission rules
      const currentConfig = await readPermissionsConfig();
      const importedRules: PermissionRule[] = [];

      claudeSettings.permissions.deny.forEach((denyPattern: string, index: number) => {
        // Parse the deny pattern to extract action and target
        const match = denyPattern.match(/^(\w+)\((.+)\)$/);
        if (match) {
          const [, action, target] = match;

          let actionType: ActionType;
          let scope: PermissionScope;

          // Map Claude settings actions to our ActionType enum
          switch (action.toLowerCase()) {
            case 'update':
            case 'edit':
            case 'write':
              actionType = ActionType.FILE_WRITE;
              break;
            case 'read':
              actionType = ActionType.FILE_READ;
              break;
            case 'delete':
            case 'remove':
              actionType = ActionType.FILE_DELETE;
              break;
            case 'execute':
            case 'run':
              actionType = ActionType.SYSTEM_COMMAND;
              break;
            default:
              actionType = ActionType.FILE_WRITE; // Default fallback
          }

          // Determine scope based on target pattern
          if (target.includes('*') || target.includes('?')) {
            scope = PermissionScope.PATTERN;
          } else if (target.startsWith('/') || target.includes('/')) {
            scope = PermissionScope.SPECIFIC_PATH;
          } else {
            scope = PermissionScope.PATTERN;
          }

          const rule: PermissionRule = {
            id: uuidv4(),
            action: actionType,
            scope,
            target,
            allowed: false, // Claude settings deny list = not allowed
            reason: `Imported from .claude/settings.json deny list: ${denyPattern}`,
            priority: PRIORITY_CONSTANTS.IMPORTED_RULE_BASE + index, // High priority for imported rules
          };

          importedRules.push(rule);
        } else {
          // Handle patterns that don't match the expected format
          const rule: PermissionRule = {
            id: uuidv4(),
            action: ActionType.FILE_WRITE,
            scope: PermissionScope.PATTERN,
            target: denyPattern,
            allowed: false,
            reason: `Imported from .claude/settings.json deny list: ${denyPattern}`,
            priority: PRIORITY_CONSTANTS.IMPORTED_RULE_BASE + index,
          };

          importedRules.push(rule);
        }
      });

      // Remove existing imported rules (those with reason containing "Imported from .claude/settings.json")
      currentConfig.rules = currentConfig.rules.filter(
        rule => !rule.reason?.includes('Imported from .claude/settings.json')
      );

      // Add new imported rules
      currentConfig.rules.push(...importedRules);

      // Sort by priority
      currentConfig.rules.sort((a, b) => b.priority - a.priority);

      await writePermissionsConfig(currentConfig);

      logger.info('Imported permissions from .claude/settings.json:', {
        importedCount: importedRules.length,
        totalRules: currentConfig.rules.length,
      });

      res.json({
        success: true,
        data: {
          importedRules: importedRules.length,
          totalRules: currentConfig.rules.length,
          config: currentConfig,
        },
      });
    } catch (error) {
      logger.error('Error importing Claude settings permissions:', error as Error);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: 'Failed to import Claude settings permissions' });
    }
  });

  return router;
}
