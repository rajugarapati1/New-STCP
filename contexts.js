import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { authAPI } from './api';

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (token) {
        try { const { data } = await authAPI.me(); setUser(data.user); localStorage.setItem('user', JSON.stringify(data.user)); }
        catch { logout(); }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token); setUser(data.user); return data;
  }, []);

  const register = useCallback(async d => {
    const { data } = await authAPI.register(d);
    localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token); setUser(data.user); return data;
  }, []);

  const logout = useCallback(() => { localStorage.clear(); setToken(null); setUser(null); }, []);
  const updateUser = useCallback(u => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); }, []);

  return <AuthCtx.Provider value={{ user, token, loading, login, register, logout, updateUser }}>{children}</AuthCtx.Provider>;
};
export const useAuth = () => useContext(AuthCtx);

// ─── SOCKET CONTEXT ───────────────────────────────────────────────────────────
const SocketCtx = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const ref = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!user || !token) return;
    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', { transports: ['websocket'] });
    ref.current = s;
    s.on('connect', () => { setConnected(true); s.emit('authenticate', user._id); });
    s.on('disconnect', () => setConnected(false));
    s.on('user:online', ({ userId, online }) => setOnlineUsers(p => { const n = new Set(p); online ? n.add(userId) : n.delete(userId); return n; }));
    return () => { s.disconnect(); ref.current = null; };
  }, [user, token]);

  const join = pid => ref.current?.emit('join:project', pid);
  const leave = pid => ref.current?.emit('leave:project', pid);
  const subscribe = (event, fn) => { ref.current?.on(event, fn); return () => ref.current?.off(event, fn); };

  return <SocketCtx.Provider value={{ socket: ref.current, connected, onlineUsers, join, leave, subscribe }}>{children}</SocketCtx.Provider>;
};
export const useSocket = () => useContext(SocketCtx);
