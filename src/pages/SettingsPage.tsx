import React, { useState } from 'react';
import { Save, Shield, User, Bell, Sliders, Server } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types/veritas';
import { veritasApi } from '../services/api';

export function SettingsPage() {
  const { user, updateUser, addToast } = useApp();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [institution, setInstitution] = useState(user.institution);
  const [department, setDepartment] = useState(user.department);
  const [role, setRole] = useState<UserRole>(user.role);

  const [defaultLevel, setDefaultLevel] = useState('Undergraduate');
  const [autoExpandEvidence, setAutoExpandEvidence] = useState(true);
  const [notifyApproval, setNotifyApproval] = useState(true);
  const [notifyPipeline, setNotifyPipeline] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = name.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();

    updateUser({
      name: name.trim(),
      email: email.trim(),
      institution: institution.trim(),
      department: department.trim(),
      role,
      initials,
    });

    addToast({
      type: 'success',
      title: 'Settings Saved',
      description: `Profile and role (${role}) updated.`,
    });
  };

  return (
    <form onSubmit={handleSave} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Manage your Veritas profile, reviewer role permissions, and notification preferences.
        </p>
      </div>

      {/* User Profile */}
      <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="w-4 h-4 text-[#635BFF]" />
          <h2 className="text-sm font-semibold text-[#182238]">User Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1">
              Academic Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1">
              Institution
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            />
          </div>
        </div>
      </section>

      {/* User Role */}
      <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-4 h-4 text-[#18BFA0]" />
          <h2 className="text-sm font-semibold text-[#182238]">User Role</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['Author', 'Reviewer'] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`text-left p-4 rounded-[10px] border transition-all ${
                role === r
                  ? 'border-[#635BFF] bg-[#635BFF]/[0.04] ring-2 ring-[#635BFF]/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-semibold text-[#182238]">{r}</p>
              <p className="text-xs text-[#64748B] mt-1">
                {r === 'Author'
                  ? 'Submit science questions, draft explanations, and monitor live verification workflows.'
                  : 'Authorized to approve, reject, or request changes on completed reviews before publication.'}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Account Preferences & Notification Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-[#635BFF]" />
            <h2 className="text-sm font-semibold text-[#182238]">
              Account Preferences
            </h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1">
              Default Academic Level
            </label>
            <select
              value={defaultLevel}
              onChange={(e) => setDefaultLevel(e.target.value)}
              className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm text-[#182238]"
            >
              <option>School</option>
              <option>Undergraduate</option>
              <option>Postgraduate</option>
              <option>Research</option>
            </select>
          </div>

          <label className="flex items-center justify-between gap-3 text-xs text-[#182238] cursor-pointer">
            <span>Auto-expand supporting evidence cards</span>
            <input
              type="checkbox"
              checked={autoExpandEvidence}
              onChange={(e) => setAutoExpandEvidence(e.target.checked)}
              className="rounded accent-[#635BFF]"
            />
          </label>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="text-sm font-semibold text-[#182238]">
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-3 text-xs text-[#182238]">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Pending human approval alerts</span>
              <input
                type="checkbox"
                checked={notifyApproval}
                onChange={(e) => setNotifyApproval(e.target.checked)}
                className="rounded accent-[#635BFF]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Multi-agent pipeline completion alerts</span>
              <input
                type="checkbox"
                checked={notifyPipeline}
                onChange={(e) => setNotifyPipeline(e.target.checked)}
                className="rounded accent-[#635BFF]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Reviewer change-request notifications</span>
              <input
                type="checkbox"
                checked={notifyChanges}
                onChange={(e) => setNotifyChanges(e.target.checked)}
                className="rounded accent-[#635BFF]"
              />
            </label>
          </div>
        </section>
      </div>

      {/* System Information */}
      <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Server className="w-4 h-4 text-[#64748B]" />
          <h2 className="text-sm font-semibold text-[#182238]">
            System Information
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-[#64748B]">Platform</p>
            <p className="font-semibold text-[#182238] mt-0.5">
              Veritas Multi-Agent Review v2.4
            </p>
          </div>
          <div>
            <p className="text-[#64748B]">Pipeline Architecture</p>
            <p className="font-semibold text-[#182238] mt-0.5">
              Analyze → Retrieve → Verify → Review → Correct
            </p>
          </div>
          <div>
            <p className="text-[#64748B]">API Integration Mode</p>
            <p className="font-semibold text-[#0E8A73] mt-0.5">
              {veritasApi.isRemoteBackendConfigured()
                ? 'Connected to Remote REST Backend'
                : 'REST Client Ready (Local State Adapter)'}
            </p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-sm font-medium shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </form>
  );
}
