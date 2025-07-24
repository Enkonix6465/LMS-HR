import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";

interface ComplaintRecord {
  id: string;
  userId: string;
  date: string;
  subject: string;
  description: string;
  status: string;
  submittedOn: string;
  userEmail?: string;
}

interface BugReport {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  status: string;
  submittedOn: string;
  userEmail?: string;
}

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, resolved, rejected
  const [activeTab, setActiveTab] = useState("complaints"); // complaints, bugs

  useEffect(() => {
    setLoading(true);
    
    // Fetch complaints
    const complaintsQuery = query(collection(db, "complaints"), orderBy("timestamp", "desc"));
    const complaintsUnsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
      const complaintsList: ComplaintRecord[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        complaintsList.push({
          id: doc.id,
          userId: data.userId,
          date: data.date,
          subject: data.subject,
          description: data.description,
          status: data.status,
          submittedOn: data.submittedOn,
          userEmail: data.userEmail || "Unknown",
        });
      });
      setComplaints(complaintsList);
      setLoading(false);
    });
    
    // Fetch bug reports
    const bugsQuery = query(collection(db, "bugReports"), orderBy("timestamp", "desc"));
    const bugsUnsubscribe = onSnapshot(bugsQuery, (snapshot) => {
      const bugsList: BugReport[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        bugsList.push({
          id: doc.id,
          userId: data.userId,
          date: data.date,
          title: data.title,
          description: data.description,
          status: data.status,
          submittedOn: data.submittedOn,
          userEmail: data.userEmail || "Unknown",
        });
      });
      setBugReports(bugsList);
      setLoading(false);
    });

    return () => {
      complaintsUnsubscribe();
      bugsUnsubscribe();
    };
  }, []);

  const updateComplaintStatus = async (id: string, newStatus: string) => {
    try {
      const complaintRef = doc(db, "complaints", id);
      await updateDoc(complaintRef, {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating complaint status:", error);
      alert("Failed to update complaint status");
    }
  };
  
  const updateBugReportStatus = async (id: string, newStatus: string) => {
    try {
      const bugRef = doc(db, "bugReports", id);
      await updateDoc(bugRef, {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating bug report status:", error);
      alert("Failed to update bug report status");
    }
  };

  const filteredComplaints = complaints.filter((complaint) => {
    if (filter === "all") return true;
    return complaint.status === filter;
  });
  
  const filteredBugReports = bugReports.filter((bug) => {
    if (filter === "all") return true;
    return bug.status === filter;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto transition-all duration-300">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-blue-800 dark:text-blue-300">
        🔍 Issue Management
      </h2>
      
      {/* Tab Navigation */}
      <div className="flex justify-center mb-6">
        <div className="flex border dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab("complaints")}
            className={`px-4 py-2 ${activeTab === "complaints" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`}
          >
            Complaints
          </button>
          <button
            onClick={() => setActiveTab("bugs")}
            className={`px-4 py-2 ${activeTab === "bugs" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`}
          >
            Bug Reports
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: {activeTab === "complaints" ? complaints.length : bugReports.length} {activeTab === "complaints" ? "complaints" : "bug reports"}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-sm ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 rounded-full text-sm ${filter === "pending" ? "bg-yellow-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1 rounded-full text-sm ${filter === "resolved" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1 rounded-full text-sm ${filter === "rejected" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
          >
            Rejected
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading {activeTab === "complaints" ? "complaints" : "bug reports"}...</p>
          </div>
        ) : activeTab === "complaints" && filteredComplaints.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No complaints found
          </div>
        ) : activeTab === "bugs" && filteredBugReports.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            No bug reports found
          </div>
        ) : activeTab === "complaints" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredComplaints.map((complaint) => (
                  <tr
                    key={complaint.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-4 py-3">{complaint.date}</td>
                    <td className="px-4 py-3">{complaint.userEmail}</td>
                    <td className="px-4 py-3">{complaint.subject}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs overflow-hidden text-ellipsis">
                        {complaint.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(
                          complaint.status
                        )}`}
                      >
                        {complaint.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {complaint.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                updateComplaintStatus(complaint.id, "resolved")
                              }
                              className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() =>
                                updateComplaintStatus(complaint.id, "rejected")
                              }
                              className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {complaint.status !== "pending" && (
                          <button
                            onClick={() =>
                              updateComplaintStatus(complaint.id, "pending")
                            }
                            className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBugReports.map((bug) => (
                  <tr
                    key={bug.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-4 py-3">{bug.date}</td>
                    <td className="px-4 py-3">{bug.userEmail}</td>
                    <td className="px-4 py-3">{bug.title}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs overflow-hidden text-ellipsis">
                        {bug.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(
                          bug.status
                        )}`}
                      >
                        {bug.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {bug.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                updateBugReportStatus(bug.id, "resolved")
                              }
                              className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() =>
                                updateBugReportStatus(bug.id, "rejected")
                              }
                              className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {bug.status !== "pending" && (
                          <button
                            onClick={() =>
                              updateBugReportStatus(bug.id, "pending")
                            }
                            className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}