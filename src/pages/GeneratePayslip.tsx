import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

const PayslipForm = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [employee, setEmployee] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [salaryDetails, setSalaryDetails] = useState({});
  const [form, setForm] = useState({
    month: "",
    notes: "",
    taxPercent: 5,
    latePenalty: 200,
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const snap = await getDocs(collection(db, "employees"));
      setEmployees(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchEmployees();
  }, []);

  const convertTimeToDecimal = (timeStr) => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+)h\s+(\d+)m\s+(\d+)s/);
    if (!match) return 0;
    const [_, h, m, s] = match.map(Number);
    return h + m / 60 + s / 3600;
  };

  useEffect(() => {
    const fetchDetails = async () => {
      const emp = employees.find((e) => e.id === selectedId);
      if (!emp) return;

      setEmployee(emp);

      const month = form.month || new Date().toISOString().slice(0, 7);

      const [attendanceSnap, salarySnap] = await Promise.all([
        getDoc(doc(db, "attendanceSummary", `${emp.id}_${month}`)),
        getDoc(doc(db, "salary", emp.id)),
      ]);

      const attendance = attendanceSnap.exists() ? attendanceSnap.data() : null;
      const salary = salarySnap.exists() ? salarySnap.data() : null;

      setAttendanceSummary(attendance);

      if (salary) {
        const basic = parseFloat(salary.basicSalary || 0);
        const hra = parseFloat(salary.houseRentAllowance || 0);
        const da = parseFloat(salary.dearnessAllowance || 0);
        const conveyance = parseFloat(salary.conveyanceAllowance || 0);
        const medical = parseFloat(salary.medicalAllowance || 0);
        const special = parseFloat(salary.specialAllowance || 0);
        const overtime = parseFloat(salary.overtimePay || 0);
        const incentives = parseFloat(salary.incentives || 0);
        const other = parseFloat(salary.otherAllowances || 0);

        const gross =
          basic +
          hra +
          da +
          conveyance +
          medical +
          special +
          overtime +
          incentives +
          other;

        const totalHours = convertTimeToDecimal(
          attendance?.totalmonthHours || "0h 0m 0s"
        );
        const standardMonthlyHours = 198;
        const hourRatio = Math.min(totalHours / standardMonthlyHours, 1);
        const grossAdjusted = gross * hourRatio;

        const tax = grossAdjusted * (form.taxPercent / 100);
        const penalty = (attendance?.absentDays || 0) * form.latePenalty;
        const netSalary = grossAdjusted - tax - penalty;

        setSalaryDetails({
          ...salary,
          grossSalary: gross,
          grossAdjusted,
          netSalary,
          workedHours: totalHours,
          hourRatio: hourRatio.toFixed(2),
          tax,
          penalty,
        });
      } else {
        setSalaryDetails({});
      }
    };

    if (selectedId) fetchDetails();
  }, [selectedId, form.month, form.taxPercent, form.latePenalty, employees]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const confirmSubmit = async () => {
    const docRef = doc(db, "salaryDetails", `${selectedId}_${form.month}`);
    await setDoc(docRef, {
      employeeId: selectedId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      month: form.month,
      ...salaryDetails,
      presentDays: attendanceSummary?.presentDays || 0,
      absentDays: attendanceSummary?.absentDays || 0,
      leavesTaken: attendanceSummary?.leavesTaken || 0,
      totalWorkingDays: attendanceSummary?.totalWorkingDays || 0,
      totalWorkedHours: salaryDetails.workedHours,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    });

    alert("Payslip submitted successfully!");
    setForm({ month: "", notes: "", taxPercent: 5, latePenalty: 200 });
    setSelectedId("");
    setEmployee(null);
    setAttendanceSummary(null);
    setSalaryDetails({});
    setShowPreview(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Generate Payslip</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="font-semibold">Select Employee</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.email})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            name="taxPercent"
            value={form.taxPercent}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Tax %"
          />
          <input
            type="number"
            name="latePenalty"
            value={form.latePenalty}
            onChange={handleChange}
            className="p-2 border rounded"
            placeholder="Penalty per Absence"
          />
        </div>

        <div>
          <label className="font-semibold">Month (YYYY-MM)</label>
          <input
            type="month"
            name="month"
            value={form.month}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="font-semibold">Notes (optional)</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="text-xl font-bold text-center mt-4">
          Net Salary (After Tax & Penalty): ₹{" "}
          {salaryDetails.netSalary?.toFixed(2) || 0}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
        >
          Preview Payslip
        </button>
      </form>

      {showPreview && (
        <div className="bg-white border border-gray-300 p-6 mt-6 rounded-2xl shadow-lg max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold mb-4 text-center text-gray-800">
            Payslip
          </h3>
          <p className="text-center text-sm text-gray-500 mb-2">
            Enkonix Software Services
          </p>
          <p className="text-center text-sm text-gray-500 mb-6">
            21023 Pearson Point Road, Gateway Avenue
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p>
                <strong>Date of Joining:</strong> {employee?.joiningDate || "-"}
              </p>
              <p>
                <strong>Pay Period:</strong> {form.month}
              </p>
              <p>
                <strong>Total Working Days:</strong>{" "}
                {attendanceSummary?.totalWorkingDays || 0}
              </p>
              <p>
                <strong>Leaves Taken:</strong>{" "}
                {attendanceSummary?.leavesTaken || 0}
              </p>
              <p>
                <strong>Present Days:</strong>{" "}
                {attendanceSummary?.presentDays || 0}
              </p>
            </div>
            <div>
              <p>
                <strong>Employee Name:</strong> {employee?.name}
              </p>
              <p>
                <strong>Designation:</strong> {employee?.title}
              </p>
              <p>
                <strong>Department:</strong> {employee?.department}
              </p>
              <p>
                <strong>Worked Hours:</strong>{" "}
                {salaryDetails.workedHours?.toFixed(2)} hrs
              </p>
              <p>
                <strong>Total Standard Hours:</strong> 198 hrs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Earnings Table */}
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">Earnings</th>
                  <th className="p-2 border">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Basic", value: salaryDetails.basicSalary },
                  {
                    label: "House Rent Allowance",
                    value: salaryDetails.houseRentAllowance,
                  },
                  {
                    label: "Dearness Allowance",
                    value: salaryDetails.dearnessAllowance,
                  },
                  {
                    label: "Conveyance Allowance",
                    value: salaryDetails.conveyanceAllowance,
                  },
                  {
                    label: "Medical Allowance",
                    value: salaryDetails.medicalAllowance,
                  },
                  {
                    label: "Special Allowance",
                    value: salaryDetails.specialAllowance,
                  },
                  { label: "Overtime Pay", value: salaryDetails.overtimePay },
                  { label: "Incentives", value: salaryDetails.incentives },
                  {
                    label: "Other Allowances",
                    value: salaryDetails.otherAllowances,
                  },
                ].map((item) => (
                  <tr key={item.label}>
                    <td className="p-2 border">{item.label}</td>
                    <td className="p-2 border">
                      {parseFloat(item.value || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-2 border">Total Earnings</td>
                  <td className="p-2 border">
                    ₹{salaryDetails.grossSalary?.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Deductions Table */}
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">Deductions</th>
                  <th className="p-2 border">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border">Tax</td>
                  <td className="p-2 border">
                    {salaryDetails.tax?.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">
                    Penalty for {attendanceSummary?.absentDays || 0} days
                  </td>
                  <td className="p-2 border">
                    {salaryDetails.penalty?.toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-2 border">Total Deductions</td>
                  <td className="p-2 border">
                    ₹
                    {(
                      parseFloat(salaryDetails.tax || 0) +
                      parseFloat(salaryDetails.penalty || 0)
                    ).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bank Details Section */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <table className="w-full border border-gray-300">
              <thead className="bg-blue-100">
                <tr>
                  <th className="p-2 border text-left" colSpan="2">
                    Bank & Account Details
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr>
                  <td className="p-2 border w-1/2">Account Holder Name</td>
                  <td className="p-2 border">
                    {salaryDetails.accountHolderName || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">Account Number</td>
                  <td className="p-2 border">
                    {salaryDetails.accountNumber || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">Bank Name</td>
                  <td className="p-2 border">
                    {salaryDetails.bankName || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">IFSC Code</td>
                  <td className="p-2 border">
                    {salaryDetails.ifscCode || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">PAN Number</td>
                  <td className="p-2 border">
                    {salaryDetails.panNumber || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">ESIC</td>
                  <td className="p-2 border">
                    {salaryDetails.esicNumber || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border">UAN</td>
                  <td className="p-2 border">{salaryDetails.uan || "N/A"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-center mt-6">
            <h4 className="text-xl font-bold">
              Net Pay: ₹{salaryDetails.netSalary?.toFixed(2)}
            </h4>
            <p className="text-sm italic text-gray-500">
              {salaryDetails.netSalaryInWords || "Net Salary in Words"}
            </p>
          </div>

          <div className="grid grid-cols-2 text-center text-sm mt-10">
            <div>
              <p>Employer Signature</p>
              <hr className="mt-6 border-t border-gray-400 w-3/4 mx-auto" />
            </div>
            <div>
              <p>Employee Signature</p>
              <hr className="mt-6 border-t border-gray-400 w-3/4 mx-auto" />
            </div>
          </div>

          <p className="text-center text-xs mt-4 text-gray-500">
            This is a system generated payslip
          </p>

          <div className="text-center mt-6">
            <button
              onClick={confirmSubmit}
              className="bg-green-600 text-white font-semibold px-6 py-2 rounded shadow hover:bg-green-700"
            >
              Confirm & Save Payslip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipForm;
