#!/usr/bin/env node
/**
 * Check Idekavan SMS credentials from server/.env without starting the app.
 *
 *   node server/sms-check.js
 *   node server/sms-check.js --send 0912xxxxxxx
 */
const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '.env'),
    override: true
});

const {
    fetchUserInfo,
    pingProvider,
    sendIdekavanMessage,
    toIdekavanMobile,
    toIdekavanSource,
    hasSmsCredentials
} = require('./sms');

function argValue(flag) {
    const idx = process.argv.indexOf(flag);
    if (idx === -1 || idx + 1 >= process.argv.length) return '';
    return String(process.argv[idx + 1] || '').trim();
}

async function run() {
    const provider = String(process.env.SMS_PROVIDER || 'idekavan').toLowerCase();
    const line = process.env.SMS_LINE_NUMBER || process.env.SMS_LINE || '';
    console.log(`provider=${provider}`);
    console.log(`line=${line ? toIdekavanSource(line) : '(missing SMS_LINE_NUMBER)'}`);
    console.log(`hasCredentials=${hasSmsCredentials(process.env)}`);

    if (provider !== 'idekavan' && provider !== 'idekavan.com') {
        console.log('sms-check only talks to Idekavan. Set SMS_PROVIDER=idekavan');
        process.exit(1);
    }

    const ping = await pingProvider(process.env);
    console.log(`ping HTTP ${ping.statusCode}: ${typeof ping.data === 'string' ? ping.data : JSON.stringify(ping.data || ping.raw)}`);

    const info = await fetchUserInfo(process.env);
    const data = info.data || {};
    console.log(`user=${data.userName || '?'}`);
    console.log(`credit=${data.credit != null ? data.credit : '?'}`);
    console.log(`senderIds=${Array.isArray(data.senderIds) ? data.senderIds.join(',') : '?'}`);

    const sendTo = argValue('--send');
    if (!sendTo) {
        console.log('idekavan userinfo ok');
        return;
    }

    const result = await sendIdekavanMessage({
        phone: sendTo,
        text: 'تست ارسال تات کیدز',
        env: process.env
    });
    console.log(`sent to ${toIdekavanMobile(sendTo)} via ${result.channel}`);
    console.log(`ids=${JSON.stringify(result.data)}`);
}

run().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
