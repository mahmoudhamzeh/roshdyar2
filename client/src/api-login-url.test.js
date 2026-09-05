import { safeNextPath, loginUrl } from './api';

test('safeNextPath only allows same-origin relative paths', () => {
    expect(safeNextPath('/shop')).toBe('/shop');
    expect(safeNextPath('/cart?x=1')).toBe('/cart?x=1');
    expect(safeNextPath('https://evil.test')).toBe('/');
    expect(safeNextPath('//evil.test')).toBe('/');
});

test('loginUrl keeps next for services and omits it for home', () => {
    expect(loginUrl('/dashboard')).toBe('/register');
    expect(loginUrl('/my-children')).toBe('/register?next=%2Fmy-children');
    expect(loginUrl('/cart')).toBe('/register?next=%2Fcart');
});
