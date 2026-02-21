import React from 'react';
import { Bot, Code, Sparkles, Cpu, Settings } from 'lucide-react';

export type AgentType = 'claude_code' | 'openai_codex' | 'openai_o1' | 'anthropic_api' | 'custom';

interface AgentOption {
  value: AgentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const agentOptions: AgentOption[] = [
  {
    value: 'claude_code',
    label: 'Claude Code',
    description: 'AI pair programmer by Anthropic',
    icon: <Bot className="h-4 w-4" />,
  },
  {
    value: 'openai_codex',
    label: 'OpenAI Codex',
    description: 'Code generation model by OpenAI',
    icon: <Code className="h-4 w-4" />,
  },
  {
    value: 'openai_o1',
    label: 'OpenAI O1',
    description: 'Advanced reasoning model',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: 'anthropic_api',
    label: 'Anthropic API',
    description: 'Direct Claude API integration',
    icon: <Cpu className="h-4 w-4" />,
  },
  {
    value: 'custom',
    label: 'Custom Agent',
    description: 'Custom LLM integration',
    icon: <Settings className="h-4 w-4" />,
  },
];

interface AgentSelectorProps {
  value: AgentType;
  onChange: (value: AgentType) => void;
  disabled?: boolean;
  className?: string;
  showDescription?: boolean;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  showDescription = true,
}) => {
  const selectedAgent = agentOptions.find(opt => opt.value === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">Agent Type</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as AgentType)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        data-testid="agent-selector"
      >
        {agentOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showDescription && selectedAgent && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="mt-0.5 text-blue-600">{selectedAgent.icon}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">{selectedAgent.label}</p>
            <p className="text-xs text-blue-700">{selectedAgent.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for inline use
interface AgentBadgeProps {
  agentType: AgentType;
  className?: string;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ agentType, className = '' }) => {
  const agent = agentOptions.find(opt => opt.value === agentType);
  if (!agent) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium ${className}`}
      data-testid="agent-badge"
    >
      {agent.icon}
      <span>{agent.label}</span>
    </div>
  );
};
