import React, { useState, useEffect } from 'react';
import { taskAPI, teamAPI, userAPI, authAPI } from '../api';
import { useAuth } from '../contexts';
import { format, isBefore, addDays } from 'date-fns';
import toast from 'react-hot-toast';

// ─── MY TASKS ─────────────────────────────────────────────────────────────────
export function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('dueDate');

  useEffect(() => { taskAPI.getMy().then(({ data }) => setTasks(data.tasks)).finally(() => setLoading(false)); }, []);

  const updateStatus = async (id, status) => {
    try { await taskAPI.update(id, { status }); setTasks(p => p.map(t => t._id===id?{...t,status}:t)); toast.success(`→ ${status}`); }
    catch { toast.error('Failed'); }
  };

  const now = new Date();
  const counts = {
    all: tasks.length,
    active: tasks.filter(t=>t.status!=='done').length,
    done: tasks.filter(t=>t.status==='done').length,
    overdue: tasks.filter(t=>t.dueDate&&isBefore(new Date(t.dueDate),now)&&t.status!=='done').length,
    today: tasks.filter(t=>t.dueDate&&format(new Date(t.dueDate),'yyyy-MM-dd')===format(now,'yyyy-MM-dd')).length,
  };

  let filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter==='active') return t.status!=='done';
    if (filter==='done') return t.status==='done';
    if (filter==='overdue') return t.dueDate&&isBefore(new Date(t.dueDate),now)&&t.status!=='done';
    if (filter==='today') return t.dueDate&&format(new Date(t.dueDate),'yyyy-MM-dd')===format(now,'yyyy-MM-dd');
    return true;
  }).sort((a,b) => {
    if (sort==='priority') { const o={critical:0,high:1,medium:2,low:3}; return (o[a.priority]||3)-(o[b.priority]||3); }
    if (sort==='dueDate') return (a.dueDate||'9999')<(b.dueDate||'9999')?-1:1;
    return a.status.localeCompare(b.status);
  });

  const PC = { low:'var(--ok)', medium:'var(--warn)', high:'var(--orange)', critical:'var(--err)' };

  if (loading) return <div className="loader"><div className="spin" /></div>;

  return (
    <div style={{ maxWidth:880 }}>
      <div className="mb-6">
        <h1 style={{ fontSize:24 }}>My Tasks</h1>
        <p className="text-muted text-sm mt-1">{counts.active} active · {counts.done} done · {counts.overdue} overdue</p>
      </div>
      <div className="flex gap2 mb-4 wrap">
        {[['all','All'],['active','Active'],['today','Today'],['overdue','Overdue'],['done','Done']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding:'5px 13px', borderRadius:100, border:'1px solid', borderColor:filter===k?'var(--accent)':'var(--border)', background:filter===k?'var(--accent)':'transparent', color:filter===k?'#fff':'var(--text2)', fontSize:12.5, cursor:'pointer', transition:'all var(--tr)' }}>
            {l} {counts[k]>0&&<span style={{ opacity:.8 }}>({counts[k]})</span>}
          </button>
        ))}
      </div>
      <div className="flex gap3 mb-4">
        <input className="input" placeholder="Search tasks…" value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1 }} />
        <select className="select" value={sort} onChange={e=>setSort(e.target.value)} style={{ width:170 }}>
          <option value="dueDate">Sort by Due Date</option>
          <option value="priority">Sort by Priority</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>
      {!filtered.length ? <div className="empty"><span style={{fontSize:38}}>✅</span><h3>No tasks found</h3></div> : (
        <div className="flex col gap2">
          {filtered.map(t => {
            const overdue = t.dueDate&&isBefore(new Date(t.dueDate),now)&&t.status!=='done';
            return (
              <div key={t._id} className="card flex items-c gap3" style={{ padding:'14px 18px', borderLeft:`3px solid ${PC[t.priority]}`, opacity:t.status==='done'?.6:1 }}>
                <input type="checkbox" checked={t.status==='done'} onChange={() => updateStatus(t._id,t.status==='done'?'todo':'done')} style={{ width:17,height:17,accentColor:'var(--accent)',cursor:'pointer',flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:500, textDecoration:t.status==='done'?'line-through':'none' }} className="trunc">{t.title}</div>
                  <div className="flex gap3 text-sm text-muted mt-1 wrap">
                    {t.project&&<span>📁 {t.project.name}</span>}
                    {t.dueDate&&<span style={{ color:overdue?'var(--err)':'var(--muted)' }}>📅 {format(new Date(t.dueDate),'MMM d')}{overdue?' (overdue)':''}</span>}
                  </div>
                </div>
                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                <select className="select" value={t.status} onChange={e=>updateStatus(t._id,e.target.value)} style={{ padding:'4px 9px',fontSize:12,width:'auto' }}>
                  <option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="in-review">In Review</option><option value="done">Done</option><option value="blocked">Blocked</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TEAM ─────────────────────────────────────────────────────────────────────
const AVCOL = ['#7c6af7','#ec4899','#10e8a0','#f59e0b','#38bdf8','#a855f7'];
const avC = name => { let h=0; for(let c of (name||'')) h=c.charCodeAt(0)+((h<<5)-h); return AVCOL[Math.abs(h)%AVCOL.length]; };
const init = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??';
const RCOL = { admin:'var(--accent)', manager:'var(--purple)', member:'var(--ok)', owner:'var(--warn)' };

function TeamModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', description:'' });
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { const { data } = await teamAPI.create(form); toast.success('Team created!'); onCreated(data.team); }
    catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="backdrop"><div className="modal modal-sm">
      <div className="mhead"><h2 style={{ fontSize:17 }}>New Team</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
      <form onSubmit={submit}><div className="mbody">
        <div className="fg"><label className="flabel">Name *</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Engineering" required /></div>
        <div className="fg"><label className="flabel">Description</label><textarea className="textarea" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{ minHeight:60 }} /></div>
      </div>
      <div className="mfoot"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'…':'Create'}</button></div>
      </form>
    </div></div>
  );
}

export function Team() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [addEmail, setAddEmail] = useState('');
  const [addingTo, setAddingTo] = useState(null);

  useEffect(() => {
    Promise.all([teamAPI.getAll(), userAPI.getAll()])
      .then(([t,u]) => { setTeams(t.data.teams); setAllUsers(u.data.users); })
      .finally(() => setLoading(false));
  }, []);

  const handleAddMember = async teamId => {
    if (!addEmail.trim()) return; setAddingTo(teamId);
    try { const { data } = await teamAPI.addMember(teamId, { email: addEmail }); setTeams(p=>p.map(t=>t._id===teamId?data.team:t)); setAddEmail(''); toast.success('Added!'); }
    catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setAddingTo(null); }
  };

  if (loading) return <div className="loader"><div className="spin" /></div>;

  return (
    <div style={{ maxWidth:880 }}>
      <div className="flex jbet items-c mb-6">
        <div><h1 style={{ fontSize:24 }}>Team</h1><p className="text-muted text-sm mt-1">{teams.length} teams · {allUsers.length} members</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Team</button>
      </div>
      <div className="card mb-6">
        <h2 style={{ fontSize:15, marginBottom:14 }}>All Members ({allUsers.length})</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10 }}>
          {allUsers.map(u => (
            <div key={u._id} className="flex items-c gap2" style={{ padding:'9px 11px', background:'var(--elevated)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
              <div className="av av-sm" style={{ background:avC(u.name) }}>{init(u.name)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600 }} className="trunc">{u.name}</div>
                <div style={{ fontSize:11 }}><span style={{ color:RCOL[u.role]||'var(--muted)', fontWeight:600 }}>{u.role}</span>{u.department&&<span className="text-muted"> · {u.department}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {!teams.length ? <div className="empty"><span style={{fontSize:46}}>👥</span><h3>No teams yet</h3><button className="btn btn-primary mt-2" onClick={()=>setShowModal(true)}>Create Team</button></div>
        : teams.map(team => (
          <div key={team._id} className="card mb-4">
            <div className="flex jbet items-c" style={{ cursor:'pointer' }} onClick={() => setExpanded(p=>p===team._id?null:team._id)}>
              <div className="flex items-c gap3">
                <div style={{ width:40,height:40,borderRadius:9,background:'rgba(124,106,247,.15)',border:'1px solid rgba(124,106,247,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>👥</div>
                <div><div style={{ fontWeight:700, fontSize:15 }}>{team.name}</div><div className="text-sm text-muted">{team.members?.length||0} members</div></div>
              </div>
              <span className="text-muted">{expanded===team._id?'▲':'▼'}</span>
            </div>
            {team.description && <p className="text-sm text-2 mt-3">{team.description}</p>}
            {expanded===team._id && (
              <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                <div className="flex col gap2 mb-4">
                  {team.members?.map(m => (
                    <div key={m._id} className="flex items-c gap2">
                      <div className="av av-sm" style={{ background:avC(m.user?.name) }}>{init(m.user?.name)}</div>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{m.user?.name}</div><div className="text-sm text-muted">{m.user?.email}</div></div>
                      <span style={{ fontSize:11.5, padding:'2px 9px', background:'var(--overlay)', borderRadius:100, color:RCOL[m.role]||'var(--muted)' }}>{m.role}</span>
                    </div>
                  ))}
                </div>
                {team.owner?._id===user?._id && (
                  <div className="flex gap2">
                    <input className="input" type="email" placeholder="Add by email" value={addEmail} onChange={e=>setAddEmail(e.target.value)} style={{ flex:1 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddMember(team._id)} disabled={addingTo===team._id}>{addingTo===team._id?'…':'Add'}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      }
      {showModal && <TeamModal onClose={() => setShowModal(false)} onCreated={t => { setTeams(p=>[t,...p]); setShowModal(false); }} />}
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
export function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name:user?.name||'', bio:user?.bio||'', department:user?.department||'', skills:user?.skills?.join(', ')||'' });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [pwSaving, setPwSaving] = useState(false);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const pf = k => e => setPw(p=>({...p,[k]:e.target.value}));

  const saveProfile = async e => {
    e.preventDefault(); setSaving(true);
    try { const { data } = await authAPI.updateProfile({ ...form, skills:form.skills.split(',').map(s=>s.trim()).filter(Boolean) }); updateUser(data.user); toast.success('Profile updated!'); }
    catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setSaving(false); }
  };

  const changePw = async e => {
    e.preventDefault();
    if (pw.newPassword!==pw.confirm) { toast.error('Passwords do not match'); return; }
    setPwSaving(true);
    try { await authAPI.changePassword({ currentPassword:pw.currentPassword, newPassword:pw.newPassword }); toast.success('Password changed!'); setPw({ currentPassword:'', newPassword:'', confirm:'' }); }
    catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setPwSaving(false); }
  };

  return (
    <div style={{ maxWidth:620 }}>
      <h1 style={{ fontSize:24, marginBottom:24 }}>Profile</h1>
      <div className="card mb-4 flex items-c gap4">
        <div className="av av-lg" style={{ background:avC(user?.name) }}>{init(user?.name)}</div>
        <div>
          <div style={{ fontSize:19, fontWeight:700 }}>{user?.name}</div>
          <div className="text-sm text-muted mt-1">{user?.email}</div>
          <div className="flex gap2 mt-2">
            <span style={{ fontSize:12, padding:'2px 10px', background:'rgba(124,106,247,.15)', color:'var(--accent)', borderRadius:100, fontWeight:600 }}>{user?.role}</span>
            {user?.department&&<span style={{ fontSize:12, padding:'2px 10px', background:'var(--overlay)', color:'var(--text2)', borderRadius:100 }}>{user?.department}</span>}
          </div>
        </div>
      </div>
      <div className="card mb-4">
        <h2 style={{ fontSize:15, marginBottom:16 }}>Edit Profile</h2>
        <form onSubmit={saveProfile} className="flex col gap3">
          <div className="g2"><div className="fg"><label className="flabel">Full Name</label><input className="input" value={form.name} onChange={f('name')} required /></div><div className="fg"><label className="flabel">Department</label><input className="input" value={form.department} onChange={f('department')} placeholder="Engineering" /></div></div>
          <div className="fg"><label className="flabel">Bio</label><textarea className="textarea" value={form.bio} onChange={f('bio')} rows={2} style={{ minHeight:64 }} /></div>
          <div className="fg"><label className="flabel">Skills (comma-separated)</label><input className="input" value={form.skills} onChange={f('skills')} placeholder="React, Node.js" /></div>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ alignSelf:'flex-start' }}>{saving?'Saving…':'Save Changes'}</button>
        </form>
      </div>
      <div className="card">
        <h2 style={{ fontSize:15, marginBottom:16 }}>Change Password</h2>
        <form onSubmit={changePw} className="flex col gap3">
          <div className="fg"><label className="flabel">Current Password</label><input className="input" type="password" value={pw.currentPassword} onChange={pf('currentPassword')} required /></div>
          <div className="g2">
            <div className="fg"><label className="flabel">New Password</label><input className="input" type="password" value={pw.newPassword} onChange={pf('newPassword')} required minLength={6} /></div>
            <div className="fg"><label className="flabel">Confirm</label><input className="input" type="password" value={pw.confirm} onChange={pf('confirm')} required /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={pwSaving} style={{ alignSelf:'flex-start' }}>{pwSaving?'Updating…':'Update Password'}</button>
        </form>
      </div>
    </div>
  );
}

export default MyTasks;
