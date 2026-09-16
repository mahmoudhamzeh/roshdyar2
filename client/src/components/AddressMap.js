import React, { useEffect, useRef } from 'react';

const TEHRAN = [35.6892, 51.3890];
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const loadLeaflet = () => new Promise((resolve, reject) => {
    if (window.L) {
        resolve(window.L);
        return;
    }
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        document.head.appendChild(link);
    }
    const existing = document.getElementById('leaflet-js');
    if (existing) {
        existing.addEventListener('load', () => resolve(window.L));
        existing.addEventListener('error', reject);
        return;
    }
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
});

const AddressMap = ({ lat, lng, onChange }) => {
    const elRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        let cancelled = false;
        loadLeaflet().then((L) => {
            if (cancelled || !elRef.current || !L || mapRef.current) return;
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
            });
            const start = lat != null && lng != null ? [Number(lat), Number(lng)] : TEHRAN;
            const map = L.map(elRef.current).setView(start, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            const marker = L.marker(start, { draggable: true }).addTo(map);
            const emit = (point) => {
                if (onChangeRef.current) onChangeRef.current({ lat: point.lat, lng: point.lng });
            };
            marker.on('dragend', () => emit(marker.getLatLng()));
            map.on('click', (event) => {
                marker.setLatLng(event.latlng);
                emit(event.latlng);
            });
            mapRef.current = map;
            markerRef.current = marker;
            window.setTimeout(() => map.invalidateSize(), 250);
            if (lat == null || lng == null) emit({ lat: start[0], lng: start[1] });
        }).catch(() => {});
        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
        // Map instance is created once; lat/lng updates happen in the next effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!mapRef.current || !markerRef.current || lat == null || lng == null) return;
        const next = [Number(lat), Number(lng)];
        markerRef.current.setLatLng(next);
        mapRef.current.setView(next);
    }, [lat, lng]);

    return <div ref={elRef} className="checkout-map" role="application" aria-label="نقشه انتخاب محل ارسال" />;
};

export default AddressMap;
