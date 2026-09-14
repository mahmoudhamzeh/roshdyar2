import React from 'react';
import { useHistory } from 'react-router-dom';
import './CartAddedModal.css';

const CartAddedModal = ({ open, productName, onClose }) => {
    const history = useHistory();
    if (!open) return null;

    return (
        <div className="cart-added-overlay" role="presentation" onClick={onClose}>
            <div className="cart-added-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <h3>کالا به سبد خرید اضافه شد</h3>
                {productName ? <p>{productName}</p> : null}
                <div className="cart-added-actions">
                    <button type="button" className="cart-added-continue" onClick={onClose}>
                        ادامه خرید
                    </button>
                    <button
                        type="button"
                        className="cart-added-cart"
                        onClick={() => {
                            onClose();
                            history.push('/cart');
                        }}
                    >
                        رفتن به سبد خرید
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartAddedModal;
