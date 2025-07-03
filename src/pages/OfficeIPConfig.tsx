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
    <div className="max-w-xl mx-auto py-10 px-4">
      <h2 className="text-2xl font-bold mb-4 text-center">
        🛡️ Configure Office IPs
      </h2>

      {message && (
        <div className="text-green-600 text-center mb-2">{message}</div>
      )}

      <div className="flex gap-2 mb-4">
        <input
          value={newIP}
          onChange={(e) => setNewIP(e.target.value)}
          placeholder="Enter IP (e.g. 192.168.1.100)"
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={addIP}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ➕ Add
        </button>
      </div>

      <ul className="space-y-2 mb-4">
        {ipList.map((ip, index) => (
          <li
            key={index}
            className="flex justify-between items-center bg-gray-100 p-2 rounded"
          >
            <span>{ip}</span>
            <button
              onClick={() => removeIP(ip)}
              className="text-red-600 font-semibold"
            >
              ❌ Remove
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={saveIPs}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        💾 Save to Firebase
      </button>
    </div>
  );
}
