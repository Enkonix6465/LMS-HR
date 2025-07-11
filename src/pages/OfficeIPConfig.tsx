import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function OfficeIPConfig() {
  const [ipList, setIpList] = useState<string[]>([]);
  const [newIP, setNewIP] = useState("");
  const [message, setMessage] = useState("");

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
    </div>
  );
}
