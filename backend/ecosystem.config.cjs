module.exports = {
  apps: [
    {
      name: "nigam-backend",
      script: "src/server.js",
      instances: 1,
      instances: 4,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
