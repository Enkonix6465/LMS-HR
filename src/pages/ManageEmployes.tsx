import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  setDoc,
  doc,
  deleteDoc,
  getDocs,
  collection,
} from "firebase/firestore";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
  photo: string;
  title: string;
  department: string;
  type: string;
  joiningDate: string;
  manager: string;
  location: string;
  status: string;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<Employee>({
    id: "",
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    photo: "",
    title: "",
    department: "",
    type: "Full-time",
    joiningDate: "",
    manager: "",
    location: "",
    status: "Active",
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, "employees"));
      const data = snapshot.docs.map((doc) => doc.data() as Employee);
      setEmployees(data);
    };
    fetchEmployees();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createAuthUser = async (emp: Employee) => {
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        emp.email,
        "123456"
      );
      emp.id = userCred.user.uid;
      return emp;
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        return emp;
      } else {
        throw error;
      }
    }
  };

  const saveToDatabase = async (emp: Employee) => {
    await setDoc(doc(db, "employees", emp.id), emp);
  };

  const handleAddOrUpdate = async () => {
    if (!form.name || !form.email) return alert("Please fill required fields");

    setLoading(true);
    try {
      const updatedForm = await createAuthUser(form);
      await saveToDatabase(updatedForm);

      if (editIndex !== null) {
        const updated = [...employees];
        updated[editIndex] = updatedForm;
        setEmployees(updated);
        setEditIndex(null);
      } else {
        setEmployees([...employees, updatedForm]);
      }

      setForm({
        id: "",
        name: "",
        email: "",
        phone: "",
        gender: "",
        dob: "",
        photo: "",
        title: "",
        department: "",
        type: "Full-time",
        joiningDate: "",
        manager: "",
        location: "",
        status: "Active",
      });

      setMessage("Employee added successfully!");
    } catch (err: any) {
      alert("Failed to add employee: " + err.message);
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = (index: number) => {
    setForm(employees[index]);
    setEditIndex(index);
  };

  const handleDelete = async (index: number) => {
    const emp = employees[index];
    await deleteDoc(doc(db, "employees", emp.id));
    const updated = [...employees];
    updated.splice(index, 1);
    setEmployees(updated);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Employee>(sheet);

    setLoading(true);
    const uploaded: Employee[] = [];

    for (const emp of json) {
      try {
        const updated = await createAuthUser(emp);
        await saveToDatabase(updated);
        uploaded.push(updated);
      } catch (err) {
        console.error(err);
      }
    }

    setEmployees([...employees, ...uploaded]);
    setLoading(false);
    setMessage("Bulk upload successful!");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-700 dark:text-blue-400 animate-fade-in-down">
        Employee Management
      </h2>

      {loading && (
        <div className="text-blue-600 dark:text-blue-400 mb-3 animate-fade-in">
          Loading...
        </div>
      )}
      {message && (
        <div className="text-green-600 dark:text-green-400 mb-3 animate-fade-in">
          {message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-lg p-4 rounded mb-8 animate-slide-up">
        <h3 className="font-semibold mb-4 text-lg">➕ Add / Edit Employee</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["name", "Full Name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["photo", "Photo URL"],
            ["title", "Job Title"],
            ["department", "Department"],
            ["manager", "Manager"],
            ["location", "Location"],
          ].map(([name, placeholder]) => (
            <input
              key={name}
              name={name}
              value={form[name as keyof Employee]}
              onChange={handleChange}
              placeholder={placeholder}
              className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          ))}
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Intern</option>
            <option>Contract</option>
          </select>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option>Active</option>
            <option>Inactive</option>
            <option>Terminated</option>
          </select>
          <input
            type="date"
            name="dob"
            value={form.dob}
            onChange={handleChange}
            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="date"
            name="joiningDate"
            value={form.joiningDate}
            onChange={handleChange}
            className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <button
          onClick={handleAddOrUpdate}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition duration-200"
        >
          {editIndex !== null ? "Update" : "Add"} Employee
        </button>

        <div className="mt-6">
          <label className="block font-medium mb-1">📥 Bulk Upload</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleBulkUpload}
            className="border w-full p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg p-4 rounded animate-fade-in">
        <h3 className="font-semibold mb-4 text-lg">📋 All Employees</h3>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border text-sm min-w-[800px]">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
              <tr>
                <th className="border px-2 py-2">Photo</th>
                <th className="border px-2 py-2">Name</th>
                <th className="border px-2 py-2">Email</th>
                <th className="border px-2 py-2">Phone</th>
                <th className="border px-2 py-2">Department</th>
                <th className="border px-2 py-2">Status</th>
                <th className="border px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={idx}
                  className="text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <td className="border px-2 py-2">
                    {emp.photo ? (
                      <img
                        src={emp.photo}
                        alt={emp.name}
                        className="h-10 w-10 rounded-full mx-auto object-cover"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border px-2 py-2">{emp.name}</td>
                  <td className="border px-2 py-2">{emp.email}</td>
                  <td className="border px-2 py-2">{emp.phone}</td>
                  <td className="border px-2 py-2">{emp.department}</td>
                  <td className="border px-2 py-2">{emp.status}</td>
                  <td className="border px-2 py-2 space-x-2">
                    <button
                      onClick={() => handleEdit(idx)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
