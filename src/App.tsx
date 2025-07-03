import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useThemeStore } from "./store/themeStore";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import UserManagement from "./pages/UserManagement";
import { Toaster } from "react-hot-toast";
import Attendance from "./pages/Attendance";
import WorkLocationAssignment from "./pages/WorkLocationAssignment";
import ManageEmployes from "./pages/ManageEmployes";
import LeaveApprovalPage from "./pages/LeaveApprovalPage";
import ChatMeetingPage from "./pages/ChatMeetingPage";
import GeneratePayslip from "./pages/GeneratePayslip";
import SalaryForm from "./pages/SalaryForm";
function App() {
  const { user, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />}
        />
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="ManageEmployes" element={<ManageEmployes />} />
          <Route path="LeaveApprovalPage" element={<LeaveApprovalPage />} />
          <Route path="ChatMeetingPage" element={<ChatMeetingPage />} />
          <Route path="GeneratePayslip" element={<GeneratePayslip />} />
          <Route path="SalaryForm" element={<SalaryForm />} />

          {/* Work Location Assignment */}
          <Route
            path="WorkLocationAssignment"
            element={<WorkLocationAssignment />}
          />

          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
