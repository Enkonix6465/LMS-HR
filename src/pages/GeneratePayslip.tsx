import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getDoc, doc, getDocs, collection, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const PayslipGenerator = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [month, setMonth] = useState("");
  const [penaltyPerDay, setPenaltyPerDay] = useState(200);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState(null);
  const [salary, setSalary] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [payslipData, setPayslipData] = useState(null);
  const payslipRef = useRef();

  useEffect(() => {
    const fetchEmployees = async () => {
      const snap = await getDocs(collection(db, "employees"));
      setEmployees(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchEmployees();
  }, []);

  const convertToHoursDecimal = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m, s] = timeStr.split(/[hms]+/).map((v) => parseInt(v) || 0);
    return h + m / 60 + s / 3600;
  };

  const handlePreview = async () => {
    if (!selectedId || !month) return alert("Please fill all fields");

    const [empSnap, salarySnap, summarySnap] = await Promise.all([
      getDoc(doc(db, "employees", selectedId)),
      getDoc(doc(db, "salary", selectedId)),
      getDoc(doc(db, "attendanceSummary", `${selectedId}_${month}`)),
    ]);

    const emp = empSnap.data();
    const salaryData = salarySnap.data();
    const summaryData = summarySnap.data();

    if (!emp || !salaryData || !summaryData)
      return alert("Required data missing");

    setEmployee(emp);
    setSalary(salaryData);
    setSummary(summaryData);

    const base = parseFloat(salaryData.basicSalary || 0);
    const hra = parseFloat(salaryData.houseRentAllowance || 0);
    const da = parseFloat(salaryData.dearnessAllowance || 0);
    const convey = parseFloat(salaryData.conveyanceAllowance || 0);
    const med = parseFloat(salaryData.medicalAllowance || 0);
    const spec = parseFloat(salaryData.specialAllowance || 0);
    const overtime = parseFloat(salaryData.overtimePay || 0);
    const incent = parseFloat(salaryData.incentives || 0);
    const other = parseFloat(salaryData.otherAllowances || 0);

    const gross =
      base + hra + da + convey + med + spec + overtime + incent + other;

    const workedHrs = convertToHoursDecimal(summaryData.totalmonthHours);
    const extraHrs = Object.values(summaryData.extraWorkLog || {}).reduce(
      (sum, val) => sum + convertToHoursDecimal(val),
      0
    );

    const totalHrs = workedHrs + extraHrs;
    const stdHrs = summaryData.totalWorkingDays * 9;
    const hourRatio = Math.min(totalHrs / stdHrs, 1);

    const adjusted = gross * hourRatio;
    const extraPay = gross * (extraHrs / stdHrs);
    const pf = parseFloat(salaryData.providentFund || 0);
    const proTax = parseFloat(salaryData.professionalTax || 0);
    const incomeTax = parseFloat(salaryData.incomeTax || 0);
    const penalty = (summaryData.absentDays || 0) * penaltyPerDay;

    const deductions = pf + proTax + incomeTax + penalty;
    const net = adjusted + extraPay - deductions;

    const finalData = {
      gross,
      adjusted,
      extraPay,
      pf,
      proTax,
      incomeTax,
      penalty,
      deductions,
      net,
      stdHrs,
      totalHrs,
      extraHrs,
      presentDays: summaryData.presentDays,
      absentDays: summaryData.absentDays,
      leavesTaken: summaryData.leavesTaken,
      totalWorkingDays: summaryData.totalWorkingDays,
      totalWorkedHours: totalHrs.toFixed(2),
      employeeId: selectedId,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      month,
      notes,
      accountHolderName: salaryData.accountHolderName,
      accountNumber: salaryData.accountNumber,
      bankName: salaryData.bankName,
      ifscCode: salaryData.ifscCode,
      panNumber: salaryData.panNumber,
      esicNumber: salaryData.esicNumber,
      uan: salaryData.uan,
      createdAt: new Date().toISOString(),
    };

    setPayslipData(finalData);
  };

  useEffect(() => {
    if (payslipData) {
      const savePayslipHTML = async () => {
        const payslipHTML = payslipRef.current?.outerHTML || "";
        const finalPayslip = { ...payslipData, payslipHTML };
        await setDoc(
          doc(
            db,
            "salaryDetails",
            `${payslipData.employeeId}_${payslipData.month}`
          ),
          finalPayslip
        );
      };
      savePayslipHTML();
    }
  }, [payslipData]);

  const downloadPDF = async () => {
    const canvas = await html2canvas(payslipRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(imgData, "PNG", 10, 10, 190, 0);
    pdf.save("payslip.pdf");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 transition-colors duration-500 dark:bg-gray-900 dark:text-white bg-white text-black min-h-screen">
      <h2 className="text-center text-xl font-bold mb-4 text-blue-700 dark:text-blue-300 transition-all duration-300">
        Auto Payslip Generator
      </h2>
      <div className="flex items-center justify-between mb-4">
        <img src="/logo.jpg" alt="Company Logo" className="h-16" />
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">
            Enkonix Software Services Pvt Ltd
          </p>
          <p className="text-xs text-gray-500">Banglore, Novel Office.</p>
          <p className="text-xs text-gray-500">hr@enkonix.in</p>
        </div>
      </div>
      <h2 className="text-center text-lg font-bold mb-2">Payslip</h2>

      <select
        className="w-full border p-2 mb-3 rounded"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">Select Employee</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name} ({e.email})
          </option>
        ))}
      </select>

      <input
        type="month"
        className="w-full border p-2 mb-3 rounded"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      />

      <input
        type="number"
        className="w-full border p-2 mb-3 rounded"
        placeholder="Penalty per Absence"
        value={penaltyPerDay}
        onChange={(e) => setPenaltyPerDay(Number(e.target.value))}
      />

      <textarea
        className="w-full border p-2 mb-3 rounded"
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white px-4 py-2 rounded w-full"
        onClick={handlePreview}
      >
        Preview Payslip
      </button>

      {employee && salary && summary && payslipData && (
        <>
          <div
            className="mt-6 animate-fade-in"
            style={{ animation: "fadeIn 0.5s ease-in-out" }}
          >
            <div
              ref={payslipRef}
              className="relative mt-6 bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-400 text-sm w-full overflow-hidden transition-colors duration-500"
            >
              {/* Background watermark layer */}
              <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                  backgroundImage: 'url("/log1.png")',
                  backgroundRepeat: "repeat",
                  backgroundSize: "120px",
                  transform: "rotate(-45deg)", // ✅ diagonal direction
                  transformOrigin: "center",
                  opacity: 0.06, // ✅ very light
                }}
              ></div>

              {/* Payslip content layer */}
              <div className="relative z-10">
                {/* 🔽 Your entire existing payslip layout goes here 🔽 */}

                {/* Example */}

                {/* Header */}
                <div
                  className="text-white text-sm font-semibold p-2 flex items-center justify-between"
                  style={{ backgroundColor: "#f3cfb9" }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo.jpg"
                      alt="Enkonix Logo"
                      className="h-12 w-auto"
                    />
                    <p className="text-black font-bold text-lg">
                      ENKONIX SOFTWARE SERVICES PVT LTD
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-x border-b border-gray-400 text-center font-semibold py-2">
                Payslip For{" "}
                {new Date(month + "-01")
                  .toLocaleString("default", { month: "long", year: "numeric" })
                  .toUpperCase()}
              </div>

              {/* Top Details Grid */}
              <div className="grid grid-cols-2 border border-gray-400 border-t-0 divide-x divide-gray-400">
                <div className="divide-y divide-gray-400">
                  {[
                    ["Personnel No.", employee.id],
                    ["Bank", salary.bankName],
                    ["DOJ", employee.joiningDate],
                    ["PF No.", salary.uan || "-"],
                    ["Location", employee.location || "-"],
                    ["Department", employee.department || "-"],
                  ].map(([label, value]) => (
                    <div className="grid grid-cols-2" key={label}>
                      <div
                        className="font-semibold p-1 border-r border-gray-300 text-white"
                        style={{ backgroundColor: "#76bce4" }}
                      >
                        {label}
                      </div>
                      <div className="p-1">{value || "-"}</div>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-gray-400">
                  {[
                    ["Name", employee.name],
                    ["Bank A/c No.", salary.accountNumber],
                    ["LOP Days", summary.absentDays || 0],
                    ["STD Days", summary.totalWorkingDays || 0],
                    ["Worked Days", summary.presentDays || 0],
                    ["Designation", employee.title || "-"],
                  ].map(([label, value]) => (
                    <div className="grid grid-cols-2" key={label}>
                      <div
                        className="font-semibold p-1 border-r border-gray-300 text-white"
                        style={{ backgroundColor: "#76bce4" }}
                      >
                        {label}
                      </div>
                      <div className="p-1">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 mt-4 border border-gray-400">
                <table className="w-full border-r border-gray-400">
                  <thead
                    className="font-semibold p-1 border-r border-gray-300 text-white"
                    style={{ backgroundColor: "#76bce4" }}
                  >
                    <tr>
                      <th className="border border-gray-300 p-1 text-left">
                        Earnings
                      </th>
                      <th className="border border-gray-300 p-1 text-right">
                        Amount in Rs.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["BASIC", salary.basicSalary],
                      ["HOUSE RENT ALLOWANCE", salary.houseRentAllowance],
                      ["SPECIAL ALLOWANCE", salary.specialAllowance],
                      ["HOT SKILL BONUS", salary.otherAllowances],
                    ].map(([label, val]) => (
                      <tr key={label}>
                        <td className="border border-gray-300 p-1">{label}</td>
                        <td className="border border-gray-300 p-1 text-right">
                          {parseFloat(val || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="border border-gray-300 p-1">
                        GROSS EARNING
                      </td>
                      <td className="border border-gray-300 p-1 text-right">
                        ₹{payslipData.gross.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full">
                  <thead
                    className="font-semibold p-1 border-r border-gray-300 text-white"
                    style={{ backgroundColor: "#76bce4" }}
                  >
                    <tr>
                      <th className="border border-gray-300 p-1 text-left">
                        Deductions
                      </th>
                      <th className="border border-gray-300 p-1 text-right">
                        Amount in Rs.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["PROVIDENT FUND", payslipData.pf],
                      ["PROFESSIONAL TAX", payslipData.proTax],
                      ["INCOME TAX", payslipData.incomeTax],
                    ].map(([label, val]) => (
                      <tr key={label}>
                        <td className="border border-gray-300 p-1">{label}</td>
                        <td className="border border-gray-300 p-1 text-right">
                          {val.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="border border-gray-300 p-1">
                        GROSS DEDUCTIONS
                      </td>
                      <td className="border border-gray-300 p-1 text-right">
                        ₹{payslipData.deductions.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Pay */}
              <div className="border border-gray-400 border-t-0 text-right p-2 font-bold">
                NET PAY ₹{payslipData.net.toFixed(2)}
              </div>

              {/* Footer */}
              <div className="text-xs text-center mt-2 italic text-gray-600">
                ** This is a computer generated payslip and does not require
                signature and stamp.
              </div>
            </div>
          </div>
        </>
      )}
      {payslipData && (
        <div className="mt-4 flex gap-4">
          <button
            className="bg-green-600 hover:bg-green-700 transition duration-300 text-white px-4 py-2 rounded"
            onClick={downloadPDF}
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default PayslipGenerator;
