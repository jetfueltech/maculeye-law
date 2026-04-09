import React, { useState, useEffect, useRef } from 'react';
import { CommunicationLog } from '../types';

export interface ActiveCallInfo {
  contactName: string;
  contactPhone: string;
  caseId: string;
  caseName: string;
}

interface FloatingCallBarProps {
  activeCall: ActiveCallInfo;
  onEndCall: (log: Omit<CommunicationLog, 'id'>) => void;
  onDismiss: () => void;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const FloatingCallBar: React.FC<FloatingCallBarProps> = ({ activeCall, onEndCall, onDismiss }) => {
  const [callTimer, setCallTimer] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [callNote, setCallNote] = useState('');
  const [callEnded, setCallEnded] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isConnected && !callEnded) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, callEnded]);

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleEndCall = () => {
    setCallEnded(true);
    setExpanded(true);
  };

  const handleSave = () => {
    onEndCall({
      type: 'call',
      direction: 'outbound',
      contactName: activeCall.contactName,
      contactPhone: activeCall.contactPhone,
      timestamp: new Date().toISOString(),
      duration: formatTime(callTimer),
      status: 'completed',
      content: callNote || 'No notes provided.',
    });
  };

  const handleDiscard = () => {
    onDismiss();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
      <div
        className={`pointer-events-auto transition-all duration-300 ease-out ${
          expanded ? 'w-full max-w-lg mb-0' : 'mb-4 w-full max-w-md'
        }`}
      >
        <div className={`bg-stone-900 text-white shadow-2xl shadow-black/40 overflow-hidden transition-all duration-300 ${
          expanded ? 'rounded-t-2xl' : 'rounded-2xl mx-4'
        }`}>
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
            onClick={() => !callEnded && setExpanded(!expanded)}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              callEnded ? 'bg-stone-700' : isConnected ? 'bg-green-500/20' : 'bg-blue-500/20'
            }`}>
              {callEnded ? (
                <svg className="w-4.5 h-4.5 text-stone-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 010-1.41C2.74 9.32 7.13 8 12 8c4.87 0 9.26 1.32 11.71 3.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 00-2.66-1.85.995.995 0 01-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
              ) : (
                <svg className={`w-4.5 h-4.5 ${isConnected ? 'text-green-400' : 'text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{activeCall.contactName}</span>
                {isConnected && !callEnded && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-mono text-green-400">{formatTime(callTimer)}</span>
                  </span>
                )}
                {callEnded && (
                  <span className="text-xs text-stone-400">Call ended - {formatTime(callTimer)}</span>
                )}
              </div>
              <span className="text-xs text-stone-400">{activeCall.contactPhone}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isConnected && !callEnded && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleConnect(); }}
                  className="px-3.5 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-bold rounded-full transition-colors"
                >
                  Dial
                </button>
              )}

              {isConnected && !callEnded && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/20'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
                    className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
                    title="End call"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 010-1.41C2.74 9.32 7.13 8 12 8c4.87 0 9.26 1.32 11.71 3.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 00-2.66-1.85.995.995 0 01-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                  </button>
                </>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
            </div>
          </div>

          {expanded && (
            <div className="px-4 pb-4 border-t border-white/10 animate-fade-in">
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Call Notes</label>
                <textarea
                  ref={noteRef}
                  className="w-full h-24 p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-stone-500 outline-none focus:border-blue-500/50 resize-none"
                  placeholder="Type notes during or after the call..."
                  value={callNote}
                  onChange={e => setCallNote(e.target.value)}
                />
              </div>
              {callEnded && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Save Call Log
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg text-sm transition-colors"
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
