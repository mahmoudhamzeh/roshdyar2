import React from 'react';
import './QuantityStepper.css';

const QuantityStepper = ({ value, min = 1, max = 99, onChange, label = 'تعداد' }) => {
    const cap = Number.isFinite(Number(max)) ? Number(max) : 99;
    const floor = Number.isFinite(Number(min)) ? Number(min) : 1;
    const qty = Math.min(Math.max(Number(value) || floor, floor), cap);

    const setQty = (next) => {
        const n = Math.min(Math.max(next, floor), cap);
        if (n !== qty) onChange(n);
    };

    return (
        <div className="qty-stepper">
            {label ? <span className="qty-stepper-label">{label}</span> : null}
            <div className="qty-stepper-controls">
                <button type="button" onClick={() => setQty(qty - 1)} disabled={qty <= floor} aria-label="کاهش تعداد">
                    −
                </button>
                <input
                    type="number"
                    min={floor}
                    max={cap}
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value, 10) || floor)}
                    aria-label={label}
                />
                <button type="button" onClick={() => setQty(qty + 1)} disabled={qty >= cap} aria-label="افزایش تعداد">
                    +
                </button>
            </div>
        </div>
    );
};

export default QuantityStepper;
