import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
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

const AdminAttendanceCalendar = () => {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AttendanceEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  useEffect(() => {
    const fetchAllAttendanceSummaries = async () => {
      setLoading(true);
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
      setFilteredEvents(allEvents);
      setLoading(false);
    };

    fetchAllAttendanceSummaries();
  }, []);

  useEffect(() => {
    const filtered = events.filter((ev) =>
      ev.extendedProps.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [search, events]);

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.toPlainObject());
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "leave":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

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
          />
          <button
            onClick={() => setViewMode("calendar")}
            className={`p-2 rounded ${
              viewMode === "calendar"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 dark:text-white"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded ${
              viewMode === "list"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 dark:text-white"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {viewMode === "calendar" ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={filteredEvents}
                eventClick={handleEventClick}
                height="auto"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                eventDidMount={(info) => {
                  const status = info.event.extendedProps.status.toLowerCase();
                  info.el.style.backgroundColor =
                    status === "present" ? "rgb(34,197,94)" : "rgb(239,68,68)";
                  info.el.style.borderColor =
                    status === "present" ? "rgb(22,163,74)" : "rgb(220,38,38)";
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                      Hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {event.extendedProps.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {event.extendedProps.email}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {format(new Date(event.extendedProps.date), "PPP")}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            event.extendedProps.status
                          )}`}
                        >
                          {event.extendedProps.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {event.extendedProps.hours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedEvent && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Event Details
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Employee
              </h3>
              <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                <Users className="h-4 w-4 mr-1" />
                {selectedEvent.extendedProps.name}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Date
              </h3>
              <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {format(new Date(selectedEvent.extendedProps.date), "PPP")}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  selectedEvent.extendedProps.status
                )}`}
              >
                {selectedEvent.extendedProps.status.toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Hours
              </h3>
              <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                <Clock className="h-4 w-4 mr-1" />
                {selectedEvent.extendedProps.hours}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceCalendar;
