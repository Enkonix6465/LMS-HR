import React, { useEffect, useState } from "react";
import {
  collectionGroup,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";

interface LogEntry {
  email: string;
  ipAddress: string;
  deviceType: string;
  os: string;
  browser: string;
  screenSize: string;
  loginTime: string;
  userId: string;
}

// --- AI Device Logs Panel ---
function AIDeviceLogsPanel({ logs, allowedIPs }: { logs: LogEntry[]; allowedIPs: string[] }) {
  // Security alerts: logins from non-office IPs
  const nonOffice = React.useMemo(() => logs.filter(log => !allowedIPs.includes(log.ipAddress)), [logs, allowedIPs]);

  // Anomaly detection: multiple logins from same IP for different users
  const ipUserMap = React.useMemo(() => {
    const map: Record<string, Set<string>> = {};
    logs.forEach(log => {
      if (!map[log.ipAddress]) map[log.ipAddress] = new Set();
      map[log.ipAddress].add(log.email);
    });
    return Object.entries(map).filter(([ip, users]) => users.size > 1);
  }, [logs]);

  // Trend: most common login time (hour)
  const hourTrend = React.useMemo(() => {
    const hours: Record<number, number> = {};
    logs.forEach(log => {
      const d = new Date(log.loginTime);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        hours[h] = (hours[h] || 0) + 1;
      }
    });
    const max = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    return max ? `${max[0]}:00 (${max[1]} logins)` : null;
  }, [logs]);

  return (
    <div className="mb-6 bg-gradient-to-br from-red-50 via-blue-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-4">
      <h3 className="font-bold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2"><span>🤖</span>AI Device Log Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-xs flex items-center gap-1">🚨 Security Alerts</h4>
          {nonOffice.length === 0 ? <div className="text-xs text-gray-400">No non-office logins</div> : (
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {nonOffice.slice(0, 3).map((log, i) => <li key={i}>{log.email} from {log.ipAddress}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1 text-xs flex items-center gap-1">⚠️ Anomalies</h4>
          {ipUserMap.length === 0 ? <div className="text-xs text-gray-400">No IP/user anomalies</div> : (
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {ipUserMap.slice(0, 3).map(([ip, users], i) => <li key={i}>IP {ip} used by {Array.from(users).join(", ")}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-xs flex items-center gap-1">📈 Login Trend</h4>
          {hourTrend ? <div className="text-xs text-gray-700 dark:text-gray-200">Most logins at {hourTrend}</div> : <div className="text-xs text-gray-400">No trend</div>}
        </div>
      </div>
    </div>
  );
}

export default function ViewLoginLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchName, setSearchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowedIPs, setAllowedIPs] = useState<string[]>([]);

  useEffect(() => {
    const fetchAllowedIPs = async () => {
      const docRef = doc(db, "officeNetwork", "allowedIPs");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setAllowedIPs(snap.data().ips || []);
      }
    };
    fetchAllowedIPs();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collectionGroup(db, "entries"));
        const allLogs: LogEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userId = docSnap.ref.parent.parent?.id || "unknown";
          let loginTime = data.loginTime;
          if (loginTime && typeof loginTime === "object" && loginTime.seconds) {
            loginTime = new Date(loginTime.seconds * 1000).toISOString();
          }
          if (loginTime && typeof loginTime === "string") {
            allLogs.push({
              email: data.email,
              ipAddress: data.ipAddress,
              deviceType: data.deviceType,
              os: data.os,
              browser: data.browser,
              screenSize: data.screenSize,
              loginTime,
              userId,
            });
          }
        });
        const sorted = allLogs.sort(
          (a, b) =>
            new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime()
        );
        setLogs(sorted);
        setFilteredLogs(sorted);
        setLoading(false);
      } catch (err: any) {
        setError("Failed to fetch logs. " + (err?.message || ""));
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;
    if (selectedDate) {
      filtered = filtered.filter((log) =>
        log.loginTime.startsWith(selectedDate)
      );
    }
    if (searchName) {
      filtered = filtered.filter((log) =>
        log.email.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    setFilteredLogs(filtered);
  }, [selectedDate, searchName, logs]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <AIDeviceLogsPanel logs={filteredLogs} allowedIPs={allowedIPs} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2 sm:mb-0">
        Employee Login Logs
            <span className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">{filteredLogs.length} logs</span>
      </h1>
          <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded w-full sm:w-auto dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <input
          type="text"
          placeholder="Search by email"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
              className="p-2 border rounded w-full sm:w-auto dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>
        </div>
        <div className="overflow-auto rounded-lg shadow-inner max-h-[70vh] border dark:border-gray-600">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">IP</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Device</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">OS</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Browser</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Screen</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log, idx) => {
              let parsedDate: Date | null = null;
              try {
                parsedDate = new Date(log.loginTime);
              } catch {}
                const isOfficeIP = allowedIPs.includes(log.ipAddress);
              return (
                  <tr
                    key={idx}
                    className={`transition-all duration-150 hover:bg-blue-50 dark:hover:bg-gray-700 ${!isOfficeIP ? 'bg-red-50 dark:bg-red-900/30' : ''}`}
                  >
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100 font-medium">{log.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {log.ipAddress}
                      {!isOfficeIP && (
                        <span className="ml-1 bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                          <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>Non-Office IP
                        </span>
                      )}
                  </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">{log.deviceType}</span>
                  </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full text-xs font-semibold">{log.os}</span>
                  </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded-full text-xs font-semibold">{log.browser}</span>
                  </td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">{log.screenSize}</td>
                    <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">{parsedDate && !isNaN(parsedDate.getTime()) ? format(parsedDate, "dd/MM/yyyy hh:mm:ss a") : log.loginTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredLogs.length === 0 && !loading && !error && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No login logs found for the selected filter.
          </div>
        )}
          {loading && (
            <div className="p-4 text-center text-blue-600 font-semibold animate-pulse">Loading logs...</div>
          )}
          {error && (
            <div className="p-4 text-center text-red-600 font-semibold">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
