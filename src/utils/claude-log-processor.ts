// Claude Log Processor adapted from vibe-kanban
import { NormalizedEntry, ClaudeJson, ClaudeContentItem, ActionType } from '../types/logs';

export class ClaudeLogProcessor {
  private modelName?: string;

  constructor() {
    this.modelName = undefined;
  }

  toNormalizedEntries(claudeJson: ClaudeJson, _worktreePath: string): NormalizedEntry[] {
    switch (claudeJson.type) {
      case 'system': {
        if ('subtype' in claudeJson && claudeJson.subtype === 'init') {
          return [];
        }
        return [{
          entry_type: { type: 'system_message' },
          content: 'subtype' in claudeJson && claudeJson.subtype ? `System: ${claudeJson.subtype}` : 'System message',
          metadata: claudeJson,
        }];
      }
      case 'assistant': {
        if (!('message' in claudeJson)) return [];
        const message = claudeJson.message;
        const entries: NormalizedEntry[] = [];
        if (!this.modelName && message.model) {
          this.modelName = message.model;
          entries.push({
            entry_type: { type: 'system_message' },
            content: `System initialized with model: ${message.model}`,
            });
        }
        for (const item of message.content) {
          const entry = this.contentItemToNormalizedEntry(item, 'assistant', _worktreePath);
          if (entry) entries.push(entry);
        }
        return entries;
      }
      case 'user': {
        if (!('message' in claudeJson)) return [];
        const message = claudeJson.message;
        return message.content
          .map((item: ClaudeContentItem) => this.contentItemToNormalizedEntry(item, 'user', _worktreePath))
          .filter(Boolean) as NormalizedEntry[];
      }
      case 'tool_use': {
        if (!('tool_name' in claudeJson)) return [];
        const actionType = this.inferActionType(claudeJson.tool_name, claudeJson.input);
        return [{
          entry_type: { 
            type: 'tool_use', 
            tool_name: claudeJson.tool_name,
            action_type: actionType
          },
          content: `Tool use: ${claudeJson.tool_name}`,
          metadata: claudeJson,
        }];
      }
      case 'tool_result':
      case 'result':
        return [];
      default:
        return [{
          entry_type: { type: 'system_message' },
          content: 'Unrecognized JSON message from Claude',
        }];
    }
  }

  contentItemToNormalizedEntry(item: ClaudeContentItem, role: string, _worktreePath: string): NormalizedEntry | undefined {
    
    switch (item.type) {
      case 'text':
        return {
          entry_type: role === 'user' ? { type: 'user_message' } : { type: 'assistant_message' },
          content: item.text,
          metadata: item,
        };
      case 'thinking':
        return {
          entry_type: { type: 'thinking' },
          content: item.thinking,
          metadata: item,
        };
      case 'tool_use': {
        const actionType = this.inferActionType(item.name, item.input);
        return {
          entry_type: { 
            type: 'tool_use',
            tool_name: item.name,
            action_type: actionType
          },
          content: `Tool use: ${item.name}`,
          metadata: item,
        };
      }
      default:
        return undefined;
    }
  }

  private inferActionType(toolName: string, input: unknown): ActionType {
    const lowerName = toolName.toLowerCase();
    const typedInput = input as Record<string, unknown> || {};
    
    // File operations
    if (lowerName.includes('read') || lowerName.includes('file') && lowerName.includes('read')) {
      return { 
        action: 'file_read', 
        path: (typeof typedInput.file_path === 'string' ? typedInput.file_path : undefined) || 
              (typeof typedInput.path === 'string' ? typedInput.path : undefined)
      };
    }
    
    if (lowerName.includes('edit') || lowerName.includes('write') || lowerName.includes('multiedit')) {
      const oldString = typeof typedInput.old_string === 'string' ? typedInput.old_string : undefined;
      const newString = typeof typedInput.new_string === 'string' ? typedInput.new_string : undefined;
      
      return { 
        action: 'file_edit', 
        path: (typeof typedInput.file_path === 'string' ? typedInput.file_path : undefined) || 
              (typeof typedInput.path === 'string' ? typedInput.path : undefined),
        changes: Array.isArray(typedInput.edits) 
          ? typedInput.edits 
          : (oldString ? [{ old_string: oldString, new_string: newString }] : undefined)
      };
    }
    
    // Command execution
    if (lowerName.includes('bash') || lowerName.includes('command') || lowerName.includes('exec')) {
      return { action: 'command_run' };
    }
    
    // Search operations
    if (lowerName.includes('grep') || lowerName.includes('search') || lowerName.includes('glob')) {
      return { action: 'search' };
    }
    
    // Web operations
    if (lowerName.includes('web') || lowerName.includes('fetch') || lowerName.includes('http')) {
      return { action: 'web_fetch' };
    }
    
    // Task management
    if (lowerName.includes('task') && lowerName.includes('create')) {
      return { action: 'task_create' };
    }
    
    // Todo management
    if (lowerName.includes('todo')) {
      return { action: 'todo_management' };
    }
    
    // Plan presentation
    if (lowerName.includes('plan') || lowerName.includes('exit')) {
      return { action: 'plan_presentation' };
    }
    
    // Default fallback
    return { action: 'command_run' };
  }
}