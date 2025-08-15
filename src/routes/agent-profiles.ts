import { Router, Request, Response } from 'express';
import { ILogger } from '../logger-interface';
import { WorktreeExecutionService } from '../services/worktree-execution.service';
import { handleApiError } from '../utils/error-handler';

interface AgentProfile {
  type: 'claude' | 'openai' | 'local' | 'custom';
  name: string;
  command: string[];
  [key: string]: unknown;
}

interface RouteContext {
  req: Request;
  res: Response;
  worktreeExecutionService: WorktreeExecutionService;
  logger: ILogger;
}

// Helper function for profile validation
function validateProfileStructure(profile: unknown): string | null {
  if (!profile || typeof profile !== 'object') {
    return 'Profile must be an object';
  }
  
  const profileObj = profile as Record<string, unknown>;
  const requiredFields = ['type', 'name', 'command'];
  const missingFields = requiredFields.filter(field => !profileObj[field]);
  
  if (missingFields.length > 0) {
    return `Missing required profile fields: ${missingFields.join(', ')}`;
  }
  
  const validTypes = ['claude', 'openai', 'local', 'custom'];
  if (!validTypes.includes(profileObj.type as string)) {
    return `Invalid agent type. Must be one of: ${validTypes.join(', ')}`;
  }
  
  return null;
}

// Helper function to validate request data
function validateAddProfileRequest(req: Request, res: Response): { name: string; profile: AgentProfile } | null {
  const { name, profile } = req.body;
  
  if (!name || !profile) {
    res.status(400).json({ 
      error: 'Missing required fields: name and profile' 
    });
    return null;
  }

  const validationError = validateProfileStructure(profile);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return null;
  }

  return { name, profile: profile as AgentProfile };
}

// Helper function for GET route
function handleGetProfiles(context: RouteContext): void {
  const { res, worktreeExecutionService, logger } = context;
  try {
    const profiles = worktreeExecutionService.getAvailableAgentProfiles();
    res.json({ profiles });
  } catch (error) {
    handleApiError(res, { logger, operation: 'get agent profiles', error });
  }
}

// Helper function for POST route
function handleAddProfile(context: RouteContext): void {
  const { res, worktreeExecutionService, logger } = context;
  try {
    const validatedData = validateAddProfileRequest(context.req, res);
    if (!validatedData) return;
    
    const { name, profile } = validatedData;
    
    worktreeExecutionService.addCustomAgentProfile(name, profile);
    logger.info('Custom agent profile added', { name, type: profile.type });
    
    res.status(201).json({ 
      message: 'Agent profile added successfully', 
      name,
      profile 
    });
    
  } catch (error) {
    handleApiError(res, { logger, operation: 'add agent profile', error });
  }
}

export function createAgentProfilesRoutes(
  worktreeExecutionService: WorktreeExecutionService,
  logger: ILogger
): Router {
  const router = Router();

  // GET /api/agent-profiles - Get all available agent profiles
  router.get('/', (req, res) => {
    handleGetProfiles({ req, res, worktreeExecutionService, logger });
  });

  // POST /api/agent-profiles - Add a custom agent profile
  router.post('/', (req, res) => {
    handleAddProfile({ req, res, worktreeExecutionService, logger });
  });

  return router;
}