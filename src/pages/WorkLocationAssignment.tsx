import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { eachDayOfInterval, format, parseISO } from "date-fns";

interface Employee {
  id: string;
  name: string;
}

export default function AssignGeoFenceWithReverse() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("1");
  const [address, setAddress] = useState("");
  const [workFromHome, setWorkFromHome] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await getDocs(collection(db, "employees"));
      const empList = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setEmployees(empList);
    };
    fetchEmployees();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === employees.length) {
      setSelected([]);
    } else {
      setSelected(employees.map((e) => e.id));
    }
  };

  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latVal = pos.coords.latitude.toFixed(6);
        const lngVal = pos.coords.longitude.toFixed(6);
        setLat(latVal);
        setLng(lngVal);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latVal}&lon=${lngVal}&zoom=18&addressdetails=1`
          );
          const data = await res.json();
          const fullAddress =
            data.display_name ||
            `${data.address.road || ""}, ${
              data.address.city ||
              data.address.town ||
              data.address.village ||
              ""
            }, ${data.address.state || ""}, ${data.address.country || ""}`;
          setAddress(fullAddress.trim() || `Lat: ${latVal}, Lng: ${lngVal}`);
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          setAddress(`Lat: ${latVal}, Lng: ${lngVal}`);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location.");
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const assignLocation = async () => {
    if (!fromDate || !toDate) {
      alert("Please select a valid date range.");
      return;
    }

    if (!workFromHome && (!lat || !lng) && !address) {
      alert("Please get or enter a location.");
      return;
    }

    setAssignLoading(true);

    const zoneBase = {
      lat: workFromHome ? 0 : parseFloat(lat),
      lng: workFromHome ? 0 : parseFloat(lng),
      radius: workFromHome ? 0 : parseFloat(radius),
      address: workFromHome ? "Work From Home" : address,
      workFromHome,
    };

    const range = eachDayOfInterval({
      start: parseISO(fromDate),
      end: parseISO(toDate),
    });

    const newAssignments: any[] = [];

    for (const empId of selected) {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) continue;

      for (const d of range) {
        const dateStr = format(d, "yyyy-MM-dd");
        const zone = { ...zoneBase, date: dateStr };
        const dateDocRef = doc(db, "geoAssignments", emp.id, "dates", dateStr);
        await setDoc(dateDocRef, zone);
        newAssignments.push({ emp, zone });
      }
    }

    setAssignments((prev) => [...prev, ...newAssignments]);
    setSelected([]);
    setLat("");
    setLng("");
    setRadius("1");
    setAddress("");
    setWorkFromHome(false);
    setFromDate("");
    setToDate("");
    setAssignLoading(false);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 mx-auto max-w-4xl text-gray-800 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-4 text-center">
        Assign Geo-Fence with Auto Address
      </h2>

      {/* Employee Selection */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Select Employees</h3>
        <input
          type="text"
          placeholder="Search by name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded mb-2 dark:bg-gray-900 dark:border-gray-700"
        />
        <button
          onClick={toggleSelectAll}
          className="mb-2 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded"
        >
          {selected.length === employees.length ? "Deselect All" : "Select All"}
        </button>
        <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border p-2 rounded dark:border-gray-700">
          {filteredEmployees.map((emp) => (
            <label key={emp.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(emp.id)}
                onChange={() => toggleSelect(emp.id)}
              />
              {emp.name}
            </label>
          ))}
        </div>
      </div>

      {/* Geo-Fence Assignment */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Define Geo-Fence</h3>

        <label className="font-medium flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={workFromHome}
            onChange={(e) => setWorkFromHome(e.target.checked)}
          />
          Allow Work From Home
        </label>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-medium">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="font-medium">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
        </div>

        {!workFromHome && (
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
              placeholder="Latitude"
            />
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
              placeholder="Longitude"
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full border p-2 rounded dark:bg-gray-900 dark:border-gray-700"
              placeholder="Radius (km)"
            />
            <button
              onClick={getGPSLocation}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center"
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              ) : (
                "📍 Use My GPS Location"
              )}
            </button>
          </div>
        )}

        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border p-2 rounded mb-4 dark:bg-gray-900 dark:border-gray-700"
          placeholder="Address or Zone Name"
        />

        <button
          onClick={assignLocation}
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700 w-full flex items-center justify-center"
          disabled={selected.length === 0 || assignLoading}
        >
          {assignLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              Assigning...
            </>
          ) : (
            "Assign Geo‑Fence"
          )}
        </button>
      </div>

      {/* Preview Assignments */}
      {assignments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
          <h3 className="font-semibold mb-2">Assigned Geo‑Zones</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border text-center text-sm dark:text-gray-200">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="p-2 border">Employee</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Latitude</th>
                  <th className="p-2 border">Longitude</th>
                  <th className="p-2 border">Radius</th>
                  <th className="p-2 border">Address</th>
                  <th className="p-2 border">WFH</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i}>
                    <td className="p-2 border">
                      {a.emp.name} ({a.emp.id})
                    </td>
                    <td className="p-2 border">{a.zone.date}</td>
                    <td className="p-2 border">{a.zone.lat}</td>
                    <td className="p-2 border">{a.zone.lng}</td>
                    <td className="p-2 border">{a.zone.radius}</td>
                    <td className="p-2 border">{a.zone.address}</td>
                    <td className="p-2 border">
                      {a.zone.workFromHome ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
