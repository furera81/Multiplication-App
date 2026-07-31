import { useCallback, useState } from 'react'

const MAX_HISTORY = 50

interface HistoryState {
  entries: ArrayBuffer[]
  index: number
  savedIndex: number
}

export interface DocHistory {
  bytes: ArrayBuffer | null
  canUndo: boolean
  canRedo: boolean
  dirty: boolean
  /** Start a brand-new history (e.g. opening a file); the given bytes count as the saved baseline. */
  reset: (bytes: ArrayBuffer) => void
  /** Record a new document state (e.g. after an edit), discarding any redo entries past the current point. */
  push: (bytes: ArrayBuffer) => void
  undo: () => void
  redo: () => void
  /** Mark the current state as saved to disk, so dirty tracking is accurate. */
  markSaved: () => void
  clear: () => void
}

const EMPTY: HistoryState = { entries: [], index: -1, savedIndex: -1 }

export function useDocHistory(): DocHistory {
  const [state, setState] = useState<HistoryState>(EMPTY)

  const reset = useCallback((bytes: ArrayBuffer) => {
    setState({ entries: [bytes], index: 0, savedIndex: 0 })
  }, [])

  const push = useCallback((bytes: ArrayBuffer) => {
    setState((prev) => {
      const truncated = prev.entries.slice(0, prev.index + 1)
      truncated.push(bytes)
      const overflow = truncated.length - MAX_HISTORY
      const entries = overflow > 0 ? truncated.slice(overflow) : truncated
      const savedIndex = overflow > 0 ? prev.savedIndex - overflow : prev.savedIndex
      return { entries, index: entries.length - 1, savedIndex }
    })
  }, [])

  const undo = useCallback(() => {
    setState((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev))
  }, [])

  const redo = useCallback(() => {
    setState((prev) =>
      prev.index < prev.entries.length - 1 ? { ...prev, index: prev.index + 1 } : prev
    )
  }, [])

  const markSaved = useCallback(() => {
    setState((prev) => ({ ...prev, savedIndex: prev.index }))
  }, [])

  const clear = useCallback(() => setState(EMPTY), [])

  return {
    bytes: state.index >= 0 ? state.entries[state.index] : null,
    canUndo: state.index > 0,
    canRedo: state.index < state.entries.length - 1,
    dirty: state.index !== state.savedIndex,
    reset,
    push,
    undo,
    redo,
    markSaved,
    clear
  }
}
