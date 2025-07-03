import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import emailjs from "emailjs-com";
import Modal from "react-modal";

interface LeaveRequest {
  id: string;
  userId: string;
  date: string;
  reason: string;
  status: string;
  leaveType?: string;
  isExtra?: boolean;
  timestamp?: any;
  hrComment?: string;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export default function LeaveApprovalsPage() {
  const [leaveRequests, setLeaveRequests] = useState<
    (LeaveRequest & Employee)[]
  >([]);
  const [historyRequests, setHistoryRequests] = useState<
    (LeaveRequest & Employee)[]
  >([]);
  const [comments, setComments] = useState<{ [id: string]: string }>({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState(
    "Leave Approved Notification"
  );

  useEffect(() => {
    const fetchRequests = async () => {
      const snapshot = await getDocs(collection(db, "leaveManage"));
      const pending: (LeaveRequest & Employee)[] = [];
      const history: (LeaveRequest & Employee)[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as LeaveRequest;
        const [userId, date] = docSnap.id.split("_");
        const docMonth = date?.slice(0, 7);

        const empSnap = await getDoc(doc(db, "employees", userId));
        const empData = empSnap.exists()
          ? (empSnap.data() as Employee)
          : { name: "Unknown", phone: "N/A" };

        const entry = {
          id: docSnap.id,
          userId,
          date,
          ...data,
          name: empData.name,
          phone: empData.phone,
          email: empData.email || "",
        };

        if (docMonth === selectedMonth) {
          if (data.status === "pending") {
            pending.push(entry);
          } else {
            history.push(entry);
          }
        }
      }

      setLeaveRequests(pending);
      setHistoryRequests(history);
    };

    fetchRequests();
  }, [selectedMonth]);

  const handleDecision = async (
    id: string,
    status: "accepted" | "rejected"
  ) => {
    const comment = comments[id]?.trim();
    if (!comment) return alert("Please enter a comment before proceeding.");

    const [userId, date] = id.split("_");
    const month = date.slice(0, 7);
    const summaryId = `${userId}_${month}`;
    const summaryRef = doc(db, "attendanceSummary", summaryId);
    const leaveRef = doc(db, "leaveManage", id);
    const leaveSnap = await getDoc(leaveRef);
    const summarySnap = await getDoc(summaryRef);

    await updateDoc(leaveRef, {
      status,
      hrComment: comment,
    });

    if (status === "accepted" && leaveSnap.exists()) {
      const leaveData = leaveSnap.data();
      const prevCarryForward = summarySnap.exists()
        ? summarySnap.data().carryForwardLeaves || 0
        : 0;

      const countedDates =
        (summarySnap.exists() ? summarySnap.data().countedDates : []) || [];
      if (!countedDates.includes(date)) countedDates.push(date);

      const absentDays = summarySnap.exists()
        ? summarySnap.data().absentDays || 0
        : 0;
      const presentDays = summarySnap.exists()
        ? summarySnap.data().presentDays || 0
        : 0;
      const leavesTaken = summarySnap.exists()
        ? summarySnap.data().leavesTaken || 0
        : 0;

      let newCarryForward = prevCarryForward;
      let newAbsent = absentDays;
      let newPresent = presentDays;
      let carryUsed = false;
      let markedAs: "present" | "absent" = "absent";

      if (prevCarryForward > 0) {
        newCarryForward -= 1;
        carryUsed = true;
        markedAs = "present";
        newPresent += 1;
      } else {
        newAbsent += 1;
      }

      await setDoc(
        summaryRef,
        {
          carryForwardLeaves: newCarryForward,
          absentDays: newAbsent,
          presentDays: newPresent,
          leavesTaken: leavesTaken + 1,
          [`dailyHours.${date}`]: "0h 0m 0s",
          countedDates,
          month,
          userId,
        },
        { merge: true }
      );

      const empSnap = await getDoc(doc(db, "employees", userId));
      const employeeEmail = empSnap.exists() ? empSnap.data().email : "";

      const generatedMessage = `Hi ${leaveData.name},\n\nYour leave request for ${date} has been approved.\n\nRegards,\nHR Team`;

      setEmailTo(employeeEmail);
      setEmailBody(generatedMessage);
      setShowEmailModal(true);

      const historyRef = doc(db, "leaveHistory", `${userId}_${date}`);
      await setDoc(historyRef, {
        ...leaveData,
        userId,
        date,
        month,
        status: "accepted",
        hrComment: comment,
        carryForwardAtThatTime: prevCarryForward,
        carryForwardUsed: carryUsed,
        markedAs,
        finalCarryForwardLeft: newCarryForward,
        timestamp: new Date().toISOString(),
      });
    }

    setLeaveRequests((prev) => prev.filter((req) => req.id !== id));
  };

  const sendEmail = () => {
    emailjs
      .send(
        "service_c46n6nj",
        "template_j9nyqcl",
        {
          to_email: emailTo,
          message: emailBody,
          subject: emailSubject,
          from_name: "HR Team",
        },
        "tNQ7AblkfXloEG70R"
      )
      .then(
        () => {
          alert("Email sent successfully!");
          setShowEmailModal(false);
        },
        (error) => {
          alert("Failed to send email: " + error.text);
        }
      );
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      options.push(val);
    }
    return options;
  };

  const filterBySearch = (req: LeaveRequest & Employee) =>
    req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.userId.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-4 text-center">
        📋 Leave Approvals
      </h2>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <label className="mr-2 font-medium">Filter by Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-3 py-1 rounded"
          >
            {generateMonthOptions().map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search by Name or Employee ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
      </div>

      {/* --- Pending Requests --- */}
      <h3 className="text-xl font-semibold mb-2">⏳ Pending Requests</h3>
      {leaveRequests.filter(filterBySearch).length === 0 ? (
        <p className="text-gray-500 text-center mb-6">No pending requests.</p>
      ) : (
        <div className="overflow-x-auto mb-10">
          <table className="min-w-full table-auto border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Emp ID</th>
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Phone</th>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Leave Type</th>
                <th className="border px-4 py-2">Extra Leave</th>
                <th className="border px-4 py-2">Reason</th>
                <th className="border px-4 py-2">HR Comment</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.filter(filterBySearch).map((req) => (
                <tr key={req.id} className="text-center">
                  <td className="border px-4 py-2">{req.userId}</td>
                  <td className="border px-4 py-2">{req.name}</td>
                  <td className="border px-4 py-2">{req.phone}</td>
                  <td className="border px-4 py-2">{req.date}</td>
                  <td className="border px-4 py-2">
                    {req.leaveType || "Regular"}
                  </td>
                  <td className="border px-4 py-2">
                    {req.isExtra ? "✅" : "❌"}
                  </td>
                  <td className="border px-4 py-2">{req.reason}</td>
                  <td className="border px-4 py-2">
                    <textarea
                      value={comments[req.id] || ""}
                      onChange={(e) =>
                        setComments((prev) => ({
                          ...prev,
                          [req.id]: e.target.value,
                        }))
                      }
                      className="w-full border p-1 rounded"
                      rows={2}
                    />
                  </td>
                  <td className="border px-4 py-2 space-y-1">
                    <button
                      onClick={() => handleDecision(req.id, "accepted")}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecision(req.id, "rejected")}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 w-full"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- History Section --- */}
      <h3 className="text-xl font-semibold mb-2">📜 Leave History</h3>
      {historyRequests.filter(filterBySearch).length === 0 ? (
        <p className="text-gray-500 text-center">No leave history found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Emp ID</th>
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Phone</th>
                <th className="border px-4 py-2">Date</th>
                <th className="border px-4 py-2">Leave Type</th>
                <th className="border px-4 py-2">Extra Leave</th>
                <th className="border px-4 py-2">Reason</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Comment</th>
              </tr>
            </thead>
            <tbody>
              {historyRequests.filter(filterBySearch).map((req) => (
                <tr key={req.id} className="text-center">
                  <td className="border px-4 py-2">{req.userId}</td>
                  <td className="border px-4 py-2">{req.name}</td>
                  <td className="border px-4 py-2">{req.phone}</td>
                  <td className="border px-4 py-2">{req.date}</td>
                  <td className="border px-4 py-2">
                    {req.leaveType || "Regular"}
                  </td>
                  <td className="border px-4 py-2">
                    {req.isExtra ? "✅" : "❌"}
                  </td>
                  <td className="border px-4 py-2">{req.reason}</td>
                  <td className="border px-4 py-2 capitalize">{req.status}</td>
                  <td className="border px-4 py-2">{req.hrComment || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        isOpen={showEmailModal}
        onRequestClose={() => setShowEmailModal(false)}
        className="max-w-lg mx-auto mt-20 bg-white p-6 rounded shadow"
      >
        <h2 className="text-xl font-semibold mb-2">
          Edit Email Before Sending
        </h2>
        <label className="block mb-1 font-medium">To:</label>
        <input
          type="email"
          value={emailTo}
          disabled
          className="w-full mb-3 border px-3 py-2 rounded bg-gray-100"
        />

        <label className="block mb-1 font-medium">Subject:</label>
        <input
          type="text"
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          className="w-full mb-3 border px-3 py-2 rounded"
        />

        <label className="block mb-1 font-medium">Message:</label>
        <textarea
          rows={6}
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          className="w-full mb-3 border px-3 py-2 rounded"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowEmailModal(false)}
            className="px-4 py-2 rounded bg-gray-400 text-white"
          >
            Cancel
          </button>
          <button
            onClick={sendEmail}
            className="px-4 py-2 rounded bg-green-600 text-white"
          >
            Send Email
          </button>
        </div>
      </Modal>
    </div>
  );
}
