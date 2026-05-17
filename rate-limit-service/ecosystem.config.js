module.exports = {
  apps: [
    {
      name: 'rate-limit-service',
      script: 'src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
      },
      error_file: '/var/log/pm2/rate-limit-service-error.log',
      out_file: '/var/log/pm2/rate-limit-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
