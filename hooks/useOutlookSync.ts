import { useCallback, useEffect, useRef, useState } from 'react';
import type { Email } from '../types';
import {
  getOutlookConnection,
  getSyncedEmails,
  syncOutlookEmails,
} from '../services/outlookService';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export interface UseOutlookSyncResult {
  outlookConnected: boolean;
  isSyncing: boolean;
  syncMessage: string;
  connectedEmail: string;
  runSync: (silent?: boolean) => Promise<void>;
}

/**
 * Runs Outlook email sync at the app level so the inbox stays current even
 * when the user is on other views. Initial load + a 5-minute auto-sync timer
 * fire whenever a firm with an Outlook connection is active.
 */
export function useOutlookSync(
  firmId: string | undefined,
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>,
): UseOutlookSyncResult {
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [connectedEmail, setConnectedEmail] = useState('');

  const initializedFirmRef = useRef<string | null>(null);
  const autoSyncInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(async (silent = false) => {
    if (!firmId) return;
    if (!silent) setIsSyncing(true);
    setSyncMessage(silent ? '' : 'Syncing...');

    const result = await syncOutlookEmails(firmId);
    if (result.error) {
      if (!silent) setSyncMessage(result.error);
    } else {
      const synced = await getSyncedEmails(firmId);
      if (synced.length > 0) {
        setEmails(prev => {
          const mockEmails = prev.filter(e => e.id.startsWith('e'));
          return [...synced, ...mockEmails];
        });
      }
      if (!silent) {
        const parts: string[] = [];
        if (result.synced > 0) parts.push(`${result.synced} emails`);
        if (result.attachments && result.attachments > 0) parts.push(`${result.attachments} attachments`);
        setSyncMessage(parts.length > 0 ? `Synced ${parts.join(', ')}` : 'Up to date');
        setTimeout(() => setSyncMessage(''), 5000);
      }
    }
    if (!silent) setIsSyncing(false);
  }, [firmId, setEmails]);

  // Initial load + first sync when a firm becomes active. Runs once per firm.
  useEffect(() => {
    if (!firmId || initializedFirmRef.current === firmId) return;
    initializedFirmRef.current = firmId;

    (async () => {
      const conn = await getOutlookConnection(firmId);
      setOutlookConnected(!!conn);
      if (conn?.email_address) setConnectedEmail(conn.email_address);

      const synced = await getSyncedEmails(firmId);
      if (synced.length > 0) {
        setEmails(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEmails = synced.filter(e => !existingIds.has(e.id));
          return [...newEmails, ...prev];
        });
      }
      if (conn) {
        await runSync(synced.length > 0);
      }
    })();
  }, [firmId, setEmails, runSync]);

  // Reset connection state when switching firms.
  useEffect(() => {
    if (!firmId) {
      setOutlookConnected(false);
      setConnectedEmail('');
      initializedFirmRef.current = null;
    }
  }, [firmId]);

  // 5-minute background auto-sync — runs regardless of active view.
  useEffect(() => {
    if (!outlookConnected || !firmId) return;
    autoSyncInterval.current = setInterval(() => runSync(true), AUTO_SYNC_INTERVAL_MS);
    return () => {
      if (autoSyncInterval.current) {
        clearInterval(autoSyncInterval.current);
        autoSyncInterval.current = null;
      }
    };
  }, [outlookConnected, firmId, runSync]);

  // OAuth popup postMessage — triggers an immediate sync on successful connect.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'outlook_connected') {
        setOutlookConnected(true);
        runSync();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [runSync]);

  return { outlookConnected, isSyncing, syncMessage, connectedEmail, runSync };
}
