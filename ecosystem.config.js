const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'server', '.env');
let hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
if (!hasDatabaseUrl && fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, 'utf8');
    hasDatabaseUrl = /^DATABASE_URL=/m.test(envText);
}

const instances = process.env.PM2_INSTANCES
    || (hasDatabaseUrl ? 'max' : 1);
const useCluster = instances === 'max' || Number(instances) > 1;

module.exports = {
    apps: [
        {
            name: 'roshdyar',
            cwd: path.join(__dirname, 'server'),
            script: 'server.js',
            instances: useCluster ? instances : 1,
            exec_mode: useCluster ? 'cluster' : 'fork',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
