'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, FieldLabel } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    notifications: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const res = await api.get('/auth/guest/me');
      if (res.success && res.data) {
        setProfile({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          notifications: true,
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    // In a real app, we'd have a PUT /auth/guest/profile endpoint
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container-custom pt-32 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-surface-900 mb-2">Account Settings</h1>
          <p className="text-surface-500">Manage your personal information and booking preferences.</p>
        </div>

        <div className="grid gap-8">
          {/* Personal Information */}
          <section className="card p-8 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-surface-900">Personal Details</h2>
              <Badge tone="neutral">Guest Account</Badge>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 ..."
                />
              </div>
            </div>

            <div className="pt-6 border-t border-surface-200 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="px-8"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </section>

          {/* Preferences */}
          <section className="card p-8 space-y-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Preferences</h2>
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-100 border border-surface-200">
              <div>
                <p className="font-medium text-surface-900">Email Notifications</p>
                <p className="text-sm text-surface-500">Receive booking confirmations and special offers</p>
              </div>
              <input
                type="checkbox"
                checked={profile.notifications}
                onChange={(e) => setProfile({ ...profile, notifications: e.target.checked })}
                className="w-5 h-5 rounded accent-brand-500 cursor-pointer"
              />
            </div>
          </section>

          {/* Security */}
          <section className="card p-8 space-y-6">
            <h2 className="text-xl font-semibold text-surface-900 mb-4">Security</h2>
            <div className="grid gap-4">
              <Button variant="outline" className="w-full justify-start text-left py-6">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start text-left py-6 text-red-500 hover:text-red-600 border-red-100 hover:border-red-200">
                Delete Account
              </Button>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
