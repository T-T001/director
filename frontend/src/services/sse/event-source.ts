export type EventSourceHandlers<T = unknown> = {
  onMessage: (payload: T) => void
  onError?: (error: Event) => void
  eventNames?: string[]
}

export function createManagedEventSource<T = unknown>(
  url: string,
  { onMessage, onError, eventNames = [] }: EventSourceHandlers<T>,
) {
  const source = new EventSource(url)

  const parse = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data || '{}') as T
      onMessage(payload)
    } catch {
      // ignore malformed event
    }
  }

  source.onmessage = parse

  const listeners: Array<{ name: string; handler: EventListener }> = []

  for (const name of eventNames) {
    const handler: EventListener = (event) => parse(event as MessageEvent)
    source.addEventListener(name, handler)
    listeners.push({ name, handler })
  }

  source.onerror = (error) => {
    onError?.(error)
  }

  return {
    source,
    close: () => {
      for (const listener of listeners) {
        source.removeEventListener(listener.name, listener.handler)
      }
      source.close()
    },
  }
}
