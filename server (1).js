require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST','PUT','DELETE'], credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.set('io', io);

// ─── DB CONNECTION ──────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── MODELS ─────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin','manager','member'], default: 'member' },
  department: { type: String, default: '' },
  bio: { type: String, default: '' },
  skills: [String],
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); next();
});
UserSchema.methods.comparePassword = function(p) { return bcrypt.compare(p, this.password); };
UserSchema.methods.toJSON = function() { const o = this.toObject(); delete o.password; return o; };
const User = mongoose.model('User', UserSchema);

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['planning','active','on-hold','completed','cancelled'], default: 'planning' },
  priority: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  color: { type: String, default: '#6366f1' },
  icon: { type: String, default: '📋' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, default: 'developer' }, joinedAt: { type: Date, default: Date.now } }],
  dueDate: Date,
  startDate: Date,
  tags: [String],
  progress: { type: Number, default: 0, min: 0, max: 100 },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });
const Project = mongoose.model('Project', ProjectSchema);

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['todo','in-progress','in-review','done','blocked'], default: 'todo' },
  priority: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  type: { type: String, enum: ['task','bug','feature','improvement','story'], default: 'task' },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: Date,
  estimatedHours: { type: Number, default: 0 },
  loggedHours: { type: Number, default: 0 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  tags: [String],
  checklist: [{ id: String, text: String, completed: { type: Boolean, default: false }, completedAt: Date }],
  comments: [{ author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, content: String, createdAt: { type: Date, default: Date.now } }],
  activity: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, action: String, field: String, oldValue: mongoose.Schema.Types.Mixed, newValue: mongoose.Schema.Types.Mixed, timestamp: { type: Date, default: Date.now } }],
  completedAt: Date,
  isArchived: { type: Boolean, default: false },
  position: { type: Number, default: 0 }
}, { timestamps: true });
TaskSchema.post('save', async function() {
  try {
    const tasks = await Task.find({ project: this.project, isArchived: false });
    if (!tasks.length) return;
    const done = tasks.filter(t => t.status === 'done').length;
    await Project.findByIdAndUpdate(this.project, { progress: Math.round((done / tasks.length) * 100) });
  } catch(e) {}
});
const Task = mongoose.model('Task', TaskSchema);

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  title: String,
  message: String,
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
const Notification = mongoose.model('Notification', NotificationSchema);

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#6366f1' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, default: 'member' }, joinedAt: { type: Date, default: Date.now } }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
const Team = mongoose.model('Team', TeamSchema);

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user || !req.user.isActive) return res.status(401).json({ message: 'Unauthorized' });
    next();
  } catch(e) { res.status(401).json({ message: 'Invalid token' }); }
};
const genToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role || 'member', department: department || '' });
    res.status(201).json({ token: genToken(user._id), user });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid credentials' });
    user.lastSeen = new Date(); await user.save({ validateBeforeSave: false });
    res.json({ token: genToken(user._id), user });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/auth/me', protect, async (req, res) => res.json({ user: req.user }));

app.put('/api/auth/profile', protect, async (req, res) => {
  try {
    const { name, bio, department, skills, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, bio, department, skills, avatar }, { new: true });
    res.json({ user });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/auth/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) return res.status(400).json({ message: 'Wrong current password' });
    user.password = newPassword; await user.save();
    res.json({ message: 'Password updated' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── USER ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/users', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const q = { isActive: true };
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const users = await User.find(q).sort({ name: 1 });
    res.json({ users });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── PROJECT ROUTES ───────────────────────────────────────────────────────────
app.get('/api/projects', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      isArchived: false
    }).populate('owner', 'name email avatar').populate('members.user', 'name email avatar').sort({ updatedAt: -1 });

    const withCounts = await Promise.all(projects.map(async p => {
      const tc = await Task.aggregate([
        { $match: { project: p._id, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const counts = { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0, blocked: 0, total: 0 };
      tc.forEach(t => { counts[t._id] = t.count; counts.total += t.count; });
      return { ...p.toObject(), taskCounts: counts };
    }));
    res.json({ projects: withCounts });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/projects', protect, async (req, res) => {
  try {
    const p = await Project.create({ ...req.body, owner: req.user._id, members: [{ user: req.user._id, role: 'owner' }] });
    await p.populate('owner', 'name email avatar');
    io.to(`user:${req.user._id}`).emit('project:created', p);
    res.status(201).json({ project: p });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/projects/:id', protect, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role department');
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ project: p });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/projects/:id', protect, async (req, res) => {
  try {
    const p = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('owner', 'name email avatar').populate('members.user', 'name email avatar');
    io.to(`project:${p._id}`).emit('project:updated', p);
    res.json({ project: p });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/projects/:id', protect, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/projects/:id/members', protect, async (req, res) => {
  try {
    const { email, role } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found' });
    const p = await Project.findById(req.params.id);
    if (p.members.some(m => m.user.toString() === userToAdd._id.toString()))
      return res.status(400).json({ message: 'Already a member' });
    p.members.push({ user: userToAdd._id, role: role || 'developer' });
    await p.save();
    await Notification.create({ recipient: userToAdd._id, sender: req.user._id, type: 'project:invite', title: 'Project Invite', message: `${req.user.name} added you to "${p.name}"`, link: `/projects/${p._id}` });
    io.to(`user:${userToAdd._id}`).emit('notification:new', { message: `Added to ${p.name}` });
    await p.populate('members.user', 'name email avatar');
    res.json({ project: p });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/projects/:id/members/:uid', protect, async (req, res) => {
  try {
    const p = await Project.findById(req.params.id);
    p.members = p.members.filter(m => m.user.toString() !== req.params.uid);
    await p.save();
    res.json({ project: p });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/projects/:id/stats', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id, isArchived: false });
    const now = new Date();
    const stats = {
      total: tasks.length,
      byStatus: { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0, blocked: 0 },
      byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      overdue: 0, totalEstimatedHours: 0, totalLoggedHours: 0
    };
    tasks.forEach(t => {
      stats.byStatus[t.status] = (stats.byStatus[t.status] || 0) + 1;
      stats.byPriority[t.priority] = (stats.byPriority[t.priority] || 0) + 1;
      stats.totalEstimatedHours += t.estimatedHours || 0;
      stats.totalLoggedHours += t.loggedHours || 0;
      if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'done') stats.overdue++;
    });
    res.json({ stats });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── TASK ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/tasks', protect, async (req, res) => {
  try {
    const { project, status, priority, assignee, search } = req.query;
    const q = { isArchived: false };
    if (project) q.project = project;
    if (status) q.status = status;
    if (priority) q.priority = priority;
    if (assignee) q.assignees = assignee;
    if (search) q.title = { $regex: search, $options: 'i' };
    const tasks = await Task.find(q)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('project', 'name color icon')
      .sort({ createdAt: -1 });
    res.json({ tasks });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/tasks/my', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ assignees: req.user._id, isArchived: false })
      .populate('project', 'name color icon')
      .populate('assignees', 'name email avatar')
      .sort({ dueDate: 1, createdAt: -1 });
    res.json({ tasks });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/tasks/board/:projectId', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId, isArchived: false })
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ position: 1, createdAt: -1 });
    const board = { todo: [], 'in-progress': [], 'in-review': [], done: [], blocked: [] };
    tasks.forEach(t => { if (board[t.status]) board[t.status].push(t); });
    res.json({ board });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/tasks', protect, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, reporter: req.user._id });
    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    await task.populate('project', 'name color');
    // Notify assignees
    if (req.body.assignees?.length) {
      const notifs = req.body.assignees.filter(id => id !== req.user._id.toString()).map(uid => ({
        recipient: uid, sender: req.user._id, type: 'task:assigned',
        title: 'Task Assigned', message: `${req.user.name} assigned you "${req.body.title}"`, link: `/projects/${req.body.project}`
      }));
      if (notifs.length) {
        await Notification.insertMany(notifs);
        notifs.forEach(n => io.to(`user:${n.recipient}`).emit('notification:new', n));
      }
    }
    io.to(`project:${req.body.project}`).emit('task:created', task);
    res.status(201).json({ task });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/tasks/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .populate('activity.user', 'name email avatar')
      .populate('project', 'name color icon members');
    if (!task) return res.status(404).json({ message: 'Not found' });
    res.json({ task });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/tasks/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    const oldStatus = task.status;
    Object.assign(task, req.body);
    if (req.body.status === 'done' && oldStatus !== 'done') task.completedAt = new Date();
    if (req.body.status && req.body.status !== 'done') task.completedAt = null;
    task.activity.push({ user: req.user._id, action: 'updated', timestamp: new Date() });
    await task.save();
    await task.populate('assignees', 'name email avatar');
    await task.populate('reporter', 'name email avatar');
    io.to(`project:${task.project}`).emit('task:updated', task);
    res.json({ task });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/tasks/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    await Task.findByIdAndDelete(req.params.id);
    io.to(`project:${task.project}`).emit('task:deleted', { taskId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/tasks/:id/comments', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    task.comments.push({ author: req.user._id, content: req.body.content });
    await task.save();
    await task.populate('comments.author', 'name email avatar');
    const comment = task.comments[task.comments.length - 1];
    io.to(`project:${task.project}`).emit('comment:added', { taskId: task._id, comment });
    res.status(201).json({ comment });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/tasks/:id/checklist/:itemId', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const item = task.checklist.find(i => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.completed = req.body.completed;
    if (req.body.completed) item.completedAt = new Date();
    const done = task.checklist.filter(i => i.completed).length;
    task.progress = task.checklist.length ? Math.round((done / task.checklist.length) * 100) : task.progress;
    await task.save();
    res.json({ task });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── TEAM ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/teams', protect, async (req, res) => {
  try {
    const teams = await Team.find({ $or: [{ owner: req.user._id }, { 'members.user': req.user._id }], isActive: true })
      .populate('owner', 'name email avatar').populate('members.user', 'name email avatar');
    res.json({ teams });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/teams', protect, async (req, res) => {
  try {
    const team = await Team.create({ ...req.body, owner: req.user._id, members: [{ user: req.user._id, role: 'owner' }] });
    await team.populate('owner', 'name email avatar');
    res.status(201).json({ team });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/teams/:id/members', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    const u = await User.findOne({ email: req.body.email });
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (team.members.some(m => m.user.toString() === u._id.toString())) return res.status(400).json({ message: 'Already member' });
    team.members.push({ user: u._id, role: req.body.role || 'member' });
    await team.save();
    await team.populate('members.user', 'name email avatar');
    res.json({ team });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/teams/:id', protect, async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── NOTIFICATION ROUTES ───────────────────────────────────────────────────────
app.get('/api/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'name avatar').sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All read' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Read' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ─── SOCKET.IO ─────────────────────────────────────────────────────────────────
const connected = new Map();
io.on('connection', socket => {
  socket.on('authenticate', uid => {
    connected.set(uid, socket.id);
    socket.userId = uid;
    socket.join(`user:${uid}`);
    io.emit('user:online', { userId: uid, online: true });
  });
  socket.on('join:project', pid => socket.join(`project:${pid}`));
  socket.on('leave:project', pid => socket.leave(`project:${pid}`));
  socket.on('disconnect', () => {
    if (socket.userId) { connected.delete(socket.userId); io.emit('user:online', { userId: socket.userId, online: false }); }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 TaskFlow running on port ${PORT}`));
