import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAllergies,
    faAppleAlt,
    faBed,
    faChartLine,
    faCheck,
    faCloudMoon,
    faComments,
    faCookieBite,
    faHeart,
    faMoon,
    faNotesMedical,
    faPaperPlane,
    faPersonWalking,
    faPuzzlePiece,
    faRobot,
    faSpinner,
    faSyringe,
    faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import {
    completeActivity,
    fetchAgeGuide,
    fetchGrowthChat,
    sendGrowthChat,
    chatChipsForAge,
} from '../utils/child-growth';
import { buildOverallStatus, collectHealthTags, metricCaption, statusPhrase } from '../utils/child-snapshot';
import ChildAvatar from './ChildAvatar';
import './ChildGrowthPage.css';

const DOMAIN_TILES = [
    { id: 'speech', title: 'کلام', color: '#0284c7', icon: faComments },
    { id: 'motor', title: 'حرکت', color: '#d97706', icon: faPersonWalking },
    { id: 'food', title: 'تغذیه', color: '#c2410c', icon: faUtensils },
    { id: 'sleep', title: 'خواب', color: '#6d28d9', icon: faBed },
    { id: 'mood', title: 'رفتار', color: '#be185d', icon: faHeart },
];

const FOOD_ART = [
    { emoji: '🥣', icon: faUtensils, wash: '#ffedd5', ink: '#c2410c' },
    { emoji: '🍌', icon: faAppleAlt, wash: '#fef9c3', ink: '#a16207' },
    { emoji: '🥛', icon: faCookieBite, wash: '#e0f2fe', ink: '#0369a1' },
    { emoji: '🥗', icon: faUtensils, wash: '#dcfce7', ink: '#15803d' },
];

const SLEEP_ART = [
    { emoji: '🌙', icon: faMoon, wash: '#ede9fe', ink: '#6d28d9' },
    { emoji: '🛏️', icon: faBed, wash: '#e0e7ff', ink: '#3730a3' },
    { emoji: '🧸', icon: faCloudMoon, wash: '#fce7f3', ink: '#9d174d' },
    { emoji: '😴', icon: faMoon, wash: '#dbeafe', ink: '#1d4ed8' },
];

const PLAY_ART = [
    { emoji: '🧸', wash: '#fce7f3', ink: '#be185d' },
    { emoji: '🎵', wash: '#dbeafe', ink: '#1d4ed8' },
    { emoji: '🫧', wash: '#ccfbf1', ink: '#0f766e' },
    { emoji: '🪞', wash: '#fef3c7', ink: '#b45309' },
    { emoji: '📚', wash: '#ede9fe', ink: '#6d28d9' },
    { emoji: '🧩', wash: '#ffedd5', ink: '#c2410c' },
];

const toEduCards = (items, problems, artSet) => {
    const cards = (items || []).map((item, index) => ({
        key: `${item.title || 'tip'}-${index}`,
        title: item.title || 'نکته',
        teaser: item.detail || item,
        body: item.detail || item,
        steps: [],
        art: artSet[index % artSet.length],
        kind: 'tip',
    }));
    (problems || []).forEach((item, index) => {
        cards.push({
            key: item.id || item.title || `problem-${index}`,
            title: item.title,
            teaser: 'اگر این موقعیت را دیدید، تصویر راهنما را باز کنید.',
            body: (item.guidance || []).join('\n'),
            steps: item.guidance || [],
            art: artSet[(index + 2) % artSet.length],
            kind: 'problem',
        });
    });
    return cards;
};

const ChildGrowthPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const chatEndRef = useRef(null);
    const [guide, setGuide] = useState(null);
    const [childRaw, setChildRaw] = useState(null);
    const [vaccines, setVaccines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [openSection, setOpenSection] = useState('speech');
    const [eduTab, setEduTab] = useState('food');
    const [busyKey, setBusyKey] = useState('');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [eduPopup, setEduPopup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [chatError, setChatError] = useState('');

    const loadGuide = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [guideData, childRes, growthRes, vaxRes, chatRes] = await Promise.all([
                fetchAgeGuide(childId),
                fetch(`/api/children/${childId}`),
                fetch(`/api/growth/${childId}`),
                fetch(`/api/vaccination-status/${childId}`),
                fetchGrowthChat(childId),
            ]);
            if (!childRes.ok) throw new Error('کودک یافت نشد');
            const childData = await childRes.json();
            if (growthRes.ok) childData.growthData = await growthRes.json();
            setGuide(guideData);
            setChildRaw(childData);
            setVaccines(vaxRes.ok ? await vaxRes.json() : []);
            setMessages(chatRes.messages || []);
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

    const heightAnalysis = useMemo(
        () => (childRaw ? analyzeGrowthMetric('height', childRaw) : null),
        [childRaw]
    );
    const weightAnalysis = useMemo(
        () => (childRaw ? analyzeGrowthMetric('weight', childRaw) : null),
        [childRaw]
    );
    const illnesses = useMemo(() => collectHealthTags(childRaw?.special_illnesses), [childRaw]);
    const allergies = useMemo(() => collectHealthTags(childRaw?.allergies), [childRaw]);
    const overdueVaccines = useMemo(
        () => vaccines.filter((item) => item.status === 'overdue').length,
        [vaccines]
    );
    const doneVaccines = useMemo(
        () => vaccines.filter((item) => item.status === 'done').length,
        [vaccines]
    );

    const overall = useMemo(
        () => buildOverallStatus({
            childName: guide?.child?.name || 'کودک',
            height: heightAnalysis,
            weight: weightAnalysis,
            illnesses,
            allergies,
            overdueVaccines,
        }),
        [guide, heightAnalysis, weightAnalysis, illnesses, allergies, overdueVaccines]
    );

    const activeSection = (guide?.expectSections || []).find((item) => item.id === openSection)
        || (guide?.expectSections || [])[0];

    useEffect(() => {
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    const handleCompleteActivity = async (activity) => {
        setBusyKey(`a-${activity.id}`);
        try {
            await completeActivity(childId, activity.id, activity.duration);
            setGuide((prev) => prev && ({
                ...prev,
                activities: prev.activities.map((item) =>
                    item.id === activity.id ? { ...item, completed: true } : item
                ),
            }));
            setSelectedActivity(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyKey('');
        }
    };

    const sendChat = async (text) => {
        const message = String(text || draft).trim();
        if (message.length < 2) {
            setChatError('یک جمله بنویسید');
            return;
        }
        setBusyKey('chat');
        setChatError('');
        setDraft('');
        const pending = [...messages, { role: 'user', content: message }];
        setMessages(pending);
        try {
            const result = await sendGrowthChat(childId, message, pending);
            setMessages(result.messages || [...pending, { role: 'assistant', content: result.reply }]);
        } catch (err) {
            setChatError(err.message);
        } finally {
            setBusyKey('');
        }
    };

    const pageNav = (
        <nav className="page-nav-final">
            <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                &rarr; <span>خانه</span>
            </button>
            <h1>رشد کودک من</h1>
            <div className="nav-placeholder" />
        </nav>
    );

    if (isLoading) {
        return (
            <div className="child-growth-page">
                {pageNav}
                <p className="cg-status">
                    <FontAwesomeIcon icon={faSpinner} spin /> در حال آماده‌سازی...
                </p>
            </div>
        );
    }

    if (error || !guide) {
        return (
            <div className="child-growth-page">
                {pageNav}
                <p className="cg-status">{error || 'اطلاعاتی یافت نشد.'}</p>
            </div>
        );
    }

    const { child, band, activities, nutrition, sleep, disclaimer } = guide;
    const welcome = `سلام، من دستیار رشد ${child.name} هستم. از وضعیت کلی، غذا، خواب یا نگرانی‌تان بپرسید.`;
    const shownMessages = messages.length ? messages : [{ role: 'assistant', content: welcome }];
    const chatChips = chatChipsForAge(child.ageInMonths);
    const foodCards = toEduCards(
        nutrition?.priorities || nutrition?.guidance || [{ title: 'غذای خانواده', detail: 'لقمه‌های نرم و متنوع روی میز خانواده.' }],
        nutrition?.problems,
        FOOD_ART
    );
    const sleepCards = toEduCards(
        sleep?.routine || [{ title: 'روتین ثابت', detail: 'هر شب همان سه کار کوتاه را تکرار کنید.' }],
        sleep?.problems,
        SLEEP_ART
    );

    return (
        <div className="child-growth-page">
            {pageNav}

            <header className={`cg-hero is-${overall.tone}`}>
                <ChildAvatar child={childRaw} size="sm" className="cg-hero-avatar" />
                <div>
                    <p className="cg-kicker">{band?.title} · {child.ageLabel}</p>
                    <h2>{child.name}</h2>
                    {overall.tone === 'watch' && <span className="cg-hero-badge">نیاز به توجه</span>}
                    {overall.tone === 'muted' && <span className="cg-hero-badge is-muted">ناقص</span>}
                    <strong>{overall.title}</strong>
                    <p>{overall.detail}</p>
                </div>
            </header>

            <section className="cg-block">
                <header className="cg-block-head">
                    <h3>۱. وضعیت کلی</h3>
                    <p>قد، وزن، بیماری ثبت‌شده و واکسن در یک نگاه.</p>
                </header>
                <div className="cg-stat-grid">
                    <article className={`cg-stat is-${statusPhrase(heightAnalysis?.status).tone}`}>
                        <span>قد</span>
                        <strong>{heightAnalysis?.value != null ? `${heightAnalysis.value} سانتی‌متر` : '—'}</strong>
                        <small>{metricCaption(heightAnalysis)}</small>
                    </article>
                    <article className={`cg-stat is-${statusPhrase(weightAnalysis?.status).tone}`}>
                        <span>وزن</span>
                        <strong>{weightAnalysis?.value != null ? `${weightAnalysis.value} کیلوگرم` : '—'}</strong>
                        <small>{metricCaption(weightAnalysis)}</small>
                    </article>
                    <article className={`cg-stat is-${illnesses.length || allergies.length ? 'watch' : 'ok'}`}>
                        <span><FontAwesomeIcon icon={illnesses.length ? faNotesMedical : faAllergies} /> سلامت</span>
                        <strong>{illnesses.length || allergies.length ? 'ثبت شده' : 'موردی نیست'}</strong>
                        <small>
                            {illnesses.length ? `بیماری: ${illnesses.join('، ')}` : 'بیماری خاصی ثبت نشده'}
                            {allergies.length ? ` · آلرژی: ${allergies.join('، ')}` : ''}
                        </small>
                    </article>
                    <article className={`cg-stat is-${overdueVaccines ? 'watch' : 'ok'}`}>
                        <span><FontAwesomeIcon icon={faSyringe} /> واکسن</span>
                        <strong>{overdueVaccines ? `${overdueVaccines} عقب‌افتاده` : 'به‌روز'}</strong>
                        <small>{doneVaccines} از {vaccines.length || 0} ثبت شده</small>
                    </article>
                </div>
                <div className="cg-inline-links">
                    <Link to={`/growth-chart/${childId}`}><FontAwesomeIcon icon={faChartLine} /> نمودار قد و وزن</Link>
                    <Link to={`/vaccination/${childId}`}>کارت واکسن</Link>
                    <Link to={`/health-profile/${childId}`}>پرونده سلامت</Link>
                </div>
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <h3>۲. در این سن چه کار می‌کند؟</h3>
                    <p>یک حوزه را بزنید؛ فقط همان باز می‌شود.</p>
                </header>
                <div className="cg-domains" role="tablist">
                    {DOMAIN_TILES.map((visual) => (
                        <button
                            type="button"
                            key={visual.id}
                            className={`cg-domain ${openSection === visual.id ? 'is-active' : ''}`}
                            onClick={() => setOpenSection(visual.id)}
                        >
                            <span className="cg-domain-icon" style={{ background: visual.color }}>
                                <FontAwesomeIcon icon={visual.icon} />
                            </span>
                            <em>{visual.title}</em>
                        </button>
                    ))}
                </div>
                {activeSection && (
                    <div className="cg-domain-detail">
                        <h4>{activeSection.title}</h4>
                        <ul>
                            {(activeSection.items || []).slice(0, 2).map((item) => (
                                <li key={item.title}>
                                    <strong>{item.title}.</strong> {item.summary}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <h3>۳. آموزش این سن</h3>
                    <p>کارت تصویر را بزنید تا راهنمای کامل در پنجره باز شود.</p>
                </header>
                <div className="cg-edu-tabs">
                    {[
                        { id: 'food', label: 'غذا', icon: faUtensils },
                        { id: 'play', label: 'بازی امروز', icon: faPuzzlePiece },
                        { id: 'sleep', label: 'خواب', icon: faBed },
                    ].map((tab) => (
                        <button
                            type="button"
                            key={tab.id}
                            className={eduTab === tab.id ? 'is-on' : ''}
                            onClick={() => setEduTab(tab.id)}
                        >
                            <FontAwesomeIcon icon={tab.icon} /> {tab.label}
                        </button>
                    ))}
                </div>
                {eduTab === 'food' && (
                    <div className="cg-edu-visual">
                        {nutrition?.overview && (
                            <button
                                type="button"
                                className="cg-edu-overview"
                                onClick={() => setEduPopup({
                                    title: 'تصویر کلی تغذیه',
                                    body: nutrition.overview,
                                    art: FOOD_ART[0],
                                })}
                            >
                                <span className="cg-edu-art" style={{ background: FOOD_ART[0].wash, color: FOOD_ART[0].ink }}>
                                    <span aria-hidden="true">{FOOD_ART[0].emoji}</span>
                                </span>
                                <div>
                                    <strong>چی بخورد؟</strong>
                                    <p>{nutrition.overview}</p>
                                </div>
                            </button>
                        )}
                        <div className="cg-edu-grid">
                            {foodCards.map((card) => (
                                <button
                                    type="button"
                                    key={card.key}
                                    className={`cg-edu-card${card.kind === 'problem' ? ' is-problem' : ''}`}
                                    onClick={() => setEduPopup(card)}
                                >
                                    <span className="cg-edu-art" style={{ background: card.art.wash, color: card.art.ink }}>
                                        <span aria-hidden="true">{card.art.emoji}</span>
                                        <FontAwesomeIcon icon={card.art.icon} />
                                    </span>
                                    {card.kind === 'problem' && <em>موقعیت رایج</em>}
                                    <strong>{card.title}</strong>
                                    <p>{card.teaser}</p>
                                    <span className="cg-edu-more">نمایش راهنما</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {eduTab === 'play' && (
                    <div className="cg-edu-grid">
                        {(activities || []).map((activity, index) => {
                            const art = PLAY_ART[index % PLAY_ART.length];
                            return (
                                <button
                                    type="button"
                                    key={activity.id}
                                    className={`cg-edu-card${activity.completed ? ' is-done' : ''}`}
                                    onClick={() => setSelectedActivity(activity)}
                                >
                                    <span className="cg-edu-art" style={{ background: art.wash, color: art.ink }}>
                                        <span aria-hidden="true">{art.emoji}</span>
                                        <FontAwesomeIcon icon={faPuzzlePiece} />
                                    </span>
                                    <strong>{activity.title}</strong>
                                    <p>{activity.shortDescription || activity.goal || `${activity.duration} دقیقه بازی کوتاه`}</p>
                                    <span className="cg-edu-more">{activity.completed ? 'انجام شد' : `${activity.duration} دقیقه · شروع`}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                {eduTab === 'sleep' && (
                    <div className="cg-edu-visual">
                        {sleep?.overview && (
                            <button
                                type="button"
                                className="cg-edu-overview"
                                onClick={() => setEduPopup({
                                    title: 'تصویر کلی خواب',
                                    body: sleep.overview,
                                    art: SLEEP_ART[0],
                                })}
                            >
                                <span className="cg-edu-art" style={{ background: SLEEP_ART[0].wash, color: SLEEP_ART[0].ink }}>
                                    <span aria-hidden="true">{SLEEP_ART[0].emoji}</span>
                                </span>
                                <div>
                                    <strong>خواب این سن</strong>
                                    <p>{sleep.overview}</p>
                                </div>
                            </button>
                        )}
                        <div className="cg-edu-grid">
                            {sleepCards.map((card) => (
                                <button
                                    type="button"
                                    key={card.key}
                                    className={`cg-edu-card${card.kind === 'problem' ? ' is-problem' : ''}`}
                                    onClick={() => setEduPopup(card)}
                                >
                                    <span className="cg-edu-art" style={{ background: card.art.wash, color: card.art.ink }}>
                                        <span aria-hidden="true">{card.art.emoji}</span>
                                        <FontAwesomeIcon icon={card.art.icon} />
                                    </span>
                                    {card.kind === 'problem' && <em>موقعیت رایج</em>}
                                    <strong>{card.title}</strong>
                                    <p>{card.teaser}</p>
                                    <span className="cg-edu-more">نمایش راهنما</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="cg-block cg-chat">
                <header className="cg-block-head">
                    <h3><FontAwesomeIcon icon={faRobot} /> دستیار هوشمند</h3>
                    <p>با او حرف بزنید؛ سن {child.name} ملاک پاسخ است.</p>
                </header>
                <div className="cg-chat-log" aria-live="polite">
                    {shownMessages.map((item, index) => (
                        <div key={`${item.role}-${index}`} className={`cg-bubble is-${item.role}`}>
                            {item.content}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="cg-prompts">
                    {chatChips.map((chip) => (
                        <button type="button" key={chip} disabled={busyKey === 'chat'} onClick={() => sendChat(chip)}>
                            {chip}
                        </button>
                    ))}
                </div>
                <form
                    className="cg-chat-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendChat();
                    }}
                >
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="سؤال خود را بنویسید"
                        disabled={busyKey === 'chat'}
                    />
                    <button type="submit" disabled={busyKey === 'chat'} aria-label="ارسال">
                        {busyKey === 'chat' ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />}
                    </button>
                </form>
                {chatError && <p className="cg-error">{chatError}</p>}
            </section>

            <p className="cg-disclaimer">{disclaimer}</p>

            {eduPopup && (
                <div className="cg-modal-overlay" role="presentation" onClick={() => setEduPopup(null)}>
                    <div className="cg-modal cg-edu-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        {eduPopup.art && (
                            <div className="cg-edu-modal-art" style={{ background: eduPopup.art.wash, color: eduPopup.art.ink }}>
                                <span aria-hidden="true">{eduPopup.art.emoji}</span>
                            </div>
                        )}
                        <h3>{eduPopup.title}</h3>
                        {eduPopup.body && <p className="cg-edu-modal-body">{eduPopup.body}</p>}
                        {(eduPopup.steps || []).length > 0 && (
                            <ol>
                                {eduPopup.steps.map((step) => (
                                    <li key={step}>{step}</li>
                                ))}
                            </ol>
                        )}
                        <div className="cg-modal-actions">
                            <button type="button" className="cg-btn is-soft" onClick={() => setEduPopup(null)}>بستن</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedActivity && (
                <div className="cg-modal-overlay" role="presentation" onClick={() => setSelectedActivity(null)}>
                    <div className="cg-modal cg-edu-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="cg-edu-modal-art" style={{ background: PLAY_ART[0].wash }}>
                            <span aria-hidden="true">🧩</span>
                        </div>
                        <h3>{selectedActivity.title}</h3>
                        <p className="cg-note">{selectedActivity.duration} دقیقه</p>
                        {selectedActivity.goal && <p><strong>هدف:</strong> {selectedActivity.goal}</p>}
                        {selectedActivity.materials && <p><strong>وسایل:</strong> {selectedActivity.materials}</p>}
                        <ol>
                            {(selectedActivity.instructions || []).map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                        {selectedActivity.tip && <p className="cg-note">{selectedActivity.tip}</p>}
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
