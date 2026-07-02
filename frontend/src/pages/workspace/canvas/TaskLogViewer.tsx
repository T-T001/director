import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { listRunEvents } from '../../../services/api/runs'
import { queryKeys } from '../../../services/queryKeys'

export function TaskLogViewer({ runId, taskType }: { runId: string; taskType: string }) {
  const eventsQuery = useQuery({
    queryKey: queryKeys.runs.events(runId),
    queryFn: () => listRunEvents(runId),
    refetchInterval: 3000,
  })

  const events = eventsQuery.data?.events ?? []
  const recent = events.slice(-50)

  return (
    <div className="rounded-xl border border-[var(--glass-stroke-soft)] bg-black/24">
      <div className="flex items-center justify-between border-b border-[var(--glass-stroke-soft)] px-3 py-2">
        <p className="truncate text-[11px] font-bold text-[var(--glass-text-secondary)]" title={taskType}>
          {taskType}
        </p>
        {eventsQuery.isFetching ? <Loader2 className="h-3 w-3 animate-spin text-[var(--glass-text-tertiary)]" /> : null}
      </div>
      <div className="max-h-48 overflow-y-auto px-3 py-2">
        {recent.length === 0 ? (
          <p className="py-2 text-[11px] text-[var(--glass-text-tertiary)]">暂无事件，等待任务输出...</p>
        ) : (
          <ol className="grid gap-1">
            {recent.map((event) => (
              <li key={event.id} className="flex items-baseline gap-2 text-[10px] leading-relaxed">
                <span className="shrink-0 tabular-nums text-[var(--glass-text-tertiary)]">
                  {new Date(event.created_at).toLocaleTimeString('zh-CN', { hour12: false })}
                </span>
                <span className="min-w-0 break-words text-[var(--glass-text-secondary)]">
                  {event.event_type}
                  {event.step_key ? <span className="text-[var(--glass-accent-cyan)]"> · {event.step_key}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
