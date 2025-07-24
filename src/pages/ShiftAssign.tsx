import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
  shiftEndDate?: string;
}

interface ShiftAssignment {
  startTime: string;
  endTime: string;
  assignedBy: string;
  createdAt: string;
}

interface AllocatedEmployee {
  id: string;
  name: string;
  email: string;
  shiftEndDate: string;
  startTime: string;
  endTime: string;
}

export default function ShiftAssignmentPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [extraHours, setExtraHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shiftHistory, setShiftHistory] = useState<ShiftAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allocatedEmployees, setAllocatedEmployees] = useState<AllocatedEmployee[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);

      // Get all employees
      const snap = await getDocs(collection(db, "employees"));
      const employeeData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Get current date in YYYY-MM-DD format
      const today = format(new Date(), "yyyy-MM-dd");

      const allocatedList: AllocatedEmployee[] = [];

      // Check each employee's current shift status
      const employeesWithShiftStatus = await Promise.all(
        employeeData.map(async (emp) => {
          // Get the shifts for this employee
          const shiftsRef = collection(db, "shiftAssignments", emp.id, "dates");
          const shiftsSnap = await getDocs(shiftsRef);

          // Find the latest shift date that is >= today
          const futureShifts = shiftsSnap.docs
            .filter((doc) => doc.id >= today)
            .sort((a, b) => b.id.localeCompare(a.id));

          if (futureShifts.length > 0) {
            // Get the latest shift end date
            const latestShift = futureShifts[0];
            const shiftData = latestShift.data();

            // Add to allocated employees list
            allocatedList.push({
              id: emp.id,
              name: emp.name || "",
              email: emp.email || "",
              shiftEndDate: latestShift.id,
              startTime: shiftData.startTime,
              endTime: shiftData.endTime,
            });

            return {
              ...emp,
              shiftEndDate: latestShift.id,
              name: emp.name || "",
              email: emp.email || "",
            };
          }

          return emp;
        })
      );

      setAllocatedEmployees(allocatedList);
      setEmployees(employeesWithShiftStatus);
      setLoading(false);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchShifts = async () => {
      if (selectedIds.length !== 1) return;
      const ref = collection(db, "shiftAssignments", selectedIds[0], "dates");
      const snap = await getDocs(ref);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setShiftHistory(data.sort((a, b) => a.id.localeCompare(b.id)));
    };
    fetchShifts();
  }, [selectedIds]);

  const assignShift = async () => {
    if (!selectedIds.length || !startDate || !endDate) {
      alert("Please fill all fields.");
      return;
    }

    setSaving(true);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const allDates: string[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().slice(0, 10));
    }

    const endTimeParts = endTime.split(":").map(Number);
    const finalEndHour = endTimeParts[0] + extraHours;
    const newEndTime = `${String(finalEndHour).padStart(2, "0")}:${String(
      endTimeParts[1]
    ).padStart(2, "0")}:00`;

    for (const empId of selectedIds) {
      for (const date of allDates) {
        const ref = doc(db, "shiftAssignments", empId, "dates", date);
        await setDoc(ref, {
          startTime: `${startTime}:00`,
          endTime: newEndTime,
          assignedBy: "admin",
          createdAt: new Date().toISOString(),
        });
      }
    }

    setSaving(false);
    alert(
      `✅ Shift assigned to ${allDates.length} day(s) for ${selectedIds.length} employee(s)`
    );
  };

  const formatTime12Hour = (time: string) => {
    const [hourStr, minute] = time.split(":");
    let hour = parseInt(hourStr);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const filteredEmployees = employees.filter((emp) => {
    // Filter by search term
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter out employees with active shifts
    const today = format(new Date(), "yyyy-MM-dd");
    const hasActiveShift = emp.shiftEndDate && emp.shiftEndDate >= today;

    // Only show employees that match search and don't have active shifts
    return matchesSearch && !hasActiveShift;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 mt-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Assign Shift to Employee
      </h2>

      <input
        type="text"
        placeholder="Search by name or email"
        className="mb-4 p-2 w-full border rounded dark:bg-gray-800"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          <p className="mt-2">Loading employees...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 max-h-60 overflow-y-auto border p-2 rounded dark:bg-gray-800">
            <label className="flex items-center font-semibold mb-2">
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={
                  filteredEmployees.length > 0 &&
                  selectedIds.length === filteredEmployees.length
                }
                className="mr-2"
              />
              Select All
            </label>
            
            {/* Info message about filtered employees */}
            {employees.length > 0 && filteredEmployees.length < employees.length && (
              <div className="mb-2 p-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                <p>
                  <span className="font-bold">Note:</span> {employees.length - filteredEmployees.length} employee(s) with active shift assignments are not shown.
                </p>
              </div>
            )}
            
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <label key={emp.id} className="flex items-center mb-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(emp.id)}
                    onChange={() => handleSelectOne(emp.id)}
                    className="mr-2"
                  />
                  {emp.name} ({emp.email})
                </label>
              ))
            ) : (
              <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                No available employees found. Employees with active shift assignments are hidden.
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="block">
              <span className="font-semibold">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border p-2 rounded dark:bg-gray-800"
              />
            </label>

            <label className="block">
              <span className="font-semibold">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border p-2 rounded dark:bg-gray-800"
              />
            </label>

            <label className="block">
              <span className="font-semibold">Extra Hours (optional):</span>
              <input
                type="number"
                min={0}
                max={12}
                value={extraHours}
                onChange={(e) => setExtraHours(Number(e.target.value))}
                className="w-full border p-2 rounded dark:bg-gray-800"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <label className="block">
              <span className="font-semibold">
                Start Time ({formatTime12Hour(startTime)}):
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border p-2 rounded dark:bg-gray-800"
              />
            </label>

            <label className="block">
              <span className="font-semibold">
                End Time ({formatTime12Hour(endTime)} + {extraHours}hr):
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border p-2 rounded dark:bg-gray-800"
              />
            </label>
          </div>

          <button
            onClick={assignShift}
            disabled={saving}
            className={`w-full mt-4 bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 transition ${
              saving && "opacity-50 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <span className="flex justify-center items-center gap-2">
                <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </span>
            ) : (
              "Save Shift"
            )}
          </button>

          {/* Currently Allocated Employees */}
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-2">
              👥 Currently Allocated Employees
            </h3>
            {allocatedEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto border border-gray-300 dark:border-gray-700 text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="p-2 border">Employee</th>
                      <th className="p-2 border">Email</th>
                      <th className="p-2 border">Allocated Until</th>
                      <th className="p-2 border">Start Time</th>
                      <th className="p-2 border">End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocatedEmployees.map((emp) => (
                      <tr key={emp.id} className="text-center">
                        <td className="p-2 border">{emp.name}</td>
                        <td className="p-2 border">{emp.email}</td>
                        <td className="p-2 border">{emp.shiftEndDate}</td>
                        <td className="p-2 border">{formatTime12Hour(emp.startTime.slice(0, 5))}</td>
                        <td className="p-2 border">{formatTime12Hour(emp.endTime.slice(0, 5))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500 dark:text-gray-400 border rounded p-4">
                No employees are currently allocated to any shifts.
              </p>
            )}
          </div>

          {/* Shift History */}
          {shiftHistory.length > 0 && selectedIds.length === 1 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-2">
                📅 Shift History ({shiftHistory.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full table-auto border border-gray-300 dark:border-gray-700 text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="p-2 border">Date</th>
                      <th className="p-2 border">Start Time</th>
                      <th className="p-2 border">End Time</th>
                      <th className="p-2 border">Assigned By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftHistory.map((shift) => (
                      <tr key={shift.id} className="text-center">
                        <td className="p-2 border">{shift.id}</td>
                        <td className="p-2 border">{shift.startTime}</td>
                        <td className="p-2 border">{shift.endTime}</td>
                        <td className="p-2 border">{shift.assignedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}