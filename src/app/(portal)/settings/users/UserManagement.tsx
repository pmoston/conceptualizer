"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

const ROLE_META: Record<UserRole, { label: string; color: string; description: string }> = {
  ADMIN:      { label: "Admin",      color: "bg-red-50 text-red-600",    description: "Full access including user management" },
  CONSULTANT: { label: "Consultant", color: "bg-blue-50 text-blue-600",  description: "Create/edit projects, run agents" },
  VIEWER:     { label: "Viewer",     color: "bg-gray-100 text-gray-500", description: "Read-only access" },
};

export default function UserManagement({ users: initial }: { users: User[] }) {
  const router  = useRouter();
  const [users, setUsers]       = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "CONSULTANT" as UserRole });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res  = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      setUsers(u => [...u, data]);
      setForm({ email: "", name: "", password: "", role: "CONSULTANT" });
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id: string, role: UserRole) {
    const res  = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
      router.refresh();
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) setUsers(u => u.map(x => x.id === id ? { ...x, isActive: !isActive } : x));
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers(u => u.filter(x => x.id !== id));
    else alert("Could not delete user — they may be protected.");
  }

  return (
    <div className="space-y-6">
      {/* Role legend */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Roles</p>
        <div className="space-y-2">
          {(Object.keys(ROLE_META) as UserRole[]).map(role => (
            <div key={role} className="flex items-center gap-3 text-sm">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-20 text-center ${ROLE_META[role].color}`}>
                {ROLE_META[role].label}
              </span>
              <span className="text-gray-500">{ROLE_META[role].description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User list */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-[#1c1e3b]">{users.length} user{users.length !== 1 ? "s" : ""}</h2>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 text-xs bg-[#b3cc26] text-[#1c1e3b] font-semibold px-3 py-1.5 rounded-lg hover:brightness-105 transition"
          >
            <Plus size={12} /> Add User
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="px-5 py-4 border-b border-gray-50 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Password * (min 8 chars)</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                >
                  <option value="CONSULTANT">Consultant</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#b3cc26] text-[#1c1e3b] font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-105 disabled:opacity-50 transition"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? "Creating…" : "Create User"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-[#1c1e3b] px-3 py-2">
                Cancel
              </button>
            </div>
          </form>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(user => (
              <tr key={user.id} className={`hover:bg-gray-50 transition ${!user.isActive ? "opacity-50" : ""}`}>
                <td className="px-5 py-3">
                  <p className="font-medium text-[#1c1e3b]">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#b3cc26]"
                  >
                    <option value="CONSULTANT">Consultant</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(user.id, user.isActive)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-gray-300 hover:text-red-500 transition"
                    title="Delete user"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
