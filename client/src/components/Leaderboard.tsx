import React from 'react';
import { Participant } from '@inixpoint/shared';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardProps {
  participants: Participant[];
  title?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ participants, title = 'Leaderboard' }) => {
  const sorted = [...participants]
    .filter(p => p.connected)
    .sort((a, b) => b.score - a.score);

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (position === 2) return <Medal className="w-5 h-5 text-orange-600" />;
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <h3 className="font-serif font-bold text-lg text-neutral-900 mb-4">{title}</h3>
      
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-6">Menunggu peserta bergabung...</p>
        ) : (
          sorted.map((participant, idx) => (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${ idx === 0
                ? 'bg-yellow-50 border-yellow-200'
                : idx === 1
                ? 'bg-gray-50 border-gray-200'
                : idx === 2
                ? 'bg-orange-50 border-orange-200'
                : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                {getMedalIcon(idx) || (
                  <span className="text-sm font-bold text-neutral-500 w-5 text-center">
                    {idx + 1}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-neutral-900 text-sm">{participant.name}</p>
                  <p className="text-xs text-neutral-500">
                    {participant.answeredCount ?? 0} jawab
                    {participant.correctCount !== undefined && ` • ${participant.correctCount} benar`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-primary-700">{participant.score}</p>
                <p className="text-xs text-neutral-500">poin</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
