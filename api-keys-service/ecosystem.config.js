module.exports = {
  apps: [
    {
      name: 'api-keys-service',
      script: 'src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      error_file: '/var/log/pm2/api-keys-service-error.log',
      out_file: '/var/log/pm2/api-keys-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
