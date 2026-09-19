#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '../client/src/utils/shop.js'), 'utf8')
    .replace(/export const (\w+) = /g, 'const $1 = exports.$1 = ');
const exported = {};
vm.runInNewContext(src, { exports: exported, module: { exports: exported } });

const {
    findCategoryPathById,
    normalizeCategoryQuery,
    categoryMatchesQuery
} = exported;

const tree = [
    {
        id: 1,
        name: 'تغذیه',
        children: [{ id: 11, name: 'مکمل', children: [] }]
    },
    {
        id: 2,
        name: 'اسباب‌بازی',
        children: [{ id: 21, name: 'لگو', children: [] }]
    },
    {
        id: 3,
        name: 'موسیقی',
        children: []
    }
];

const ids = (id) => Array.from(findCategoryPathById(tree, id), (node) => Number(node.id));
assert.deepStrictEqual(ids(2), [2], 'second root group must resolve by id');
assert.deepStrictEqual(ids(3), [3], 'later root group must resolve by id');
assert.deepStrictEqual(ids(21), [2, 21]);
assert.deepStrictEqual(ids(99), []);
assert.strictEqual(findCategoryPathById(tree, 2)[0].name, tree[1].name);

assert.strictEqual(normalizeCategoryQuery('اسباب بازی'), normalizeCategoryQuery('اسباب‌بازی'));
assert.ok(categoryMatchesQuery({ name: 'اسباب‌بازی' }, 'اسباب بازی'));
assert.ok(categoryMatchesQuery({ name: 'اسباب‌بازی' }, 'اسباببازی'));
assert.ok(categoryMatchesQuery({ name: 'موسیقی' }, 'موسيقي'));
assert.ok(!categoryMatchesQuery({ name: 'پوشاک' }, 'لگو'));

console.log('shop category path tests passed');
