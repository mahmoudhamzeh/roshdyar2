import moment from 'jalali-moment';

const DRAFT_KEY = 'tatkids_checkout_draft';

export const DELIVERY_SLOTS = [
    { id: '09-13', label: '۹ تا ۱۳' },
    { id: '13-17', label: '۱۳ تا ۱۷' },
    { id: '17-21', label: '۱۷ تا ۲۱' }
];

export const slotLabel = (id) => {
    const found = DELIVERY_SLOTS.find((slot) => slot.id === id);
    return found ? found.label : id;
};

export const deliveryDays = (count = 7) => {
    const start = moment().add(1, 'day').startOf('day');
    const days = [];
    for (let i = 0; i < count; i += 1) {
        const day = start.clone().add(i, 'day');
        days.push({
            iso: day.format('YYYY-MM-DD'),
            weekday: day.locale('fa').format('dddd'),
            date: day.locale('fa').format('D MMMM'),
            label: day.locale('fa').format('dddd D MMMM')
        });
    }
    return days;
};

export const getCheckoutDraft = () => {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        const draft = raw ? JSON.parse(raw) : null;
        return draft && typeof draft === 'object' ? draft : null;
    } catch {
        return null;
    }
};

export const saveCheckoutDraft = (draft) => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft || {}));
};

export const clearCheckoutDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
};

export const formatAddressLine = (address) => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    return [address.province, address.city, address.address].filter(Boolean).join('، ');
};
