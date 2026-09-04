'use client';

import { useEffect, useState } from 'react';
import { adminApi } from './api';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
}

const PROFILE_KEY = 'admin_profile';
const CHANGE_EVENT = 'admin-session-changed';

export function setAdminProfile(profile: AdminProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearAdminSession() {
  adminApi.clearTokens();
  localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readProfile(): AdminProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminProfile;
  } catch {
    return null;
  }
}

export function useAdminSession() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(readProfile());
    setReady(true);

    const onChange = () => setProfile(readProfile());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return { profile, isLoggedIn: !!profile, ready };
}
