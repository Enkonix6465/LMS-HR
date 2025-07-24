import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { UserCircle2, PartyPopper, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, string>; // userId -> option
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-indigo-500',
  'bg-red-500',
];
const EMOJIS = ['🔵','🟢','💗','💛','💜','🟣','🔴'];

// Helper to get initials from name
function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

const VotingPage: React.FC = () => {
  const { userData } = useAuthStore();
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [confetti, setConfetti] = useState<string | null>(null);
  // Admin: Delete all past polls
  const [deletingPast, setDeletingPast] = useState(false);

  // Fetch polls in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'polls'), (snap) => {
      const arr: Poll[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        arr.push({
          id: doc.id,
          question: d.question,
          options: d.options,
          votes: d.votes || {},
        });
      });
      setPolls(arr);
    });
    return () => unsub();
  }, []);

  // Admin: Create a new poll
  const handleCreatePoll = async () => {
    setError('');
    if (!newQuestion.trim() || newOptions.some(opt => !opt.trim())) {
      setError('Please enter a question and at least two options.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'polls'), {
        question: newQuestion.trim(),
        options: newOptions.map(opt => opt.trim()),
        votes: {},
        createdAt: new Date().toISOString(),
      });
      setNewQuestion('');
      setNewOptions(['', '']);
      setCreating(false);
    } catch (err) {
      setError('Failed to create poll.');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Delete a poll
  const handleDeletePoll = async (pollId: string) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return;
    setSubmitting(true);
    try {
      await (await import('firebase/firestore')).deleteDoc(doc(db, 'polls', pollId));
    } catch (err) {
      setError('Failed to delete poll.');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Delete all past polls
  const handleDeletePastPolls = async () => {
    if (!window.confirm('Are you sure you want to delete all past polls? This cannot be undone.')) return;
    setDeletingPast(true);
    try {
      const pollsRef = collection(db, 'polls');
      const snapshot = await getDocs(pollsRef);
      const today = new Date();
      const toDelete = snapshot.docs.filter(docSnap => {
        const data = docSnap.data();
        if (!data.createdAt) return false;
        const created = new Date(data.createdAt);
        // Only delete if createdAt is before today (ignore time)
        return created < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      });
      await Promise.all(toDelete.map(docSnap => deleteDoc(doc(db, 'polls', docSnap.id))));
    } catch (err) {
      setError('Failed to delete past polls.');
    } finally {
      setDeletingPast(false);
    }
  };

  // User: Vote on a poll
  const handleVote = async (pollId: string, option: string) => {
    if (!userData?.uid) return;
    setSubmitting(true);
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollSnap = await getDoc(pollRef);
      if (!pollSnap.exists()) return;
      const poll = pollSnap.data();
      const votes = poll.votes || {};
      votes[userData.uid] = option;
      await updateDoc(pollRef, { votes });
      setConfetti(pollId); // trigger confetti for this poll
      setTimeout(() => setConfetti(null), 1800);
    } catch (err) {
      setError('Failed to vote.');
    } finally {
      setSubmitting(false);
    }
  };

  // UI for creating a poll
  const renderCreatePoll = () => (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-10 max-w-xl mx-auto border border-blue-100 dark:border-gray-700 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-blue-700 dark:text-blue-300">Create Voting</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Question</label>
        <input
          type="text"
          className="w-full p-3 border rounded-lg mb-2 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400"
          value={newQuestion}
          onChange={e => setNewQuestion(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Options</label>
        {newOptions.map((opt, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 p-3 border rounded-lg dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400"
              value={opt}
              onChange={e => {
                const arr = [...newOptions];
                arr[i] = e.target.value;
                setNewOptions(arr);
              }}
            />
            {newOptions.length > 2 && (
              <button
                className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))}
                type="button"
              >Remove</button>
            )}
          </div>
        ))}
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={() => setNewOptions([...newOptions, ''])}
          type="button"
        >Add Option</button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="flex gap-2 mt-4">
        <button
          className="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition"
          onClick={handleCreatePoll}
          disabled={submitting}
        >{submitting ? 'Creating...' : 'Create Poll'}</button>
        <button
          className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          onClick={() => setCreating(false)}
          type="button"
        >Cancel</button>
      </div>
    </div>
  );

  // UI for voting and results
  const renderPoll = (poll: Poll) => {
    const userVote = poll.votes[userData?.uid || ''];
    const totalVotes = Object.keys(poll.votes).length;
    const optionCounts = poll.options.map(opt =>
      Object.values(poll.votes).filter(v => v === opt).length
    );
    const showResult = showResults[poll.id] || !!userVote;
    // Build avatars for each option
    const optionVoters: Record<string, { name: string }[]> = {};
    Object.entries(poll.votes).forEach(([uid, opt]) => {
      if (!optionVoters[opt]) optionVoters[opt] = [];
      optionVoters[opt].push({ name: uid });
    });
    return (
      <div key={poll.id} className="relative group bg-white/90 dark:bg-gray-900/90 rounded-2xl shadow-xl p-4 sm:p-8 mb-8 sm:mb-12 w-full border border-gray-200 dark:border-gray-700 backdrop-blur-md transition-transform duration-300 hover:scale-[1.03] hover:shadow-2xl animate-slide-in">
        {/* Confetti animation */}
        {confetti === poll.id && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fade-in">
            <span className="text-5xl sm:text-6xl animate-bounce">🎉</span>
            <span className="text-5xl sm:text-6xl animate-bounce delay-200">🎊</span>
            <span className="text-5xl sm:text-6xl animate-bounce delay-500">🥳</span>
          </div>
        )}
        {/* Delete button for all users */}
        <button
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 z-30 tooltip"
          onClick={() => handleDeletePoll(poll.id)}
          aria-label="Delete poll"
          disabled={submitting}
          title="Delete this poll"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <h3 className="text-lg sm:text-2xl font-extrabold mb-4 text-gray-900 dark:text-white flex items-center gap-2 drop-shadow">
          <UserCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
          {poll.question}
        </h3>
        <div className="mb-6 grid gap-3 sm:gap-4">
          {poll.options.map((opt, i) => {
            const isUserVote = userVote === opt;
            return (
              <button
                key={i}
                className={`w-full text-left px-4 sm:px-6 py-3 sm:py-4 rounded-xl border transition-all font-semibold text-base sm:text-lg flex items-center gap-3 shadow-sm relative overflow-hidden backdrop-blur-md
                  ${isUserVote ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 scale-[1.01]' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.01]'}`}
                disabled={!!userVote || submitting}
                onClick={() => handleVote(poll.id, opt)}
              >
                <span className="flex-1 text-gray-900 dark:text-white">{opt}</span>
                {isUserVote && <span className="ml-2 text-blue-600 font-bold animate-pulse flex items-center gap-1"><PartyPopper className="w-5 h-5" /> <span className="hidden xs:inline">Your Vote</span></span>}
              </button>
            );
          })}
        </div>
        {showResult && totalVotes > 0 && (
          <div className="mb-4 sm:mb-6">
            <h4 className="font-semibold mb-2 sm:mb-3 text-gray-900 dark:text-white">Who Voted?</h4>
            <div className="space-y-2">
              {poll.options.map((opt, i) => {
                return (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <span className="w-full sm:w-32 truncate text-gray-700 dark:text-gray-200">{opt}</span>
                    <span className="text-xs text-gray-400">{(optionVoters[opt] || []).length} votes</span>
                    <span className="text-base font-bold text-blue-700 dark:text-blue-300">{optionCounts[i]}</span>
                    <div className="flex-1 w-full sm:w-auto bg-gray-200 dark:bg-gray-700 rounded h-3 overflow-hidden ml-0 sm:ml-2">
                      <div
                        className="h-3 rounded transition-all duration-700 bg-blue-400"
                        style={{ width: (totalVotes > 0 ? (optionCounts[i] / totalVotes) * 100 : 0) + '%' }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!userVote && !showResult && (
          <button
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg mb-2 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setShowResults(r => ({ ...r, [poll.id]: true }))}
          >See Results</button>
        )}
        {userVote && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-full shadow-lg font-bold text-base sm:text-lg flex items-center gap-2 animate-fade-in z-10">
            <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6" /> Thank you for voting!
          </div>
        )}
      </div>
    );
  };

  // Always show Create Voting button
  const handleCreateVotingClick = () => {
    setCreating(true);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 font-sans overflow-x-hidden">
      {/* Creative background pattern */}
      <svg className="absolute left-0 top-0 w-full h-40 md:h-64 opacity-20 pointer-events-none select-none" viewBox="0 0 1440 320"><path fill="#3b82f6" fillOpacity="0.2" d="M0,160L60,170.7C120,181,240,203,360,197.3C480,192,600,160,720,133.3C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"></path></svg>
      <div className="sticky top-0 z-40 flex items-center mb-8 w-full max-w-2xl mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-b-2xl shadow-lg px-2 sm:px-4 py-3 gap-2 border-b border-gray-200 dark:border-gray-700 animate-fade-in">
        <button
          className="mr-2 sm:mr-4 px-2 sm:px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline">Back</span>
        </button>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-700 dark:text-blue-300 drop-shadow flex-1 text-center tracking-tight">🗳️ Voting & Polls</h1>
        <div className="hidden sm:flex gap-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow font-semibold hover:bg-blue-600 active:scale-95 transition flex items-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleCreateVotingClick}
          >Create Voting</button>
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-300 rounded-lg shadow font-semibold hover:bg-blue-50 dark:hover:bg-blue-900 active:scale-95 transition flex items-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={handleDeletePastPolls}
            disabled={deletingPast}
            title="Delete all polls created before today"
          >
            {deletingPast ? 'Deleting...' : 'Delete Past Polls'}
          </button>
        </div>
      </div>
      {/* Floating action button for mobile */}
      <button
        className="fixed bottom-6 right-6 z-50 sm:hidden bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 animate-fade-in"
        onClick={handleCreateVotingClick}
        aria-label="Create Voting"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      </button>
      {creating && renderCreatePoll()}
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 max-w-2xl mx-auto text-blue-700 dark:text-blue-300 tracking-tight px-2">Active Polls</h2>
      {polls.length === 0 && <div className="text-gray-500 text-center">No polls yet.</div>}
      <div className="space-y-10 w-full max-w-2xl mx-auto px-2 sm:px-0">
        {polls.map((poll, idx) => (
          <div key={poll.id} className="animate-slide-in">
            {renderPoll(poll)}
            {idx < polls.length - 1 && <div className="h-px bg-gray-200 dark:bg-gray-700 rounded-full my-6 opacity-80" />}
          </div>
        ))}
      </div>
      {/* Sticky bottom bar for actions on mobile */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 flex sm:hidden justify-center gap-4 py-2 px-2 animate-fade-in">
        <button
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-300 rounded-lg shadow font-semibold hover:bg-blue-50 dark:hover:bg-blue-900 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={handleDeletePastPolls}
          disabled={deletingPast}
        >
          {deletingPast ? 'Deleting...' : 'Delete Past Polls'}
        </button>
      </div>
    </div>
  );
};

export default VotingPage; 