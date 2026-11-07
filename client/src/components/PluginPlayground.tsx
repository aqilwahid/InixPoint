import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { BuiltinPlugin, BUILTIN_PLUGINS, PluginManifest } from '@inixpoint/shared';
import { 
  Gamepad2, 
  Upload, 
  RefreshCw, 
  X, 
  Smartphone, 
  Monitor, 
  AlertOctagon, 
  Flag, 
  CheckCircle, 
  Info,
  Layers
} from 'lucide-react';

interface PluginPlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPluginForClass?: (plugin: BuiltinPlugin) => void;
}

export const PluginPlayground: React.FC<PluginPlaygroundProps> = ({
  isOpen,
  onClose,
  onSelectPluginForClass,
}) => {
  const [plugins, setPlugins] = useState<Array<BuiltinPlugin & { isBuiltin?: boolean }>>([...BUILTIN_PLUGINS]);
  const [selectedPlugin, setSelectedPlugin] = useState<BuiltinPlugin>(BUILTIN_PLUGINS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [simParticipantName, setSimParticipantName] = useState('Peserta Simulasi');
  const [simRounds, setSimRounds] = useState(3);
  const [sessionKey, setSessionKey] = useState(Date.now());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const presenterIframeRef = useRef<HTMLIFrameElement | null>(null);
  const participantIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Fetch plugins from server on open
  useEffect(() => {
    if (!isOpen) return;
    fetch('http://localhost:4000/api/plugins')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.plugins)) {
          setPlugins(data.plugins);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Local simulated communication relay between Presenter and Participant iframes
  useEffect(() => {
    if (!isOpen) return;

    const handlePlaygroundMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      const isFromPresenter = e.source === presenterIframeRef.current?.contentWindow;
      const isFromParticipant = e.source === participantIframeRef.current?.contentWindow;

      if (!isFromPresenter && !isFromParticipant) return;

      if (isFromPresenter) {
        // Presenter broadcast/send -> forward to participant iframe
        if (data.type === 'ix:broadcast' || data.type === 'ix:send' || data.type === 'ix:sendTo') {
          participantIframeRef.current?.contentWindow?.postMessage(
            { type: 'ix:message', msg: data.msg },
            '*'
          );
        } else if (data.type === 'ix:end') {
          setStatusMessage(`Presenter mengakhiri game: ${JSON.stringify(data.result || 'Selesai')}`);
        }
      } else if (isFromParticipant) {
        // Participant send -> forward to presenter iframe
        if (data.type === 'ix:send') {
          presenterIframeRef.current?.contentWindow?.postMessage(
            { type: 'ix:message', msg: data.msg },
            '*'
          );
        } else if (data.type === 'ix:submitScore') {
          setStatusMessage(`Peserta mengajukan skor: +${data.points} poin`);
        }
      }
    };

    window.addEventListener('message', handlePlaygroundMessage);
    return () => window.removeEventListener('message', handlePlaygroundMessage);
  }, [isOpen]);

  // Reset & Re-initialize both iframes
  const handleReloadSimulation = () => {
    setSessionKey(Date.now());
    setStatusMessage(null);
  };

  const initIframe = (iframe: HTMLIFrameElement | null, role: 'presenter' | 'participant') => {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      {
        type: 'ix:init',
        ctx: {
          role,
          config: { rounds: simRounds },
          participant: { sessionId: 'sim_part_1', displayName: simParticipantName },
          participantCount: 1,
        },
      },
      '*'
    );
  };

  // Upload & Extract .zip Package (PL-01 & PL-08)
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setUploadError('Harap unggah file paket plugin berformat .zip');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file .zip melebihi batas 5 MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // Locate manifest.json and index.html
      const manifestFile = zipContent.file('manifest.json');
      const htmlFile = zipContent.file('index.html');

      if (!manifestFile) {
        throw new Error('File manifest.json tidak ditemukan di dalam paket .zip');
      }
      if (!htmlFile) {
        throw new Error('File index.html tidak ditemukan di dalam paket .zip');
      }

      const manifestStr = await manifestFile.async('string');
      let manifest: PluginManifest;
      try {
        manifest = JSON.parse(manifestStr);
      } catch {
        throw new Error('Format manifest.json tidak valid (JSON error)');
      }

      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error('Manifest harus memiliki properti id, name, dan version');
      }

      let html = await htmlFile.async('string');

      // Save to server
      const res = await fetch('http://localhost:4000/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest, html })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Gagal menyimpan plugin ke server');
      }

      const newPlugin: BuiltinPlugin = { manifest, html };
      setPlugins(prev => [newPlugin, ...prev]);
      setSelectedPlugin(newPlugin);
      setStatusMessage(`Plugin "${manifest.name}" berhasil diunggah dan siap diuji!`);
      handleReloadSimulation();
    } catch (err: any) {
      setUploadError(err.message || 'Gagal memproses file .zip');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // PL-10 Kill switch / Revoke custom plugin
  const handleRevokePlugin = async (id: string) => {
    if (!confirm('Yakin ingin mencabut (kill switch) plugin ini? Plugin tidak akan dapat dimuat lagi oleh kelas manapun.')) return;
    try {
      await fetch(`http://localhost:4000/api/plugins/${id}/revoke`, { method: 'POST' });
      setPlugins(prev => prev.filter(p => p.manifest.id !== id));
      setSelectedPlugin(BUILTIN_PLUGINS[0]);
      setStatusMessage('Plugin berhasil dicabut (kill switch aktif).');
    } catch (e: any) {
      alert('Gagal mencabut plugin: ' + e.message);
    }
  };

  // PL-16 Report problem with plugin
  const handleReportPlugin = async (id: string) => {
    const reason = prompt('Tuliskan kendala atau masalah pada plugin ini:');
    if (!reason?.trim()) return;
    try {
      await fetch(`http://localhost:4000/api/plugins/${id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      });
      alert('Laporan berhasil dikirim ke pengelola sistem.');
    } catch (e: any) {
      alert('Gagal mengirim laporan: ' + e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6 text-white overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
              Plugin Playground (Simulator Lokal R5)
              <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-mono">
                Beta Testing
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Uji coba plugin game secara langsung: simulasi layar Presenter dan Peserta di satu halaman.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onSelectPluginForClass && (
            <button
              type="button"
              onClick={() => onSelectPluginForClass(selectedPlugin)}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Gunakan Game Ini di Kelas</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Tutup Playground (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 pt-4 min-h-0 overflow-hidden">
        {/* Left Side: Plugin Selector & Config Tools */}
        <div className="w-full lg:w-72 flex flex-col gap-3 flex-shrink-0 overflow-y-auto pr-1">
          {/* Plugin Selection List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-pink-400" /> Pilih Plugin
              </span>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-pink-400 hover:text-pink-300 disabled:opacity-50 font-semibold flex items-center gap-1"
                title="Unggah paket plugin .zip (PL-01 / PL-08)"
              >
                <Upload className="w-3 h-3" />
                <span>{isUploading ? 'Memproses...' : '+ Upload .zip'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipUpload}
                className="hidden"
              />
            </div>

            {uploadError && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 mb-2">
                {uploadError}
              </p>
            )}

            <div className="space-y-1.5">
              {plugins.map((p) => {
                const isSelected = selectedPlugin.manifest.id === p.manifest.id;
                return (
                  <div
                    key={p.manifest.id}
                    onClick={() => { setSelectedPlugin(p); handleReloadSimulation(); }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-pink-950/40 border-pink-500 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate max-w-[170px]">{p.manifest.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">v{p.manifest.version}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{p.manifest.description}</p>
                    
                    {/* Actions for custom plugin: Kill Switch & Report */}
                    {p.isBuiltin === false && (
                      <div className="mt-2 pt-1 border-t border-slate-700 flex justify-end gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleReportPlugin(p.manifest.id); }}
                          className="text-amber-400 hover:underline flex items-center gap-0.5"
                          title="Lapor masalah plugin (PL-16)"
                        >
                          <Flag className="w-2.5 h-2.5" /> Lapor
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRevokePlugin(p.manifest.id); }}
                          className="text-rose-400 hover:underline flex items-center gap-0.5"
                          title="Cabut plugin / kill switch (PL-10)"
                        >
                          <AlertOctagon className="w-2.5 h-2.5" /> Cabut
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2.5 text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider block">
              Parameter Simulasi
            </span>

            <div>
              <label className="text-slate-400 block mb-1">Nama Peserta</label>
              <input
                type="text"
                value={simParticipantName}
                onChange={(e) => setSimParticipantName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Jumlah Ronde / Waktu</label>
              <input
                type="number"
                min={1}
                max={20}
                value={simRounds}
                onChange={(e) => setSimRounds(Number(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleReloadSimulation}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
              <span>Reset & Muat Ulang</span>
            </button>
          </div>

          {statusMessage && (
            <div className="bg-brand-950/40 border border-brand-500/30 p-2.5 rounded-xl text-xs text-brand-300">
              <span className="font-bold block mb-0.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Log Event Bridge:
              </span>
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Right Side: Dual Simulator Arena (Presenter & Participant) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Presenter Screen Simulator */}
          <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[320px]">
            <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-brand-400" /> Layar Presenter (Proyektor)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">role: presenter</span>
            </div>
            <iframe
              key={`pres_${sessionKey}`}
              ref={presenterIframeRef}
              srcDoc={selectedPlugin.html}
              sandbox="allow-scripts"
              onLoad={() => initIframe(presenterIframeRef.current, 'presenter')}
              title="Presenter Simulator"
              className="w-full flex-1 border-0 bg-slate-950"
            />
          </div>

          {/* Participant Phone Simulator */}
          <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[320px]">
            <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" /> Layar Ponsel Peserta ({simParticipantName})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">role: participant</span>
            </div>
            <iframe
              key={`part_${sessionKey}`}
              ref={participantIframeRef}
              srcDoc={selectedPlugin.html}
              sandbox="allow-scripts"
              onLoad={() => initIframe(participantIframeRef.current, 'participant')}
              title="Participant Simulator"
              className="w-full flex-1 border-0 bg-slate-950"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
