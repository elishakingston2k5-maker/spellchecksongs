import React from 'react';

const ALPHABETS = [
  'அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ',
  'க', 'ச', 'ஜ', 'ஞ', 'ட', 'த', 'ந', 'ப', 'ம', 'ய', 'ர',
  'ல', 'வ', 'ஷ', 'ஸ', 'ஸ்ரீ', 'ஹ'
];

export default function AlphabetGrid({
  selectedAlphabet,
  onSelectAlphabet,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  userRole
}) {
  return (
    <div className="space-y-6">
      {/* Tamil Alphabet Grid */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Browse by Tamil Alphabet</h3>
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-2.5">
          {ALPHABETS.map((char) => {
            const isActive = selectedAlphabet === char;
            const isCompleted = ['அ', 'ஆ'].includes(char);
            
            return (
              <button
                key={char}
                onClick={() => onSelectAlphabet(char)}
                className={`
                  h-12 w-12 rounded-xl flex items-center justify-center font-semibold text-lg
                  transition-all duration-200 select-none relative group border
                  ${isActive 
                    ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-navy-darkest border-gold-400 shadow-md shadow-gold-500/10' 
                    : isCompleted
                      ? 'bg-navy-medium text-white border-navy-light hover:border-gold-500/50 hover:bg-navy-light' 
                      : 'bg-navy-medium/50 text-gray-500 border-navy-light/40 hover:text-gray-400'
                  }
                `}
              >
                {char}
                
                {/* Visual indicator for completed alphabets */}
                {isCompleted && !isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gold-500 rounded-full"></span>
                )}

                {/* Tooltip for non-implemented alphabets */}
                {!isCompleted && (
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-[10px] bg-navy-dark text-gray-400 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl border border-navy-light">
                    No songs yet
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-navy-medium p-4 rounded-2xl border border-navy-light/60">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search songs by ID, Tamil title, or Tanglish..."
            className="w-full bg-navy-dark border border-navy-light rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 font-medium whitespace-nowrap">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="bg-navy-dark border border-navy-light rounded-xl px-3 py-2.5 text-gray-300 text-xs focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="in_review">In Review</option>
              <option value="corrected">Corrected</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* Matches Count Display */}
          <div className="bg-navy-darkest px-4 py-2.5 rounded-xl border border-navy-light/40 text-xs">
            <span className="text-gray-400 mr-1.5 font-medium">Matches:</span>
            <span className="text-gold-400 font-semibold font-mono">{totalCount} {totalCount === 1 ? 'song' : 'songs'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
