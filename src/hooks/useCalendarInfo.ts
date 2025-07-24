import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export function useCalendarInfo() {
  const [calendarDays, setCalendarDays] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'calendarDays')).then(snap => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setCalendarDays(arr);
    });
    getDocs(collection(db, 'customEvents')).then(snap => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setCustomEvents(arr);
    });
  }, []);
  return { calendarDays, customEvents };
} 