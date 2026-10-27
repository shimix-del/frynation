import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Building2, Store, RefreshCw, X, Check, Pencil, Mail, Phone } from 'lucide-react';
import { User, Branch } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

export const StaffManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { branches, refreshBranches } = useBranch();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add staff modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'CASHIER'>('CASHIER');
  const [pinCode, setPinCode] = useState<string>('');
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit staff modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editRole, setEditRole] = useState<'OWNER' | 'MANAGER' | 'CASHIER'>('CASHIER');
  const [editBranchId, setEditBranchId] = useState<string>('');
  const [editPinCode, setEditPinCode] = useState<string>('');

  // Add branch modal state
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [branchName, setBranchName] = useState<string>('');
  const [branchCode, setBranchCode] = useState<string>('');
  const [branchAddress, setBranchAddress] = useState<string>('');
  const [branchPhone, setBranchPhone] = useState<string>('');
  const [branchTill, setBranchTill] = useState<string>('');
  const [branchPaybill, setBranchPaybill] = useState<string>('247247');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (u: User) => {
    setEditingUserId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditBranchId(u.branchId || branches[0]?.id || '');
    setEditPinCode('');
    setIsEditModalOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.createUser({
        name,
        email,
        phone,
        role,
        pinCode,
        branchId: role === 'OWNER' ? null : branchId,
      });
      setIsStaffModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPinCode('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create staff');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setIsSaving(true);
    try {
      await api.updateUser(editingUserId, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        role: editRole,
        branchId: editRole === 'OWNER' ? null : editBranchId,
        ...(editPinCode.trim() ? { pinCode: editPinCode.trim() } : {}),
      });
      setIsEditModalOpen(false);
      setEditingUserId('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.createBranch({
        name: branchName,
        code: branchCode,
        address: branchAddress,
        phone: branchPhone,
        tillNumber: branchTill,
        paybillNumber: branchPaybill,
      });
      setIsBranchModalOpen(false);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchPhone('');
      setBranchTill('');
      refreshBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to create branch');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-950">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-100 flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-brand-500" />
            <span>Staff Directory & Branch Management</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage staff roles, contact phone numbers, emails, and branch assignments
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {currentUser?.role === 'OWNER' && (
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Store className="w-4 h-4 text-brand-400" />
              <span>+ New Branch</span>
            </button>
          )}

          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
          <button
            onClick={fetchUsers}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl border border-zinc-800"
            title="Refresh staff"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Branches List Cards */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-brand-500" />
          <span>Active Restaurant Branches ({branches.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map(b => (
            <div
              key={b.id}
              className="bg-zinc-850 border border-zinc-750 rounded-2xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{b.name}</span>
                <span className="font-mono text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-md font-bold">
                  {b.code}
                </span>
              </div>
              {b.address && <div className="text-xs text-zinc-400">{b.address}</div>}
              <div className="text-xs space-y-0.5 pt-1 border-t border-zinc-750 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Order Hotline:</span>
                  <span className="font-mono font-bold text-amber-400">{b.phone || '0143285625'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Pochi la Biashara:</span>
                  <span className="font-mono font-bold text-safari-mpesa">0143285625</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Staff Count:</span>
                  <span className="font-semibold">{b._count?.users || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-white text-base">Staff Members Directory</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Owner can edit staff emails, phone numbers, branch assignments, and roles
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-medium">
            Click <span className="text-brand-400 font-bold">Edit</span> to update phone &amp; email
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Staff Name</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Role</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">Branch</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Email</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Phone</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">Status</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-850/60 transition group">
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-bold text-white flex items-center space-x-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-brand-500/10 text-brand-400 font-black flex items-center justify-center text-[10px] sm:text-xs shrink-0">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[110px] sm:max-w-none">{u.name}</span>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'OWNER'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : u.role === 'MANAGER'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold text-zinc-300 hidden sm:table-cell">
                    {u.branchName || 'All Branches'}
                  </td>
                  <td
                    onClick={() => openEditModal(u)}
                    className="py-2.5 sm:py-3 px-2 sm:px-4 text-zinc-300 hover:text-brand-400 cursor-pointer font-mono text-[11px]"
                    title="Click to edit email"
                  >
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-400 transition" />
                      <span>{u.email}</span>
                      <Pencil className="w-3 h-3 text-brand-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </td>
                  <td
                    onClick={() => openEditModal(u)}
                    className="py-2.5 sm:py-3 px-2 sm:px-4 text-zinc-300 hover:text-brand-400 cursor-pointer font-mono text-[11px]"
                    title="Click to edit phone number"
                  >
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition" />
                      <span className={u.phone ? 'font-bold text-amber-400' : 'text-zinc-500 italic'}>
                        {u.phone || '+ Add Phone'}
                      </span>
                      <Pencil className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      Active
                    </span>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-brand-500 hover:text-white text-zinc-300 border border-zinc-700 hover:border-brand-500 rounded-xl text-xs font-bold transition inline-flex items-center space-x-1.5"
                      title="Edit staff details"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <div>
                <h3 className="font-bold text-white text-base">Edit Staff Member</h3>
                <p className="text-[11px] text-zinc-400">Update email, phone number, and access role</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. John Kamau"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-400" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="name@nanifrys.co.ke"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="e.g. 0712345678 or 0143285625"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Direct phone number for order updates and staff contact</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Role *</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value="CASHIER">Cashier / Waiter</option>
                    <option value="MANAGER">Branch Manager</option>
                    {currentUser?.role === 'OWNER' && <option value="OWNER">Owner / Admin</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Reset PIN Code
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={editPinCode}
                    onChange={e => setEditPinCode(e.target.value)}
                    placeholder="Leave blank to keep"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {editRole !== 'OWNER' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Branch *</label>
                  <select
                    value={editBranchId}
                    onChange={e => setEditBranchId(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <h3 className="font-bold text-white text-base">Add New Staff Member</h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Kamau"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="john@nanifrys.co.ke"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0712345678"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    <option value="CASHIER">Cashier / Waiter</option>
                    <option value="MANAGER">Branch Manager</option>
                    {currentUser?.role === 'OWNER' && <option value="OWNER">Owner / Admin</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    4-Digit POS PIN *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    placeholder="e.g. 5678"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-brand-400 font-mono font-black focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {role !== 'OWNER' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Branch *</label>
                  <select
                    value={branchId}
                    onChange={e => setBranchId(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-brand-500"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-2xl shadow-lg"
                >
                  {isSaving ? 'Saving...' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <h3 className="font-bold text-white text-base">Add New Restaurant Branch</h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Branch Name *</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="e.g. Mombasa Road Branch"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    value={branchCode}
                    onChange={e => setBranchCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MSA04"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-brand-400 font-mono font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">M-Pesa Till #</label>
                  <input
                    type="text"
                    value={branchTill}
                    onChange={e => setBranchTill(e.target.value)}
                    placeholder="e.g. 5428904"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-safari-mpesa font-mono font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Address / Street</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={e => setBranchAddress(e.target.value)}
                  placeholder="e.g. Nextgen Mall, Mombasa Rd"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-2xl shadow-lg"
                >
                  {isSaving ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
