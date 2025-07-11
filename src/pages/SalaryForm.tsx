import React, { useEffect, useState } from "react";
import { collection, doc, getDocs, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const SalaryForm = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [formData, setFormData] = useState(initialFormData());

  function initialFormData() {
    return {
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      panNumber: "",
      uan: "",
      esicNumber: "",
      basicSalary: "",
      houseRentAllowance: "",
      dearnessAllowance: "",
      conveyanceAllowance: "",
      medicalAllowance: "",
      specialAllowance: "",
      incentives: "",
      overtimePay: "",
      otherAllowances: "",
      providentFund: "",
      professionalTax: "",
      incomeTax: "",
      extraDeductions: "",
    };
  }

  const fetchEligibleEmployees = async () => {
    try {
      const empSnap = await getDocs(collection(db, "employees"));
      const allEmps = [];

      if (empSnap.empty) {
        console.warn("No employees found in /employees collection.");
      }

      for (const emp of empSnap.docs) {
        const salaryRef = doc(db, "salary", emp.id);
        const salaryDoc = await getDoc(salaryRef);

        if (!salaryDoc.exists()) {
          const data = emp.data();
          allEmps.push({
            id: emp.id,
            name: data.name || "Unnamed",
            email: data.email || "",
          });
        }
      }

      setEmployees(allEmps);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    fetchEligibleEmployees();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return alert("Please select an employee");

    try {
      const salaryRef = doc(db, "salary", selectedId);
      await setDoc(salaryRef, {
        ...formData,
        employeeId: selectedId,
        timestamp: new Date().toISOString(),
      });

      alert("Salary details saved successfully");
      setFormData(initialFormData());
      setSelectedId("");
      fetchEligibleEmployees();
    } catch (error) {
      console.error("Error saving salary data:", error);
      alert("Failed to save salary details.");
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white dark:bg-gray-900 dark:text-white shadow-md rounded transition-all duration-500">
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-700 dark:text-blue-300 transition-all">
        Salary Entry Form
      </h2>

      <label className="block mb-2 font-medium transition-all">
        Select Employee:
      </label>
      <select
        className="border p-2 w-full mb-6 rounded dark:bg-gray-800 dark:border-gray-600 transition-all"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="">-- Select Employee --</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name} ({emp.email})
          </option>
        ))}
      </select>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn"
      >
        <h3 className="col-span-full text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          🏦 Bank Details
        </h3>

        {[
          { label: "Bank Name", name: "bankName" },
          { label: "Account Holder Name", name: "accountHolderName" },
          { label: "Account Number", name: "accountNumber" },
          { label: "IFSC Code", name: "ifscCode" },
          { label: "PAN Number", name: "panNumber" },
          { label: "UAN (Optional)", name: "uan" },
          { label: "ESIC Number (Optional)", name: "esicNumber" },
        ].map(({ label, name }) => (
          <input
            key={name}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={label}
            className="border p-2 rounded dark:bg-gray-800 dark:border-gray-600 transition-all"
            required={!label.toLowerCase().includes("optional")}
          />
        ))}

        <h3 className="col-span-full text-lg font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-2">
          💰 Earnings
        </h3>

        {[
          { label: "Basic Salary", name: "basicSalary" },
          { label: "HRA", name: "houseRentAllowance" },
          { label: "DA", name: "dearnessAllowance" },
          { label: "Conveyance Allowance", name: "conveyanceAllowance" },
          { label: "Medical Allowance", name: "medicalAllowance" },
          { label: "Special Allowance", name: "specialAllowance" },
          { label: "Incentives / Bonus", name: "incentives" },
          { label: "Overtime Pay", name: "overtimePay" },
          { label: "Other Allowances", name: "otherAllowances" },
        ].map(({ label, name }) => (
          <input
            key={name}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={label}
            type="number"
            className="border p-2 rounded dark:bg-gray-800 dark:border-gray-600 transition-all"
          />
        ))}

        <h3 className="col-span-full text-lg font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-2">
          🧾 Deductions
        </h3>

        {[
          { label: "Provident Fund", name: "providentFund" },
          { label: "Professional Tax", name: "professionalTax" },
          { label: "Income Tax", name: "incomeTax" },
          { label: "Other Deductions (Optional)", name: "extraDeductions" },
        ].map(({ label, name }) => (
          <input
            key={name}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={label}
            type="number"
            className="border p-2 rounded dark:bg-gray-800 dark:border-gray-600 transition-all"
            required={!label.toLowerCase().includes("optional")}
          />
        ))}

        <button
          type="submit"
          className="col-span-full bg-blue-600 hover:bg-blue-700 transition-all text-white p-3 rounded mt-6"
        >
          Save Salary
        </button>
      </form>
    </div>
  );
};

export default SalaryForm;
