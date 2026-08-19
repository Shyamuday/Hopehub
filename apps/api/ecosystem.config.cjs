/**
 * PM2 production process definition.
 *
 * Run the compiled API, never the tsx development runner. This avoids keeping
 * the TypeScript loader and esbuild service in memory on the production host.
 */
module.exports = {
  apps: [
    {
      name: 'hopehub-api',
      cwd: __dirname,
      script: 'dist/apps/api/src/index.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '450M',
      time: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
