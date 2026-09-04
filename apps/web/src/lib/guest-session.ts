'use client';

import { useEffect, useState } from 'react';
import { guestApi } from './api';

export interface GuestProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

const PROFILE_KEY = 'guest_profile';
const CHANGE_EVENT = 'guest-session-changed';

/** Call after a successful guest login/register to cache the profile and notify listeners (e.g. the header). */
export function setGuestProfile(profile: GuestProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearGuestSession() {
  guestApi.clearTokens();
  localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readProfile(): GuestProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuestProfile;
  } catch {
    return null;
  }
}

/** Reactive guest session state — updates when login/register/logout happen anywhere in the app. */
export function useGuestSession() {
  const [profile, setProfile] = useState<GuestProfile | null>(null);
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
