import { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Plus, Eye, CheckCircle2, X, Search, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';

// Department values come from the API (GET /brand/permissions/catalog
// teamDepartments); only a few older ones get a longer display label.
const DEPARTMENT_LABELS = {
  QA: 'Quality Assurance',
  Installation: 'Installation Team',
};
const userLabel = (u) => (u.employeeId ? `${u.name} (${u.employeeId})` : u.name);

function shape(team) {
  return {
    id: team.id,
    name: team.name,
    department: team.department,
    leadId: team.lead?.id || team.lead || '',
    lead: team.lead?.name || 'Unassigned',
    members: (team.members || []).filter((m) => m && typeof m === 'object'),
    membersCount: team.members?.length ?? 0,
    region: team.region || '—',
  };
}

const TeamsDepartments = () => {
  const { can } = useBrandPermissions();
  const canEdit = can('teams:edit');
  const [teams, setTeams] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [membersOf, setMembersOf] = useState(null); // team id whose members dialog is open
  const [memberToAdd, setMemberToAdd] = useState('');
  const [brandUsers, setBrandUsers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', department: '', lead: '', region: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Team lead is a User reference, so the picker needs the brand's users.
        const [teamData, userData, catalog] = await Promise.all([
          apiRequest('/brand/teams', { auth: true }),
          apiRequest('/brand/users', { auth: true }).catch(() => []),
          apiRequest('/brand/permissions/catalog', { auth: true }).catch(() => null),
        ]);
        if (cancelled) return;
        setTeams((Array.isArray(teamData) ? teamData : []).map(shape));
        setBrandUsers(Array.isArray(userData) ? userData : []);
        const depts = catalog?.teamDepartments || [];
        setDepartmentsList(depts);
        setNewTeam((t) => ({ ...t, department: t.department || depts[0] || '' }));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleAddTeam = async () => {
    if (!newTeam.name.trim() || !newTeam.region.trim()) {
      toast('Please fill in all team details!');
      return;
    }
    try {
      const created = await apiRequest('/brand/teams', {
        method: 'POST',
        auth: true,
        body: {
          name: newTeam.name,
          department: newTeam.department,
          region: newTeam.region,
          ...(newTeam.lead ? { lead: newTeam.lead } : {}),
        },
      });
      // The create response returns the raw lead id; resolve it locally so the
      // new row reads the same as the ones the list endpoint populated.
      const lead = brandUsers.find(u => u.id === newTeam.lead);
      setTeams(prev => [...prev, shape({ ...created, lead })]);
      setShowAddModal(false);
      setNewTeam({ name: '', department: departmentsList[0] || '', lead: '', region: '' });
      toast(`Team "${created.name}" created successfully!`);
    } catch (err) {
      setError(`Could not create team: ${err.message}`);
    }
  };

  const handleDeleteTeam = async (id, name) => {
    const previous = teams;
    setTeams(prev => prev.filter(t => t.id !== id));
    try {
      await apiRequest(`/brand/teams/${id}`, { method: 'DELETE', auth: true });
      toast(`Team "${name}" deleted!`);
    } catch (err) {
      setTeams(previous);
      setError(`Could not delete team: ${err.message}`);
    }
  };

  const reloadTeam = (updated) => {
    // Member add/remove responses carry raw ids; resolve them from the user list.
    const byId = Object.fromEntries(brandUsers.map((u) => [u.id, u]));
    const members = (updated.members || []).map((m) => byId[m] || byId[m?.id] || m).filter((m) => m && typeof m === 'object');
    setTeams((prev) => prev.map((t) => (t.id === updated.id ? { ...shape({ ...updated, members }), lead: t.lead } : t)));
  };

  const addMember = async (teamId) => {
    if (!memberToAdd) return;
    try {
      reloadTeam(await apiRequest(`/brand/teams/${teamId}/members`, { method: 'POST', auth: true, body: { userId: memberToAdd } }));
      setMemberToAdd('');
    } catch (err) {
      setError(`Could not add member: ${err.message}`);
    }
  };

  const removeMember = async (teamId, userId) => {
    try {
      reloadTeam(await apiRequest(`/brand/teams/${teamId}/members/${userId}`, { method: 'DELETE', auth: true }));
    } catch (err) {
      setError(`Could not remove member: ${err.message}`);
    }
  };

  const q = searchQ.toLowerCase();
  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (DEPARTMENT_LABELS[t.department] || t.department).toLowerCase().includes(q) ||
    t.lead.toLowerCase().includes(q) ||
    t.region.toLowerCase().includes(q)
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Teams & Departments" subtitle="Brand teams, their departments and members" />
        <div className="p-5 space-y-5">

          {/* Top Actions */}
          <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
              <input
                placeholder="Search teams by name, lead, region..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]"
              />
            </div>
            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus size={13} /> Create Team
              </button>
            )}
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading && <p className="col-span-full text-center py-10 text-xs font-semibold text-[#64748B]">Loading teams…</p>}
            {!loading && error && <p className="col-span-full text-center py-10 text-xs font-semibold text-red-600">{error}</p>}
            {!loading && !error && filteredTeams.length === 0 && (
              <p className="col-span-full text-center py-10 text-xs font-semibold text-[#64748B]">No teams created yet.</p>
            )}
            {filteredTeams.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-[#EEF4FF] text-[#0D47A1] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D0E2FF]">{DEPARTMENT_LABELS[t.department] || t.department}</span>
                    <span className="text-[10px] text-[#64748B] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded-full">{t.region}</span>
                  </div>
                  <h3 className="font-bold text-[#1E293B] text-sm mb-3 mt-1">{t.name}</h3>

                  <div className="space-y-2 border-t border-[#F1F5F9] pt-3 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Team Lead:</span>
                      <span className="font-bold text-[#1E293B]">{t.lead}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Active Members:</span>
                      <span className="font-semibold text-[#0D47A1]">{t.membersCount} Members</span>
                    </div>
                    {/* An "Active Complaints" figure used to sit here, but nothing
                        links a ServiceRequest to a Team, so there is no number to
                        show. Restore once ServiceRequest carries a team ref. */}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#F1F5F9]">
                  <button
                    onClick={() => { setMembersOf(t.id); setMemberToAdd(''); }}
                    className="flex-1 bg-[#EEF4FF] hover:bg-[#D0E2FF] text-[#0D47A1] py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye size={12} /> Members
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteTeam(t.id, t.name)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors border border-transparent hover:border-red-200"
                      title="Delete Team"
                      aria-label={`Delete team ${t.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] text-sm">Create Service Team</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi AC Repair Team"
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Department</label>
                <select
                  value={newTeam.department}
                  onChange={e => setNewTeam({ ...newTeam, department: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                >
                  {departmentsList.map(dept => (
                    <option key={dept} value={dept}>{DEPARTMENT_LABELS[dept] || dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Team Lead</label>
                {/* The API keys `lead` to a User document, so this is a picker over
                    the brand's users rather than a free-text name. */}
                <select
                  value={newTeam.lead}
                  onChange={e => setNewTeam({ ...newTeam, lead: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                >
                  <option value="">No lead assigned</option>
                  {brandUsers.map(u => (
                    <option key={u.id} value={u.id}>{userLabel(u)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Coverage Region / City</label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi / Noida"
                  value={newTeam.region}
                  onChange={e => setNewTeam({ ...newTeam, region: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 border border-[#E2E8F0] py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button onClick={handleAddTeam} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Create Team</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {membersOf && (() => {
        const team = teams.find((t) => t.id === membersOf);
        if (!team) return null;
        const memberIds = new Set(team.members.map((m) => m.id));
        const candidates = brandUsers.filter((u) => !memberIds.has(u.id));
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Members of ${team.name}`}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E2E8F0]">
              <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="font-bold text-[#1E293B] text-sm">Members of {team.name}</h3>
                <button onClick={() => setMembersOf(null)} aria-label="Close" className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-3">
                {team.members.length === 0 && <p className="text-xs text-[#64748B]">No members yet.</p>}
                <ul className="divide-y divide-[#F1F5F9]">
                  {team.members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2 text-xs">
                      <span>
                        <span className="font-semibold text-[#1E293B]">{m.name}</span>
                        <span className="text-[#64748B]">{m.employeeId ? ` · ${m.employeeId}` : ''}{m.department ? ` · ${m.department}` : ''}</span>
                      </span>
                      {canEdit && (
                        <button onClick={() => removeMember(team.id, m.id)} aria-label={`Remove ${m.name}`} className="p-1 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={12} /></button>
                      )}
                    </li>
                  ))}
                </ul>
                {canEdit && (
                  <div className="flex gap-2">
                    <select aria-label="User to add" value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)}
                      className="flex-1 border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]">
                      <option value="">Add a user…</option>
                      {candidates.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
                    </select>
                    <button onClick={() => addMember(team.id)} disabled={!memberToAdd} className="bg-[#0D47A1] text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50">Add</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default TeamsDepartments;
