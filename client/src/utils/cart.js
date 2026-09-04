const CART_KEY = 'tatkids_shop_cart';

export const cartLineKey = (item) => {
    if (item && item.lineKey) return item.lineKey;
    if (item && item.offerId) return `offer-${item.offerId}`;
    return `product-${item && (item.productId || item.id)}`;
};

export const getCart = () => {
    try {
        const raw = localStorage.getItem(CART_KEY);
        const cart = raw ? JSON.parse(raw) : [];
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
};

export const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
};

export const getCartCount = () =>
    getCart().reduce((sum, item) => sum + (item.quantity || 0), 0);

export const addToCart = (product, quantity = 1) => {
    const cart = getCart();
    const lineKey = product.offerId ? `offer-${product.offerId}` : `product-${product.id}`;
    const existing = cart.find((item) => cartLineKey(item) === lineKey);
    const nextQty = (existing ? existing.quantity : 0) + quantity;
    const maxStock = product.stock != null ? product.stock : nextQty;

    if (existing) {
        existing.quantity = Math.min(nextQty, maxStock);
        existing.name = product.name;
        existing.price = product.price;
        existing.imageUrl = product.imageUrl || null;
        existing.stock = product.stock;
        existing.offerId = product.offerId || existing.offerId || null;
        existing.vendorId = product.vendorId || existing.vendorId || null;
        existing.vendorName = product.vendorName || existing.vendorName || null;
        existing.lineKey = lineKey;
    } else {
        cart.push({
            lineKey,
            productId: product.id,
            offerId: product.offerId || null,
            vendorId: product.vendorId || null,
            vendorName: product.vendorName || null,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl || null,
            stock: product.stock,
            quantity: Math.min(quantity, maxStock),
        });
    }
    saveCart(cart);
    return cart;
};

export const updateCartQuantity = (lineKey, quantity) => {
    let cart = getCart();
    if (quantity <= 0) {
        cart = cart.filter((item) => cartLineKey(item) !== lineKey);
    } else {
        cart = cart.map((item) =>
            cartLineKey(item) === lineKey
                ? { ...item, quantity: Math.min(quantity, item.stock != null ? item.stock : quantity) }
                : item
        );
    }
    saveCart(cart);
    return cart;
};

export const removeFromCart = (lineKey) => {
    const cart = getCart().filter((item) => cartLineKey(item) !== lineKey);
    saveCart(cart);
    return cart;
};

export const clearCart = () => {
    saveCart([]);
};

export const getCartTotal = (cart = getCart()) =>
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const groupCartByVendor = (cart = getCart()) => {
    const groups = [];
    const index = new Map();
    cart.forEach((item) => {
        const key = item.vendorId || item.vendorName || 'default';
        if (!index.has(key)) {
            const group = {
                vendorId: item.vendorId || null,
                vendorName: item.vendorName || 'فروشگاه تات کیدز',
                items: []
            };
            index.set(key, group);
            groups.push(group);
        }
        index.get(key).items.push(item);
    });
    return groups;
};

export const formatPrice = (value) =>
    Number(value || 0).toLocaleString('fa-IR') + ' تومان';
