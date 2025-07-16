import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
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

const AdminAttendanceCalendar = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("calendar");
  const [activeUsers, setActiveUsers] = useState([]);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [wfhUsers, setWfhUsers] = useState([]);
  const [officeUsers, setOfficeUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchName, setSearchName] = useState("");
  const [noAssignmentUsers, setNoAssignmentUsers] = useState([]);

  useEffect(() => {
    const fetchUserStatuses = async () => {
      const activeSnapshot = await getDocs(collection(db, "activeUsers"));
      const allActive = activeSnapshot.docs.map((doc) => doc.data());
      const activeUIDs = allActive.map((u) => u.uid);

      const employeeSnapshot = await getDocs(collection(db, "employees"));
      const allEmployees = employeeSnapshot.docs.map((doc) => doc.data());

      const offline = allEmployees.filter(
        (emp) => !activeUIDs.includes(emp.id)
      );

      setActiveUsers(allActive);
      setOfflineUsers(offline);
    };

    fetchUserStatuses();
  }, []);

  const fetchWFHAssignments = async () => {
    const todayStr = selectedDate.toISOString().split("T")[0];
    const employeeSnapshot = await getDocs(collection(db, "employees"));
    const allEmployees = employeeSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    const wfhList = [];
    const officeList = [];
    const noAssignmentList = [];

    await Promise.all(
      allEmployees.map(async (emp) => {
        try {
          const assignmentRef = doc(
            db,
            "geoAssignments",
            emp.id,
            "dates",
            todayStr
          );
          const assignmentSnap = await getDoc(assignmentRef);

          if (assignmentSnap.exists()) {
            const data = assignmentSnap.data();
            const isWFH =
              data.workFromHome === true || data.workFromHome === "true";
            const isOffice =
              data.workFromHome === false || data.workFromHome === "false";

            if (isWFH) wfhList.push(emp);
            else if (isOffice) officeList.push(emp);
            else noAssignmentList.push(emp);
          } else {
            noAssignmentList.push(emp);
          }
        } catch (err) {
          console.error(`Error fetching geoAssignment for ${emp.name}:`, err);
          noAssignmentList.push(emp);
        }
      })
    );

    setWfhUsers(wfhList);
    setOfficeUsers(officeList);
    setNoAssignmentUsers(noAssignmentList);
  };

  useEffect(() => {
    fetchWFHAssignments();
  }, [selectedDate]);

  useEffect(() => {
    const fetchAllAttendanceSummaries = async () => {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "attendanceSummary"));
      const allEvents = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = data.userId;
        const {
          name,
          email,
          department,
          dailyHours = {},
          countedDates = [],
        } = data;

        countedDates.forEach((date) => {
          const hours = dailyHours[date] || "0h 0m 0s";
          const hoursNum = parseFloat(hours.split("h")[0]) || 0;
          const status = hoursNum >= 4.5 ? "Present" : "Leave";

          allEvents.push({
            id: `${userId}_${date}`,
            title: name,
            start: date,
            allDay: true,
            extendedProps: { date, hours, status, name, email, department },
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
      (ev?.extendedProps?.name ?? "")
        .toLowerCase()
        .includes((search ?? "").toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [search, events]);

  const handleEventClick = (info) => {
    setSelectedEvent(info.event.toPlainObject());
  };

  const getStatusColor = (status) => {
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Filters and View Switcher */}

      {/* Date Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-white">
            Date:
          </label>
          <input
            type="date"
            value={selectedDate.toISOString().split("T")[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="p-2 rounded border text-sm dark:bg-gray-900 dark:text-white"
          />
        </div>
        <input
          type="text"
          placeholder="Search by name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="p-2 border rounded-md text-sm w-full md:w-64 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Status Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Active Users",
            users: activeUsers,
            bg: "bg-green-500",
          },
          {
            title: "Offline Users",
            users: offlineUsers,
            bg: "bg-red-500",
          },
          {
            title: "Work From Home",
            users: wfhUsers,
            bg: "bg-blue-500",
          },
          {
            title: "Office Work",
            users: officeUsers,
            bg: "bg-purple-500",
          },
          {
            title: "No Assignment",
            users: noAssignmentUsers.filter((u) =>
              (u.name ?? "")
                .toLowerCase()
                .includes((searchName ?? "").toLowerCase())
            ),
            bg: "bg-yellow-500",
          },
        ].map(({ title, users, bg }, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          >
            <h2 className="text-lg font-semibold mb-2">
              {title} ({users.length})
            </h2>
            <div className="max-h-[260px] overflow-y-auto space-y-2">
              {users.map((user) => (
                <div
                  key={user.id || user.uid}
                  className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-md"
                >
                  <div className={`w-2.5 h-2.5 ${bg} rounded-full`} />
                  <div className="text-sm">
                    <p className="font-medium text-gray-800 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {user.title}
                    </p>
                    {user.login && (
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        Login: {user.login}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sticky top-0 bg-white dark:bg-gray-900 z-10 py-3 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Attendance Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage employee attendance, status, and daily assignments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded-md text-sm w-full sm:w-64 dark:bg-gray-900 dark:text-white"
          />
          <button
            onClick={() => setViewMode("calendar")}
            className={`p-2 rounded-md shadow-sm transition-all ${
              viewMode === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 dark:text-white"
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md shadow-sm transition-all ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 dark:text-white"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar or List View */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : viewMode === "calendar" ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={filteredEvents}
            eventClick={handleEventClick}
            height="auto"
            contentHeight="auto"
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
                <Users className="h-4 w-4 mr-1" />{" "}
                {selectedEvent.extendedProps.name}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Date
              </h3>
              <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                <CalendarIcon className="h-4 w-4 mr-1" />{" "}
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
                <Clock className="h-4 w-4 mr-1" />{" "}
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
