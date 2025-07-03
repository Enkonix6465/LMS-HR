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
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Employee Management</h2>

      {loading && <div className="text-blue-600 mb-2">Loading...</div>}
      {message && <div className="text-green-600 mb-2">{message}</div>}

      <div className="bg-white shadow p-4 rounded mb-6">
        <h3 className="font-semibold mb-2">Add / Edit Employee</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="border p-2 rounded"
          />
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="border p-2 rounded"
          />
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone"
            className="border p-2 rounded"
          />
          <input
            name="photo"
            value={form.photo}
            onChange={handleChange}
            placeholder="Photo URL"
            className="border p-2 rounded"
          />
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Job Title"
            className="border p-2 rounded"
          />
          <input
            name="department"
            value={form.department}
            onChange={handleChange}
            placeholder="Department"
            className="border p-2 rounded"
          />
          <input
            name="manager"
            value={form.manager}
            onChange={handleChange}
            placeholder="Manager"
            className="border p-2 rounded"
          />
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Location"
            className="border p-2 rounded"
          />
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="border p-2 rounded"
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
            className="border p-2 rounded"
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
            className="border p-2 rounded"
          />
          <input
            type="date"
            name="joiningDate"
            value={form.joiningDate}
            onChange={handleChange}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={handleAddOrUpdate}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editIndex !== null ? "Update" : "Add"} Employee
        </button>

        <div className="mt-4">
          <label className="font-medium">Bulk Upload (CSV/XLSX)</label>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleBulkUpload}
            className="border p-2 mt-1 w-full rounded"
          />
        </div>
      </div>

      <div className="bg-white shadow p-4 rounded">
        <h3 className="font-semibold mb-2">All Employees</h3>
        <table className="w-full table-auto border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">Photo</th>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Email</th>
              <th className="border px-2 py-1">Phone</th>
              <th className="border px-2 py-1">Department</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={idx} className="text-center hover:bg-gray-100">
                <td className="border px-2 py-1">
                  {emp.photo ? (
                    <img
                      src={emp.photo}
                      alt={emp.name}
                      className="h-10 w-10 rounded-full mx-auto"
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td className="border px-2 py-1">{emp.name}</td>
                <td className="border px-2 py-1">{emp.email}</td>
                <td className="border px-2 py-1">{emp.phone}</td>
                <td className="border px-2 py-1">{emp.department}</td>
                <td className="border px-2 py-1">{emp.status}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button
                    onClick={() => handleEdit(idx)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="bg-red-600 text-white px-2 py-1 rounded"
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
  );
}
