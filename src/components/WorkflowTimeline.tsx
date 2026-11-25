import { useState } from 'react';
import {
  BrainCircuit,
  SearchCheck,
  ShieldCheck,
  FileSearch,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { AgentKey, AgentStageState, AgentStatus } from '../types/veritas';
import { StatusBadge } from './StatusBadge';

const AGENT_ICONS: Record<AgentKey, typeof BrainCircuit> = {
  analyze: BrainCircuit,
  retrieve: SearchCheck,
  verify: ShieldCheck,
  review: FileSearch,
  correct: Sparkles,
};

const DOT_COLOR: Record<AgentStatus, string> = {
  Completed: 'bg-[#18BFA0]',
  Running: 'bg-[#635BFF] animate-pulse ring-4 ring-[#635BFF]/20',
  Pending: 'bg-slate-300',
  Failed: 'bg-[#EF4444]',
};

/**
 * Compact 5-stage dot indicator used in Dashboard Active Review Pipeline table.
 */
export function CompactAgentIndicators({ agents }: { agents: AgentStageState[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {agents.map((agent, idx) => (
        <div key={agent.key} className="flex items-center gap-1.5" title={`${agent.shortLabel}: ${agent.status}`}>
          <div className="flex flex-col items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-full ${DOT_COLOR[agent.status]}`} />
            <span className="text-[10px] font-medium text-[#64748B]">
              {agent.shortLabel}
            </span>
          </div>
          {idx < agents.length - 1 && (
            <span
              className={`w-3 h-[1.5px] -mt-3.5 ${
                agent.status === 'Completed' ? 'bg-[#18BFA0]' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Full horizontal 5-agent workflow timeline for the Live Agent Workflow page.
 */
export function WorkflowTimeline({ agents }: { agents: AgentStageState[] }) {
  const [expandedKey, setExpandedKey] = useState<AgentKey | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {agents.map((agent, idx) => {
          const Icon = AGENT_ICONS[agent.key];
          const isExpanded = expandedKey === agent.key;

          const borderStyle =
            agent.status === 'Running'
              ? 'border-[#635BFF] ring-2 ring-[#635BFF]/15'
              : agent.status === 'Completed'
              ? 'border-[#18BFA0]/50'
              : agent.status === 'Failed'
              ? 'border-[#EF4444]/60'
              : 'border-slate-200';

          return (
            <div
              key={agent.key}
              className={`relative bg-white border rounded-[12px] p-4 flex flex-col justify-between transition-all ${borderStyle}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${
                      agent.status === 'Completed'
                        ? 'bg-[#18BFA0]/12 text-[#0E8A73]'
                        : agent.status === 'Running'
                        ? 'bg-[#635BFF]/12 text-[#635BFF]'
                        : agent.status === 'Failed'
                        ? 'bg-[#EF4444]/12 text-[#EF4444]'
                        : 'bg-slate-100 text-[#64748B]'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-[#64748B]">
                    0{idx + 1}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-[#182238]">{agent.name}</h4>
                <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
                  {agent.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={agent.status} />
                  {agent.status === 'Running' && (
                    <Loader2 className="w-3.5 h-3.5 text-[#635BFF] animate-spin" />
                  )}
                  {agent.status === 'Completed' && (
                    <Check className="w-3.5 h-3.5 text-[#18BFA0]" />
                  )}
                  {agent.status === 'Failed' && (
                    <AlertCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-[#64748B]">
                  <Clock className="w-3 h-3" />
                  {agent.completedAt
                    ? new Date(agent.completedAt).toLocaleTimeString()
                    : agent.startedAt
                    ? `Started ${new Date(agent.startedAt).toLocaleTimeString()}`
                    : 'Waiting in queue'}
                </div>

                {(agent.outputSummary || agent.errorMessage) && (
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : agent.key)}
                    className="w-full flex items-center justify-between text-xs font-medium text-[#635BFF] hover:text-[#4B44D6] pt-1"
                  >
                    <span>{isExpanded ? 'Hide output' : 'View output'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {expandedKey && (
        <div className="bg-white border border-slate-200 rounded-[12px] p-4 shadow-sm">
          {(() => {
            const selected = agents.find((a) => a.key === expandedKey);
            if (!selected) return null;
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-[#182238]">
                    Agent {selected.order}: {selected.name} — Execution Output
                  </h5>
                  <StatusBadge status={selected.status} />
                </div>
                {selected.errorMessage ? (
                  <p className="text-sm text-[#EF4444] bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-[8px] p-3">
                    {selected.errorMessage}
                  </p>
                ) : (
                  <p className="text-sm text-[#182238] bg-[#F4F6FB] rounded-[8px] p-3">
                    {selected.outputSummary}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
