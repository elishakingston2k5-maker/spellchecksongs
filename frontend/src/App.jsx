import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AlphabetGrid from './components/AlphabetGrid';
import SongList from './components/SongList';
import ReviewLyrics from './components/ReviewLyrics';
import AdminDashboard from './components/AdminDashboard';
import './App.css';
import { API_BASE_URL } from './config';

// Portal Passcode Gate Component
function PasscodeGate({ onAccessGranted }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === '615483') {
      onAccessGranted();
    } else {
      setError('Incorrect passcode. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-darkest px-4 relative overflow-hidden">
      {/* Decorative gradient glowing circles */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gold-500 opacity-[0.03] rounded-full filter blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 hover-glow shadow-2xl relative z-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-gold-500/10 rounded-xl mb-4 border border-gold-500/20">
          <span className="text-gold-400 text-2xl font-bold tracking-wider">WF</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Enter Portal Passcode</h2>
        <p className="text-sm text-gray-400 mb-6">WorshipFlow Spelling Verification portal is password-protected.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter Site Passcode"
            className="w-full bg-navy-dark border border-navy-light rounded-xl px-4 py-3 text-center text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all text-sm font-mono tracking-widest"
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-darkest font-semibold py-3 px-4 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98]"
          >
            Access Website
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [siteAccessGranted, setSiteAccessGranted] = useState(
    sessionStorage.getItem('siteAccessGranted') === 'true'
  );
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  // Clear any legacy localStorage site access
  useEffect(() => {
    localStorage.removeItem('siteAccessGranted');
  }, []);

  // Checker State
  const [selectedAlphabet, setSelectedAlphabet] = useState('அ');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [songs, setSongs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);

  // Validate existing token on boot
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error('Token expired');
        return res.json();
      })
      .then(userData => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, [token]);

  // Load songs list (for checker)
  const fetchSongs = async (page = 1) => {
    if (!token || (user && user.role === 'admin')) return;

    setIsLoadingSongs(true);
    try {
      let url = `${API_BASE_URL}/api/songs?page=${page}&limit=12&alphabet=${selectedAlphabet}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setSongs(data.songs);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching songs list:', err);
    } finally {
      setIsLoadingSongs(false);
    }
  };

  useEffect(() => {
    fetchSongs(1);
  }, [selectedAlphabet, statusFilter, searchQuery, token, user]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setSelectedSongId(null);
  };

  const handleAccessGranted = () => {
    setSiteAccessGranted(true);
    sessionStorage.setItem('siteAccessGranted', 'true');
  };

  // Step 1: Check site access gate
  if (!siteAccessGranted) {
    return <PasscodeGate onAccessGranted={handleAccessGranted} />;
  }

  // Step 2: Check authentication
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-navy-darkest text-gray-100 flex flex-col font-sans">
      {/* Navbar header */}
      <header className="bg-navy-medium/60 border-b border-navy-light/50 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-navy-darkest tracking-wider">
              WF
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">WorshipFlow</h1>
              <p className="text-[10px] text-gray-400 font-medium">Lyric Verification</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-white">{user.username}</span>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5 ${
                user.role === 'admin' 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : 'bg-gold-500/10 text-gold-400 border-gold-500/20'
              }`}>
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-navy-light hover:bg-navy-light/80 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-navy-light text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1"
            >
              <span>Logout</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main app panel wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'admin' ? (
          <AdminDashboard token={token} onLogout={handleLogout} />
        ) : selectedSongId ? (
          <ReviewLyrics
            songId={selectedSongId}
            token={token}
            onBackToList={() => {
              setSelectedSongId(null);
              fetchSongs(pagination.page);
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-light/60 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-white">Song Verification Directory</h2>
                <p className="text-gray-400 text-xs mt-1">Select Tamil alphabet and review lyrics line-by-line</p>
              </div>
            </div>

            <AlphabetGrid
              selectedAlphabet={selectedAlphabet}
              onSelectAlphabet={(char) => {
                setSelectedAlphabet(char);
                setSearchQuery('');
                setStatusFilter('');
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              totalCount={pagination.total || 0}
              userRole={user.role}
            />

            <SongList
              songs={songs}
              selectedAlphabet={selectedAlphabet}
              pagination={pagination}
              onPageChange={fetchSongs}
              onReviewSong={setSelectedSongId}
              isLoading={isLoadingSongs}
            />
          </div>
        )}
      </main>
    </div>
  );
}
