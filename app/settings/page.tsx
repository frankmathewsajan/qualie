'use client';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Shield, User, Phone, Save, Check, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getUserId } from '@/lib/userId';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface UserSettings {
  displayName: string;
  emergencyContacts: EmergencyContact[];
}

const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  emergencyContacts: [{ name: '', phone: '', relationship: '' }],
};

export default function SettingsPage() {
  const userId = useMemo(() => getUserId(), []);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing settings from Firestore
  useEffect(() => {
    async function loadSettings() {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings({
            displayName: data.displayName || data.name || '',
            emergencyContacts: data.emergencyContacts?.length
              ? data.emergencyContacts
              : [{ name: '', phone: '', relationship: '' }],
          });
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [userId]);

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setSettings((prev) => {
      const contacts = [...prev.emergencyContacts];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, emergencyContacts: contacts };
    });
    setSaved(false);
  };

  const addContact = () => {
    setSettings((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: '', phone: '', relationship: '' }],
    }));
  };

  const removeContact = (index: number) => {
    if (settings.emergencyContacts.length <= 1) return;
    setSettings((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      // Filter out empty contacts
      const validContacts = settings.emergencyContacts.filter(
        (c) => c.name.trim() || c.phone.trim()
      );

      await setDoc(doc(db, 'users', userId), {
        userId,
        name: settings.displayName || `User ${userId}`,
        displayName: settings.displayName,
        emergencyContacts: validContacts.length > 0 ? validContacts : [],
        emergencyContact: validContacts.length > 0 ? validContacts[0].phone : null,
        updatedAt: new Date(),
      }, { merge: true });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen font-sans"
         style={{ background: 'linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)' }}>

      {/* Header */}
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/listen"
            className="w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center hover:shadow-md transition-shadow">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-slate-700">Settings</p>
            <p className="text-[10px] font-mono text-slate-400">Configure your Aegis profile</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/60 rounded-full px-2.5 py-1 border border-white/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-bold text-slate-600 tracking-wider font-mono">{userId}</span>
        </div>
      </header>

      <div className="px-5 pb-8 max-w-lg mx-auto space-y-4">

        {/* User ID Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white/90 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-indigo-50">
              <Shield className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Your Aegis ID</p>
              <p className="text-xs text-slate-400">This identifies you to emergency operators</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-center">
            <span className="text-3xl font-black font-mono text-slate-800 tracking-[0.3em]">{userId}</span>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Share this ID with your emergency contacts so they can identify your alerts
          </p>
        </div>

        {/* Display Name */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white/90 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-sky-50">
              <User className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Display Name</p>
              <p className="text-xs text-slate-400">Shown to operators alongside your ID</p>
            </div>
          </div>
          <input
            type="text"
            value={settings.displayName}
            onChange={(e) => { setSettings(s => ({ ...s, displayName: e.target.value })); setSaved(false); }}
            placeholder="Enter your name"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm border border-white/90 p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-red-50">
              <Phone className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Emergency Contacts</p>
              <p className="text-xs text-slate-400">People to notify when an alert triggers</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {settings.emergencyContacts.map((contact, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    Contact {index + 1}
                  </span>
                  {settings.emergencyContacts.length > 1 && (
                    <button
                      onClick={() => removeContact(index)}
                      className="text-[10px] text-red-400 hover:text-red-600 font-medium transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                  placeholder="Contact name"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                />
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  placeholder="Phone number (e.g. +1 555-0123)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                />
                <input
                  type="text"
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                  placeholder="Relationship (e.g. Parent, Friend)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                />
              </div>
            ))}
          </div>

          <button
            onClick={addContact}
            className="mt-3 w-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            + Add another contact
          </button>
        </div>

        {/* How it works */}
        <div className="bg-amber-50/80 backdrop-blur-sm rounded-2xl border border-amber-100 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm mb-1">How Emergency Alerts Work</p>
              <ul className="text-xs text-amber-700 space-y-1 leading-relaxed">
                <li>• When noise exceeds the threshold or a distress keyword is detected, Aegis automatically triggers an alert</li>
                <li>• Your emergency contacts will receive a WhatsApp message with your GPS location</li>
                <li>• Emergency operators on the dashboard can also see your alert and send you messages</li>
                <li>• Make sure your contacts have WhatsApp installed and your phone number is correct</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={saveSettings}
          disabled={saving || loading}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all shadow-sm ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-900 hover:bg-slate-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 animate-spin" style={{ borderTopColor: 'white' }} />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-400 text-center pb-4">
          Settings are stored securely and linked to your Aegis ID ({userId})
        </p>
      </div>
    </div>
  );
}
