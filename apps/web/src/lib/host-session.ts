'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import type { HostProfile } from '@hbs/shared';

const PROFILE_KEY = 'host_profile';
const CHANGE_EVENT = 'host-session-changed';

/** Call after a successful host login/register to cache the profile and notify listeners. */
export function setHostProfile(profile: HostProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearHostSession() {
  api.clearTokens();
  localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readProfile(): HostProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HostProfile;
  } catch {
    return null;
  }
}

/** Reactive host session state — updates when login/register/logout happen anywhere in the app. */
export function useHostSession() {
  const [profile, setProfile] = useState<HostProfile | null>(null);
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
