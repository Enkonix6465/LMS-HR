import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export function usePolls() {
  const [polls, setPolls] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'polls'), (snap) => {
      const arr = [];
      snap.forEach(doc => {
        arr.push({ id: doc.id, ...doc.data() });
      });
      setPolls(arr);
    });
    return () => unsub();
  }, []);
  return polls;
} 