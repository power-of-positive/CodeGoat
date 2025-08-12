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