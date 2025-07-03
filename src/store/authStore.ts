import { create } from 'zustand';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface UserData {
  uid: string;
  email: string | null;
  role: string;
  fullName: string;
  department?: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setUserData: (userData: UserData | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  loading: true,
  signIn: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      set({ user: userCredential.user });
      
      // Fetch additional user data from Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', userCredential.user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserData;
        set({ userData });
      }
      
      toast.success('Successfully signed in!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  },
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      set({ user: null, userData: null });
      toast.success('Successfully signed out!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  },
  setUser: (user) => set({ user, loading: false }),
  setUserData: (userData) => set({ userData }),
}));

// Initialize auth state listener
onAuthStateChanged(auth, async (user) => {
  const state = useAuthStore.getState();
  if (user) {
    // Fetch user data when auth state changes
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data() as UserData;
      state.setUserData(userData);
    }
  } else {
    state.setUserData(null);
  }
  state.setUser(user);
});