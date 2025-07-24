import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, collectionGroup, getDocs } from "firebase/firestore";
import { format } from "date-fns";

export default function OfficeIPConfig() {
  const [ipList, setIpList] = useState<string[]>([]);
  const [newIP, setNewIP] = useState("");
  const [message, setMessage] = useState("");
  // Add state for device logs
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchName, setSearchName] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  const loadAllowedIPs = async () => {
    const docRef = doc(db, "officeNetwork", "allowedIPs");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setIpList(snap.data().ips || []);
    }
  };

  const saveIPs = async () => {
    const docRef = doc(db, "officeNetwork", "allowedIPs");
    await setDoc(docRef, { ips: ipList }, { merge: true });
    setMessage("✅ IP list updated.");
    setTimeout(() => setMessage(""), 3000);
  };

  const addIP = () => {
    if (newIP && !ipList.includes(newIP)) {
      setIpList([...ipList, newIP]);
      setNewIP("");
    }
  };

  const removeIP = (ip: string) => {
    setIpList(ipList.filter((item) => item !== ip));
  };

  useEffect(() => {
    loadAllowedIPs();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoadingLogs(true);
      setErrorLogs(null);
      try {
        const snapshot = await getDocs(collectionGroup(db, "entries"));
        const allLogs: any[] = [];
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
        const sorted = allLogs.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
        setLogs(sorted);
        setFilteredLogs(sorted);
        setLoadingLogs(false);
      } catch (err: any) {
        setErrorLogs("Failed to fetch logs. " + (err?.message || ""));
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;
    if (selectedDate) {
      filtered = filtered.filter((log: any) => log.loginTime.startsWith(selectedDate));
    }
    if (searchName) {
      filtered = filtered.filter((log: any) => log.email.toLowerCase().includes(searchName.toLowerCase()));
    }
    setFilteredLogs(filtered);
  }, [selectedDate, searchName, logs]);

  return (
    <div className="max-w-xl mx-auto py-10 px-4 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-400 animate-fade-in-down">
        🛡️ Configure Office IPs
      </h2>

      {message && (
        <div className="text-green-600 dark:text-green-400 text-center mb-4 animate-fade-in">
          {message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-slide-up">
        <input
          value={newIP}
          onChange={(e) => setNewIP(e.target.value)}
          placeholder="Enter IP (e.g. 192.168.1.100)"
          className="flex-1 border border-gray-300 dark:border-gray-600 p-2 rounded shadow-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addIP}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition duration-200 shadow-md"
        >
          ➕ Add
        </button>
      </div>

      <ul className="space-y-3 mb-6 animate-fade-in">
        {ipList.map((ip, index) => (
          <li
            key={index}
            className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-3 rounded shadow-sm transition transform hover:scale-[1.01]"
          >
            <span className="break-words">{ip}</span>
            <button
              onClick={() => removeIP(ip)}
              className="text-red-600 hover:text-red-700 font-semibold transition"
            >
              ❌ Remove
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={saveIPs}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold transition duration-200 shadow-lg animate-slide-up"
      >
        💾 Save to Firebase
      </button>

      <div className="mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
              🔍 Device Login Logs
              <span className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">{filteredLogs.length} logs</span>
            </h2>
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
          <div className="overflow-auto rounded-lg shadow-inner max-h-[60vh] border dark:border-gray-600">
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
                  const isOfficeIP = ipList.includes(log.ipAddress);
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
            {filteredLogs.length === 0 && !loadingLogs && !errorLogs && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No login logs found for the selected filter.
              </div>
            )}
            {loadingLogs && (
              <div className="p-4 text-center text-blue-600 font-semibold animate-pulse">Loading logs...</div>
            )}
            {errorLogs && (
              <div className="p-4 text-center text-red-600 font-semibold">{errorLogs}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
