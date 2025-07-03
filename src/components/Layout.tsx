import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Book,
  MessageSquareTextIcon,
  Bell,
  Landmark,
} from "lucide-react";
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";

function Layout() {
  const { signOut, user } = useAuthStore();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const isActive = (path: string) => location.pathname === path;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const newNotes: string[] = [];
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          newNotes.push(`${data.senderName || "Unknown"}: ${data.message}`);
          const sound = new Audio(
            "https://www.myinstants.com/media/sounds/bleep.mp3"
          );
          sound.play();
        }
      });
      setNotifications((prev) => [...newNotes, ...prev]);
    });
    return () => unsub();
  }, [user?.uid]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 shadow-lg"
      >
        {isSidebarOpen ? (
          <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`$${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
            ENKONIX
          </h1>
          <button onClick={toggleNotifications} className="relative">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            )}
          </button>
        </div>

        {showNotifications && (
          <div
            id="notification-box"
            className="bg-white dark:bg-gray-700 text-sm max-h-40 overflow-auto p-2 border-b border-gray-200 dark:border-gray-600"
          >
            {notifications.map((note, i) => (
              <div
                key={i}
                className="py-1 px-2 border-b last:border-none border-gray-100 dark:border-gray-600"
              >
                {note}
              </div>
            ))}
          </div>
        )}

        <nav className="p-4 space-y-1">
          {[
            { path: "/", icon: LayoutDashboard, label: "Dashboard" },
            { path: "/users", icon: Users, label: "Users" },
            {
              path: "/WorkLocationAssignment",
              icon: Landmark,
              label: "WorkLocation",
            },
            { path: "/SalaryForm", icon: Book, label: "Salary Form" },
            {
              path: "/GeneratePayslip",
              icon: CheckSquare,
              label: "GeneratePayslip",
            },
            { path: "/attendance", icon: CheckSquare, label: "Attendance" },
            //{ path: "/projects", icon: Briefcase, label: "Projects" },
            //{ path: "/tasks", icon: CheckSquare, label: "Tasks" },

            { path: "/calendar", icon: Calendar, label: "Calendar" },
            { path: "/ManageEmployes", icon: Users, label: "Manage Employees" },
            {
              path: "/LeaveApprovalPage",
              icon: Book,
              label: "Leave Approvals",
            },
            {
              path: "/ChatMeetingPage",
              icon: MessageSquareTextIcon,
              label: "Chat & Meeting Room",
            },

            { path: "/settings", icon: Settings, label: "Settings" },
          ].map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={closeSidebar}
              className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg ${
                isActive(path)
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`}
              alt="Avatar"
              className="h-8 w-8 rounded-full"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="mt-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
