// JSON Schema definitions for API responses

export const statusResponseSchema = {
  type: 'object',
  required: ['status', 'uptime', 'timestamp'],
  properties: {
    status: {
      type: 'string',
      enum: ['healthy']
    },
    uptime: {
      type: 'number',
      minimum: 0
    },
    uptimeFormatted: {
      type: 'string'
    },
    modelsCount: {
      type: 'number'
    },
    activeModelsCount: {
      type: 'number'
    },
    memoryUsage: {
      type: 'object'
    },
    nodeVersion: {
      type: 'string'
    },
    timestamp: {
      type: 'string'
    }
  },
  additionalProperties: true
};

export const modelSchema = {
  type: 'object',
  required: ['id', 'name', 'model', 'provider', 'baseUrl', 'enabled', 'status'],
  properties: {
    id: {
      type: 'string',
      minLength: 1
    },
    name: {
      type: 'string',
      minLength: 1
    },
    model: {
      type: 'string',
      minLength: 1
    },
    provider: {
      type: 'string',
      minLength: 1
    },
    baseUrl: {
      type: 'string',
      format: 'uri'
    },
    apiKey: {
      type: 'string'
    },
    enabled: {
      type: 'boolean'
    },
    status: {
      type: 'string',
      enum: ['healthy', 'error', 'untested']
    },
    lastTested: {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    },
    responseTime: {
      oneOf: [
        { type: 'number' },
        { type: 'null' }
      ]
    }
  },
  additionalProperties: true
};

export const modelsListResponseSchema = {
  type: 'object',
  required: ['models'],
  properties: {
    models: {
      type: 'array',
      minItems: 8,
      items: modelSchema
    }
  },
  additionalProperties: false
};

export const modelTestResponseSchema = {
  type: 'object',
  required: ['modelId', 'status', 'responseTime', 'testedAt', 'model', 'error'],
  properties: {
    modelId: {
      type: 'string',
      minLength: 1
    },
    status: {
      type: 'string',
      enum: ['healthy', 'error']
    },
    responseTime: {
      type: 'number',
      minimum: 0,
      maximum: 30000
    },
    testedAt: {
      type: 'string'
    },
    model: {
      type: 'string',
      minLength: 1
    },
    error: {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    }
  },
  additionalProperties: false
};

export const modelAddResponseSchema = {
  type: 'object',
  required: ['message', 'model'],
  properties: {
    message: {
      type: 'string',
      const: 'Model added successfully'
    },
    model: modelSchema
  },
  additionalProperties: true
};

export const modelDeleteResponseSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: {
      type: 'string',
      const: 'Model deleted successfully'
    }
  },
  additionalProperties: false
};

export const errorResponseSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'string',
      minLength: 1
    }
  },
  additionalProperties: false
};

// Task Management Schemas
export const taskSchema = {
  type: 'object',
  required: ['id', 'content', 'status', 'priority'],
  properties: {
    id: {
      type: 'string',
      minLength: 1
    },
    content: {
      type: 'string',
      minLength: 1
    },
    status: {
      type: 'string',
      enum: ['pending', 'in_progress', 'completed']
    },
    priority: {
      type: 'string', 
      enum: ['low', 'medium', 'high']
    },
    startTime: {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    },
    endTime: {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    },
    duration: {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    }
  },
  additionalProperties: true
};

export const tasksListResponseSchema = {
  type: 'array',
  items: taskSchema
};

export const taskDetailResponseSchema = {
  type: 'object',
  allOf: [
    taskSchema,
    {
      properties: {
        validationRuns: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'success', 'duration', 'timestamp'],
            properties: {
              id: { type: 'string' },
              success: { type: 'boolean' },
              duration: { type: 'number' },
              timestamp: { type: 'string' },
              stages: { type: 'string' }
            }
          }
        }
      }
    }
  ]
};

// Permissions Management Schemas
export const permissionRuleSchema = {
  type: 'object',
  required: ['action'],
  properties: {
    action: {
      type: 'string',
      enum: ['allow', 'block']
    }
  },
  additionalProperties: true
};

export const commandRuleSchema = {
  allOf: [
    permissionRuleSchema,
    {
      required: ['pattern'],
      properties: {
        pattern: {
          type: 'string',
          minLength: 1
        }
      }
    }
  ]
};

export const fileRuleSchema = {
  allOf: [
    permissionRuleSchema,
    {
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          minLength: 1
        }
      }
    }
  ]
};

export const apiRuleSchema = {
  allOf: [
    permissionRuleSchema,
    {
      required: ['endpoint'],
      properties: {
        endpoint: {
          type: 'string',
          minLength: 1
        }
      }
    }
  ]
};

export const permissionsResponseSchema = {
  type: 'object',
  required: ['commands', 'files', 'apis'],
  properties: {
    commands: {
      type: 'array',
      items: commandRuleSchema
    },
    files: {
      type: 'array',
      items: fileRuleSchema
    },
    apis: {
      type: 'array',
      items: apiRuleSchema
    }
  },
  additionalProperties: false
};