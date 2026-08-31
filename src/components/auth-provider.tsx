"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, User, createUserWithEmailAndPassword, onIdTokenChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getRecord, setRecord } from "@/lib/firestore-data";
import type { UserProfile } from "@/types";

type AuthContextValue = {
  user: UserProfile | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>; logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(firebaseUser: User): Promise<UserProfile> {
  const existing = await getRecord<UserProfile>(`users/${firebaseUser.uid}`);
  if (existing) return existing;
  const profile: UserProfile = {
    uid:firebaseUser.uid, email:firebaseUser.email ?? "", username:"",
    displayName:firebaseUser.displayName ?? "", avatar:firebaseUser.photoURL ?? "",
    bio:"", location:"", website:"", role:"USER"
  };
  await setRecord(`users/${firebaseUser.uid}`, profile, false);
  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  const refreshProfile = async () => {
    if (!auth?.currentUser) return;
    setUser(await loadProfile(auth.currentUser));
  };

  useEffect(() => {
    if (!auth) return;
    return onIdTokenChanged(auth, async next => {
      try {
        if (next) {
          const token = await next.getIdToken();
          await fetch("/api/session", { method:"POST", headers:{ Authorization:`Bearer ${token}` } });
          setUser(await loadProfile(next));
        } else {
          await fetch("/api/session", { method:"DELETE" });
          setUser(null);
        }
      }
      finally { setLoading(false); }
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading,
    login: async (email, password) => {
      if (!auth) throw new Error("Firebase is not configured");
      const result = await signInWithEmailAndPassword(auth, email, password); setUser(await loadProfile(result.user));
    },
    register: async (email, password) => {
      if (!auth) throw new Error("Firebase is not configured");
      const result = await createUserWithEmailAndPassword(auth, email, password); setUser(await loadProfile(result.user));
    },
    googleLogin: async () => {
      if (!auth) throw new Error("Firebase is not configured");
      const result = await signInWithPopup(auth, new GoogleAuthProvider()); setUser(await loadProfile(result.user));
    },
    logout: async () => { await fetch("/api/session", { method:"DELETE" }); if (auth) await signOut(auth); setUser(null); },
    refreshProfile
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
