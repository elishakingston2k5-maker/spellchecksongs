import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const ALPHABETS = ['All', 'அ', 'ஆ'];

export default function AdminDashboard({ token, onLogout, theme, onToggleTheme }) {
  const [stats, setStats] = useState(null);
  const [recentErrors, setRecentErrors] = useState([]);
  const [songs, setSongs] = useState([]);
  const [checkers, setCheckers] = useState([]);
  
  // Filtering & Pagination
  const [selectedTab, setSelectedTab] = useState('songs'); // 'songs' or 'errors'
  const [selectedAlphabet, setSelectedAlphabet] = useState('All');
  const [selectedChecker, setSelectedChecker] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('in_review'); // default to show review songs
  const [errorStatusFilter, setErrorStatusFilter] = useState('pending'); // default show pending errors
  const [searchQuery, setSearchQuery] = useState('');
  const [songPagination, setSongPagination] = useState({ page: 1, pages: 1 });
  
  // Detail Modal State
  const [activeSong, setActiveSong] = useState(null);
  const [songErrors, setSongErrors] = useState([]);
  const [updatingSongStatus, setUpdatingSongStatus] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Fetch initial dashboard stats & filters
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
        setRecentErrors(data.recentErrors || []);
        setCheckers(data.checkers || []);
      } else {
        showNotification(data.message || 'Error fetching stats', 'error');
      }
    } catch (err) {
      showNotification('Network error loading dashboard stats.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch songs based on filters
  const fetchSongs = async (page = 1) => {
    try {
      let url = `${API_BASE_URL}/api/songs?page=${page}&limit=12`;
      if (selectedAlphabet !== 'All') url += `&alphabet=${selectedAlphabet}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSongs(data.songs);
        setSongPagination(data.pagination);
      }
    } catch (err) {
      showNotification('Network error loading songs.', 'error');
    }
  };

  // Fetch all errors for the separate list view
  const fetchErrors = async () => {
    try {
      let url = `${API_BASE_URL}/api/errors?`;
      if (errorStatusFilter) url += `status=${errorStatusFilter}&`;
      if (selectedChecker) url += `checkedBy=${selectedChecker}&`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRecentErrors(data);
      }
    } catch (err) {
      showNotification('Network error loading error reports.', 'error');
    }
  };

  // Fetch active song details for review modal
  const handleOpenSongDetail = async (songId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/songs/${songId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setActiveSong(data.song);
        setSongErrors(data.errors || []);
        setUpdatingSongStatus(data.song.status);
      } else {
        showNotification('Error loading song details.', 'error');
      }
    } catch (err) {
      showNotification('Network error loading song detail.', 'error');
    }
  };

  // Action: Approve error
  const handleApproveError = async (errorId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/errors/${errorId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Error report approved.');
        // Update local arrays
        setSongErrors(prev => prev.map(err => err._id === errorId ? { ...err, status: 'approved' } : err));
        setRecentErrors(prev => prev.map(err => err._id === errorId ? { ...err, status: 'approved' } : err));
        fetchDashboardData();
        // Re-fetch song details to update the slide text on-screen
        if (activeSong) {
          handleOpenSongDetail(activeSong.id);
        }
      } else {
        showNotification(data.message, 'error');
      }
    } catch (err) {
      showNotification('Network error.', 'error');
    }
  };

  // Action: Reject error
  const handleRejectError = async (errorId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/errors/${errorId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showNotification('Error report rejected.');
        // Update local arrays
        setSongErrors(prev => prev.map(err => err._id === errorId ? { ...err, status: 'rejected' } : err));
        setRecentErrors(prev => prev.map(err => err._id === errorId ? { ...err, status: 'rejected' } : err));
        fetchDashboardData();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (err) {
      showNotification('Network error.', 'error');
    }
  };

  // Action: Update song status
  const handleUpdateSongStatus = async (newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/songs/${activeSong.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification(`Song status updated to ${newStatus}`);
        setUpdatingSongStatus(newStatus);
        setActiveSong(prev => ({ ...prev, status: newStatus }));
        fetchSongs(songPagination.page);
        fetchDashboardData();
      } else {
        showNotification(data.message, 'error');
      }
    } catch (err) {
      showNotification('Network error.', 'error');
    }
  };

  // Action: Export songs as JSON file
  const handleExportJSON = async (alphabet) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/export/${encodeURIComponent(alphabet)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${alphabet}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showNotification(`Successfully exported ${alphabet}.json`);
      } else {
        const data = await response.json();
        showNotification(data.message || 'Export failed', 'error');
      }
    } catch (err) {
      showNotification('Network error during export.', 'error');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  useEffect(() => {
    if (selectedTab === 'songs') {
      fetchSongs(1);
    } else {
      fetchErrors();
    }
  }, [selectedTab, selectedAlphabet, selectedStatus, errorStatusFilter, selectedChecker, searchQuery]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ text: msg, type });
    setTimeout(() => setNotification(null), 3000);
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {notification.type === 'error' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <span className="text-sm font-semibold">{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-light/60 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-gray-400 text-xs mt-1">Review corrections and manage song verification state</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export அ JSON Button */}
          <button
            onClick={() => handleExportJSON('அ')}
            className="bg-navy-medium hover:bg-gold-500/10 border border-navy-light hover:border-gold-500/20 text-gray-400 hover:text-gold-400 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export அ.json</span>
          </button>
          
          {/* Export ஆ JSON Button */}
          <button
            onClick={() => handleExportJSON('ஆ')}
            className="bg-navy-medium hover:bg-gold-500/10 border border-navy-light hover:border-gold-500/20 text-gray-400 hover:text-gold-400 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export ஆ.json</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="bg-navy-medium hover:bg-navy-light text-gray-400 hover:text-white p-2.5 rounded-xl border border-navy-light transition-all duration-200 active:scale-95 flex items-center justify-center shadow-lg"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={onLogout}
            className="bg-navy-medium hover:bg-red-500/10 border border-navy-light hover:border-red-500/20 text-gray-400 hover:text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1.5"
          >
            <span>Sign Out</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Counters Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-navy-medium border border-navy-light/50 p-5 rounded-2xl relative overflow-hidden group">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Database Songs</span>
              <div className="text-3xl font-bold text-white mt-1 font-mono">{stats.totalSongs}</div>
              <div className="absolute right-4 bottom-4 text-gray-800 font-bold text-4xl select-none group-hover:scale-105 transition-transform duration-300">Σ</div>
            </div>

            <div className="bg-navy-medium border border-sky-500/15 p-5 rounded-2xl relative overflow-hidden group">
              <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Pending Review</span>
              <div className="text-3xl font-bold text-sky-400 mt-1 font-mono">{stats.pendingReviews}</div>
              <div className="absolute right-4 bottom-4 text-sky-500/5 font-bold text-4xl select-none group-hover:scale-105 transition-transform duration-300">⏱</div>
            </div>

            <div className="bg-navy-medium border border-purple-500/15 p-5 rounded-2xl relative overflow-hidden group">
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Corrected Songs</span>
              <div className="text-3xl font-bold text-purple-400 mt-1 font-mono">{stats.correctedSongs}</div>
              <div className="absolute right-4 bottom-4 text-purple-500/5 font-bold text-4xl select-none group-hover:scale-105 transition-transform duration-300">✍</div>
            </div>

            <div className="bg-navy-medium border border-emerald-500/15 p-5 rounded-2xl relative overflow-hidden group">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Approved & Verified</span>
              <div className="text-3xl font-bold text-emerald-400 mt-1 font-mono">{stats.approvedSongs}</div>
              <div className="absolute right-4 bottom-4 text-emerald-500/5 font-bold text-4xl select-none group-hover:scale-105 transition-transform duration-300">✓</div>
            </div>
          </div>

          <div className="bg-navy-medium border border-navy-light/50 p-5 rounded-2xl space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Database Songs</span>
                  <div className="text-2xl font-bold text-white font-mono mt-0.5">{stats.totalSongs}</div>
                </div>
                <div className="h-8 w-px bg-navy-light/60 hidden sm:block"></div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Total Checked & Corrected</span>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
                    {stats.correctedSongs + stats.pendingReviews + stats.approvedSongs}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-400">Overall Verification Progress</span>
                <span className="text-sm font-bold text-white bg-gold-500/10 px-2.5 py-1 rounded-lg border border-gold-500/20 font-mono">
                  {stats.totalSongs ? Math.round(((stats.correctedSongs + stats.pendingReviews + stats.approvedSongs) / stats.totalSongs) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="h-2 w-full bg-navy-dark rounded-full overflow-hidden border border-navy-light/30">
              <div 
                className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stats.totalSongs ? Math.round(((stats.correctedSongs + stats.pendingReviews + stats.approvedSongs) / stats.totalSongs) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-navy-light/60">
        <button
          onClick={() => setSelectedTab('songs')}
          className={`px-5 py-3.5 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${
            selectedTab === 'songs' 
              ? 'border-gold-500 text-gold-400' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Song Review Console
        </button>
        <button
          onClick={() => setSelectedTab('errors')}
          className={`px-5 py-3.5 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${
            selectedTab === 'errors' 
              ? 'border-gold-500 text-gold-400' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Global Error Reports
        </button>
      </div>

      {/* Tab: Song Review Console */}
      {selectedTab === 'songs' && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-navy-medium p-4 rounded-2xl border border-navy-light/60 items-end">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Tamil Alphabet</label>
              <select
                value={selectedAlphabet}
                onChange={(e) => setSelectedAlphabet(e.target.value)}
                className="w-full bg-navy-dark border border-navy-light rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-500"
              >
                {ALPHABETS.map(char => (
                  <option key={char} value={char}>{char === 'All' ? 'All Letters' : char}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Song Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-navy-dark border border-navy-light rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-500"
              >
                <option value="">All Songs</option>
                <option value="pending">Pending Review</option>
                <option value="in_review">In Review</option>
                <option value="corrected">Corrected</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Songs</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, Tamil title, Tanglish..."
                className="w-full bg-navy-dark border border-navy-light rounded-xl px-3.5 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 text-xs"
              />
            </div>
          </div>

          {/* Songs Grid list */}
          {songs.length === 0 ? (
            <div className="text-center py-16 bg-navy-medium/20 rounded-2xl border border-dashed border-navy-light/40 text-gray-500">
              No matching songs found under these filter terms.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {songs.map(song => (
                <div
                  key={song.id}
                  className="bg-navy-medium border border-navy-light/50 rounded-2xl p-5 flex flex-col justify-between hover-glow space-y-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gold-400 font-semibold bg-gold-500/5 px-2 py-0.5 rounded border border-gold-500/10">
                        ID {song.id}
                      </span>
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                        song.status === 'in_review' ? 'bg-sky-500/10 text-sky-400 border-sky-500/25' :
                        song.status === 'corrected' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                        song.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/25'
                      }`}>
                        {song.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm truncate">{song.title}</h4>
                      <p className="text-gray-400 text-xs truncate mt-0.5">{song.tanglishTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-navy-light/35">
                    <span className="text-[10px] text-gray-500">
                      {song.reviewedBy ? `By: ${song.reviewedBy}` : 'Unreviewed'}
                    </span>
                    <button
                      onClick={() => handleOpenSongDetail(song.id)}
                      className="bg-navy-light hover:bg-gold-500 hover:text-navy-darkest text-gray-300 font-semibold px-3 py-1.5 rounded-lg border border-navy-light hover:border-gold-400 transition-all text-[11px] active:scale-95"
                    >
                      View Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination controls */}
          {songPagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-navy-light/40 pt-4">
              <button
                onClick={() => fetchSongs(songPagination.page - 1)}
                disabled={songPagination.page === 1}
                className="text-xs font-semibold text-gray-400 hover:text-white disabled:text-gray-700 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {songPagination.page} of {songPagination.pages}
              </span>
              <button
                onClick={() => fetchSongs(songPagination.page + 1)}
                disabled={songPagination.page === songPagination.pages}
                className="text-xs font-semibold text-gray-400 hover:text-white disabled:text-gray-700 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Global Error Reports */}
      {selectedTab === 'errors' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-navy-medium p-4 rounded-2xl border border-navy-light/60 items-end">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Error Status</label>
              <select
                value={errorStatusFilter}
                onChange={(e) => setErrorStatusFilter(e.target.value)}
                className="w-full bg-navy-dark border border-navy-light rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-500"
              >
                <option value="">All Reports</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter By Checker</label>
              <select
                value={selectedChecker}
                onChange={(e) => setSelectedChecker(e.target.value)}
                className="w-full bg-navy-dark border border-navy-light rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-500"
              >
                <option value="">All Checkers</option>
                {checkers.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="bg-navy-darkest px-4 py-2 text-right rounded-xl border border-navy-light/40 text-xs">
              <span className="text-gray-400 mr-2">Reported Items:</span>
              <span className="text-gold-400 font-bold font-mono">{recentErrors.length}</span>
            </div>
          </div>

          {/* List of Error Reports */}
          {recentErrors.length === 0 ? (
            <div className="text-center py-16 bg-navy-medium/20 rounded-2xl border border-dashed border-navy-light/40 text-gray-500">
              No reported errors found matching these criteria.
            </div>
          ) : (
            <div className="bg-navy-medium border border-navy-light/40 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-navy-dark text-gray-400 uppercase tracking-wider font-semibold border-b border-navy-light/60">
                      <th className="py-3 px-4">Song Details</th>
                      <th className="py-3 px-4">Slide</th>
                      <th className="py-3 px-4">Language</th>
                      <th className="py-3 px-4">Pinpoint Error Details</th>
                      <th className="py-3 px-4">Mistake Type / Checker</th>
                      <th className="py-3 px-4 text-center">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-light/30">
                    {recentErrors.map(err => (
                      <tr key={err._id} className="hover:bg-navy-light/10 text-gray-200">
                        <td className="py-3.5 px-4 max-w-[160px] truncate">
                          <span className="block font-semibold text-white truncate">{err.songTitle}</span>
                          <span className="text-[10px] text-gray-500 font-mono">ID {err.songId}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">Slide {err.slideIndex + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            err.language === 'Tamil' 
                              ? 'bg-red-500/10 text-red-400 border-red-500/15' 
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/15'
                          }`}>
                            {err.language}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-red-400 line-through truncate max-w-[110px]">{err.originalText}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-emerald-400 font-semibold truncate max-w-[110px]">
                              {err.suggestedCorrection || '(delete)'}
                            </span>
                          </div>
                          {err.comment && <p className="text-[10px] text-gray-500 italic mt-0.5">"{err.comment}"</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="block text-[10px] text-gray-400">{err.mistakeType}</span>
                          <span className="text-[10px] text-gray-500">Checked by: <span className="text-gray-300 font-semibold">{err.checkedBy}</span></span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {err.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleApproveError(err._id)}
                                  className="bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-navy-darkest border border-emerald-500/25 px-2.5 py-1 rounded font-bold transition-all text-[10px] active:scale-95"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectError(err._id)}
                                  className="bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-navy-darkest border border-red-500/25 px-2.5 py-1 rounded font-bold transition-all text-[10px] active:scale-95"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded border ${
                                err.status === 'approved' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {err.status}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Song Review Details Modal */}
      {activeSong && (
        <div className="fixed inset-0 bg-navy-darkest/95 flex items-center justify-center p-4 z-40 overflow-y-auto animate-fade-in">
          <div className="bg-navy-medium border border-navy-light max-w-4xl w-full rounded-2xl shadow-2xl p-6 relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto md:overflow-visible">
            {/* Modal close icon */}
            <button
              onClick={() => setActiveSong(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 hover:bg-navy-light rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left Side: Song slides */}
            <div className="flex-1 space-y-4 md:max-h-[75vh] md:overflow-y-auto pr-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">Reviewing Song</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{activeSong.title}</h3>
                <p className="text-gray-400 text-xs">{activeSong.tanglishTitle} (ID: {activeSong.id})</p>
              </div>

              <div className="space-y-4 pt-2">
                {activeSong.slides.map((slide, sIdx) => (
                  <div key={sIdx} className="bg-navy-dark border border-navy-light/60 p-4 rounded-xl space-y-3">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">Slide {sIdx + 1}</span>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-white leading-relaxed whitespace-pre-line">
                        {slide.ta}
                      </div>
                      <div className="text-xs text-gray-300 font-mono leading-relaxed pt-1.5 border-t border-navy-light/20 whitespace-pre-line">
                        {slide.tg}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Verification Controller */}
            <div className="w-full md:w-[320px] bg-navy-dark border border-navy-light/70 p-4 rounded-xl flex flex-col justify-between gap-4 md:max-h-[75vh]">
              <div className="space-y-4 overflow-y-auto pr-1">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider border-b border-navy-light/30 pb-2">
                  Reported Corrections ({songErrors.length})
                </h4>

                {songErrors.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-600">
                    No errors reported by checker.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {songErrors.map(err => (
                      <div key={err._id} className="bg-navy-medium border border-navy-light/40 p-3 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>Slide {err.slideIndex + 1} ({err.language})</span>
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            err.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                            err.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                          }`}>
                            {err.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-red-400 line-through">{err.originalText}</span>
                          <span>→</span>
                          <span className="text-emerald-400 font-semibold">{err.suggestedCorrection || '(delete)'}</span>
                        </div>

                        <p className="text-[10px] text-gray-500">{err.mistakeType}</p>
                        {err.comment && <p className="text-[9px] text-gray-500 italic">"{err.comment}"</p>}

                        {err.status === 'pending' && (
                          <div className="flex gap-2 pt-1 border-t border-navy-light/20">
                            <button
                              onClick={() => handleApproveError(err._id)}
                              className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-navy-darkest px-2 py-0.5 rounded text-[10px] transition-colors flex-1 text-center font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectError(err._id)}
                              className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-navy-darkest px-2 py-0.5 rounded text-[10px] transition-colors flex-1 text-center font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Set Song Status Controls */}
              <div className="border-t border-navy-light/30 pt-4 space-y-3 shrink-0">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Set Overall Song Status</label>
                  <select
                    value={updatingSongStatus}
                    onChange={(e) => handleUpdateSongStatus(e.target.value)}
                    className="w-full bg-navy-medium border border-navy-light rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-gold-500 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_review">In Review</option>
                    <option value="corrected">Corrected</option>
                    <option value="approved">Approved & Verified</option>
                  </select>
                </div>

                <button
                  onClick={() => setActiveSong(null)}
                  className="w-full bg-navy-light hover:bg-navy-light/70 text-gray-300 font-semibold py-2.5 rounded-lg text-xs transition-colors active:scale-95"
                >
                  Close Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
