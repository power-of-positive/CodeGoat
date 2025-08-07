# UI Development Plan for Model & API Key Management

## 🎯 **High-Level Architecture**

**Frontend**: React SPA with static file serving from Express  
**Backend**: Extend current proxy server with management APIs  
**Data**: Continue using `config.yaml` as source of truth  
**Deployment**: Prepare for Electron packaging  

## 📋 **Detailed Breakdown of Key Tasks**

### **Phase 1: Foundation (High Priority)**

**1. Technology Stack Setup**
- **React + Vite** (faster than Create React App, better dev experience)
- **Tailwind CSS** or **Material-UI** for styling
- **React Query** for API state management and caching
- **React Hook Form** for form validation
- **React Router** for navigation

**2. Backend API Extensions**
```typescript
// New endpoints to add:
GET    /api/management/models     // List all models
POST   /api/management/models     // Add new model
PUT    /api/management/models/:id // Update model
DELETE /api/management/models/:id // Delete model
POST   /api/management/test/:id   // Test model connectivity
GET    /api/management/status     // Server status
POST   /api/management/reload     // Reload configuration
```

**3. Data Models & Validation**
```typescript
interface UIModelConfig {
  id: string;
  name: string;
  provider: 'openrouter' | 'openai' | 'anthropic';
  model: string;
  apiKey: string;
  enabled: boolean;
  status?: 'healthy' | 'error' | 'untested';
  lastTested?: Date;
}
```

### **Phase 2: Core Features (Medium Priority)**

**4. Dashboard Components**
- **Model Grid/List** with status indicators
- **Quick Stats** (total models, active models, recent errors)
- **Server Status** indicator
- **Recent Activity** log

**5. Model Management**
- **Add Model Form** with provider-specific fields
- **Edit Model Modal** with validation
- **Bulk Operations** (enable/disable, delete multiple)
- **Model Testing** with real API calls

**6. API Key Management**
- **Secure Input Fields** with show/hide toggle
- **Environment Variable Integration** (`os.environ/OPENROUTER_API_KEY`)
- **Key Validation** and testing
- **Multiple Keys** per provider support

### **Phase 3: Advanced Features (Low Priority)**

**7. Provider Templates**
```typescript
const providers = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    authHeader: 'Authorization',
    keyFormat: 'Bearer {key}',
    modelCatalog: '/models' // Auto-populate available models
  }
}
```

**8. Real-time Features**
- **WebSocket connection** for live updates
- **Model health monitoring** with automatic retries
- **Usage metrics** and cost tracking
- **Live logs** and error monitoring

## 🔧 **Implementation Strategy**

### **Recommended Approach:**

1. **Start with Backend APIs** - Extend current server with management endpoints
2. **Build Simple React Frontend** - Basic CRUD operations first
3. **Add Real-time Updates** - WebSocket/SSE for live status
4. **Polish UI/UX** - Modern design and responsive layout
5. **Prepare for Electron** - Static file serving and packaging

### **File Structure:**
```
├── src/
│   ├── management/          # New management API routes
│   │   ├── models.ts       # Model CRUD endpoints  
│   │   ├── config.ts       # Configuration management
│   │   └── status.ts       # Server status endpoints
│   └── ... (existing files)
├── ui/                     # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utilities and API calls
│   └── dist/               # Built frontend files
```

## 🔐 **Security Considerations**

- **API Key Storage**: Use environment variables, never localStorage
- **Input Validation**: Zod/Joi schemas on both client and server  
- **CSRF Protection**: Tokens for state-changing operations
- **Rate Limiting**: Prevent abuse of management endpoints
- **Error Handling**: Don't expose sensitive information in errors

## 🚀 **Quick Start Plan**

**Week 1**: Backend APIs and basic React setup  
**Week 2**: Model list/add/edit functionality  
**Week 3**: API key management and model testing  
**Week 4**: Real-time updates and polishing  

## 📝 **Current Todo List**

### High Priority
1. Plan UI architecture and technology stack
2. Set up React development environment with Vite/Create React App
3. Create management API endpoints in Express server
4. Design data models and validation schemas
5. Build model management CRUD operations
6. Create API key management system with secure storage
7. Add input validation and error handling
8. Implement security measures (CSRF protection, input sanitization)

### Medium Priority
9. Build main dashboard component showing current configuration
10. Create model list view with add/edit/delete functionality
11. Build forms for adding/editing models and API keys
12. Add real-time server status and model health monitoring
13. Implement model connectivity testing (test API calls)
14. Build responsive design with modern UI components

### Low Priority
15. Create configuration export/import functionality
16. Add server start/stop/restart controls from UI
17. Create provider-specific model templates (OpenRouter, OpenAI, etc.)
18. Add bulk model import from provider catalogs
19. Build usage analytics and cost tracking dashboard
20. Prepare for Electron packaging with static file serving

## 💡 **Next Steps**

To get started, we should:

1. **Set up the React development environment** in a `ui/` directory
2. **Create the first management API endpoints** for listing and managing models
3. **Build a basic dashboard** showing current model configuration
4. **Add forms for model and API key management**

Would you like to begin with setting up the React environment or creating the management API endpoints first?