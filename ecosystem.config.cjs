module.exports = {
  apps: [
    {
      name: 'lifeos',
      script: './dist/server.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      restart_delay: 3000,
      min_uptime: '10s',
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 4000,
      wait_ready: true,
      listen_timeout: 15000
    }
  ]
};
