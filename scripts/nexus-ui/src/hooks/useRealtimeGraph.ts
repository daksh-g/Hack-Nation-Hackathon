import { useEffect, useRef, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ChangePayload = {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

interface UseRealtimeGraphOptions {
  /** Called when any node/edge/alert changes in the database */
  onGraphChange?: (payload: ChangePayload) => void
  /** Tables to subscribe to (default: nodes, edges, alerts) */
  tables?: string[]
  /** Whether the subscription is active */
  enabled?: boolean
}

/**
 * Subscribe to Supabase Realtime changes on graph tables.
 * Automatically reconnects and cleans up on unmount.
 */
export function useRealtimeGraph(options: UseRealtimeGraphOptions = {}) {
  const {
    onGraphChange,
    tables = ['nodes', 'edges', 'alerts'],
    enabled = true,
  } = options

  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onGraphChange)
  callbackRef.current = onGraphChange

  const subscribe = useCallback(() => {
    if (!isSupabaseConfigured() || !supabase || !enabled) return

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    let channel = supabase.channel('nexus-graph-changes')

    for (const table of tables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          callbackRef.current?.({
            table,
            eventType: payload.eventType as ChangePayload['eventType'],
            new: (payload.new as Record<string, unknown>) ?? {},
            old: (payload.old as Record<string, unknown>) ?? {},
          })
        }
      )
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to graph changes')
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[Realtime] Channel error, will retry...')
      }
    })

    channelRef.current = channel
  }, [tables, enabled])

  useEffect(() => {
    subscribe()
    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [subscribe])

  return {
    isConnected: channelRef.current !== null,
  }
}
