import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const MISTAKE_TYPES = [
  'Tamil spelling mistake',
  'Tanglish spelling mistake',
  'Missing word',
  'Extra word',
  'Line break issue',
  'Other'
];

export default function ReviewLyrics({ songId, onBackToList, token }) {
  const [song, setSong] = useState(null);
  const [errors, setErrors] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // Error pinpoint state
  const [selectedWordKey, setSelectedWordKey] = useState(null); // 'lineIdx_wordIdx_lang'
  const [originalText, setOriginalText] = useState('');
  const [suggestedCorrection, setSuggestedCorrection] = useState('');
  const [language, setLanguage] = useState('Tamil');
  const [mistakeType, setMistakeType] = useState('Tamil spelling mistake');
  const [comment, setComment] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch song details
  useEffect(() => {
    const fetchSong = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/songs/${songId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        const data = await response.json();
        if (response.ok) {
          setSong(data.song);
          // Set errors already saved (for resuming progress)
          setErrors(data.errors || []);
        } else {
          showNotification(data.message || 'Error fetching song details', 'error');
        }
      } catch (err) {
        showNotification('Network error. Failed to load song.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSong();
  }, [songId, token]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ text: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <svg className="animate-spin h-8 w-8 text-gold-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-gray-400">Loading lyrics review console...</span>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="text-center py-16 bg-navy-medium border border-navy-light rounded-2xl">
        <h4 className="text-red-400 font-semibold text-lg">Song not found</h4>
        <button onClick={onBackToList} className="mt-4 bg-navy-light px-4 py-2 rounded-xl text-xs text-white">
          Return to list
        </button>
      </div>
    );
  }

  const slides = song.slides || [];
  const currentSlide = slides[currentSlideIndex];
  const isPending = song.status === 'pending';

  // Helper: split text by newline first, then by space into words
  const renderInteractiveText = (text, lang) => {
    if (!text) return null;
    const lines = text.split('\n');
    
    return lines.map((line, lineIdx) => {
      const words = line.split(' ');
      return (
        <div key={lineIdx} className="mb-2 last:mb-0 leading-relaxed">
          {words.map((word, wordIdx) => {
            const key = `${lineIdx}_${wordIdx}_${lang}`;
            const isSelected = selectedWordKey === key;
            
            // Highlight style classes
            let highlightClass = isPending ? 'word-clickable' : '';
            if (isSelected) {
              highlightClass = lang === 'Tamil' ? 'word-selected-tamil' : 'word-selected-tanglish';
            } else {
              // Highlight words that already have reported errors in this slide
              const hasError = errors.some(err => 
                err.slideIndex === currentSlideIndex && 
                err.language === lang && 
                err.originalText.includes(word)
              );
              if (hasError) {
                highlightClass += lang === 'Tamil' ? ' word-has-error' : ' word-has-error-tg';
              }
            }

            return (
              <span
                key={wordIdx}
                onClick={() => handleWordClick(word, key, lang)}
                className={`${highlightClass} mr-1.5`}
              >
                {word}
              </span>
            );
          })}
        </div>
      );
    });
  };

  const handleWordClick = (word, key, lang) => {
    if (!isPending) return;
    setSelectedWordKey(key);
    setOriginalText(word);
    setLanguage(lang);
    setMistakeType(lang === 'Tamil' ? 'Tamil spelling mistake' : 'Tanglish spelling mistake');
  };

  const handleAddError = () => {
    if (!originalText.trim()) {
      showNotification('Please select or enter the original text with the mistake.', 'error');
      return;
    }

    const newError = {
      songId: song.id,
      songTitle: song.title,
      slideIndex: currentSlideIndex,
      language,
      originalText: originalText.trim(),
      suggestedCorrection: suggestedCorrection.trim(),
      mistakeType,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    setErrors([...errors, newError]);
    
    // Reset inputs
    setOriginalText('');
    setSuggestedCorrection('');
    setComment('');
    setSelectedWordKey(null);
    showNotification('Error pinpoint added to list.');
  };

  const handleDeleteError = (indexToDelete) => {
    setErrors(errors.filter((_, idx) => idx !== indexToDelete));
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/songs/${song.id}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ errors }),
      });

      if (response.ok) {
        showNotification('Progress saved successfully! You can resume later.');
      } else {
        const data = await response.json();
        showNotification(data.message || 'Failed to save progress.', 'error');
      }
    } catch (err) {
      showNotification('Network error. Failed to save progress.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/songs/${song.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ errors }),
      });

      if (response.ok) {
        showNotification('Review submitted successfully! Song status is now "In Review".');
        setTimeout(() => {
          onBackToList();
        }, 1500);
      } else {
        const data = await response.json();
        showNotification(data.message || 'Failed to submit review.', 'error');
      }
    } catch (err) {
      showNotification('Network error. Failed to submit review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Reopen song back to pending status
  const handleReopenSong = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/songs/${song.id}/reopen`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Song reopened successfully. You can now edit and add corrections!');
        setSong(prev => ({ ...prev, status: 'pending' }));
      } else {
        showNotification(data.message || 'Failed to reopen song.', 'error');
      }
    } catch (err) {
      showNotification('Network error. Failed to reopen song.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-xl border shadow-xl flex items-center gap-3 z-50 animate-slide-in ${
          notification.type === 'error' 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {notification.type === 'error' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <span className="text-sm font-semibold">{notification.text}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-navy-light/60 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToList}
            className="h-10 w-10 rounded-xl bg-navy-medium border border-navy-light hover:border-gold-500/40 text-gray-400 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            title="Back to song list"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{song.title}</h2>
              <span className="font-mono text-xs text-gold-400 font-semibold bg-gold-500/5 px-2 py-0.5 rounded border border-gold-500/10">
                ID {song.id}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">{song.tanglishTitle}</p>
          </div>
        </div>

        {isPending ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProgress}
              disabled={isSaving || isSubmitting}
              className="bg-navy-medium hover:bg-navy-light/70 text-gray-300 hover:text-white border border-navy-light font-medium px-4 py-2.5 rounded-xl transition-all text-xs flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSaving ? 'Saving...' : 'Save Progress'}
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={isSaving || isSubmitting}
              className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-darkest font-semibold px-5 py-2.5 rounded-xl transition-all text-xs shadow-md shadow-gold-500/5 hover:shadow-gold-500/15 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Song State:</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-xl border ${
                song.status === 'in_review' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                song.status === 'corrected' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {song.status.replace('_', ' ')} (Read Only)
              </span>
            </div>
            
            <button
              onClick={handleReopenSong}
              disabled={isSaving}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-semibold px-3 py-1.5 rounded-xl transition-all text-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              title="Make this song editable again"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
              </svg>
              <span>Reopen Song</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Console: Song slides & Error pinpoint inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Slide Lyric View Card */}
          <div className="bg-navy-medium border border-navy-light/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy-light/40 pb-4 mb-5">
              <span className="text-xs font-semibold text-gold-400 uppercase tracking-widest">Lyric Slide Editor</span>
              <span className="text-xs text-gray-400 font-medium">
                Slide <span className="text-white font-semibold font-mono">{currentSlideIndex + 1}</span> of{' '}
                <span className="text-white font-semibold font-mono">{slides.length}</span>
              </span>
            </div>

            {slides.length > 0 ? (
              <div className="space-y-6 min-h-[140px] flex flex-col justify-center">
                {/* Tamil block */}
                <div className="space-y-1.5 border-l-2 border-red-500/50 pl-4 py-1">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Tamil Lyrics (Click word to tag)</span>
                  <div className="text-lg sm:text-xl font-semibold text-white leading-relaxed font-sans">
                    {renderInteractiveText(currentSlide?.ta, 'Tamil')}
                  </div>
                </div>

                {/* Tanglish block */}
                <div className="space-y-1.5 border-l-2 border-purple-500/50 pl-4 py-1">
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Tanglish Lyrics (Click word to tag)</span>
                  <div className="text-base sm:text-lg font-medium text-gray-300 leading-relaxed font-mono">
                    {renderInteractiveText(currentSlide?.tg, 'Tanglish')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No slides loaded for this song.</div>
            )}

            {/* Slide Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-navy-light/40 pt-4 mt-6">
              <button
                onClick={() => {
                  setCurrentSlideIndex(prev => Math.max(0, prev - 1));
                  setSelectedWordKey(null);
                }}
                disabled={currentSlideIndex === 0}
                className="bg-navy-dark hover:bg-navy-light border border-navy-light text-gray-300 disabled:text-gray-600 disabled:pointer-events-none hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous Slide</span>
              </button>

              <button
                onClick={() => {
                  setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
                  setSelectedWordKey(null);
                }}
                disabled={currentSlideIndex === slides.length - 1}
                className="bg-navy-dark hover:bg-navy-light border border-navy-light text-gray-300 disabled:text-gray-600 disabled:pointer-events-none hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Next Slide</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error Pinpoint Form Panel */}
          {isPending ? (
            <div className="bg-navy-medium border border-navy-light/60 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 border-b border-navy-light/40 pb-3 mb-5">
                Pinpoint Spelling Mistake
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Original Text</label>
                  <input
                    type="text"
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    placeholder="Click a word above or type here"
                    className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested Correction</label>
                  <input
                    type="text"
                    value={suggestedCorrection}
                    onChange={(e) => setSuggestedCorrection(e.target.value)}
                    placeholder="Type the corrected spelling"
                    className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm cursor-pointer"
                  >
                    <option value="Tamil">Tamil</option>
                    <option value="Tanglish">Tanglish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mistake Type</label>
                  <select
                    value={mistakeType}
                    onChange={(e) => setMistakeType(e.target.value)}
                    className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm cursor-pointer"
                  >
                    {MISTAKE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comment (Optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    placeholder="Provide context or explanation for this spelling correction"
                    className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleAddError}
                className="mt-5 w-full bg-navy-light hover:bg-gold-500 hover:text-navy-darkest text-gray-300 font-semibold py-3 px-4 rounded-xl border border-navy-light hover:border-gold-400 active:scale-[0.98] transition-all text-xs"
              >
                Add Error
              </button>
            </div>
          ) : (
            <div className="bg-navy-medium border border-navy-light/60 rounded-2xl p-6 flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-xs space-y-0.5">
                <span className="text-white font-bold block">Read-Only Archives</span>
                <p className="text-gray-400 leading-relaxed">This song's checking has been completed. Tagging corrections or editing has been disabled.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Drawer Panel: List of currently tagged errors in this song */}
        <div className="bg-navy-medium border border-navy-light/60 rounded-2xl p-5 space-y-4">
          <div className="border-b border-navy-light/40 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">Marked Errors ({errors.length})</h3>
            <span className="bg-navy-darkest text-[10px] text-gray-400 px-2.5 py-1 rounded-full border border-navy-light">
              Current Session
            </span>
          </div>

          {errors.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-xs space-y-2">
              <svg className="w-8 h-8 text-gray-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p>No errors marked yet.</p>
              <p className="text-[10px]">Click lyric words above to pinpoint mistakes.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {errors.map((err, idx) => (
                <div
                  key={idx}
                  className="bg-navy-dark border border-navy-light/50 hover:border-navy-light rounded-xl p-3.5 space-y-2.5 relative group transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-navy-light/30 pb-1.5">
                    <span className="text-[10px] font-semibold text-gray-400">
                      Slide {err.slideIndex + 1}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      err.language === 'Tamil' 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/15' 
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                    }`}>
                      {err.language}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-red-400 line-through truncate max-w-[100px]">{err.originalText}</span>
                      <span className="text-gray-500">→</span>
                      <span className="text-emerald-400 font-semibold truncate max-w-[100px]">
                        {err.suggestedCorrection || '(delete word)'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-[10px] italic">{err.mistakeType}</p>
                    {err.comment && (
                      <p className="text-gray-500 text-[10px] leading-relaxed pt-1 border-t border-navy-light/20">
                        "{err.comment}"
                      </p>
                    )}
                  </div>

                  {/* Delete pinpoint button */}
                  {isPending && (
                    <button
                      onClick={() => handleDeleteError(idx)}
                      className="absolute top-2.5 right-2.5 text-gray-500 hover:text-red-400 p-1 rounded hover:bg-navy-light transition-colors"
                      title="Remove correction"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
