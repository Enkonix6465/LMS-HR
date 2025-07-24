import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface BugReport {
  id: string;
  date: string;
  title: string;
  description: string;
  status: string;
  submittedOn?: string;
}

// --- AI Bug/Complaint Panel ---
function AIBugComplaintPanel({ reports }: { reports: BugReport[] }) {
  // Sentiment: count negative words
  const negativeWords = ['not working', 'problem', 'angry', 'frustrated', 'issue', 'error'];
  const negativeCount = React.useMemo(() => reports.filter(r => negativeWords.some(w => r.description.toLowerCase().includes(w))).length, [reports]);
  // Auto-categorization: by status
  const pending = React.useMemo(() => reports.filter(r => r.status === 'pending'), [reports]);
  const resolved = React.useMemo(() => reports.filter(r => r.status === 'resolved'), [reports]);
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="mb-6 bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">🤖 AI Bug/Complaint Insights</h3>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-blue-600 dark:text-blue-300 underline">{expanded ? 'Hide' : 'Show'}</button>
      </div>
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-xs flex items-center gap-1">⚠️ Negative Sentiment</h4>
            <div className="text-xs text-gray-700 dark:text-gray-200">{negativeCount} report(s) with negative sentiment</div>
          </div>
          <div>
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1 text-xs flex items-center gap-1">🕒 Pending</h4>
            {pending.length === 0 ? <div className="text-xs text-gray-400">None</div> : (
              <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                {pending.map((r, i) => <li key={i}>{r.title}</li>)}
              </ul>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-300 mb-1 text-xs flex items-center gap-1">✅ Resolved</h4>
            {resolved.length === 0 ? <div className="text-xs text-gray-400">None</div> : (
              <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                {resolved.map((r, i) => <li key={i}>{r.title}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BugReportPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState<BugReport[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        const ref = collection(db, "bugReports");
        onSnapshot(ref, (snapshot) => {
          const list: BugReport[] = [];
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.userId === authUser.uid) {
              list.push({
                id: doc.id,
                date: data.date,
                title: data.title,
                description: data.description,
                status: data.status,
                submittedOn: data.submittedOn,
              });
            }
          });
          setReports(list);
        });
      }
    });
    return () => unsub();
  }, []);

  const getCurrentDateStr = () => new Date().toLocaleDateString("en-CA");

  const onSubmit = async () => {
    if (!user || !title || !description) return;
    const todayStr = getCurrentDateStr();
    const ref = doc(db, "bugReports", `${user.uid}_${Date.now()}`);
    await setDoc(ref, {
      userId: user.uid,
      date: todayStr,
      title,
      description,
      status: "pending",
      submittedOn: todayStr,
      timestamp: serverTimestamp(),
      userEmail: user.email, // Add user email for admin reference
    });
    setTitle("");
    setDescription("");
    alert("✅ Bug report submitted successfully!");
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto transition-all duration-300">
      <AIBugComplaintPanel reports={reports} />
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      >
        ← Back
      </button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-blue-800 dark:text-blue-300">
        🐞 Bug Report
      </h2>
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow p-4 mb-6">
        <label className="block font-medium mb-1 dark:text-gray-300">
          Title:
        </label>
        <input
          className="w-full border dark:border-gray-600 px-3 py-2 mb-4 rounded bg-white dark:bg-gray-700 dark:text-white"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter bug title"
        />
        <label className="block font-medium mb-1 dark:text-gray-300">
          Description:
        </label>
        <textarea
          className="w-full border dark:border-gray-600 px-3 py-2 mb-4 rounded bg-white dark:bg-gray-700 dark:text-white"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the bug in detail..."
        ></textarea>
        <button
          className="block w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-300"
          onClick={onSubmit}
        >
          Submit Bug Report
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded p-4 overflow-auto transition-all duration-300">
        <h3 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
          📋 Your Bug Reports
        </h3>
        <table className="w-full text-sm table-auto border dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="border px-3 py-2">Date</th>
              <th className="border px-3 py-2">Title</th>
              <th className="border px-3 py-2">Status</th>
              <th className="border px-3 py-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {reports
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="border px-3 py-2">{r.date}</td>
                  <td className="border px-3 py-2">{r.title}</td>
                  <td className="border px-3 py-2 capitalize">{r.status}</td>
                  <td className="border px-3 py-2">{r.description}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}