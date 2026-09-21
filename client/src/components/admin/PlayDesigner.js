import React, { useEffect, useMemo, useState } from 'react';
import PlayStoryCard from '../PlayStoryCard';
import { PLAY_SCENES } from '../PlayStoryArt';
import './PlayDesigner.css';

const emptyForm = {
    title: '',
    duration: 8,
    bandId: '',
    instructions: '',
    goal: '',
    materials: '',
    scene: 'blocks',
    active: true,
    image: null,
};

const getAdmin = () => {
    try {
        return JSON.parse(localStorage.getItem('loggedInUser'));
    } catch {
        return null;
    }
};

const PlayDesigner = () => {
    const [plays, setPlays] = useState([]);
    const [bands, setBands] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [currentImage, setCurrentImage] = useState('');

    const load = async () => {
        const admin = getAdmin();
        const res = await fetch('/api/admin/growth-plays', {
            headers: { 'x-user-id': admin && admin.id, Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
        });
        if (!res.ok) throw new Error('بارگذاری بازی‌ها ناموفق بود');
        const data = await res.json();
        setPlays(data.plays || []);
        setBands(data.bands || []);
    };

    useEffect(() => {
        load().catch((err) => setError(err.message));
    }, []);

    const preview = useMemo(() => ({
        title: form.title || 'داستان تصویری',
        duration: form.duration || 8,
        goal: form.goal,
        instructions: form.instructions
            .split(/\r?\n/)
            .map((line) => line.replace(/^\s*\d+[.\-)]\s*/, '').trim())
            .filter(Boolean),
        scene: form.scene,
        imageUrl: form.image ? URL.createObjectURL(form.image) : currentImage,
        completed: false,
    }), [form, currentImage]);

    const reset = () => {
        setForm(emptyForm);
        setEditingId(null);
        setCurrentImage('');
    };

    const startEdit = (play) => {
        setEditingId(play.id);
        setCurrentImage(play.imageUrl || '');
        setForm({
            title: play.title || '',
            duration: play.duration || 8,
            bandId: play.bandId || '',
            instructions: (play.instructions || []).join('\n'),
            goal: play.goal || '',
            materials: play.materials || '',
            scene: play.scene || 'blocks',
            active: play.active !== false,
            image: null,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const admin = getAdmin();
            const body = new FormData();
            body.append('title', form.title);
            body.append('duration', String(form.duration));
            body.append('bandId', form.bandId);
            body.append('instructions', form.instructions);
            body.append('goal', form.goal);
            body.append('materials', form.materials);
            body.append('scene', form.scene);
            body.append('active', form.active ? 'true' : 'false');
            if (form.image) body.append('image', form.image);
            const url = editingId ? `/api/admin/growth-plays/${editingId}` : '/api/admin/growth-plays';
            const res = await fetch(url, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'x-user-id': admin && admin.id, Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
                body,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'ذخیره بازی ناموفق بود');
            reset();
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (play) => {
        if (!window.confirm(`بازی «${play.title}» حذف شود؟`)) return;
        const admin = getAdmin();
        await fetch(`/api/admin/growth-plays/${play.id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': admin && admin.id, Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
        });
        if (editingId === play.id) reset();
        load().catch((err) => setError(err.message));
    };

    return (
        <div className="play-designer">
            <header className="play-designer-head">
                <h2>طراحی بازی رشد</h2>
                <p>بازی را مثل کارت داستان تصویری بسازید. اگر تصویر نگذارید، تصویرک صحنه انتخاب‌شده نمایش داده می‌شود.</p>
            </header>
            {error && <p className="play-designer-error">{error}</p>}
            <div className="play-designer-grid">
                <form className="play-designer-form" onSubmit={handleSubmit}>
                    <h3>{editingId ? 'ویرایش بازی' : 'بازی جدید'}</h3>
                    <label>عنوان</label>
                    <input
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="مثلاً داستان تصویری"
                        required
                    />
                    <div className="play-designer-row">
                        <div>
                            <label>مدت (دقیقه)</label>
                            <input
                                type="number"
                                min="1"
                                value={form.duration}
                                onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label>گروه سنی</label>
                            <select
                                value={form.bandId}
                                onChange={(e) => setForm((p) => ({ ...p, bandId: e.target.value }))}
                            >
                                <option value="">همه سنین</option>
                                {bands.map((band) => (
                                    <option key={band.id} value={band.id}>{band.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <label>صحنه تصویرک</label>
                    <select
                        value={form.scene}
                        onChange={(e) => setForm((p) => ({ ...p, scene: e.target.value }))}
                    >
                        {PLAY_SCENES.map((scene) => (
                            <option key={scene.id} value={scene.id}>{scene.label}</option>
                        ))}
                    </select>
                    <label>تصویر اختصاصی (اختیاری)</label>
                    <input type="file" accept="image/*" onChange={(e) => setForm((p) => ({ ...p, image: e.target.files[0] || null }))} />
                    <label>هدف کوتاه</label>
                    <input
                        value={form.goal}
                        onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
                        placeholder="مثلاً بازی مشترک ساختنی"
                    />
                    <label>مراحل بازی (هر خط یک مرحله)</label>
                    <textarea
                        rows="5"
                        value={form.instructions}
                        onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                        placeholder={'صفحه را با هم ببینید.\nبپرسید چه احساسی دارید؟'}
                        required
                    />
                    <label className="play-designer-check">
                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                        />
                        فعال باشد و در رشد کودک نمایش داده شود
                    </label>
                    <div className="play-designer-actions">
                        <button type="submit" disabled={saving}>{saving ? 'در حال ذخیره...' : (editingId ? 'ذخیره تغییرات' : 'ثبت بازی')}</button>
                        {editingId && <button type="button" className="is-ghost" onClick={reset}>انصراف</button>}
                    </div>
                </form>
                <div className="play-designer-preview">
                    <h3>پیش‌نمایش کارت</h3>
                    <PlayStoryCard activity={preview} showClose={false} />
                </div>
            </div>
            <section className="play-designer-list">
                <h3>بازی‌های طراحی‌شده</h3>
                {plays.length === 0 ? (
                    <p>هنوز بازی سفارشی ثبت نشده است.</p>
                ) : (
                    <ul>
                        {plays.map((play) => (
                            <li key={play.id}>
                                <div>
                                    <strong>{play.title}</strong>
                                    <span>{play.duration} دقیقه · {play.active ? 'فعال' : 'غیرفعال'}</span>
                                    <small>{play.bandId || 'همه سنین'} · {play.instructions.length} مرحله</small>
                                </div>
                                <div>
                                    <button type="button" onClick={() => startEdit(play)}>ویرایش</button>
                                    <button type="button" className="is-danger" onClick={() => handleDelete(play)}>حذف</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default PlayDesigner;
