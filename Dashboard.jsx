import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import { projectAPI, taskAPI } from '../api';
import { format, isBefore, addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#7c6af7','#f59e0b','#a855f7','#10e8a0','#f43f5e'];
const PRIO_COLOR = { low: 'var(--ok)', medium: 'var(--warn)', high: 'var(--orange)', critical: 'var(--err)' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([projectAPI.getAll(), taskAPI.getMy()])
      .then(([p, t]) => { setProjects(p.data.projects || []); setTasks(t.data.tasks || []); })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const s = {
    projects: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    myTasks: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== 'done').length,
    dueSoon: tasks.filter(t => t.dueDate && !isBefore(new Date(t.dueDate), now) && isBefore(new Date(t.dueDate), addDays(now, 3))).length,
  };

  const statusData = [
    { name: 'To Do', v: tasks.filter(t => t.status === 'todo').length },
    { name: 'In Prog', v: tasks.filter(t => t.status === 'in-progress').length },
    { name: 'Review', v: tasks.filter(t => t.status === 'in-review').length },
    { name: 'Done', v: tasks.filter(t => t.status === 'done').length },
    { name: 'Blocked', v: tasks.filter(t => t.status === 'blocked').length },
  ].filter(d => d.v > 0);

  const projChart = projects.slice(0, 6).map(p => ({ name: p.name.slice(0, 11), progress: p.progress || 0 }));
  const highPrio = tasks.filter(t => t.status !== 'done' && ['high','critical'].includes(t.priority)).slice(0, 5);

  if (loading) return <div className="loader"><div className="spin" /></div>;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div style={{ maxWidth: 1150 }}>
      <div className="mb-6">
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Good {greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted text-sm">{format(now, 'EEEE, MMMM d yyyy')} · Workspace overview</p>
      </div>

      {/* Stats */}
      <div className="g4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
        {[
          { label:'Total Projects', val: s.projects, icon:'📁', color:'var(--accent)', sub:`${s.active} active` },
          { label:'My Tasks', val: s.myTasks, icon:'📋', color:'var(--purple)', sub:`${s.done} done` },
          { label:'Due Soon', val: s.dueSoon, icon:'⏰', color:'var(--warn)', sub:'within 3 days' },
          { label:'Overdue', val: s.overdue, icon:'🚨', color:'var(--err)', sub:'needs attention' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ borderTopColor: c.color }}>
            <div className="flex jbet items-c">
              <div><div className="stat-lbl">{c.label}</div><div className="stat-val">{c.val}</div><div className="stat-sub">{c.sub}</div></div>
              <span style={{ fontSize: 26, opacity: .65 }}>{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="flex gap4 mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 400px' }}>
          <h3 style={{ fontSize: 14, marginBottom: 16 }}>Project Progress</h3>
          {projChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={projChart} barSize={22}>
                <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0,100]} />
                <Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
                <Bar dataKey="progress" fill="var(--accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty" style={{ padding: 40 }}><p>No projects yet</p></div>}
        </div>
        <div className="card" style={{ width: 260 }}>
          <h3 style={{ fontSize: 14, marginBottom: 16 }}>Tasks by Status</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart><Pie data={statusData} dataKey="v" cx="50%" cy="50%" outerRadius={60} innerRadius={28}>
                  {statusData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie><Tooltip contentStyle={{ background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} /></PieChart>
              </ResponsiveContainer>
              <div className="flex col gap2 mt-3">
                {statusData.map((d,i) => (
                  <div key={d.name} className="flex jbet items-c text-sm">
                    <div className="flex items-c gap2"><span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i%COLORS.length], display: 'inline-block' }} /><span className="text-2">{d.name}</span></div>
                    <span style={{ fontWeight: 700 }}>{d.v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="empty" style={{ padding: 32 }}><p>No tasks yet</p></div>}
        </div>
      </div>

      {/* Bottom */}
      <div className="g2">
        <div className="card">
          <div className="flex jbet items-c mb-4">
            <h3 style={{ fontSize: 14 }}>High Priority Tasks</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-tasks')}>View all</button>
          </div>
          {highPrio.length > 0 ? highPrio.map(t => (
            <div key={t._id} className="flex jbet items-c gap2" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }} className="trunc">{t.title}</div>
                <div className="text-sm text-muted mt-1">{t.project?.name}</div>
              </div>
              <div className="flex gap2 items-c">
                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                {t.dueDate && isBefore(new Date(t.dueDate), now) && <span className="text-sm text-err">overdue</span>}
              </div>
            </div>
          )) : <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>🎉 No high priority tasks</div>}
        </div>

        <div className="card">
          <div className="flex jbet items-c mb-4">
            <h3 style={{ fontSize: 14 }}>Recent Projects</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View all</button>
          </div>
          {projects.slice(0, 5).map(p => (
            <div key={p._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate(`/projects/${p._id}`)}>
              <div className="flex jbet items-c mb-2">
                <div className="flex items-c gap2"><span style={{ fontSize: 15 }}>{p.icon}</span><span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span></div>
                <span className={`badge-${p.status} badge`} style={{ fontSize: 11 }}>{p.status}</span>
              </div>
              <div className="pbar"><div className="pfill" style={{ width: `${p.progress}%` }} /></div>
              <div className="flex jbet text-sm text-muted mt-1">
                <span>{p.taskCounts?.total || 0} tasks</span><span>{p.progress}%</span>
              </div>
            </div>
          ))}
          {!projects.length && <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No projects. <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/projects')}>Create one</button>
          </div>}
        </div>
      </div>
    </div>
  );
}
