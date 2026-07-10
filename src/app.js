'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes      = require('./modules/auth/routes');
const adminRoutes     = require('./modules/admin/routes');
const libraryRoutes   = require('./modules/library/routes');
const labsRoutes      = require('./modules/labs/routes');
const equipmentRoutes = require('./modules/equipment/routes');
const logbookRoutes   = require('./modules/logbook/routes');
const busRoutes          = require('./modules/bus/routes');
const busRequestsRoutes  = require('./modules/busRequests/routes');
const notificationsRoutes = require('./modules/notifications/routes');
const facultyRoutes   = require('./modules/faculty/routes');
const studentsRoutes  = require('./modules/students/routes');
const managerRoutes   = require('./modules/manager/routes');

const app = express();

/* ── CORS (allows a separate frontend origin to call this API) ── */
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
}));

/* ── Body parsers ──────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Ensure the DB connection exists before any route runs. connectDB()
   caches the connection (see src/config/db.js), so this is a no-op after
   the first successful call within a warm serverless instance. This makes
   the app self-sufficient regardless of which file a host uses as the
   entrypoint (server.js, a custom wrapper, or this file directly). ── */
app.use((req, res, next) => {
  connectDB().then(() => next()).catch(next);
});

/* ── Health check ─────────────────────────────────────────── */
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Campus Resource Management API is running' });
});

/* ── Module routers (versioned prefix) ────────────────────── */
app.use('/api/v1/auth',      authRoutes);
app.use('/api/v1/admin',     adminRoutes);
app.use('/api/v1/library',   libraryRoutes);
app.use('/api/v1/labs',      labsRoutes);
app.use('/api/v1/equipment', equipmentRoutes);
app.use('/api/v1/logbook',   logbookRoutes);
app.use('/api/v1/bus',          busRoutes);
app.use('/api/v1/bus-requests', busRequestsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/faculty',   facultyRoutes);
app.use('/api/v1/students',  studentsRoutes);
app.use('/api/v1/manager',   managerRoutes);

/* ── Error handling (must be last) ───────────────────────── */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
