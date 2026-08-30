const CART_KEY = 'tatkids_shop_cart';

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
    const existing = cart.find((item) => item.productId === product.id);
    const nextQty = (existing ? existing.quantity : 0) + quantity;
    const maxStock = product.stock != null ? product.stock : nextQty;

    if (existing) {
        existing.quantity = Math.min(nextQty, maxStock);
        existing.name = product.name;
        existing.price = product.price;
        existing.imageUrl = product.imageUrl || null;
        existing.stock = product.stock;
    } else {
        cart.push({
            productId: product.id,
            offerId: product.offerId || null,
            vendorId: product.vendorId || null,
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

export const updateCartQuantity = (productId, quantity) => {
    let cart = getCart();
    if (quantity <= 0) {
        cart = cart.filter((item) => item.productId !== productId);
    } else {
        cart = cart.map((item) =>
            item.productId === productId
                ? { ...item, quantity: Math.min(quantity, item.stock != null ? item.stock : quantity) }
                : item
        );
    }
    saveCart(cart);
    return cart;
};

export const removeFromCart = (productId) => {
    const cart = getCart().filter((item) => item.productId !== productId);
    saveCart(cart);
    return cart;
};

export const clearCart = () => {
    saveCart([]);
};

export const getCartTotal = (cart = getCart()) =>
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const formatPrice = (value) =>
    Number(value || 0).toLocaleString('fa-IR') + ' تومان';
