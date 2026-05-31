import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts';
import toast from 'react-hot-toast';

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await login(form.email, form.password); toast.success('Welcome back!'); navigate('/dashboard'); }
    catch (ex) { setErr(ex.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <h1 style={{ fontSize: 26, letterSpacing: '-0.5px' }}>TaskFlow</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Smart team collaboration platform</p>
        </div>
        <div className="card" style={{ boxShadow: 'var(--sh2)' }}>
          <h2 style={{ fontSize: 19, marginBottom: 20 }}>Sign in</h2>
          {err && <div className="alert alert-err">{err}</div>}
          <form onSubmit={submit} className="flex col gap3">
            <div className="fg"><label className="flabel">Email</label><input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required /></div>
            <div className="fg"><label className="flabel">Password</label><input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required /></div>
            <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            No account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member', department: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await register(form); toast.success('Account created!'); navigate('/dashboard'); }
    catch (ex) { setErr(ex.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="logo-icon">⚡</div>
          <h1 style={{ fontSize: 26 }}>TaskFlow</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Create your account</p>
        </div>
        <div className="card" style={{ boxShadow: 'var(--sh2)' }}>
          <h2 style={{ fontSize: 19, marginBottom: 20 }}>Get started</h2>
          {err && <div className="alert alert-err">{err}</div>}
          <form onSubmit={submit} className="flex col gap3">
            <div className="fg"><label className="flabel">Full Name</label><input className="input" placeholder="Jane Smith" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} required /></div>
            <div className="fg"><label className="flabel">Email</label><input className="input" type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} required /></div>
            <div className="g2">
              <div className="fg"><label className="flabel">Role</label>
                <select className="select" value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
                  <option value="member">Member</option><option value="manager">Manager</option><option value="admin">Admin</option>
                </select>
              </div>
              <div className="fg"><label className="flabel">Department</label><input className="input" placeholder="Engineering" value={form.department} onChange={e => setForm(p=>({...p,department:e.target.value}))} /></div>
            </div>
            <div className="fg"><label className="flabel">Password</label><input className="input" type="password" placeholder="Min 6 chars" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} required minLength={6} /></div>
            <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
          </form>
          <p style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Already have one? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
