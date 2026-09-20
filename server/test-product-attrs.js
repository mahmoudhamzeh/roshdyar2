#!/usr/bin/env node
const assert = require('assert');
const { parseProductAttrs } = require('./shop-model');

const parsed = parseProductAttrs({
    hasRemote: 'بله',
    batteryLife: '۲۰ دقیقه پرواز',
    'برد کنترل': '۳۰ متر'
});
assert.strictEqual(parsed.hasRemote, 'بله');
assert.strictEqual(parsed.batteryLife, '۲۰ دقیقه پرواز');
assert.strictEqual(parsed['برد کنترل'], '۳۰ متر');

const fromJson = parseProductAttrs(JSON.stringify({
    'کنترل‌دار': 'رادیویی',
    'مدت نگهداری باتری': '۲۰ دقیقه'
}));
assert.strictEqual(fromJson['کنترل‌دار'], 'رادیویی');
assert.strictEqual(fromJson['مدت نگهداری باتری'], '۲۰ دقیقه');

console.log('product attrs parse ok');
