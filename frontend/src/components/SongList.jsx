import React from 'react';

const STATUS_BADGES = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  in_review: {
    label: 'In Review',
    classes: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
  },
  corrected: {
    label: 'Corrected',
    classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  approved: {
    label: 'Approved',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }
};

export default function SongList({
  songs,
  selectedAlphabet,
  pagination,
  onPageChange,
  onReviewSong,
  isLoading
}) {
  const isAvailableAlphabet = ['அ', 'ஆ'].includes(selectedAlphabet);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <svg className="animate-spin h-8 w-8 text-gold-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-gray-400 text-sm">Loading songs database...</span>
      </div>
    );
  }

  if (!isAvailableAlphabet) {
    return (
      <div className="text-center py-16 bg-navy-medium/30 border border-dashed border-navy-light/40 rounded-2xl">
        <div className="inline-flex items-center justify-center p-3 bg-navy-light/50 rounded-full mb-3 text-gray-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h4 className="text-gray-400 font-semibold text-lg">No songs added yet.</h4>
        <p className="text-gray-500 text-sm mt-1">Reviewers have not processed songs starting with "{selectedAlphabet}" yet.</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-16 bg-navy-medium/30 border border-dashed border-navy-light/40 rounded-2xl">
        <div className="inline-flex items-center justify-center p-3 bg-navy-light/50 rounded-full mb-3 text-gray-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h4 className="text-gray-400 font-semibold text-lg">No matching songs found.</h4>
        <p className="text-gray-500 text-sm mt-1">Try resetting your search query or check another status filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid of Songs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {songs.map((song) => {
          const badge = STATUS_BADGES[song.status] || STATUS_BADGES.pending;

          return (
            <div
              key={song.id}
              className="bg-navy-medium border border-navy-light/50 rounded-2xl p-5 hover-glow flex justify-between items-start gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs text-gold-400 font-semibold bg-gold-500/5 px-2 py-0.5 rounded border border-gold-500/10 shrink-0">
                    ID {song.id}
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badge.classes} shrink-0`}>
                    {badge.label}
                  </span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-base truncate" title={song.title}>
                    {song.title}
                  </h4>
                  <p className="text-gray-400 text-xs truncate mt-0.5" title={song.tanglishTitle}>
                    {song.tanglishTitle}
                  </p>
                </div>
                {song.reviewedBy && (
                  <p className="text-[10px] text-gray-500">
                    Reviewed by <span className="text-gray-400">{song.reviewedBy}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => onReviewSong(song.id)}
                className="bg-navy-light hover:bg-navy-light/80 hover:text-white border border-navy-light text-gray-300 font-medium px-4 py-2.5 rounded-xl transition-all text-xs shrink-0 flex items-center gap-1.5 active:scale-[0.97]"
              >
                <span>{song.status === 'pending' ? 'Review Lyrics' : 'View Lyrics'}</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {song.status === 'pending' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-navy-light/50 pt-6">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white disabled:text-gray-600 disabled:pointer-events-none transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          <span className="text-xs text-gray-500">
            Page <span className="text-gray-300 font-semibold font-mono">{pagination.page}</span> of{' '}
            <span className="text-gray-300 font-semibold font-mono">{pagination.pages}</span>
          </span>

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white disabled:text-gray-600 disabled:pointer-events-none transition-colors"
          >
            <span>Next</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
