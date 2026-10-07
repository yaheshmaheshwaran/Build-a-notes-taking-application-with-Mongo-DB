/**
 * =============================================
 *  PROJECT 5 – Notes App | server.js
 *  Backend: Express + Mongoose (MongoDB)
 * =============================================
 *
 * REST API Endpoints:
 *   GET    /api/notes          → list all notes
 *   GET    /api/notes/:id      → get one note
 *   POST   /api/notes          → create note
 *   PUT    /api/notes/:id      → update note
 *   DELETE /api/notes/:id      → delete note
 *   DELETE /api/notes          → delete all notes
 */

'use strict';
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notesapp';

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Mongoose Model ────────────────────────────────────────────
const NoteSchema = new mongoose.Schema({
  title:    { type: String, required: [true, 'Title is required'], trim: true, maxlength: [200, 'Title too long'] },
  content:  { type: String, default: '', trim: true },
  color:    { type: String, default: '#6366f1', enum: ['#6366f1','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6'] },
  pinned:   { type: Boolean, default: false },
  tags:     { type: [String], default: [] },
  category: { type: String, default: 'general', enum: ['general','work','personal','ideas','study'] },
}, { timestamps: true });

NoteSchema.index({ title: 'text', content: 'text' });

const Note = mongoose.model('Note', NoteSchema);

// ─── Helpers ───────────────────────────────────────────────────
const ok  = (res, data, code=200) => res.status(code).json({ success: true,  data });
const err = (res, msg, code=400)  => res.status(code).json({ success: false, error: msg });

// ─── Routes ────────────────────────────────────────────────────

/** GET /api/notes — List all (with optional search & filter) */
app.get('/api/notes', async (req, res) => {
  try {
    const { q, category, pinned } = req.query;
    const filter = {};
    if (q)        { filter.$text = { $search: q }; }
    if (category) { filter.category = category; }
    if (pinned !== undefined) { filter.pinned = pinned === 'true'; }

    const notes = await Note.find(filter).sort({ pinned: -1, updatedAt: -1 });
    ok(res, notes);
  } catch (e) { err(res, e.message, 500); }
});

/** GET /api/notes/:id — Get one note */
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return err(res, 'Note not found', 404);
    ok(res, note);
  } catch (e) { err(res, 'Invalid ID', 400); }
});

/** POST /api/notes — Create note */
app.post('/api/notes', async (req, res) => {
  try {
    const note = await Note.create(req.body);
    ok(res, note, 201);
    console.log(`📝 Note created: "${note.title}"`);
  } catch (e) {
    const msg = e.name === 'ValidationError'
      ? Object.values(e.errors).map(v=>v.message).join(', ')
      : e.message;
    err(res, msg, 400);
  }
});

/** PUT /api/notes/:id — Update note */
app.put('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!note) return err(res, 'Note not found', 404);
    ok(res, note);
    console.log(`✏️  Note updated: "${note.title}"`);
  } catch (e) { err(res, e.message, 400); }
});

/** DELETE /api/notes/:id — Delete one note */
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return err(res, 'Note not found', 404);
    ok(res, { message: 'Note deleted', id: req.params.id });
    console.log(`🗑️  Note deleted: "${note.title}"`);
  } catch (e) { err(res, e.message, 400); }
});

/** DELETE /api/notes — Delete all notes */
app.delete('/api/notes', async (req, res) => {
  try {
    const result = await Note.deleteMany({});
    ok(res, { message: `Deleted ${result.deletedCount} notes` });
  } catch (e) { err(res, e.message, 500); }
});

/** Serve frontend for all other routes */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Connect & Start ───────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(`\n✅  MongoDB connected: ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`🚀  Notes server running at http://localhost:${PORT}`);
      console.log(`📡  API: http://localhost:${PORT}/api/notes\n`);
    });
  })
  .catch(e => {
    console.error('❌  MongoDB connection failed:', e.message);
    console.error('    Make sure MongoDB is running: mongod --dbpath /data/db');
    process.exit(1);
  });

module.exports = app;
