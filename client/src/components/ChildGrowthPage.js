import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBed,
    faCheck,
    faChild,
    faComments,
    faLightbulb,
    faPersonWalking,
    faPuzzlePiece,
    faShieldAlt,
    faSpinner,
    faUtensils,
    faHeart,
} from '@fortawesome/free-solid-svg-icons';
import {
    DOMAINS,
    analyzeConcern,
    completeActivity,
    fetchAgeGuide,
    toggleSafetyTask,
} from '../utils/child-growth';
import './ChildGrowthPage.css';

const SECTION_ICONS = {
    speech: faComments,
    motor: faPersonWalking,
    food: faUtensils,
    sleep: faBed,
    mood: faHeart,
};

const QUICK_PROMPTS = [
    'هنوز تنهایی راه نمی‌رود',
    'کلمه نمی‌گوید و فقط جیغ می‌زند',
    'شب‌ها مدام بیدار می‌شود',
    'غذا را رد می‌کند',
    'قشقرق شدید دارد',
];

const ChildGrowthPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [guide, setGuide] = useState(null);
    const [childRaw, setChildRaw] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [openSection, setOpenSection] = useState('speech');
    const [busyKey, setBusyKey] = useState('');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [concernText, setConcernText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [analyzeError, setAnalyzeError] = useState('');

    const loadGuide = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [guideData, childRes] = await Promise.all([
                fetchAgeGuide(childId),
                fetch(`/api/children/${childId}`),
            ]);
            if (!childRes.ok) throw new Error('کودک یافت نشد');
            setGuide(guideData);
            setChildRaw(await childRes.json());
        } catch (err) {
            setError(err.message || 'خطا در دریافت اطلاعات');
            setGuide(null);
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        loadGuide();
    }, [loadGuide]);

    const progress = useMemo(() => {
        if (!guide) return { done: 0, total: 0, pct: 0 };
        const acts = guide.activities || [];
        const safes = guide.safetyTasks || [];
        const done = acts.filter((item) => item.completed).length + safes.filter((item) => item.done).length;
        const total = acts.length + safes.length;
        return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    }, [guide]);

    const handleCompleteActivity = async (activity) => {
        setBusyKey(`a-${activity.id}`);
        try {
            await completeActivity(childId, activity.id, activity.duration);
            setGuide((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    activities: prev.activities.map((item) =>
                        item.id === activity.id ? { ...item, completed: true } : item
                    ),
                };
            });
            setSelectedActivity(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyKey('');
        }
    };

    const handleSafety = async (task) => {
        setBusyKey(`s-${task.id}`);
        try {
            const nextDone = !task.done;
            await toggleSafetyTask(childId, task.id, nextDone);
            setGuide((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    safetyTasks: prev.safetyTasks.map((item) =>
                        item.id === task.id ? { ...item, done: nextDone } : item
                    ),
                };
            });
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyKey('');
        }
    };

    const handleAnalyze = async (text) => {
        const concern = String(text || concernText).trim();
        if (concern.length < 4) {
            setAnalyzeError('نگرانی را کمی کامل‌تر بنویسید');
            return;
        }
        setBusyKey('ai');
        setAnalyzeError('');
        try {
            const result = await analyzeConcern(childId, concern);
            setAnalysis(result);
            setConcernText(concern);
        } catch (err) {
            setAnalyzeError(err.message);
        } finally {
            setBusyKey('');
        }
    };

    if (isLoading) {
        return (
            <div className="child-growth-page">
                <p className="cg-status">
                    <FontAwesomeIcon icon={faSpinner} spin /> در حال آماده‌سازی رشد کودک من...
                </p>
            </div>
        );
    }

    if (error || !guide) {
        return (
            <div className="child-growth-page">
                <nav className="page-nav-final">
                    <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                        &rarr; <span>خانه</span>
                    </button>
                    <h1>رشد کودک من</h1>
                    <div className="nav-placeholder" />
                </nav>
                <p className="cg-status">{error || 'اطلاعاتی یافت نشد.'}</p>
            </div>
        );
    }

    const { child, band, expectSections, activities, safetyTasks, redFlags, disclaimer } = guide;

    return (
        <div className="child-growth-page cg-simple">
            <nav className="page-nav-final">
                <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                    &rarr; <span>خانه</span>
                </button>
                <h1>رشد کودک من</h1>
                <div className="nav-placeholder" />
            </nav>

            <header className="cg-hero">
                <div className="cg-hero-avatar" aria-hidden="true">
                    {childRaw?.avatar ? <img src={childRaw.avatar} alt="" /> : <FontAwesomeIcon icon={faChild} />}
                </div>
                <div className="cg-hero-text">
                    <p className="cg-kicker">کودک من در این ماه</p>
                    <h2>{child.name}</h2>
                    <p className="cg-age">{child.ageLabel} · {band?.title}</p>
                    <p className="cg-band">{band?.subtitle}</p>
                </div>
            </header>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faLightbulb} />
                    <div>
                        <h3>۱. کودک من در این ماه چه تغییری می‌کند؟</h3>
                        <p>۵ کارت کوتاه؛ جزئیات فقط وقتی باز می‌شود که بخواهید.</p>
                    </div>
                </header>
                <div className="cg-accordion">
                    {(expectSections || []).map((section) => {
                        const open = openSection === section.id;
                        return (
                            <article key={section.id} className={`cg-acc ${open ? 'is-open' : ''}`}>
                                <button type="button" onClick={() => setOpenSection(open ? '' : section.id)}>
                                    <FontAwesomeIcon icon={SECTION_ICONS[section.id] || faLightbulb} />
                                    <span>
                                        <strong>{section.title}</strong>
                                        <em>{section.teaser}</em>
                                    </span>
                                </button>
                                {open && (
                                    <div className="cg-acc-body">
                                        {section.items.map((item) => (
                                            <p key={item.title}>
                                                <strong>{item.title}.</strong> {item.summary || item.detail}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faPuzzlePiece} />
                    <div>
                        <h3>۲. کارهای امروز و این ماه</h3>
                        <p>هر روز سه بازی تازه؛ کارهای دیروز تکرار نمی‌شوند.</p>
                    </div>
                </header>
                <div className="cg-progress" aria-label={`پیشرفت امروز ${progress.pct} درصد`}>
                    <div style={{ width: `${progress.pct}%` }} />
                </div>
                <p className="cg-note">{progress.done} از {progress.total} کار امروز · {progress.pct}٪</p>
                <div className="cg-list">
                    {(activities || []).map((activity, index) => (
                        <button
                            type="button"
                            key={activity.id}
                            className={`cg-list-item${activity.completed ? ' is-done' : ''}`}
                            onClick={() => setSelectedActivity(activity)}
                        >
                            <div>
                                <strong>{index + 1}. {activity.title}</strong>
                                <span>
                                    {activity.duration} دقیقه
                                    {' · '}
                                    {(activity.domains || []).map((d) => DOMAINS[d]?.label).filter(Boolean).join(' + ')}
                                </span>
                                {activity.goal && <em>{activity.goal}</em>}
                            </div>
                            <span className="cg-list-cta">{activity.completed ? 'انجام شد' : 'شروع'}</span>
                        </button>
                    ))}
                </div>
                {(safetyTasks || []).length > 0 && (
                    <div className="cg-safety-list">
                        {(safetyTasks || []).map((task) => (
                            <label key={task.id} className={task.done ? 'is-done' : ''}>
                                <input
                                    type="checkbox"
                                    checked={Boolean(task.done)}
                                    disabled={busyKey === `s-${task.id}`}
                                    onChange={() => handleSafety(task)}
                                />
                                <span>
                                    <strong>ایمنی: {task.title}</strong>
                                    <em>{task.detail}</em>
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                <Link to={`/growth-chart/${childId}`} className="cg-link-btn">مشاهده نمودار قد و وزن</Link>
            </section>

            <section className="cg-block cg-ai">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faShieldAlt} />
                    <div>
                        <h3>۳. از چی نگران باشم؟ دستیار هوشمند</h3>
                        <p>سن {child.name} ملاک پاسخ است؛ این بخش تشخیص پزشکی نیست.</p>
                    </div>
                </header>
                {(redFlags || []).length > 0 && (
                    <div className="cg-flags">
                        {redFlags.map((flag) => (
                            <article key={flag.id} className={`cg-flag is-${flag.level}`}>
                                <strong>{flag.title}</strong>
                                <span>{flag.detail}</span>
                            </article>
                        ))}
                    </div>
                )}
                <div className="cg-prompts">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button type="button" key={prompt} onClick={() => { setConcernText(prompt); handleAnalyze(prompt); }}>
                            {prompt}
                        </button>
                    ))}
                </div>
                <textarea
                    className="cg-concern-box"
                    rows="3"
                    value={concernText}
                    onChange={(e) => setConcernText(e.target.value)}
                    placeholder="نگرانی‌تان را با یک جمله بنویسید؛ مثلاً هنوز تنهایی راه نمی‌رود."
                />
                <button type="button" className="cg-btn" disabled={busyKey === 'ai'} onClick={() => handleAnalyze()}>
                    {busyKey === 'ai' ? 'در حال تحلیل...' : 'تحلیل نگرانی'}
                </button>
                {analyzeError && <p className="cg-error">{analyzeError}</p>}
                {analysis && (
                    <div className={`cg-ai-result is-${analysis.status_badge && analysis.status_badge.color}`}>
                        <p className="cg-ai-badge">{analysis.status_badge && analysis.status_badge.text}</p>
                        <p className="cg-overview">{analysis.summary_verdict}</p>
                        {analysis.analysis && (analysis.analysis.motor_explanation || analysis.analysis.speech_explanation) && (
                            <ul className="cg-bullets">
                                {analysis.analysis.motor_explanation && <li>{analysis.analysis.motor_explanation}</li>}
                                {analysis.analysis.speech_explanation && <li>{analysis.analysis.speech_explanation}</li>}
                            </ul>
                        )}
                        <h4 className="cg-subhead">الان در خانه چه کار کنم؟</h4>
                        <ol className="cg-steps">
                            {(analysis.home_actions || []).map((action) => (
                                <li key={action.title}>
                                    <strong>{action.title}</strong>
                                    <span>{action.description}</span>
                                </li>
                            ))}
                        </ol>
                        {analysis.recommended_action && (
                            <p className="cg-note">
                                {analysis.recommended_action.needs_doctor_visit
                                    ? 'این مورد را با پزشک کودک مطرح کنید.'
                                    : 'الان نیاز فوری به مراجعه نیست؛ اگر نگران ماندید با متخصص مشورت کنید.'}
                            </p>
                        )}
                    </div>
                )}
            </section>

            <p className="cg-disclaimer">
                <FontAwesomeIcon icon={faLightbulb} /> {disclaimer}
            </p>

            {selectedActivity && (
                <div className="cg-modal-overlay" role="presentation" onClick={() => setSelectedActivity(null)}>
                    <div className="cg-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <h3>{selectedActivity.title}</h3>
                        <p className="cg-note">⏱ {selectedActivity.duration} دقیقه</p>
                        {selectedActivity.goal && <p><strong>هدف:</strong> {selectedActivity.goal}</p>}
                        <ol>
                            {(selectedActivity.instructions || []).map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                        <div className="cg-modal-actions">
                            <button
                                type="button"
                                className="cg-btn"
                                disabled={busyKey === `a-${selectedActivity.id}` || selectedActivity.completed}
                                onClick={() => handleCompleteActivity(selectedActivity)}
                            >
                                <FontAwesomeIcon icon={faCheck} /> انجام شد
                            </button>
                            <button type="button" className="cg-btn is-soft" onClick={() => setSelectedActivity(null)}>بستن</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildGrowthPage;
