const express = require('express');
const { v4: uuidv4 } = require('uuid');
const healthRoutes = require('./routes/health');
const replicationRoutes = require('./routes/replication');
const rebalanceRoutes = require('./routes/rebalance');

const app = express();

// Middleware to parse JSON body
app.use(express.json());

// Middleware to assign request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  next();
});

// Register routes
app.use('/', healthRoutes);
app.use('/replication', replicationRoutes);
app.use('/rebalance', rebalanceRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
    meta: { request_id: req.id }
  });
});

module.exports = app;
