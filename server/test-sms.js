#!/usr/bin/env node
const assert = require('assert');
const {
    toIdekavanMobile,
    toIdekavanSource,
    toSmsIrMobile,
    buildOtpMessage,
    buildAuthHeaders,
    deliverOtp,
    resetTokenCache
} = require('./sms');

function mockRequest(impl) {
    const calls = [];
    const requestFn = async (method, url, options = {}) => {
        calls.push({ method, url, options });
        return impl(method, url, options, calls.length);
    };
    requestFn.calls = calls;
    return requestFn;
}

async function run() {
    assert.strictEqual(toIdekavanMobile('09121234567'), '989121234567');
    assert.strictEqual(toIdekavanMobile('+989121234567'), '989121234567');
    assert.strictEqual(toIdekavanMobile('989121234567'), '989121234567');
    assert.strictEqual(toIdekavanMobile('9121234567'), '989121234567');
    assert.strictEqual(toSmsIrMobile('09121234567'), '9121234567');
    assert.strictEqual(toIdekavanSource('989982007916'), '989982007916');
    assert.strictEqual(toIdekavanSource('09982007916'), '989982007916');

    const keyHeaders = buildAuthHeaders({ SMS_API_KEY: 'abc123' });
    assert.strictEqual(keyHeaders['X-API-Key'], 'abc123');

    const basicHeaders = buildAuthHeaders({ SMS_USERNAME: 'hamze', SMS_PASSWORD: 'secret' });
    assert.strictEqual(
        basicHeaders.Authorization,
        `Basic ${Buffer.from('hamze:secret').toString('base64')}`
    );

    const logResult = await deliverOtp('09120000000', '12345', {
        env: { SMS_PROVIDER: 'log' }
    });
    assert.strictEqual(logResult.channel, 'log');

    const requestFn = mockRequest(async () => ({
        statusCode: 200,
        data: {
            message: 'Successfully done.',
            succeeded: true,
            data: ['624ed1bbcd0efb1ef148e0a0'],
            resultCode: 100
        },
        raw: ''
    }));

    const sent = await deliverOtp('09121234567', '54321', {
        env: {
            SMS_PROVIDER: 'idekavan',
            SMS_API_KEY: 'test-key',
            SMS_LINE_NUMBER: '989982007916'
        },
        requestFn
    });
    assert.strictEqual(sent.channel, 'idekavan');
    assert.deepStrictEqual(sent.data, ['624ed1bbcd0efb1ef148e0a0']);
    assert.strictEqual(requestFn.calls.length, 1);
    assert.strictEqual(requestFn.calls[0].method, 'POST');
    assert.ok(requestFn.calls[0].url.endsWith('/api/1/message/send'));
    assert.strictEqual(requestFn.calls[0].options.headers['X-API-Key'], 'test-key');
    assert.strictEqual(requestFn.calls[0].options.body[0].SourceAddress, '989982007916');
    assert.strictEqual(requestFn.calls[0].options.body[0].DestinationAddress, '989121234567');
    assert.strictEqual(requestFn.calls[0].options.body[0].DataCoding, 8);
    assert.ok(requestFn.calls[0].options.body[0].MessageText.includes('54321'));
    assert.ok(buildOtpMessage('54321').includes('54321'));

    let failed = false;
    try {
        await deliverOtp('09121234567', '11111', {
            env: {
                SMS_PROVIDER: 'idekavan',
                SMS_API_KEY: 'test-key',
                SMS_LINE_NUMBER: '989982007916'
            },
            requestFn: mockRequest(async () => ({
                statusCode: 401,
                data: { message: 'Unauthorized', succeeded: false, resultCode: 101 },
                raw: ''
            }))
        });
    } catch (err) {
        failed = /idekavan send failed/.test(err.message);
    }
    assert.ok(failed, 'failed Idekavan send must throw');

    const patternFn = mockRequest(async () => ({
        statusCode: 200,
        data: { message: 'Successfully done.', succeeded: true, data: ['p1'], resultCode: 100 },
        raw: ''
    }));
    const patterned = await deliverOtp('09121234567', '99999', {
        env: {
            SMS_PROVIDER: 'idekavan',
            SMS_API_KEY: 'test-key',
            SMS_LINE_NUMBER: '989982007916',
            SMS_PATTERN_ID: '638698763364455987'
        },
        requestFn: patternFn
    });
    assert.strictEqual(patterned.channel, 'idekavan-pattern');
    assert.ok(patternFn.calls[0].url.includes('/api/PatternMessage/send'));
    assert.deepStrictEqual(patternFn.calls[0].options.body.destinations, ['989121234567']);
    assert.deepStrictEqual(patternFn.calls[0].options.body.parameters, ['99999']);

    try {
        await deliverOtp('09121234567', '11111', {
            env: {
                SMS_PROVIDER: 'idekavan',
                SMS_API_KEY: 'test-key',
                SMS_LINE_NUMBER: '989982007916'
            },
            requestFn: mockRequest(async () => ({
                statusCode: 403,
                data: '<html><h1>403</h1><h2>Forbidden</h2></html>',
                raw: '<html><h1>403</h1><h2>Forbidden</h2></html>'
            }))
        });
        assert.fail('403 HTML must throw');
    } catch (err) {
        assert.ok(/IP این سرور/.test(err.message), err.message);
    }

    resetTokenCache();
    console.log('sms unit tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
