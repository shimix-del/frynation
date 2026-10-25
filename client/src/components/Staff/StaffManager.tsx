import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, KeyRound, Building2, Store, RefreshCw, X, Check } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffActive, setStaffActive] = useState(true);

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

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const changes = {
        name,
        email,
        phone,
        role,
        ...(pinCode ? { pinCode } : {}),
        ...(editingId ? { isActive: staffActive } : {}),
        branchId: role === 'OWNER' ? null : branchId,
      };
      if (editingId) await api.updateUser(editingId, changes);
      else await api.createUser(changes);
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
            <span>Staff Roles & Multi-Branch Directory</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage cashier PIN codes, branch assignments, M-Pesa Tills, and access levels
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
            onClick={() => { setEditingId(null); setName(''); setEmail(''); setPhone(''); setPinCode(''); setRole('CASHIER'); setStaffActive(true); setIsStaffModalOpen(true); }}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
          <button
            onClick={fetchUsers}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl border border-zinc-800"
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
        <h3 className="font-extrabold text-white text-base">Staff Members & Fast PIN Logins</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/70 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Staff Name</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Role</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">Branch</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden md:table-cell">Email</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden lg:table-cell">Phone</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4">Access</th>
                <th className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-800/40">
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
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-semibold text-zinc-300 hidden sm:table-cell">{u.branchName || 'All Branches'}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-zinc-400 hidden md:table-cell">{u.email}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-zinc-400 hidden lg:table-cell">{u.phone || '-'}</td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 font-mono font-bold text-brand-400">
                    {currentUser?.role === 'OWNER' && <button className="bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700 text-xs" onClick={() => {
                      setEditingId(u.id); setName(u.name); setEmail(u.email); setPhone(u.phone || '');
                      setRole(u.role); setBranchId(u.branchId || ''); setPinCode(''); setStaffActive(u.isActive !== false); setIsStaffModalOpen(true);
                    }}>Edit access</button>}
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 hidden sm:table-cell">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      {u.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <h3 className="font-bold text-white text-base">{editingId ? 'Edit Staff Access' : 'Add New Staff Member'}</h3>
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
                    {editingId ? 'New PIN (leave blank to keep current)' : '4-Digit POS PIN *'}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    placeholder="e.g. 5678"
                    required={!editingId}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-3.5 py-2 text-xs text-brand-400 font-mono font-black focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {editingId && <label className="flex gap-2 text-sm text-zinc-200"><input type="checkbox" checked={staffActive} onChange={e => setStaffActive(e.target.checked)} />Allow staff login</label>}
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
                  {isSaving ? 'Saving...' : editingId ? 'Save Access' : 'Create Staff'}
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
