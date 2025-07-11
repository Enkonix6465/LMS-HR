import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { db } from "../lib/firebase";
import jsPDF from "jspdf";
import "jspdf-autotable";

// TYPES
interface Session {
  login: string;
  logout: string;
  loginLocation?: { address: string };
  logoutLocation?: { address: string };
}

interface AttendanceData {
  date: string;
  location: string;
  totalHours: string;
  sessions: Session[];
  userId: string;
}

interface WorkLog {
  date: string;
  login: string;
  logout: string;
  duration: string;
  location: string;
  loginAddress?: string;
  logoutAddress?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  title: string;
  phone: string;
  workLogs: WorkLog[];
}

interface MonthlySummary {
  userId: string;
  name: string;
  email: string;
  department: string;
  month: string;
  presentDays: number;
  halfDays: number;
  leavesTaken: number;
  extraLeaves: number;
  carryForwardLeaves: number;
  totalWorkingDays: number;
  workingDaysTillToday: number;
  totalmonthHours: string;
  absentDays: number;
}

export default function SearchAttendanceDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const employeeSnap = await getDocs(collection(db, "employees"));
      const employeeData = employeeSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const attendanceSnap = await getDocs(collection(db, "attendance"));

      const logs: Employee[] = [];

      for (const emp of employeeData) {
        const workLogs: WorkLog[] = [];

        attendanceSnap.docs.forEach((att) => {
          const data = att.data() as AttendanceData;

          if (data.userId === emp.id) {
            data.sessions.forEach((s, idx) => {
              workLogs.push({
                date: data.date,
                login: s.login,
                logout: s.logout,
                duration:
                  idx === data.sessions.length - 1 ? data.totalHours : "",
                location: data.location,
                loginAddress: s.loginLocation?.address ?? "-",
                logoutAddress: s.logoutLocation?.address ?? "-",
              });
            });
          }
        });

        logs.push({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          department: emp.department,
          title: emp.title,
          phone: emp.phone,
          workLogs,
        });
      }

      setEmployees(logs);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchSummaries = async () => {
      const summarySnap = await getDocs(collection(db, "attendanceSummary"));
      const data: MonthlySummary[] = [];

      summarySnap.forEach((doc) => {
        const s = doc.data();

        const countedLength = s.countedDates?.length || 0;

        data.push({
          userId: s.userId,
          name: s.name,
          email: s.email,
          department: s.department,
          month: s.month,
          presentDays: s.presentDays,
          halfDays: s.halfDays,
          leavesTaken: s.leavesTaken,
          extraLeaves: s.extraLeaves,
          totalWorkingDays: s.totalWorkingDays,
          workingDaysTillToday: countedLength,
          totalmonthHours: s.totalmonthHours,
          absentDays:
            countedLength - (s.presentDays + s.halfDays + s.leavesTaken),
          carryForwardLeaves: s.carryForwardLeaves || 0,
        });
      });

      setSummaries(data);
    };

    fetchSummaries();
  }, []);

  const getEmployeeSummaries = (userId: string) =>
    summaries.filter((s) => s.userId === userId);

  const getTotalDuration = (logs: WorkLog[]) => {
    let totalSeconds = 0;
    logs.forEach((log) => {
      if (log.duration) {
        const parts = log.duration.match(/(\d+)h\s(\d+)m\s(\d+)s/);
        if (parts) {
          totalSeconds +=
            parseInt(parts[1]) * 3600 +
            parseInt(parts[2]) * 60 +
            parseInt(parts[3]);
        }
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportCSV = () => {
    if (!selected) return;
    const headers = ["Date", "Login", "Logout", "Duration", "Location"];
    const rows = selected.workLogs.map((log) => [
      log.date,
      log.login,
      log.logout || "In Progress",
      log.duration,
      log.location,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selected.name}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (!selected) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${selected.name} - Attendance Report`, 14, 20);

    const rows = selected.workLogs.map((log) => [
      log.date,
      log.login,
      log.logout || "In Progress",
      log.duration,
      log.location,
    ]);

    (doc as any).autoTable({
      head: [["Date", "Login", "Logout", "Duration", "Location"]],
      body: rows,
      startY: 30,
    });

    doc.save(`${selected.name}_attendance.pdf`);
  };

  const getAttendanceList = (logs: WorkLog[]) => {
    const grouped: { [date: string]: WorkLog[] } = {};
    logs.forEach((log) => {
      if (!grouped[log.date]) grouped[log.date] = [];
      grouped[log.date].push(log);
    });

    return Object.entries(grouped).map(([date, logs]) => {
      return {
        date,
        totalHours: logs.find((l) => l.duration)?.duration || "0h 0m",
        sessions: logs.map((l) => ({
          login: l.login,
          logout: l.logout,
          loginLocation: {
            address: l.loginAddress || "-",
            lat: null,
            lng: null,
          },
          logoutLocation: {
            address: l.logoutAddress || "-",
            lat: null,
            lng: null,
          },
        })),
      };
    });
  };

  const allAttendanceList = selected
    ? getAttendanceList(selected.workLogs)
    : [];

  const attendanceList = selectedDate
    ? allAttendanceList.filter((entry) => entry.date === selectedDate)
    : [];

  return (
    <div className="p-4 sm:p-6 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-400 animate-fade-in">
        Employee Attendance & Leave Dashboard
      </h2>

      {!selected ? (
        <>
          <div className="w-full max-w-md mx-auto mb-6 animate-fade-in">
            <input
              type="text"
              placeholder="Search by employee name or ID..."
              className="w-full border border-gray-300 dark:border-gray-700 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-gray-800 dark:text-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded overflow-x-auto animate-slide-up">
            <table className="min-w-full table-auto text-sm border border-gray-300 dark:border-gray-700">
              <thead className="bg-blue-100 dark:bg-blue-900 text-gray-800 dark:text-gray-200 font-semibold">
                <tr>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Email</th>
                  <th className="px-4 py-2 border">Department</th>
                  <th className="px-4 py-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                  >
                    <td className="px-4 py-2 border">{emp.name}</td>
                    <td className="px-4 py-2 border">{emp.email}</td>
                    <td className="px-4 py-2 border">{emp.department}</td>
                    <td className="px-4 py-2 border">
                      <button
                        className="text-white bg-blue-600 hover:bg-blue-700 transition px-3 py-1 rounded shadow-sm text-xs sm:text-sm"
                        onClick={() => setSelected(emp)}
                      >
                        View Attendance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => setSelected(null)}
            className="mb-4 bg-gray-100 dark:bg-gray-800 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
          >
            ← Back to Employee List
          </button>

          <div className="max-w-6xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-center mb-2 text-blue-600 dark:text-blue-400 animate-fade-in-down">
              📅 Attendance History
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
              {selected?.name}
            </p>

            <div className="flex items-center justify-center flex-wrap gap-3 mb-6">
              <label className="text-gray-700 dark:text-gray-200 font-medium">
                Select Date:
              </label>
              <input
                type="date"
                className="border border-gray-300 dark:border-gray-700 px-3 py-2 rounded shadow-sm focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-800 dark:text-white"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
              {selectedDate && (
                <button
                  className="text-sm text-red-500 underline"
                  onClick={() => setSelectedDate("")}
                >
                  Clear
                </button>
              )}
            </div>

            {!selectedDate && (
              <p className="text-center text-red-500 mb-4 text-sm font-medium">
                Please select a date to view the attendance details.
              </p>
            )}

            <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-md rounded-md animate-slide-up">
              <table className="w-full text-sm text-left border border-gray-300 dark:border-gray-700 min-w-[800px]">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold">
                  <tr>
                    <th className="border px-4 py-2">#</th>
                    <th className="border px-4 py-2">Date</th>
                    <th className="border px-4 py-2">Total Hours</th>
                    <th className="border px-4 py-2">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceList.map((att, index) => {
                    const [h = 0] = att.totalHours
                      ?.split("h")
                      .map((v: any) => parseInt(v)) || [0];
                    const isUnderworked = h < 9;

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                      >
                        <td className="border px-4 py-2">{index + 1}</td>
                        <td className="border px-4 py-2">{att.date}</td>
                        <td
                          className={`border px-4 py-2 font-semibold ${
                            isUnderworked ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {att.totalHours}
                        </td>
                        <td className="border px-4 py-2">
                          <ul className="space-y-2">
                            {att.sessions.map((s, i) => (
                              <li
                                key={i}
                                className="pb-2 border-b border-dashed last:border-b-0 text-sm"
                              >
                                <div>
                                  <span className="text-green-600 font-semibold">
                                    🟢 Login:
                                  </span>{" "}
                                  {s.login || "—"}
                                </div>
                                <div className="ml-4 text-xs text-gray-600 dark:text-gray-300">
                                  📍 {s.loginLocation.address}
                                </div>

                                <div className="mt-1">
                                  <span className="text-red-600 font-semibold">
                                    🔴 Logout:
                                  </span>{" "}
                                  {s.logout || "⏳"}
                                </div>
                                <div className="ml-4 text-xs text-gray-600 dark:text-gray-300">
                                  📍 {s.logoutLocation.address}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-green-700 dark:text-green-400 animate-fade-in">
              📋 Monthly Attendance Summary
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full table-auto border text-sm text-center shadow bg-white dark:bg-gray-800 rounded-md min-w-[900px] animate-slide-up">
                <thead className="bg-green-100 dark:bg-green-900 text-black dark:text-gray-200 font-bold">
                  <tr>
                    <th className="border px-3 py-2">Month</th>
                    <th className="border px-3 py-2">Working Days</th>
                    <th className="border px-3 py-2 text-blue-600 dark:text-blue-300">
                      Working Days (Till Today)
                    </th>
                    <th className="border px-3 py-2">Present</th>
                    <th className="border px-3 py-2">Half</th>
                    <th className="border px-3 py-2">Absent</th>
                    <th className="border px-3 py-2">Leaves Taken</th>
                    <th className="border px-3 py-2 text-red-600">
                      Extra Leaves
                    </th>
                    <th className="border px-3 py-2 text-green-600">
                      Carry Forward
                    </th>
                    <th className="border px-3 py-2">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {getEmployeeSummaries(selected.id).map((row, idx) => {
                    const extraWorkLog = summaries.find(
                      (s) => s.userId === row.userId && s.month === row.month
                    ) as any;

                    const extraHours: Record<string, string> =
                      extraWorkLog?.extraWorkLog || {};

                    return (
                      <React.Fragment key={idx}>
                        <tr className="bg-white dark:bg-gray-900 font-semibold">
                          <td className="border px-3 py-2">{row.month}</td>
                          <td className="border px-3 py-2">
                            {row.totalWorkingDays}
                          </td>
                          <td className="border px-3 py-2">
                            {row.workingDaysTillToday}
                          </td>
                          <td className="border px-3 py-2">
                            {row.presentDays}
                          </td>
                          <td className="border px-3 py-2">{row.halfDays}</td>
                          <td className="border px-3 py-2">{row.absentDays}</td>
                          <td className="border px-3 py-2">
                            {row.leavesTaken}
                          </td>
                          <td className="border px-3 py-2 text-red-600">
                            {row.extraLeaves}
                          </td>
                          <td className="border px-3 py-2 text-green-600">
                            {row.carryForwardLeaves}
                          </td>
                          <td className="border px-3 py-2">
                            {row.totalmonthHours}
                          </td>
                        </tr>
                        {Object.entries(extraHours).length > 0 && (
                          <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                            <td
                              colSpan={10}
                              className="border px-3 py-2 text-left"
                            >
                              <span className="font-semibold text-green-700 dark:text-green-300">
                                🕒 Extra Hours Worked:
                              </span>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {Object.entries(extraHours).map(
                                  ([date, duration]) => (
                                    <li key={date}>
                                      {date}:{" "}
                                      <span className="font-medium">
                                        {duration}
                                      </span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
