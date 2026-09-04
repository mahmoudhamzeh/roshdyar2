import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBed,
    faChartLine,
    faCheck,
    faCheckCircle,
    faChild,
    faCircle,
    faClipboardList,
    faComments,
    faHeart,
    faLightbulb,
    faPersonWalking,
    faPuzzlePiece,
    faQuestionCircle,
    faShieldAlt,
    faSpinner,
    faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import {
    DOMAINS,
    MILESTONE_STATUS,
    STATUS_LABELS,
    TREND_LABELS,
    analyzeConcern,
    completeActivity,
    fetchAgeGuide,
    formatRelativeMeasurementDate,
    toggleSafetyTask,
    updateMilestoneStatus,
} from '../utils/child-growth';
import './ChildGrowthPage.css';

const DOMAIN_TILES = [
    { id: 'speech', title: 'کلام', color: '#0284c7', icon: faComments, domains: ['LANGUAGE', 'COGNITIVE'] },
    { id: 'motor', title: 'حرکت', color: '#d97706', icon: faPersonWalking, domains: ['MOTOR'] },
    { id: 'food', title: 'تغذیه', color: '#c2410c', icon: faUtensils, domains: ['INDEPENDENCE'], source: 'nutrition' },
    { id: 'sleep', title: 'خواب', color: '#6d28d9', icon: faBed, domains: [], source: 'sleep' },
    { id: 'mood', title: 'رفتار', color: '#be185d', icon: faHeart, domains: ['SOCIAL'], source: 'behavior' },
];

const QUICK_PROMPTS = [
    'هنوز تنهایی راه نمی‌رود',
    'کلمه نمی‌گوید و جیغ می‌زند',
    'شب‌ها زیاد بیدار می‌شود',
    'غذا را رد می‌کند',
    'قشقرق شدید دارد',
];

const STATUS_CHOICES = [
    MILESTONE_STATUS.OBSERVED,
    MILESTONE_STATUS.NOT_YET_OBSERVED,
    MILESTONE_STATUS.UNSURE,
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
    const [expandedExpect, setExpandedExpect] = useState(false);

    const loadGuide = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [guideData, childRes, growthRes] = await Promise.all([
                fetchAgeGuide(childId),
                fetch(`/api/children/${childId}`),
                fetch(`/api/growth/${childId}`),
            ]);
            if (!childRes.ok) throw new Error('کودک یافت نشد');
            const childData = await childRes.json();
            if (growthRes.ok) {
                childData.growthData = await growthRes.json();
            }
            setGuide(guideData);
            setChildRaw(childData);
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

    const lastMeasure = useMemo(() => {
        if (guide?.growthSummary?.lastMeasurement) return guide.growthSummary.lastMeasurement;
        const records = childRaw?.growthData;
        if (!Array.isArray(records) || !records.length) return null;
        return [...records].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    }, [guide, childRaw]);

    const progress = useMemo(() => {
        if (!guide) return { done: 0, total: 0, pct: 0 };
        const acts = guide.activities || [];
        const safes = guide.safetyTasks || [];
        const done = acts.filter((item) => item.completed).length + safes.filter((item) => item.done).length;
        const total = acts.length + safes.length;
        return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    }, [guide]);

    const activeTile = DOMAIN_TILES.find((item) => item.id === openSection) || DOMAIN_TILES[0];
    const activeSection = (guide?.expectSections || []).find((item) => item.id === openSection)
        || (guide?.expectSections || [])[0];
    const topicBlock = activeTile?.source ? guide?.[activeTile.source] : null;
    const sectionMilestones = useMemo(() => {
        const items = guide?.milestones?.items || [];
        const ids = activeTile?.domains || [];
        if (!ids.length) return [];
        return items.filter((item) => ids.includes(item.domain)).slice(0, 4);
    }, [guide, activeTile]);

    const handleMilestone = async (milestoneId, status) => {
        setBusyKey(`m-${milestoneId}`);
        try {
            await updateMilestoneStatus(childId, milestoneId, status);
            setGuide((prev) => {
                if (!prev) return prev;
                const items = prev.milestones.items.map((item) =>
                    item.id === milestoneId ? { ...item, status } : item
                );
                const checked = items.filter((item) => item.status !== MILESTONE_STATUS.NOT_CHECKED).length;
                const observed = items.filter((item) => item.status === MILESTONE_STATUS.OBSERVED).length;
                return { ...prev, milestones: { ...prev.milestones, items, checked, observed } };
            });
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyKey('');
        }
    };

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

    const handleSafety = async (task) => {
        setBusyKey(`s-${task.id}`);
        try {
            const nextDone = !task.done;
            await toggleSafetyTask(childId, task.id, nextDone);
            setGuide((prev) => prev && ({
                ...prev,
                safetyTasks: prev.safetyTasks.map((item) =>
                    item.id === task.id ? { ...item, done: nextDone } : item
                ),
            }));
        } catch (err) {
            alert(err.message);
        } finally {
            setBusyKey('');
        }
    };

    const handleAnalyze = async (text) => {
        const concern = String(text || concernText).trim();
        if (concern.length < 4) {
            setAnalyzeError('یک جمله کامل‌تر بنویسید');
            return;
        }
        setBusyKey('ai');
        setAnalyzeError('');
        try {
            setAnalysis(await analyzeConcern(childId, concern));
            setConcernText(concern);
        } catch (err) {
            setAnalyzeError(err.message);
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

    const { child, band, expectSections, activities, safetyTasks, redFlags, disclaimer, milestones, growthSummary } = guide;

    return (
        <div className="child-growth-page">
            {pageNav}

            <header className="cg-hero">
                <div className="cg-hero-avatar" aria-hidden="true">
                    {childRaw?.avatar ? <img src={childRaw.avatar} alt="" /> : <FontAwesomeIcon icon={faChild} />}
                </div>
                <div className="cg-hero-text">
                    <p className="cg-kicker">{band?.title}</p>
                    <h2>{child.name}</h2>
                    <p className="cg-age">{child.ageLabel}</p>
                    {band?.subtitle && <p className="cg-band">{band.subtitle}</p>}
                </div>
            </header>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faLightbulb} />
                    <div>
                        <h3>این ماه چه تغییری می‌کند؟</h3>
                        <p>یک حوزه را انتخاب کنید؛ جزئیات فقط همان‌جا باز می‌شود.</p>
                    </div>
                </header>
                <div className="cg-domains" role="tablist" aria-label="حوزه‌های رشد">
                    {(expectSections || []).map((section) => {
                        const visual = DOMAIN_TILES.find((item) => item.id === section.id) || DOMAIN_TILES[0];
                        const active = activeSection && activeSection.id === section.id;
                        return (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={active}
                                key={section.id}
                                className={`cg-domain ${active ? 'is-active' : ''}`}
                                onClick={() => {
                                    setOpenSection(section.id);
                                    setExpandedExpect(false);
                                }}
                            >
                                <span className="cg-domain-icon" style={{ background: visual.color }}>
                                    <FontAwesomeIcon icon={visual.icon} />
                                </span>
                                <em>{visual.title}</em>
                            </button>
                        );
                    })}
                </div>
                {activeSection && (
                    <div className="cg-domain-detail">
                        <h4>{activeSection.title}</h4>
                        {(activeSection.items || []).slice(0, expandedExpect ? 3 : 1).map((item) => (
                            <article key={item.title} className="cg-focus">
                                <strong>{item.title}</strong>
                                <p>{expandedExpect ? (item.detail || item.summary) : item.summary}</p>
                            </article>
                        ))}
                        {topicBlock?.overview && expandedExpect && (
                            <p className="cg-overview">{topicBlock.overview}</p>
                        )}
                        {(activeSection.items || []).length > 1 && (
                            <button
                                type="button"
                                className="cg-text-btn"
                                onClick={() => setExpandedExpect((prev) => !prev)}
                            >
                                {expandedExpect ? 'نمایش کمتر' : 'خواندن جزئیات'}
                            </button>
                        )}
                    </div>
                )}
                {sectionMilestones.length > 0 && (
                    <div className="cg-milestone-box">
                        <div className="cg-milestone-head">
                            <FontAwesomeIcon icon={faClipboardList} />
                            <span>
                                مهارت‌های {activeTile.title}
                                {milestones?.total ? ` · ${milestones.checked} از ${milestones.total} بررسی‌شده` : ''}
                            </span>
                        </div>
                        <ul className="cg-milestone-list">
                            {sectionMilestones.map((milestone) => {
                                const status = milestone.status || MILESTONE_STATUS.NOT_CHECKED;
                                return (
                                    <li key={milestone.id}>
                                        <div className="cg-milestone-main">
                                            <FontAwesomeIcon
                                                icon={status === MILESTONE_STATUS.OBSERVED ? faCheckCircle : faCircle}
                                                className={status === MILESTONE_STATUS.OBSERVED ? 'is-observed' : ''}
                                            />
                                            <div>
                                                <strong>{milestone.title}</strong>
                                                {milestone.description && <p>{milestone.description}</p>}
                                            </div>
                                        </div>
                                        <div className="cg-status-row">
                                            {STATUS_CHOICES.map((choice) => (
                                                <button
                                                    type="button"
                                                    key={choice}
                                                    disabled={busyKey === `m-${milestone.id}`}
                                                    className={status === choice ? 'is-active' : ''}
                                                    onClick={() => handleMilestone(milestone.id, choice)}
                                                >
                                                    {STATUS_LABELS[choice]}
                                                </button>
                                            ))}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faPuzzlePiece} />
                    <div>
                        <h3>کار امروز</h3>
                        <p>هر روز سه بازی تازه. تیک امروز برای فردا عوض می‌شود.</p>
                    </div>
                    <span className="cg-progress-chip">{progress.pct}٪</span>
                </header>
                <div className="cg-progress" aria-label={`پیشرفت امروز ${progress.pct} درصد`}>
                    <div style={{ width: `${progress.pct}%` }} />
                </div>
                <p className="cg-note">{progress.done} از {progress.total} کار امروز</p>
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
                                    {(activity.domains || []).length
                                        ? ` · ${(activity.domains || []).map((d) => DOMAINS[d]?.label).filter(Boolean).join(' + ')}`
                                        : ''}
                                </span>
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
                                    <strong>
                                        <FontAwesomeIcon icon={faShieldAlt} /> {task.title}
                                    </strong>
                                    {task.detail && <em>{task.detail}</em>}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                <div className="cg-growth-box">
                    <div className="cg-growth-grid">
                        <div>
                            <span>قد</span>
                            <strong>{lastMeasure?.height != null ? `${lastMeasure.height} سم` : '—'}</strong>
                            <small>
                                {heightAnalysis?.percentile != null
                                    ? `حدود صدک ${Math.round(heightAnalysis.percentile)}`
                                    : 'هنوز ثبت نشده'}
                            </small>
                        </div>
                        <div>
                            <span>وزن</span>
                            <strong>{lastMeasure?.weight != null ? `${lastMeasure.weight} کگ` : '—'}</strong>
                            <small>
                                {weightAnalysis?.percentile != null
                                    ? `حدود صدک ${Math.round(weightAnalysis.percentile)}`
                                    : 'هنوز ثبت نشده'}
                            </small>
                        </div>
                    </div>
                    <p className="cg-note">
                        آخرین اندازه‌گیری: {formatRelativeMeasurementDate(lastMeasure?.date) || 'ثبت نشده'}
                        {growthSummary?.trend ? ` · روند ${TREND_LABELS[growthSummary.trend] || ''}` : ''}
                    </p>
                    <Link to={`/growth-chart/${childId}`} className="cg-link-btn">
                        <FontAwesomeIcon icon={faChartLine} /> نمودار کامل قد و وزن
                    </Link>
                </div>
            </section>

            <section className="cg-block cg-ai">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faQuestionCircle} />
                    <div>
                        <h3>نگرانم؛ کمکم کن</h3>
                        <p>سن {child.name} ملاک پاسخ است. این بخش تشخیص پزشکی نیست.</p>
                    </div>
                </header>
                {(redFlags || []).length > 0 && (
                    <details className="cg-flags-box">
                        <summary>چه موقع باید حواسم باشد؟</summary>
                        <div>
                            {redFlags.slice(0, 4).map((flag) => (
                                <p key={flag.id}><strong>{flag.title}:</strong> {flag.detail}</p>
                            ))}
                        </div>
                    </details>
                )}
                <div className="cg-prompts">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            type="button"
                            key={prompt}
                            className={concernText === prompt ? 'is-on' : ''}
                            onClick={() => handleAnalyze(prompt)}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
                <textarea
                    className="cg-concern-box"
                    rows="3"
                    value={concernText}
                    onChange={(e) => setConcernText(e.target.value)}
                    placeholder="نگرانی را با یک جمله بنویسید"
                />
                <button type="button" className="cg-btn" disabled={busyKey === 'ai'} onClick={() => handleAnalyze()}>
                    {busyKey === 'ai' ? 'در حال تحلیل...' : 'تحلیل نگرانی'}
                </button>
                {analyzeError && <p className="cg-error">{analyzeError}</p>}
                {analysis && (
                    <div className={`cg-ai-card is-${analysis.status_badge && analysis.status_badge.color}`}>
                        <span className="cg-ai-badge">{analysis.status_badge && analysis.status_badge.text}</span>
                        <p className="cg-overview">{analysis.summary_verdict}</p>
                        <ol className="cg-steps">
                            {(analysis.analysis?.motor_explanation || analysis.analysis?.speech_explanation) && (
                                <li>
                                    <strong>وضعیت</strong>
                                    <span>
                                        {[analysis.analysis.motor_explanation, analysis.analysis.speech_explanation]
                                            .filter(Boolean)
                                            .join(' ')}
                                    </span>
                                </li>
                            )}
                            <li>
                                <strong>الان در خانه</strong>
                                <span>
                                    {(analysis.home_actions || []).length
                                        ? analysis.home_actions.map((action) => action.title).join(' · ')
                                        : 'بازی‌های امروز را ادامه دهید.'}
                                </span>
                            </li>
                            <li>
                                <strong>قدم بعد</strong>
                                <span>
                                    {analysis.recommended_action && analysis.recommended_action.needs_doctor_visit
                                        ? 'این مورد را با پزشک کودک مطرح کنید.'
                                        : 'الان مراجعه فوری لازم نیست؛ اگر نگران ماندید مشورت کنید.'}
                                </span>
                            </li>
                        </ol>
                        {(analysis.home_actions || []).length > 0 && (
                            <ul className="cg-bullets">
                                {analysis.home_actions.map((action) => (
                                    <li key={action.title}>
                                        <strong>{action.title}.</strong> {action.description}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
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
                            <button type="button" className="cg-btn is-soft" onClick={() => setSelectedActivity(null)}>
                                بستن
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildGrowthPage;
