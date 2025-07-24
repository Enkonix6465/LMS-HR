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
  department?: string; // Added for AI recommendation
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

// AI Recommendation logic for leave approval
async function getAILeaveRecommendation(req: LeaveRequest & Employee): Promise<{ recommendation: string; reason: string }> {
  // Fetch attendance summary for last 2 months
  const now = new Date(req.date);
  const months = [
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`,
  ];
  let absences = 0, presents = 0, leaves = 0;
  for (const m of months) {
    const summaryRef = doc(db, "attendanceSummary", `${req.userId}_${m}`);
    const snap = await getDoc(summaryRef);
    if (snap.exists()) {
      const data = snap.data();
      absences += data.absentDays || 0;
      presents += data.presentDays || 0;
      leaves += data.leavesTaken || 0;
    }
  }
  // Fetch team status: how many team members are on leave for this date
  let teamOnLeave = 0;
  if (req.department) {
    const allLeaves = await getDocs(collection(db, "leaveManage"));
    for (const docSnap of allLeaves.docs) {
      const data = docSnap.data();
      if (data.date === req.date && data.status === "accepted" && data.department === req.department) {
        teamOnLeave++;
      }
    }
  }
  // (Optional) Fetch workload: number of open tasks (not implemented here)
  // Rule-based logic
  let recommendation = "Needs Review";
  let reason = "";
  if (absences <= 1 && presents >= 15 && teamOnLeave < 2) {
    recommendation = "Approve";
    reason = "Good attendance, low recent absences, and team is adequately staffed.";
  } else if (absences > 3 || teamOnLeave >= 2) {
    recommendation = "Deny";
    reason = absences > 3 ? "Too many recent absences." : "Team is short-staffed on requested date.";
  } else {
    reason = `Attendance: ${presents} present, ${absences} absent, ${leaves} leaves in last 2 months. Team on leave: ${teamOnLeave}.`;
  }
  return { recommendation, reason };
}

// --- AI Leave Approval Panel ---
function AILeaveApprovalPanel({ leaveRequests, aiRecs }: { leaveRequests: (LeaveRequest & Employee)[]; aiRecs: { [id: string]: { recommendation: string; reason: string } } }) {
  // Summary: how many approve/deny/needs review
  const summary = React.useMemo(() => {
    let approve = 0, deny = 0, review = 0;
    Object.values(aiRecs).forEach(r => {
      if (r.recommendation === 'Approve') approve++;
      else if (r.recommendation === 'Deny') deny++;
      else review++;
    });
    return { approve, deny, review };
  }, [aiRecs]);

  // Conflict highlighting: overlapping leaves (same date, same department)
  const conflicts = React.useMemo(() => {
    const byDeptDate: Record<string, (LeaveRequest & Employee)[]> = {};
    leaveRequests.forEach(req => {
      const key = (req.department || 'General') + '_' + req.date;
      if (!byDeptDate[key]) byDeptDate[key] = [];
      byDeptDate[key].push(req);
    });
    return Object.entries(byDeptDate).filter(([_, arr]) => arr.length > 1);
  }, [leaveRequests]);

  // Team coverage: departments with 2+ pending leaves on same day
  const lowCoverage = conflicts.filter(([_, arr]) => arr.length >= 2).map(([key, arr]) => {
    const [dept, date] = key.split('_');
    return { dept, date, count: arr.length };
  });

  return (
    <div className="mb-6 bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-4">
      <h3 className="font-bold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2"><span>🤖</span>AI Leave Approval Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-xs flex items-center gap-1">✅ Recommendation Summary</h4>
          <div className="text-xs text-gray-700 dark:text-gray-200">Approve: {summary.approve}, Deny: {summary.deny}, Needs Review: {summary.review}</div>
        </div>
        <div>
          <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-xs flex items-center gap-1">⚠️ Conflicts</h4>
          {conflicts.length === 0 ? <div className="text-xs text-gray-400">No conflicts</div> : (
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {conflicts.slice(0, 3).map(([key, arr], i) => <li key={i}>{arr.length} requests for {arr[0].department || 'General'} on {arr[0].date}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-1 text-xs flex items-center gap-1">👥 Team Coverage</h4>
          {lowCoverage.length === 0 ? <div className="text-xs text-gray-400">All teams covered</div> : (
            <ul className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
              {lowCoverage.slice(0, 3).map((c, i) => <li key={i}>{c.dept} at risk on {c.date} ({c.count} pending leaves)</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
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

  // AI recommendations cache
  const [aiRecs, setAiRecs] = useState<{ [id: string]: { recommendation: string; reason: string } }>({});
  const [aiLoading, setAiLoading] = useState(false);

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
          : { name: "Unknown", phone: "N/A", email: "" };

        const entry = {
          ...data,
          id: docSnap.id,
          userId,
          date,
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

  // Fetch AI recommendations for pending requests
  useEffect(() => {
    const fetchRecs = async () => {
      const recs: { [id: string]: { recommendation: string; reason: string } } = {};
      setAiLoading(true);
      for (const req of leaveRequests) {
        try {
          recs[req.id] = await getAILeaveRecommendation(req);
        } catch (err) {
          recs[req.id] = { recommendation: "Needs Review", reason: "AI error: Could not fetch recommendation." };
        }
      }
      setAiRecs(recs);
      setAiLoading(false);
    };
    if (leaveRequests.length > 0) fetchRecs();
  }, [leaveRequests]);

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
    <div className="p-6 max-w-7xl mx-auto text-gray-900 dark:text-gray-200 transition-all duration-500">
      <h2 className="text-3xl font-bold mb-4 text-center">
        📋 Leave Approvals
      </h2>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <label className="mr-2 font-medium">Filter by Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border px-3 py-1 rounded bg-white dark:bg-gray-800 dark:text-gray-100"
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
            className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Pending Requests */}
      <AILeaveApprovalPanel leaveRequests={leaveRequests} aiRecs={aiRecs} />
      <h3 className="text-xl font-semibold mb-2">⏳ Pending Requests</h3>
      {leaveRequests.filter(filterBySearch).length === 0 ? (
        <p className="text-gray-500 text-center mb-6">No pending requests.</p>
      ) : (
        <div className="overflow-x-auto mb-10 animate-fade-in-up transition-all duration-500">
          {aiLoading && (
            <div className="text-center text-blue-600 font-semibold mb-2 animate-pulse">AI recommendations loading...</div>
          )}
          <table className="min-w-[900px] w-full border border-gray-300 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 shadow-md rounded-lg">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                {[
                  "Emp ID",
                  "Name",
                  "Phone",
                  "Date",
                  "Leave Type",
                  "Extra Leave",
                  "Reason",
                  "HR Comment",
                  "Actions",
                ].map((head, i) => (
                  <th key={i} className="border px-4 py-2">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaveRequests.filter(filterBySearch).map((req) => (
                <tr
                  key={req.id}
                  className="text-center hover:bg-sky-50 dark:hover:bg-gray-700 transition"
                >
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
                      className="w-full border p-1 rounded bg-white dark:bg-gray-700 dark:text-white"
                      rows={2}
                    />
                    {/* AI Recommendation Panel */}
                    {aiRecs[req.id] && (
                      <div className={`mt-2 p-2 rounded text-xs font-semibold ${aiRecs[req.id].recommendation === "Approve" ? "bg-green-100 text-green-800" : aiRecs[req.id].recommendation === "Deny" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                        <span className="block mb-1">🤖 <b>AI Recommendation:</b> {aiRecs[req.id].recommendation}</span>
                        <span className="block">{aiRecs[req.id].reason}</span>
                      </div>
                    )}
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

      {/* History */}
      <h3 className="text-xl font-semibold mb-2">📜 Leave History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border border-gray-300 text-sm bg-white dark:bg-gray-800 dark:text-gray-100">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "Emp ID",
                "Name",
                "Phone",
                "Date",
                "Leave Type",
                "Extra Leave",
                "Reason",
                "Status",
                "Comment",
              ].map((head, i) => (
                <th key={i} className="border px-4 py-2">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historyRequests.filter(filterBySearch).map((req) => (
              <tr
                key={req.id}
                className="text-center hover:bg-sky-50 dark:hover:bg-gray-700 transition"
              >
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

      <Modal
        isOpen={showEmailModal}
        onRequestClose={() => setShowEmailModal(false)}
        className="max-w-lg mx-auto mt-20 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg animate-fade-in-up text-gray-900 dark:text-white"
      >
        <h2 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">
          ✉️ Edit Email Before Sending
        </h2>
        <label className="block mb-1 font-medium">To:</label>
        <input
          type="email"
          value={emailTo}
          disabled
          className="w-full mb-3 border px-3 py-2 rounded bg-gray-100 dark:bg-gray-800"
        />

        <label className="block mb-1 font-medium">Subject:</label>
        <input
          type="text"
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          className="w-full mb-3 border px-3 py-2 rounded bg-white dark:bg-gray-800"
        />

        <label className="block mb-1 font-medium">Message:</label>
        <textarea
          rows={6}
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          className="w-full mb-3 border px-3 py-2 rounded bg-white dark:bg-gray-800"
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
            className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
          >
            Send Email
          </button>
        </div>
      </Modal>
    </div>
  );
}
