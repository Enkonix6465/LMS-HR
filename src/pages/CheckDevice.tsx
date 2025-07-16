import React, { useEffect, useState } from "react";
import {
  collectionGroup,
  getDocs,
  query,
  where,
  Timestamp,
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

export default function ViewLoginLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const snapshot = await getDocs(collectionGroup(db, "entries"));
      const allLogs: LogEntry[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = docSnap.ref.parent.parent?.id || "unknown";
        if (data.loginTime) {
          allLogs.push({
            email: data.email,
            ipAddress: data.ipAddress,
            deviceType: data.deviceType,
            os: data.os,
            browser: data.browser,
            screenSize: data.screenSize,
            loginTime: data.loginTime,
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
      <h1 className="text-2xl font-bold mb-4 dark:text-white">
        Employee Login Logs
      </h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 border rounded w-full sm:w-1/3 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <input
          type="text"
          placeholder="Search by email"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="p-2 border rounded w-full sm:w-1/3 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="overflow-auto rounded-lg shadow-md max-h-[70vh] border dark:border-gray-600">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                IP
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Device
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                OS
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Browser
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Screen
              </th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {log.email}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {log.ipAddress}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {log.deviceType}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {log.os}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {log.browser}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {log.screenSize}
                </td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {format(new Date(log.loginTime), "dd/MM/yyyy hh:mm:ss a")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No login logs found for the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
