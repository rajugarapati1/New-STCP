import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, SocketProvider, useSocket } from './contexts';
import { notifAPI } from './api';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Board from './pages/Board';
import MyTasks from './pages/MyTasks';
import Team from './pages/Team';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const AV_COLORS = ['#7c6af7','#ec4899','#10e8a0','#f59e0b','#38bdf8','#a855f7','#f97316'];
export const avColor = name => { let h = 0; for (let c of (name||'')) h = c.charCodeAt(0)+((h<<5)-h); return AV_COLORS[Math.abs(h)%AV_COLORS.length]; };
export const initials = name => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'??';

// ─── NOTIFICATION PANEL ───────────────────────────────────────────────────────
function NotifPanel({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notifAPI.getAll().then(({ data }) => setItems(data.notifications)).finally(() => setLoading(false));
    const h = e => { if (!e.target.closest('.notif-panel') && !e.target.closest('.notif-btn')) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const typeIcon = t => t.includes('task') ? '📋' : t.includes('project') ? '📁' : t.includes('team') ? '👥' : '🔔';

  return (
    <div className="notif-panel">
      <div className="flex items-c jbet" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14 }}>Notifications</span>
        <button style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => { notifAPI.markAllRead(); setItems(p => p.map(n => ({ ...n, isRead: true }))); }}>Mark all read</button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? <div className="loader"><div className="spin" /></div>
          : items.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No notifications</div>
            : items.map(n => (
              <div key={n._id} className={`notif-item ${n.isRead ? '' : 'unread'}`}>
                <span style={{ fontSize: 18 }}>{typeIcon(n.type || '')}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{n.message}</div>
                </div>
                {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />}
              </div>
            ))}
      </div>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────
const NAV = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/projects', icon: '◈', label: 'Projects' },
  { to: '/my-tasks', icon: '◻', label: 'My Tasks' },
  { to: '/team', icon: '◉', label: 'Team' },
];

function Layout() {
  const { user, logout } = useAuth();
  const { connected, subscribe } = useSocket();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => { notifAPI.getAll().then(({ data }) => setUnread(data.unreadCount)).catch(() => {}); }, []);
  useEffect(() => { if (!subscribe) return; return subscribe('notification:new', () => setUnread(p => p + 1)); }, [subscribe]);

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '18px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,var(--accent),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, boxShadow: '0 0 18px var(--glow)' }}>⚡</div>
          {!collapsed && <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17 }}>TaskFlow</span>}
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 9px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        {/* User */}
        <div style={{ padding: '10px 9px', borderTop: '1px solid var(--border)' }}>
          <div className="flex items-c gap2" style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 'var(--r)' }} onClick={() => navigate('/profile')}>
            <div className="av av-sm" style={{ background: avColor(user?.name) }}>{initials(user?.name)}</div>
            {!collapsed && <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }} className="trunc">{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user?.role}</div>
            </div>}
          </div>
          {!collapsed && <button className="btn btn-ghost btn-sm w-full" style={{ marginTop: 6 }} onClick={() => { logout(); navigate('/login'); }}>Sign out</button>}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon" onClick={() => setCollapsed(o => !o)}>☰</button>
          <div className="flex items-c gap3">
            <div className="flex items-c gap2 text-sm" style={{ color: connected ? 'var(--ok)' : 'var(--muted)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--ok)' : 'var(--muted)', display: 'inline-block' }} />
              {connected ? 'Live' : 'Offline'}
            </div>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-icon notif-btn" onClick={() => { setNotifOpen(o => !o); setUnread(0); }}>
                🔔
                {unread > 0 && <span style={{ position: 'absolute', top: 3, right: 3, width: 15, height: 15, background: 'var(--err)', borderRadius: '50%', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unread > 9 ? '9+' : unread}</span>}
              </button>
              {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)} />}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>⚙ Profile</button>
          </div>
        </header>
        <main className="content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/board" element={<Board />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/team" element={<Team />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ─── ROUTE GUARDS ─────────────────────────────────────────────────────────────
function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader" style={{ height: '100vh', background: 'var(--bg)' }}><div className="spin" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}
function Public({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Public><Login /></Public>} />
            <Route path="/register" element={<Public><Register /></Public>} />
            <Route path="/*" element={<Private><Layout /></Private>} />
          </Routes>
          <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #2d2d44' } }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
