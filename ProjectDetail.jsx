import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI } from '../api';
import { useAuth } from '../contexts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const SC = { todo:'#818cf8','in-progress':'#fbbf24','in-review':'#a78bfa',done:'#10e8a0',blocked:'#f43f5e' };
const AVCOL = ['#7c6af7','#ec4899','#10e8a0','#f59e0b','#38bdf8'];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('developer');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([projectAPI.getById(id), taskAPI.getAll({ project: id, limit: 100 }), projectAPI.getStats(id)])
      .then(([p, t, s]) => { setProject(p.data.project); setTasks(t.data.tasks); setStats(s.data.stats); })
      .finally(() => setLoading(false));
  }, [id]);

  const addMember = async e => {
    e.preventDefault(); setAdding(true);
    try { const { data } = await projectAPI.addMember(id, { email: memberEmail, role: memberRole }); setProject(data.project); setMemberEmail(''); toast.success('Member added!'); }
    catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setAdding(false); }
  };

  const removeMember = async uid => {
    if (!window.confirm('Remove member?')) return;
    try { await projectAPI.removeMember(id, uid); setProject(p => ({ ...p, members: p.members.filter(m => m.user._id !== uid) })); toast.success('Removed'); }
    catch { toast.error('Failed'); }
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete project and all tasks? This cannot be undone.')) return;
    try { await projectAPI.delete(id); toast.success('Project deleted'); navigate('/projects'); }
    catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="loader"><div className="spin" /></div>;
  if (!project) return <div className="empty"><h3>Project not found</h3></div>;

  const isOwner = project.owner?._id === user?._id || project.owner === user?._id;
  const tabs = ['overview','tasks','members', ...(isOwner ? ['settings'] : [])];

  return (
    <div style={{ maxWidth: 1050 }}>
      <div className="flex jbet items-start mb-6 wrap gap3">
        <div className="flex gap3 items-start">
          <div style={{ width: 52, height: 52, borderRadius: 13, display:'flex',alignItems:'center',justifyContent:'center', fontSize:26, background:`${project.color}20`, border:`1px solid ${project.color}50`, flexShrink:0 }}>{project.icon}</div>
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 6 }}>{project.name}</h1>
            <div className="flex gap2 wrap">
              <span className={`badge badge-${project.priority}`}>{project.priority}</span>
              {project.dueDate && <span className="text-sm text-muted">Due {format(new Date(project.dueDate),'MMM d, yyyy')}</span>}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/projects/${id}/board`)}>📋 Open Board</button>
      </div>

      <div className="tabs">
        {tabs.map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>)}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:20 }}>
            {[{l:'Total Tasks',v:stats?.total||0,i:'📋'},{l:'In Progress',v:stats?.byStatus?.['in-progress']||0,i:'⚡'},{l:'Completed',v:stats?.byStatus?.done||0,i:'✅'},{l:'Overdue',v:stats?.overdue||0,i:'🚨'},{l:'Est. Hours',v:stats?.totalEstimatedHours||0,i:'⏱'}].map(s => (
              <div key={s.l} className="card" style={{ textAlign:'center', padding:16 }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.i}</div>
                <div style={{ fontSize:22, fontWeight:800, fontFamily:'Syne' }}>{s.v}</div>
                <div className="text-sm text-muted">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="card mb-4">
            <div className="flex jbet mb-2"><span style={{ fontSize:14, fontWeight:600 }}>Overall Progress</span><span style={{ fontWeight:700, color:'var(--accent)' }}>{project.progress}%</span></div>
            <div className="pbar" style={{ height:10 }}><div className="pfill" style={{ width:`${project.progress}%` }} /></div>
          </div>
          {project.description && <div className="card mb-4"><h3 style={{ fontSize:14, marginBottom:10 }}>Description</h3><p style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.6 }}>{project.description}</p></div>}
          {project.tags?.length > 0 && <div className="card"><h3 style={{ fontSize:14, marginBottom:12 }}>Tags</h3><div className="flex gap2 wrap">{project.tags.map(t => <span key={t} className="tag">{t}</span>)}</div></div>}
        </>
      )}

      {tab === 'tasks' && (
        <>
          <div className="flex jbet items-c mb-4"><h2 style={{ fontSize:17 }}>All Tasks ({tasks.length})</h2><button className="btn btn-primary btn-sm" onClick={() => navigate(`/projects/${id}/board`)}>+ Add via Board</button></div>
          {!tasks.length ? <div className="empty"><span style={{fontSize:38}}>📋</span><h3>No tasks yet</h3></div> : (
            <div className="flex col gap2">
              {tasks.map(t => (
                <div key={t._id} className="card flex items-c gap3" style={{ padding:'13px 17px' }}>
                  <span style={{ width:9,height:9,borderRadius:'50%',background:SC[t.status],flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13.5, fontWeight:500 }}>{t.title}</div>
                    {t.dueDate && <div className="text-sm text-muted mt-1">Due: {format(new Date(t.dueDate),'MMM d')}</div>}
                  </div>
                  <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                  <span className={`badge badge-${t.status}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'members' && (
        <>
          {isOwner && (
            <div className="card mb-4">
              <h3 style={{ fontSize:14, marginBottom:14 }}>Add Member</h3>
              <form onSubmit={addMember} className="flex gap3 wrap">
                <input className="input" type="email" placeholder="member@email.com" value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} style={{ flex:1, minWidth:200 }} required />
                <select className="select" value={memberRole} onChange={e=>setMemberRole(e.target.value)} style={{ width:140 }}>
                  <option value="developer">Developer</option><option value="manager">Manager</option><option value="viewer">Viewer</option>
                </select>
                <button className="btn btn-primary" type="submit" disabled={adding}>{adding?'…':'Add'}</button>
              </form>
            </div>
          )}
          <div className="flex col gap2">
            {project.members?.map((m,i) => (
              <div key={m._id} className="card flex items-c gap3" style={{ padding:'13px 17px' }}>
                <div style={{ width:38,height:38,borderRadius:'50%',background:AVCOL[i%AVCOL.length],color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,flexShrink:0 }}>{m.user?.name?.[0]?.toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{m.user?.name}</div>
                  <div className="text-sm text-muted">{m.user?.email}</div>
                </div>
                <span style={{ fontSize:12, padding:'2px 10px', background:'var(--overlay)', borderRadius:100, color:'var(--text2)' }}>{m.role}</span>
                {isOwner && m.user?._id !== user?._id && <button className="btn btn-ghost btn-sm" style={{ color:'var(--err)' }} onClick={() => removeMember(m.user._id)}>Remove</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'settings' && isOwner && (
        <div className="card" style={{ maxWidth:460, borderTop:'3px solid var(--err)' }}>
          <h3 style={{ fontSize:14, marginBottom:8, color:'var(--err)' }}>Danger Zone</h3>
          <p className="text-sm text-muted mb-4">Deleting this project will also delete all its tasks. This cannot be undone.</p>
          <button className="btn btn-danger" onClick={deleteProject}>Delete Project</button>
        </div>
      )}
    </div>
  );
}
