import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const COLORS = ['#7c6af7','#ec4899','#10e8a0','#f59e0b','#38bdf8','#a855f7','#f97316'];
const ICONS = ['📋','🚀','⚡','🎯','💡','🔥','🌊','🎨','🔬','🏗️','🧩','🛡️'];
const statusClass = s => ({ planning:'badge-planning', active:'badge-active', 'on-hold':'badge-on-hold', completed:'badge-completed' }[s] || 'badge-planning');

function Modal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name:'', description:'', status:'planning', priority:'medium', color:COLORS[0], icon:ICONS[0], dueDate:'', tags:'' });
  const [loading, setLoading] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await projectAPI.create({ ...form, tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean) });
      toast.success('Project created!'); onCreated(data.project);
    } catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="backdrop">
      <div className="modal modal-md">
        <div className="mhead"><h2 style={{ fontSize: 17 }}>New Project</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="mbody">
            <div className="flex gap3">
              <div className="fg" style={{ flex: 1 }}><label className="flabel">Name *</label><input className="input" placeholder="My project" value={form.name} onChange={f('name')} required /></div>
              <div className="fg"><label className="flabel">Icon</label><select className="select" value={form.icon} onChange={f('icon')} style={{ width: 72 }}>{ICONS.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
            </div>
            <div className="fg"><label className="flabel">Description</label><textarea className="textarea" value={form.description} onChange={f('description')} rows={2} placeholder="What's this about?" style={{ minHeight: 70 }} /></div>
            <div className="g2">
              <div className="fg"><label className="flabel">Status</label><select className="select" value={form.status} onChange={f('status')}><option value="planning">Planning</option><option value="active">Active</option><option value="on-hold">On Hold</option><option value="completed">Completed</option></select></div>
              <div className="fg"><label className="flabel">Priority</label><select className="select" value={form.priority} onChange={f('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            </div>
            <div className="g2">
              <div className="fg"><label className="flabel">Due Date</label><input className="input" type="date" value={form.dueDate} onChange={f('dueDate')} /></div>
              <div className="fg"><label className="flabel">Color</label>
                <div className="flex gap2 wrap" style={{ paddingTop: 6 }}>
                  {COLORS.map(c => <div key={c} onClick={() => setForm(p=>({...p,color:c}))} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color===c?'2px solid #fff':'2px solid transparent', outline: form.color===c?`2px solid ${c}`:'none', transition: 'all .15s' }} />)}
                </div>
              </div>
            </div>
            <div className="fg"><label className="flabel">Tags (comma-separated)</label><input className="input" placeholder="frontend, api" value={form.tags} onChange={f('tags')} /></div>
          </div>
          <div className="mfoot"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Creating…':'Create Project'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');

  useEffect(() => { projectAPI.getAll().then(({ data }) => setProjects(data.projects)).finally(() => setLoading(false)); }, []);

  const filtered = projects.filter(p => (!search || p.name.toLowerCase().includes(search.toLowerCase())) && (!statusF || p.status === statusF));

  if (loading) return <div className="loader"><div className="spin" /></div>;

  return (
    <div style={{ maxWidth: 1150 }}>
      <div className="flex jbet items-c mb-6">
        <div><h1 style={{ fontSize: 24 }}>Projects</h1><p className="text-muted text-sm mt-1">{projects.length} total</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>
      <div className="flex gap3 mb-6 wrap">
        <input className="input" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="select" value={statusF} onChange={e=>setStatusF(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">All Statuses</option><option value="planning">Planning</option><option value="active">Active</option><option value="on-hold">On Hold</option><option value="completed">Completed</option>
        </select>
      </div>

      {!filtered.length ? (
        <div className="empty"><span style={{ fontSize: 46 }}>📁</span><h3>No projects found</h3><p>Create your first project</p><button className="btn btn-primary" onClick={()=>setShowModal(true)}>Create Project</button></div>
      ) : (
        <div className="gauto">
          {filtered.map(p => (
            <div key={p._id} className="card card-hover" onClick={() => navigate(`/projects/${p._id}`)}>
              <div className="flex jbet items-start mb-4">
                <div className="flex items-c gap3">
                  <div style={{ width: 38, height: 38, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: `${p.color}20`, border: `1px solid ${p.color}40` }}>{p.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <span className={`badge ${statusClass(p.status)}`} style={{ marginTop: 2 }}>{p.status}</span>
                  </div>
                </div>
                <span className={`badge badge-${p.priority}`}>{p.priority}</span>
              </div>
              {p.description && <p className="text-sm text-2" style={{ marginBottom: 12, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</p>}
              <div className="mb-3">
                <div className="flex jbet text-sm text-muted mb-2"><span>Progress</span><span style={{ fontWeight: 700, color: 'var(--text)' }}>{p.progress}%</span></div>
                <div className="pbar"><div className="pfill" style={{ width: `${p.progress}%` }} /></div>
              </div>
              <div className="flex jbet text-sm text-muted">
                <span>📋 {p.taskCounts?.total||0} tasks · ✅ {p.taskCounts?.done||0}</span>
                {p.dueDate && <span>📅 {format(new Date(p.dueDate),'MMM d')}</span>}
              </div>
              {p.members?.length > 0 && (
                <div className="flex mt-3" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  {p.members.slice(0,4).map((m,i) => (
                    <div key={m._id||i} title={m.user?.name} style={{ width: 26, height: 26, borderRadius: '50%', marginLeft: i>0?-8:0, background: COLORS[i%COLORS.length], border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', zIndex: 4-i, position: 'relative' }}>{m.user?.name?.[0]?.toUpperCase()||'?'}</div>
                  ))}
                  {p.members.length > 4 && <div style={{ width: 26, height: 26, borderRadius: '50%', marginLeft: -8, background: 'var(--overlay)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--muted)' }}>+{p.members.length-4}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showModal && <Modal onClose={() => setShowModal(false)} onCreated={p => { setProjects(prev => [p,...prev]); setShowModal(false); }} />}
    </div>
  );
}
