import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  List,
  LayoutGrid,
} from "lucide-react";

interface AttendanceEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  extendedProps: {
    date: string;
    hours: string;
    status: string;
    name: string;
    email: string;
    department?: string;
  };
}

// --- AI Calendar Panel ---
function AICalendarPanel({ events }: { events: AttendanceEvent[] }) {
  // Smart event/holiday suggestions: suggest days with no events on Fridays/Mondays
  const suggestions = React.useMemo(() => {
    const eventDates = new Set(events.map(ev => ev.start));
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const days: string[] = [];
    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, month, d);
      if (date.getMonth() !== month) break;
      const iso = date.toISOString().slice(0, 10);
      if (!eventDates.has(iso) && (date.getDay() === 1 || date.getDay() === 5)) {
        days.push(iso);
      }
    }
    return days;
  }, [events]);

  // Conflict detection: overlapping events for same user on same day
  const conflicts = React.useMemo(() => {
    const byUserDate: Record<string, AttendanceEvent[]> = {};
    events.forEach(ev => {
      const key = ev.extendedProps.name + '_' + ev.start;
      if (!byUserDate[key]) byUserDate[key] = [];
      byUserDate[key].push(ev);
    });
    return Object.entries(byUserDate).filter(([_, arr]) => arr.length > 1);
  }, [events]);

  // AI leave optimization: suggest best day to take off (Friday/Monday with no event)
  const leaveSuggestion = suggestions.length > 0 ? suggestions[0] : null;

  return (
    <div className="mb-6 bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-4">
      <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2"><span>🤖</span>AI Calendar Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-green-700 dark:text-green-300 mb-1 text-xs flex items-center gap-1">✨ Smart Suggestions</h4>
          {suggestions.length === 0 ? <div className="text-xs text-gray-400">No suggestions</div> : (
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {suggestions.slice(0, 3).map((d, i) => <li key={i}>Consider adding an event/holiday on {d}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-xs flex items-center gap-1">⚠️ Conflicts</h4>
          {conflicts.length === 0 ? <div className="text-xs text-gray-400">No conflicts</div> : (
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {conflicts.slice(0, 3).map(([key, arr], i) => <li key={i}>{arr[0].extendedProps.name} has {arr.length} events on {arr[0].start}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-1 text-xs flex items-center gap-1">🗓️ Leave Optimization</h4>
          {leaveSuggestion ? <div className="text-xs text-gray-700 dark:text-gray-200">Best day to take off: {leaveSuggestion}</div> : <div className="text-xs text-gray-400">No optimal leave day found</div>}
        </div>
      </div>
    </div>
  );
}

// Add AttractiveCalendar component
function AttractiveCalendar({
  year,
  month,
  activeUsersByDate,
  events,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number;
  activeUsersByDate: Record<string, any[]>;
  events: AttendanceEvent[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const days: string[] = Array.from({ length: 31 }, (_, i) => {
    const d = new Date(Date.UTC(year, month, i + 1));
    return d.getUTCMonth() === month ? d.toISOString().slice(0, 10) : null;
  }).filter(Boolean) as string[];
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const weeks: any[] = [[]];
  for (let i = 0; i < firstDay; i++) weeks[0].push("");
  days.forEach((d: string) => {
    if (weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push("");
  const today = new Date().toISOString().slice(0, 10);
  // Map events by date for quick lookup
  const eventsByDate: Record<string, AttendanceEvent[]> = {};
  (events || []).forEach(ev => {
    if (!eventsByDate[ev.start]) eventsByDate[ev.start] = [];
    eventsByDate[ev.start].push(ev);
  });
  return (
    <div className="bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-2 sm:p-4 w-full max-w-6xl mx-auto overflow-x-auto">
      <div className="flex justify-between items-center mb-2">
        <button onClick={onPrevMonth} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600">Prev</button>
        <h2 className="text-lg font-bold text-blue-700 dark:text-blue-300">
          {format(new Date(year, month, 1), 'MMMM yyyy')}
        </h2>
        <button onClick={onNextMonth} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600">Next</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center mb-1">
        {"SMTWTFS".split("").map((d: string) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {weeks.map((week: any[], wi: number) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1 min-h-[90px] sm:min-h-[110px] md:min-h-[120px]">
          {week.map((date: any, di: number) => {
            if (!date) return <div key={di} />;
            const isToday = date === today;
            const bg = isToday ? "ring-2 ring-blue-500" : "bg-white dark:bg-gray-800";
            return (
              <div key={di} className={`relative group transition-all duration-200 rounded-lg shadow-sm p-1 h-20 sm:h-24 flex flex-col items-center justify-start ${bg} hover:scale-105`}>
                <span className="font-bold text-base md:text-lg lg:text-xl mb-1">{Number(String(date).slice(-2))}</span>
                {/* Active users avatars or count */}
                {activeUsersByDate[date] && activeUsersByDate[date].length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-1 mb-1">
                    {activeUsersByDate[date].slice(0, 3).map((user, idx) => (
                      <span key={idx} className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold shadow" title={user.name}>{user.name ? user.name.charAt(0) : '?'}</span>
                    ))}
                    {activeUsersByDate[date].length > 3 && (
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow">+{activeUsersByDate[date].length - 3}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 mb-1">No active</span>
                )}
                {/* Event icons */}
                <div className="flex flex-wrap gap-1 justify-center">
                  {eventsByDate[date] && eventsByDate[date].map((ev, idx) => {
                    let icon = '📌';
                    if (ev.extendedProps?.status === 'Present') icon = '🤝';
                    if (ev.extendedProps?.status === 'Leave') icon = '⏳';
                    return <span key={idx} title={ev.title} className="text-lg">{icon}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const AdminAttendanceCalendar = () => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchAllAttendanceSummaries = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(collection(db, "attendanceSummary"));
        const allEvents: AttendanceEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userId = data.userId;
          const name = data.name;
          const email = data.email;
          const department = data.department;
          const dailyHours = data.dailyHours || {};
          const countedDates: string[] = data.countedDates || [];
          countedDates.forEach((date) => {
            const hours = dailyHours[date] || "0h 0m 0s";
            const hoursNum = parseFloat(hours.split("h")[0]) || 0;
            const status = hoursNum >= 4.5 ? "Present" : "Leave";
            allEvents.push({
              id: `${userId}_${date}`,
              title: name,
              start: date,
              allDay: true,
              extendedProps: {
                date,
                hours,
                status,
                name,
                email,
                department,
              },
            });
          });
        });
        setEvents(allEvents);
        setLoading(false);
      } catch (err: any) {
        setError("Failed to fetch attendance data. " + (err?.message || ""));
        setLoading(false);
      }
    };
    fetchAllAttendanceSummaries();
  }, [calendarMonth, calendarYear]);

  // Efficient filtering with useMemo
  const filteredEvents = useMemo(() => {
    if (!search) return events;
    return events.filter((ev) =>
      ev.extendedProps.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, events]);

  // Map active users by date
  const activeUsersByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach(ev => {
      if (!ev.extendedProps || !ev.extendedProps.name || !ev.start) return;
      const date = format(new Date(ev.start), 'yyyy-MM-dd');
      if (!map[date]) map[date] = [];
      if (ev.extendedProps.status === 'Present') map[date].push(ev.extendedProps);
    });
    return map;
  }, [events]);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Admin Attendance Calendar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and filter attendance records of all employees
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded-md text-sm dark:bg-gray-900 dark:text-white"
            aria-label="Search employee"
          />
        </div>
      </div>
      {/* AI Calendar Panel */}
      <AICalendarPanel events={filteredEvents} />
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-red-600 font-semibold">
          {error}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No attendance events found.
        </div>
      ) : (
        <AttractiveCalendar
          year={calendarYear}
          month={calendarMonth}
          activeUsersByDate={activeUsersByDate}
          events={filteredEvents}
          onPrevMonth={() => setCalendarMonth(m => m === 0 ? 11 : m - 1)}
          onNextMonth={() => setCalendarMonth(m => m === 11 ? 0 : m + 1)}
        />
      )}
    </div>
  );
};

export default AdminAttendanceCalendar;
