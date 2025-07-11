import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { Sun, Moon } from "lucide-react";

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
  const { theme, setTheme } = useThemeStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const isActive = (path: string) => location.pathname === path;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleNotifications = () => setShowNotifications(!showNotifications);

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
    <div className="flex min-h-screen bg-sky-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-sky-100 dark:bg-gray-800 shadow-lg md:hidden transition-all duration-300 hover:scale-105"
      >
        {isSidebarOpen ? (
          <X className="h-6 w-6 text-gray-800 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-800 dark:text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 bg-sky-100 dark:bg-gray-800 border-r border-sky-200 dark:border-gray-700 transition-all duration-500 ease-in-out flex flex-col`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sky-200 dark:border-gray-700 relative">
          {/* Logo + scrolling text */}
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover shadow-lg border border-gray-300 dark:border-gray-600 hover:rotate-6 transition-transform duration-300"
            />
            <div className="overflow-hidden whitespace-nowrap">
              <div className="animate-marquee text-sky-700 dark:text-sky-300 font-semibold text-base">
                ENKONIX
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggleNotifications} className="relative">
              <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300 hover:scale-110 transition-transform" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-1 rounded hover:bg-sky-200 dark:hover:bg-gray-700 transition-colors duration-300"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-yellow-400" />
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {showNotifications && (
          <div className="bg-sky-50 dark:bg-gray-700 text-sm max-h-40 overflow-y-auto px-4 py-2 border-b border-sky-200 dark:border-gray-600 animate-fadeIn">
            {notifications.map((note, i) => (
              <div
                key={i}
                className="py-1 px-2 border-b last:border-none border-sky-100 dark:border-gray-600"
              >
                {note}
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-auto px-4 py-4 space-y-1">
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
            { path: "/OfficeIPConfig", icon: CheckSquare, label: "Office IPs" },
            { path: "/settings", icon: Settings, label: "Settings" },
          ].map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={closeSidebar}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ease-in-out transform ${
                isActive(path)
                  ? "bg-sky-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium scale-[1.03]"
                  : "text-gray-700 dark:text-gray-300 hover:bg-sky-100 dark:hover:bg-gray-700 hover:scale-[1.02]"
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sky-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`}
              alt="Avatar"
              className="h-8 w-8 rounded-full transition-transform duration-300 hover:scale-110"
            />
            <div className="ml-3 truncate">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-3 flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 transition-all duration-300 hover:translate-x-1"
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 max-w-full animate-fadeIn">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
