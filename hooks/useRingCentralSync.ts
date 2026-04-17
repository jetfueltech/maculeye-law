import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getRingCentralConnection,
  syncRingCentral,
  type RingCentralConnection,
} from '../services/ringcentralService';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min — parallels useOutlookSync

export interface UseRingCentralSyncResult {
  connection: RingCentralConnection | null;
  isSyncing: boolean;
  syncMessage: string;
  runSync: (silent?: boolean) => Promise<void>;
  refreshConnection: () => Promise<void>;
}

/**
 * Keeps RingCentral call logs and SMS in sync at the app level so the user
 * gets fresh data even when they're not on the case view. Mirrors the shape
 * of useOutlookSync for consistency.
 */
export function useRingCentralSync(
  firmId: string | undefined,
  userId: string | undefined,
): UseRingCentralSyncResult {
  const [connection, setConnection] = useState<RingCentralConnection | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const initializedKey = useRef<string | null>(null);
  const autoSyncInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshConnection = useCallback(async () => {
    if (!firmId || !userId) {
      setConnection(null);
      return;
    }
    const conn = await getRingCentralConnection(firmId, userId);
    setConnection(conn);
  }, [firmId, userId]);

  const runSync = useCallback(async (silent = false) => {
    if (!firmId || !userId) return;
    if (!silent) {
      setIsSyncing(true);
      setSyncMessage('Syncing...');
    }
    const result = await syncRingCentral(firmId, userId);
    if (result.error) {
      if (!silent) setSyncMessage(result.error);
    } else if (!silent) {
      const parts: string[] = [];
      if (result.calls > 0) parts.push(`${result.calls} calls`);
      if (result.sms > 0) parts.push(`${result.sms} SMS`);
      setSyncMessage(parts.length > 0 ? `Synced ${parts.join(', ')}` : 'Up to date');
      setTimeout(() => setSyncMessage(''), 5000);
    }
    if (!silent) setIsSyncing(false);
  }, [firmId, userId]);

  // Initial load + first sync whenever firm or user changes.
  useEffect(() => {
    const key = `${firmId || ''}::${userId || ''}`;
    if (!firmId || !userId) {
      setConnection(null);
      initializedKey.current = null;
      return;
    }
    if (initializedKey.current === key) return;
    initializedKey.current = key;

    (async () => {
      const conn = await getRingCentralConnection(firmId, userId);
      setConnection(conn);
      if (conn) {
        await runSync(true);
      }
    })();
  }, [firmId, userId, runSync]);

  // 5-minute auto-sync while connected.
  useEffect(() => {
    if (!connection || !firmId || !userId) return;
    autoSyncInterval.current = setInterval(() => runSync(true), AUTO_SYNC_INTERVAL_MS);
    return () => {
      if (autoSyncInterval.current) {
        clearInterval(autoSyncInterval.current);
        autoSyncInterval.current = null;
      }
    };
  }, [connection, firmId, userId, runSync]);

  // OAuth popup postMessage — triggers a connection refresh + sync.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ringcentral_connected') {
        refreshConnection().then(() => runSync(false));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshConnection, runSync]);

  return { connection, isSyncing, syncMessage, runSync, refreshConnection };
}
