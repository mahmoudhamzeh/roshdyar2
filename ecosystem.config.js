const path = require('path');

const instances = process.env.PM2_INSTANCES || 1;
const useCluster = instances === 'max' || Number(instances) > 1;

module.exports = {
    apps: [
        {
            name: 'roshdyar',
            cwd: path.join(__dirname, 'server'),
            script: 'server.js',
            instances: useCluster ? instances : 1,
            exec_mode: useCluster ? 'cluster' : 'fork',
            env_file: path.join(__dirname, 'server', '.env'),
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
};
