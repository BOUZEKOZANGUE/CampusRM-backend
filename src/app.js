'use strict';

const express = require('express');
const cors = require('cors');
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

/* ── Health check ─────────────────────────────────────────── */
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Campus Resource Management API is running', deployMarker: 'DIAG-7f3k2' });
});

/* ── TEMP DIAGNOSTIC: raw TCP reachability test to all Mongo shard hosts ── */
app.get('/api/v1/diag/tcp', (req, res) => {
  const net = require('net');
  const port = 27017;
  const hosts = [
    'ac-a2sr6sj-shard-00-00.cmbweb1.mongodb.net',
    'ac-a2sr6sj-shard-00-01.cmbweb1.mongodb.net',
    'ac-a2sr6sj-shard-00-02.cmbweb1.mongodb.net',
  ];

  const testHost = (host) => new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    socket.setTimeout(8000);
    socket.on('connect', () => {
      done = true;
      resolve({ host, result: 'TCP_CONNECTED', ms: Date.now() - start });
      socket.destroy();
    });
    socket.on('timeout', () => {
      if (done) return;
      done = true;
      resolve({ host, result: 'TCP_TIMEOUT', ms: Date.now() - start });
      socket.destroy();
    });
    socket.on('error', (err) => {
      if (done) return;
      done = true;
      resolve({ host, result: 'TCP_ERROR', message: err.message, ms: Date.now() - start });
    });
    socket.connect(port, host);
  });

  Promise.all(hosts.map(testHost)).then((results) => res.json({ results }));
});

/* ── TEMP DIAGNOSTIC: raw TLS handshake test ── */
app.get('/api/v1/diag/tls', (req, res) => {
  const tls = require('tls');
  const host = 'ac-a2sr6sj-shard-00-00.cmbweb1.mongodb.net';
  const port = 27017;
  const start = Date.now();
  let done = false;
  const socket = tls.connect({ host, port, servername: host, timeout: 8000 }, () => {
    done = true;
    res.json({ result: 'TLS_CONNECTED', ms: Date.now() - start, authorized: socket.authorized, authorizationError: socket.authorizationError });
    socket.destroy();
  });
  socket.on('timeout', () => {
    if (done) return;
    done = true;
    res.json({ result: 'TLS_TIMEOUT', ms: Date.now() - start });
    socket.destroy();
  });
  socket.on('error', (err) => {
    if (done) return;
    done = true;
    res.json({ result: 'TLS_ERROR', message: err.message, code: err.code, ms: Date.now() - start });
  });
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

/* ── TEMP DIAGNOSTIC: explicit connectDB() call + readyState ── */
app.get('/api/v1/diag/mongoose', async (req, res) => {
  const mongoose = require('mongoose');
  const connectDB = require('./config/db');
  const stateBefore = mongoose.connection.readyState;
  const start = Date.now();
  try {
    await connectDB();
    res.json({ result: 'CONNECT_OK', ms: Date.now() - start, stateBefore, stateAfter: mongoose.connection.readyState });
  } catch (err) {
    res.json({ result: 'CONNECT_FAILED', ms: Date.now() - start, stateBefore, stateAfter: mongoose.connection.readyState, message: err.message });
  }
});

module.exports = app;
