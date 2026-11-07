import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';
import { PluginManifest } from '@inixpoint/shared';
import { AlertTriangle, Gamepad2, RotateCcw, XCircle } from 'lucide-react';

interface PluginSandboxProps {
  role: 'presenter' | 'participant';
  code: string;
  hostToken?: string;
  manifest: PluginManifest;
  config: Record<string, any>;
  html: string;
  participant?: { sessionId: string; displayName: string };
  participantCount: number;
  onClose?: () => void;
}

export const PluginSandbox: React.FC<PluginSandboxProps> = ({
  role,
  code,
  hostToken,
  manifest,
  config,
  html,
  participant,
  participantCount,
  onClose,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Prepare secure sandbox HTML with strict CSP (PL-04 & 11.6)
  const secureHtml = React.useMemo(() => {
    // Inject strict Content Security Policy to prevent external network egress
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:;">`;
    if (html.includes('<head>')) {
      return html.replace('<head>', `<head>${cspMeta}`);
    }
    return `${cspMeta}${html}`;
  }, [html]);

  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      // Security: Only accept messages from our sandbox iframe
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) {
        return;
      }

      const data = e.data;
      if (!data || typeof data !== 'object') return;

      try {
        switch (data.type) {
          case 'ix:send':
            socket.emit('plugin-message', {
              code,
              target: 'presenter',
              data: data.msg,
            });
            break;

          case 'ix:broadcast':
            socket.emit('plugin-message', {
              code,
              target: 'all',
              data: data.msg,
            });
            break;

          case 'ix:sendTo':
            socket.emit('plugin-message', {
              code,
              target: data.targetId,
              data: data.msg,
            });
            break;

          case 'ix:submitScore':
            socket.emit('plugin-score', {
              code,
              points: data.points,
              meta: data.meta,
            });
            break;

          case 'ix:end':
            if (role === 'presenter' && hostToken) {
              socket.emit('plugin-end', {
                code,
                hostToken,
                result: data.result,
              });
            }
            break;

          default:
            break;
        }
      } catch (err: any) {
        console.error('[PluginSandbox] Bridge error:', err);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [code, hostToken, role]);

  // Relay inbound socket messages to the sandbox iframe
  useEffect(() => {
    const handlePluginMessage = (payload: any) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'ix:message', msg: payload.data },
          '*'
        );
      }
    };

    socket.on('plugin-message', handlePluginMessage);
    return () => {
      socket.off('plugin-message', handlePluginMessage);
    };
  }, []);

  // Initialize plugin once iframe is loaded
  const handleIframeLoad = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        setIsReady(true);
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'ix:init',
            ctx: {
              role,
              config,
              participant,
              participantCount,
            },
          },
          '*'
        );
      }
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.message || 'Gagal menginisialisasi sandbox game.');
    }
  };

  // Watchdog timeout: if iframe fails to load in 8s, surface friendly fallback (PL-15)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady) {
        setHasError(true);
        setErrorMessage('Game plugin membutuhkan waktu terlalu lama untuk memuat.');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isReady]);

  if (hasError) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center text-slate-200 shadow-xl max-w-lg mx-auto my-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h4 className="font-bold text-base text-rose-300 mb-1">Watchdog Plugin: Terjadi Kendala</h4>
        <p className="text-xs text-slate-400 mb-4">{errorMessage || 'Plugin dihentikan demi keamanan sesi.'}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => { setHasError(false); setIsReady(false); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              Tutup Plugin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      {/* Plugin Header Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 flex-shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <Gamepad2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
          <span className="font-bold text-white truncate">{manifest.name}</span>
          <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-mono">
            Plugin Beta (v{manifest.version})
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Tutup Game Plugin"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sandboxed iframe (PL-04: sandbox without allow-same-origin) */}
      <iframe
        ref={iframeRef}
        srcDoc={secureHtml}
        sandbox="allow-scripts"
        onLoad={handleIframeLoad}
        title={manifest.name}
        className="w-full flex-1 border-0 min-h-[460px] bg-slate-950"
      />
    </div>
  );
};
