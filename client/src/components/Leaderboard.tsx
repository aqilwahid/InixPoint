import React, { useState } from 'react';
import { Participant } from '@inixpoint/shared';
import { Trophy, Medal, Star, Zap } from 'lucide-react';

interface LeaderboardProps {
  participants: Participant[];
  title?: string;
  onAwardStar?: (participantId: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ participants, title = 'Quiz Summary & Leaderboard', onAwardStar }) => {
  const [viewMode, setViewMode] = useState<'table' | 'podium'>('table');

  const sorted = [...participants]
    .filter(p => p.connected)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
      return (a.averageSpeedSec || 99) - (b.averageSpeedSec || 99);
    });

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />;
    if (idx === 1) return <Medal className="w-4 h-4 text-slate-300 fill-slate-300" />;
    if (idx === 2) return <Medal className="w-4 h-4 text-amber-600 fill-amber-600" />;
    return <span className="font-mono text-xs font-bold text-slate-400">{idx + 1}</span>;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl text-slate-100">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/80">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-serif font-bold text-base text-white">{title}</h3>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
            {sorted.length} Peserta
          </span>
        </div>

        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              viewMode === 'table' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tabel Ringkasan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('podium')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              viewMode === 'podium' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Podium 3 Besar
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Belum ada aktivitas peserta. Jawaban yang masuk akan tampil di sini!
        </p>
      ) : viewMode === 'podium' ? (
        /* Podium View */
        <div className="py-4">
          <div className="flex justify-center items-end gap-3 max-w-md mx-auto mb-6 pt-4">
            {/* Rank 2 */}
            {sorted[1] && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-300 truncate max-w-[90px]">{sorted[1].name}</span>
                <span className="text-xs text-amber-400 font-mono font-bold mt-0.5">{sorted[1].score} pts</span>
                <div className="w-full bg-slate-700 border-t-4 border-slate-300 rounded-t-xl h-24 flex flex-col items-center justify-center shadow-lg mt-2">
                  <Medal className="w-6 h-6 text-slate-300" />
                  <span className="text-lg font-black text-slate-200">#2</span>
                </div>
              </div>
            )}

            {/* Rank 1 */}
            {sorted[0] && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-amber-300 truncate max-w-[100px]">{sorted[0].name}</span>
                <span className="text-xs text-amber-400 font-mono font-bold mt-0.5">{sorted[0].score} pts</span>
                <div className="w-full bg-brand-700/80 border-t-4 border-amber-400 rounded-t-xl h-32 flex flex-col items-center justify-center shadow-2xl mt-2">
                  <Trophy className="w-8 h-8 text-amber-400" />
                  <span className="text-2xl font-black text-amber-300">#1</span>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {sorted[2] && (
              <div className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-slate-300 truncate max-w-[90px]">{sorted[2].name}</span>
                <span className="text-xs text-amber-400 font-mono font-bold mt-0.5">{sorted[2].score} pts</span>
                <div className="w-full bg-slate-700 border-t-4 border-amber-600 rounded-t-xl h-20 flex flex-col items-center justify-center shadow-lg mt-2">
                  <Medal className="w-6 h-6 text-amber-600" />
                  <span className="text-lg font-black text-slate-200">#3</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ClassPoint-style Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                <th className="py-2.5 px-3">Nama</th>
                <th className="py-2.5 px-3 text-center">Answered</th>
                <th className="py-2.5 px-3 text-center">Correct</th>
                <th className="py-2.5 px-3 text-center">Star ⭐</th>
                <th className="py-2.5 px-3 text-center">Speed</th>
                <th className="py-2.5 px-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-medium">
              {sorted.map((participant, idx) => (
                <tr
                  key={participant.id}
                  className={`hover:bg-slate-800/50 transition ${
                    idx === 0
                      ? 'bg-amber-500/10'
                      : idx === 1
                      ? 'bg-slate-500/10'
                      : idx === 2
                      ? 'bg-amber-700/10'
                      : ''
                  }`}
                >
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center">
                      {getRankBadge(idx)}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-brand-300 flex items-center justify-center font-bold text-[10px]">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-slate-200 font-semibold">{participant.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    {participant.answeredCount ?? 0}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                    {participant.correctCount ?? 0}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center space-x-1.5">
                      <span className="inline-flex items-center space-x-1 bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold font-mono">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{participant.stars ?? 0}</span>
                      </span>
                      {onAwardStar && (
                        <button
                          type="button"
                          onClick={() => onAwardStar(participant.id)}
                          className="px-1.5 py-0.5 rounded bg-amber-400/15 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 transition text-[10px] font-bold active:scale-95"
                          title={`Beri +1 bintang untuk ${participant.name}`}
                        >
                          +⭐
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">
                    <span className="inline-flex items-center text-slate-300">
                      <Zap className="w-3 h-3 text-yellow-400 mr-1" />
                      {participant.averageSpeedSec !== undefined ? `${participant.averageSpeedSec}s` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-brand-400">
                    {participant.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
