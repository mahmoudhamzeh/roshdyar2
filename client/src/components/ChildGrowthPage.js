import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAllergies,
    faBed,
    faChartLine,
    faCheck,
    faChild,
    faComments,
    faHeart,
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
} from '../utils/child-growth';
import { buildOverallStatus, collectHealthTags, metricCaption, statusPhrase } from '../utils/child-snapshot';
import './ChildGrowthPage.css';

const DOMAIN_TILES = [
    { id: 'speech', title: 'کلام', color: '#0284c7', icon: faComments },
    { id: 'motor', title: 'حرکت', color: '#d97706', icon: faPersonWalking },
    { id: 'food', title: 'تغذیه', color: '#c2410c', icon: faUtensils },
    { id: 'sleep', title: 'خواب', color: '#6d28d9', icon: faBed },
    { id: 'mood', title: 'رفتار', color: '#be185d', icon: faHeart },
];

const CHAT_CHIPS = [
    'قد و وزنش مناسب است؟',
    'در این سن چه چیزی بخورد؟',
    'شب‌ها بدخواب است',
    'هنوز تنهایی راه نمی‌رود',
];

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
    const foodTips = (nutrition?.priorities || nutrition?.guidance || []).slice(0, 3);
    const sleepTips = (sleep?.routine || []).slice(0, 3);

    return (
        <div className="child-growth-page">
            {pageNav}

            <header className={`cg-hero is-${overall.tone}`}>
                <div className="cg-hero-avatar" aria-hidden="true">
                    {childRaw?.avatar ? <img src={childRaw.avatar} alt="" /> : <FontAwesomeIcon icon={faChild} />}
                </div>
                <div>
                    <p className="cg-kicker">{band?.title} · {child.ageLabel}</p>
                    <h2>{child.name}</h2>
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
                        <strong>{heightAnalysis?.value != null ? `${heightAnalysis.value} سم` : '—'}</strong>
                        <small>{metricCaption(heightAnalysis)}</small>
                    </article>
                    <article className={`cg-stat is-${statusPhrase(weightAnalysis?.status).tone}`}>
                        <span>وزن</span>
                        <strong>{weightAnalysis?.value != null ? `${weightAnalysis.value} کگ` : '—'}</strong>
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
                    <p>چی بخورد، چه بازی کند، خوابش چطور باشد.</p>
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
                    <div className="cg-edu-body">
                        {nutrition?.overview && <p>{nutrition.overview}</p>}
                        <ul>
                            {(foodTips.length ? foodTips : [{ title: 'غذای خانواده', detail: 'لقمه‌های نرم و متنوع روی میز خانواده.' }]).map((item) => (
                                <li key={item.title || item}>
                                    <strong>{item.title || 'نکته'}.</strong> {item.detail || item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {eduTab === 'play' && (
                    <div className="cg-list">
                        {(activities || []).map((activity) => (
                            <button
                                type="button"
                                key={activity.id}
                                className={`cg-list-item${activity.completed ? ' is-done' : ''}`}
                                onClick={() => setSelectedActivity(activity)}
                            >
                                <div>
                                    <strong>{activity.title}</strong>
                                    <span>{activity.duration} دقیقه</span>
                                </div>
                                <em>{activity.completed ? 'انجام شد' : 'شروع'}</em>
                            </button>
                        ))}
                    </div>
                )}
                {eduTab === 'sleep' && (
                    <div className="cg-edu-body">
                        {sleep?.overview && <p>{sleep.overview}</p>}
                        <ul>
                            {(sleepTips.length ? sleepTips : [{ title: 'روتین ثابت', detail: 'هر شب همان سه کار کوتاه را تکرار کنید.' }]).map((item) => (
                                <li key={item.title}>
                                    <strong>{item.title}.</strong> {item.detail}
                                </li>
                            ))}
                        </ul>
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
                    {CHAT_CHIPS.map((chip) => (
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

            {selectedActivity && (
                <div className="cg-modal-overlay" role="presentation" onClick={() => setSelectedActivity(null)}>
                    <div className="cg-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <h3>{selectedActivity.title}</h3>
                        <p className="cg-note">{selectedActivity.duration} دقیقه</p>
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
