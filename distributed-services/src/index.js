const app = require('./app');

// Port is configured via environment variable or default to 3000
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[Server] Service is up and listening on port ${PORT}`);
});

// Graceful shutdown required by PM2
process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed out remaining connections.');
    process.exit(0);
  });
});
