import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI, projectAPI } from '../api';
import { useSocket } from '../contexts';
import { useAuth } from '../contexts';
import { format, isBefore } from 'date-fns';
import toast from 'react-hot-toast';

const COLS = [
  { id:'todo', label:'To Do', color:'#818cf8' },
  { id:'in-progress', label:'In Progress', color:'#fbbf24' },
  { id:'in-review', label:'In Review', color:'#a78bfa' },
  { id:'done', label:'Done', color:'#10e8a0' },
  { id:'blocked', label:'Blocked', color:'#f43f5e' },
];
const PC = { low:'var(--ok)', medium:'var(--warn)', high:'var(--orange)', critical:'var(--err)' };
const PI = { low:'↓', medium:'→', high:'↑', critical:'⬆' };
const AVCOL = ['#7c6af7','#ec4899','#10e8a0'];

function TaskCard({ task }) {
  const [drag, setDrag] = useState(false);
  return (
    <div draggable
      onDragStart={e => { e.dataTransfer.setData('taskId', task._id); setDrag(true); }}
      onDragEnd={() => setDrag(false)}
      className={`task-card ${drag?'dragging':''}`}
      style={{ borderLeft: `3px solid ${PC[task.priority]||'var(--border)'}`, marginBottom: 9 }}>
      <div className="flex jbet mb-2">
        <span style={{ fontSize:11, background:'var(--overlay)', padding:'2px 8px', borderRadius:100, color:'var(--text2)' }}>{task.type}</span>
        <span style={{ color:PC[task.priority], fontWeight:700, fontSize:13 }} title={task.priority}>{PI[task.priority]}</span>
      </div>
      <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4, marginBottom:9 }}>{task.title}</div>
      {task.tags?.length > 0 && <div className="flex wrap gap2 mb-2">{task.tags.slice(0,2).map(t=><span key={t} className="tag" style={{ fontSize:10, padding:'1px 7px' }}>{t}</span>)}</div>}
      {task.checklist?.length > 0 && (
        <div className="mb-2">
          <div className="text-sm text-muted mb-1">☑ {task.checklist.filter(i=>i.completed).length}/{task.checklist.length}</div>
          <div className="pbar" style={{ height:3 }}><div className="pfill" style={{ width:`${(task.checklist.filter(i=>i.completed).length/task.checklist.length)*100}%` }} /></div>
        </div>
      )}
      <div className="flex jbet items-c mt-2">
        <div className="flex" style={{ gap:-4 }}>
          {(task.assignees||[]).slice(0,3).map((a,i)=>(
            <div key={a._id} title={a.name} style={{ width:20,height:20,borderRadius:'50%',marginLeft:i>0?-5:0,background:AVCOL[i%3],border:'2px solid var(--elevated)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'#fff',zIndex:3-i,position:'relative' }}>{a.name?.[0]?.toUpperCase()}</div>
          ))}
        </div>
        <div className="flex gap2 text-sm text-muted">
          {task.comments?.length>0 && <span>💬{task.comments.length}</span>}
          {task.dueDate && <span style={{ color: isBefore(new Date(task.dueDate),new Date())?'var(--err)':'var(--muted)' }}>📅{format(new Date(task.dueDate),'MMM d')}</span>}
        </div>
      </div>
    </div>
  );
}

function CreateModal({ projectId, defaultStatus, members, onClose, onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title:'', description:'', status:defaultStatus, priority:'medium', type:'task', assignees:[], dueDate:'', estimatedHours:'', tags:'' });
  const [loading, setLoading] = useState(false);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await taskAPI.create({ ...form, project:projectId, estimatedHours:Number(form.estimatedHours)||0, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean) });
      toast.success('Task created!'); onCreated(data.task);
    } catch(err) { toast.error(err.response?.data?.message||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="backdrop">
      <div className="modal modal-md">
        <div className="mhead"><h2 style={{ fontSize:17 }}>New Task</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="mbody">
            <div className="fg"><label className="flabel">Title *</label><input className="input" placeholder="Task title" value={form.title} onChange={f('title')} required /></div>
            <div className="fg"><label className="flabel">Description</label><textarea className="textarea" value={form.description} onChange={f('description')} rows={2} style={{ minHeight:60 }} /></div>
            <div className="g3">
              <div className="fg"><label className="flabel">Status</label><select className="select" value={form.status} onChange={f('status')}><option value="todo">To Do</option><option value="in-progress">In Progress</option><option value="in-review">In Review</option><option value="done">Done</option><option value="blocked">Blocked</option></select></div>
              <div className="fg"><label className="flabel">Priority</label><select className="select" value={form.priority} onChange={f('priority')}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              <div className="fg"><label className="flabel">Type</label><select className="select" value={form.type} onChange={f('type')}><option value="task">Task</option><option value="bug">Bug</option><option value="feature">Feature</option><option value="improvement">Improvement</option></select></div>
            </div>
            <div className="g2">
              <div className="fg"><label className="flabel">Due Date</label><input className="input" type="date" value={form.dueDate} onChange={f('dueDate')} /></div>
              <div className="fg"><label className="flabel">Est. Hours</label><input className="input" type="number" min="0" value={form.estimatedHours} onChange={f('estimatedHours')} /></div>
            </div>
            <div className="fg"><label className="flabel">Assign To (Ctrl+click for multiple)</label>
              <select className="select" multiple value={form.assignees} onChange={e=>setForm(p=>({...p,assignees:Array.from(e.target.selectedOptions,o=>o.value)}))} style={{ height:75 }}>
                {members.map(m=><option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="flabel">Tags</label><input className="input" placeholder="frontend, urgent" value={form.tags} onChange={f('tags')} /></div>
          </div>
          <div className="mfoot"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Creating…':'Create Task'}</button></div>
        </form>
      </div>
    </div>
  );
}

export default function Board() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { subscribe, join, leave } = useSocket();
  const [board, setBoard] = useState({ todo:[], 'in-progress':[], 'in-review':[], done:[], blocked:[] });
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createFor, setCreateFor] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const loadBoard = useCallback(async () => {
    const [b, p] = await Promise.all([taskAPI.getBoard(projectId), projectAPI.getById(projectId)]);
    setBoard(b.data.board); setProject(p.data.project);
  }, [projectId]);

  useEffect(() => { loadBoard().finally(() => setLoading(false)); join?.(projectId); return () => leave?.(projectId); }, [projectId]);
  useEffect(() => {
    if (!subscribe) return;
    const u1 = subscribe('task:created', t => setBoard(p => ({ ...p, [t.status]: [t,...(p[t.status]||[])] })));
    const u2 = subscribe('task:updated', t => setBoard(p => { const n={...p}; Object.keys(n).forEach(k=>{n[k]=n[k].filter(x=>x._id!==t._id);}); n[t.status]=[t,...(n[t.status]||[])]; return n; }));
    const u3 = subscribe('task:deleted', ({ taskId }) => setBoard(p => { const n={...p}; Object.keys(n).forEach(k=>{n[k]=n[k].filter(x=>x._id!==taskId);}); return n; }));
    return () => { u1?.(); u2?.(); u3?.(); };
  }, [subscribe]);

  const handleDrop = async (e, newStatus) => {
    e.preventDefault(); setDragOver(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    let task = null, oldStatus = null;
    Object.entries(board).forEach(([col, tasks]) => { const f = tasks.find(t=>t._id===taskId); if(f){task=f;oldStatus=col;} });
    if (!task || oldStatus === newStatus) return;
    setBoard(p => { const n={...p}; n[oldStatus]=n[oldStatus].filter(t=>t._id!==taskId); n[newStatus]=[{...task,status:newStatus},...n[newStatus]]; return n; });
    try { await taskAPI.update(taskId, { status: newStatus }); toast.success(`→ ${newStatus.replace('-',' ')}`); }
    catch { toast.error('Failed to move task'); loadBoard(); }
  };

  if (loading) return <div className="loader"><div className="spin" /></div>;

  return (
    <div>
      <div className="flex items-c gap3 mb-6">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${projectId}`)}>← Back</button>
        <span style={{ fontSize:20 }}>{project?.icon}</span>
        <h1 style={{ fontSize:20 }}>{project?.name} — Board</h1>
      </div>
      <div className="board">
        {COLS.map(col => {
          const tasks = board[col.id] || [];
          return (
            <div key={col.id} className="board-col">
              <div className={`board-col-inner ${dragOver===col.id?'dragover':''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, col.id)}>
                <div className="col-header">
                  <div className="flex items-c gap2">
                    <span className="col-dot" style={{ background:col.color, boxShadow:`0 0 8px ${col.color}` }} />
                    <span style={{ fontFamily:'Syne', fontWeight:700, fontSize:12.5 }}>{col.label}</span>
                    <span style={{ background:'var(--overlay)', padding:'2px 7px', borderRadius:100, fontSize:11, color:'var(--muted)' }}>{tasks.length}</span>
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{ padding:4, fontSize:15 }} onClick={() => setCreateFor(col.id)}>+</button>
                </div>
                {tasks.map(t => <TaskCard key={t._id} task={t} />)}
                {!tasks.length && <div style={{ padding:'20px 12px', textAlign:'center', color:'var(--muted)', fontSize:12.5, border:'1px dashed var(--border)', borderRadius:'var(--r)' }}>Drop here</div>}
                <button style={{ width:'100%', marginTop:10, padding:8, background:'none', border:'1px dashed var(--border)', borderRadius:'var(--r)', color:'var(--muted)', cursor:'pointer', fontSize:12.5, transition:'all var(--tr)' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=col.color;e.currentTarget.style.color=col.color;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--muted)';}}
                  onClick={() => setCreateFor(col.id)}>+ Add Task</button>
              </div>
            </div>
          );
        })}
      </div>
      {createFor && (
        <CreateModal projectId={projectId} defaultStatus={createFor} members={project?.members||[]}
          onClose={() => setCreateFor(null)}
          onCreated={task => { setBoard(p=>({...p,[task.status]:[task,...(p[task.status]||[])]})); setCreateFor(null); }} />
      )}
    </div>
  );
}
