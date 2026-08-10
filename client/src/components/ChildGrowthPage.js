import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAppleAlt,
    faBed,
    faChartLine,
    faCheckCircle,
    faChild,
    faHeart,
    faLightbulb,
    faSeedling,
    faShieldAlt,
    faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import { getChildDisplayName } from '../utils/childName';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import {
    DOMAINS,
    MILESTONE_STATUS,
    formatAgeLabel,
    formatRelativeMeasurementDate,
    getCorrectedAgeMonths,
    getGrowthBandForAge,
    loadActivityCompletions,
    loadMilestoneStatuses,
    saveActivityCompletion,
    saveMilestoneStatus,
} from '../utils/child-growth';
import './ChildGrowthPage.css';

const TOPIC_SECTIONS = [
    { id: 'sleep', title: 'خواب', icon: faBed, key: 'sleep' },
    { id: 'nutrition', title: 'تغذیه', icon: faAppleAlt, key: 'nutrition' },
    { id: 'behavior', title: 'رفتار', icon: faHeart, key: 'behavior' },
    { id: 'safety', title: 'ایمنی', icon: faShieldAlt, key: 'safety' },
];

const CONCERN_TOPICS = [
    'گفتار',
    'حرکت',
    'تغذیه',
    'خواب',
    'رفتار',
    'قد',
    'وزن',
    'بینایی',
    'شنوایی',
];

const STATUS_LABELS = {
    [MILESTONE_STATUS.NOT_CHECKED]: 'هنوز بررسی نکرده‌ام',
    [MILESTONE_STATUS.OBSERVED]: 'مشاهده کرده‌ام',
    [MILESTONE_STATUS.NOT_YET_OBSERVED]: 'هنوز مشاهده نکرده‌ام',
    [MILESTONE_STATUS.UNSURE]: 'مطمئن نیستم',
};

const ChildGrowthPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [child, setChild] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [milestoneStatuses, setMilestoneStatuses] = useState({});
    const [completions, setCompletions] = useState({});
    const [activeTopic, setActiveTopic] = useState(null);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showMilestones, setShowMilestones] = useState(false);
    const [concernTopic, setConcernTopic] = useState(null);
    const [concernStep, setConcernStep] = useState(0);
    const [concernAnswers, setConcernAnswers] = useState([]);
    const [concernResult, setConcernResult] = useState(null);

    const loadChild = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/children/${childId}`);
            if (!res.ok) throw new Error('کودک یافت نشد');
            const data = await res.json();
            setChild(data);
            setMilestoneStatuses(loadMilestoneStatuses(childId));
            setCompletions(loadActivityCompletions(childId));
        } catch (err) {
            setError(err.message || 'خطا در دریافت اطلاعات');
            setChild(null);
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        loadChild();
    }, [loadChild]);

    const ageInfo = useMemo(() => (child ? getCorrectedAgeMonths(child) : null), [child]);
    const contentAge = ageInfo ? (ageInfo.isPremature && ageInfo.chronological < 24 ? ageInfo.corrected : ageInfo.chronological) : 0;
    const band = useMemo(() => getGrowthBandForAge(contentAge), [contentAge]);

    const milestoneStats = useMemo(() => {
        const total = band?.milestones?.length || 0;
        const checked = (band?.milestones || []).filter((m) => {
            const status = milestoneStatuses[m.id]?.status;
            return status && status !== MILESTONE_STATUS.NOT_CHECKED;
        }).length;
        const observed = (band?.milestones || []).filter(
            (m) => milestoneStatuses[m.id]?.status === MILESTONE_STATUS.OBSERVED
        ).length;
        return { total, checked, observed };
    }, [band, milestoneStatuses]);

    const heightAnalysis = useMemo(
        () => (child ? analyzeGrowthMetric('height', child) : null),
        [child]
    );
    const weightAnalysis = useMemo(
        () => (child ? analyzeGrowthMetric('weight', child) : null),
        [child]
    );

    const handleMilestoneStatus = (milestoneId, status) => {
        const next = saveMilestoneStatus(childId, milestoneId, status);
        setMilestoneStatuses({ ...next });
    };

    const handleCompleteActivity = (activity) => {
        const next = saveActivityCompletion(childId, activity.id, { duration: activity.duration });
        setCompletions({ ...next });
        setSelectedActivity(null);
    };

    const startConcern = (topic) => {
        setConcernTopic(topic);
        setConcernStep(0);
        setConcernAnswers([]);
        setConcernResult(null);
    };

    const answerConcern = (answer) => {
        const nextAnswers = [...concernAnswers, answer];
        setConcernAnswers(nextAnswers);
        if (concernStep === 0) {
            setConcernStep(1);
            return;
        }
        if (concernStep === 1) {
            setConcernStep(2);
            return;
        }
        // Step 2: regression question — yes triggers professional review
        if (answer === 'yes') {
            setConcernResult('professional');
        } else if (nextAnswers.includes('no_progress') || nextAnswers.filter((a) => a === 'no').length >= 2) {
            setConcernResult('yellow');
        } else {
            setConcernResult('green');
        }
    };

    const resetConcern = () => {
        setConcernTopic(null);
        setConcernStep(0);
        setConcernAnswers([]);
        setConcernResult(null);
    };

    if (isLoading) {
        return (
            <div className="child-growth-page">
                <p className="cg-status">در حال آماده‌سازی رشد کودک من...</p>
            </div>
        );
    }

    if (error || !child) {
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

    const displayName = getChildDisplayName(child);
    const ageLabel = formatAgeLabel(ageInfo.chronological);
    const lastMeasureDate =
        heightAnalysis?.date || weightAnalysis?.date || null;

    const concernQuestions = [
        {
            text: `آیا درباره «${concernTopic}» نشانه‌ای هست که اخیراً بیشتر نگران‌تان کرده؟`,
            yes: 'yes',
            no: 'no',
            yesLabel: 'بله، نگرانم',
            noLabel: 'هنوز مطمئن نیستم',
        },
        {
            text: 'آیا در این موضوع نسبت به قبل پیشرفتی دیده‌اید؟',
            yes: 'progress',
            no: 'no_progress',
            yesLabel: 'بله، پیشرفت داشته',
            noLabel: 'خیر / مشخص نیست',
        },
        {
            text: 'آیا مهارتی وجود دارد که قبلاً داشته و اکنون از دست داده باشد؟',
            yes: 'yes',
            no: 'no',
            yesLabel: 'بله',
            noLabel: 'خیر',
        },
    ];

    return (
        <div className="child-growth-page">
            <nav className="page-nav-final">
                <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                    &rarr; <span>خانه</span>
                </button>
                <h1>رشد کودک من</h1>
                <div className="nav-placeholder" />
            </nav>

            <header className="cg-hero animate-fade-up">
                <div className="cg-hero-avatar" aria-hidden="true">
                    {child.avatar ? (
                        <img
                            src={child.avatar.startsWith('/uploads') ? child.avatar : child.avatar}
                            alt=""
                        />
                    ) : (
                        <FontAwesomeIcon icon={faChild} />
                    )}
                </div>
                <div className="cg-hero-text">
                    <p className="cg-kicker">این ماه کودک من</p>
                    <h2>{displayName}</h2>
                    <p className="cg-age">{ageLabel}</p>
                    {ageInfo.isPremature && ageInfo.chronological < 24 && (
                        <p className="cg-corrected">
                            سن اصلاح‌شده برای محتوا: {formatAgeLabel(ageInfo.corrected)}
                            <span>（بر اساس سن بارداری ثبت‌شده — جنبه آموزشی）</span>
                        </p>
                    )}
                    <p className="cg-band">{band.title}</p>
                </div>
            </header>

            <section className="cg-section animate-fade-up" style={{ animationDelay: '0.05s' }}>
                <div className="cg-section-head">
                    <span className="cg-section-emoji" aria-hidden="true">🌱</span>
                    <h3>تمرکز این ماه</h3>
                </div>
                <div className="cg-focus-grid">
                    {band.monthlyFocus.map((item) => {
                        const domain = DOMAINS[item.domain] || DOMAINS.COGNITIVE;
                        return (
                            <article key={`${item.domain}-${item.title}`} className="cg-focus-item">
                                <div className="cg-focus-label">
                                    <span aria-hidden="true">{domain.icon}</span>
                                    {domain.label}
                                </div>
                                <h4>{item.title}</h4>
                                <p>{item.summary}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="cg-section animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <div className="cg-section-head">
                    <span className="cg-section-emoji" aria-hidden="true">🎯</span>
                    <h3>امروز چه کار کنیم؟</h3>
                </div>
                <div className="cg-activity-list">
                    {band.activities.map((activity) => {
                        const done = Boolean(completions[activity.id]?.completed);
                        return (
                            <button
                                type="button"
                                key={activity.id}
                                className={`cg-activity-card${done ? ' is-done' : ''}`}
                                onClick={() => setSelectedActivity(activity)}
                            >
                                <div className="cg-activity-main">
                                    <strong>{activity.title}</strong>
                                    <span className="cg-activity-meta">
                                        {activity.duration} دقیقه
                                        {' | '}
                                        {activity.domains.map((d) => DOMAINS[d]?.label).filter(Boolean).join(' + ')}
                                    </span>
                                </div>
                                {done ? (
                                    <span className="cg-activity-badge">انجام شد</span>
                                ) : (
                                    <span className="cg-activity-chevron">مشاهده</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="cg-section animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <div className="cg-section-head">
                    <span className="cg-section-emoji" aria-hidden="true">✅</span>
                    <h3>مهارت‌ها</h3>
                </div>
                <div className="cg-panel">
                    <p className="cg-panel-text">
                        {milestoneStats.checked} از {milestoneStats.total} مهارت بررسی شده
                        {milestoneStats.observed > 0 && (
                            <span> · {milestoneStats.observed} مشاهده‌شده</span>
                        )}
                    </p>
                    <div className="cg-progress" aria-hidden="true">
                        <div
                            className="cg-progress-bar"
                            style={{
                                width: `${milestoneStats.total ? (milestoneStats.checked / milestoneStats.total) * 100 : 0}%`,
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        className="cg-btn"
                        onClick={() => setShowMilestones((v) => !v)}
                    >
                        {showMilestones ? 'بستن مهارت‌ها' : 'مشاهده مهارت‌ها'}
                    </button>
                    {showMilestones && (
                        <div className="cg-milestone-groups">
                            {Object.values(DOMAINS).map((domain) => {
                                const items = band.milestones.filter((m) => m.domain === domain.id);
                                if (!items.length) return null;
                                return (
                                    <div key={domain.id} className="cg-milestone-group">
                                        <h4>
                                            <span aria-hidden="true">{domain.icon}</span> {domain.label}
                                        </h4>
                                        <ul>
                                            {items.map((milestone) => {
                                                const status =
                                                    milestoneStatuses[milestone.id]?.status ||
                                                    MILESTONE_STATUS.NOT_CHECKED;
                                                return (
                                                    <li key={milestone.id}>
                                                        <div className="cg-milestone-row">
                                                            <span
                                                                className={`cg-milestone-mark status-${status.toLowerCase()}`}
                                                                aria-hidden="true"
                                                            >
                                                                {status === MILESTONE_STATUS.OBSERVED ? '✓' : '○'}
                                                            </span>
                                                            <span className="cg-milestone-title">{milestone.title}</span>
                                                        </div>
                                                        <div className="cg-milestone-actions">
                                                            {[
                                                                MILESTONE_STATUS.OBSERVED,
                                                                MILESTONE_STATUS.NOT_YET_OBSERVED,
                                                                MILESTONE_STATUS.UNSURE,
                                                                MILESTONE_STATUS.NOT_CHECKED,
                                                            ].map((s) => (
                                                                <button
                                                                    type="button"
                                                                    key={s}
                                                                    className={status === s ? 'is-active' : ''}
                                                                    onClick={() => handleMilestoneStatus(milestone.id, s)}
                                                                >
                                                                    {STATUS_LABELS[s]}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <section className="cg-section animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <div className="cg-section-head">
                    <span className="cg-section-emoji" aria-hidden="true">📊</span>
                    <h3>رشد جسمی</h3>
                </div>
                <div className="cg-panel">
                    {!heightAnalysis?.value && !weightAnalysis?.value ? (
                        <div className="cg-empty">
                            <p>هنوز اندازه‌گیری جدیدی ثبت نکرده‌اید.</p>
                            <Link to={`/growth-chart/${childId}`} className="cg-btn">
                                ثبت قد و وزن
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="cg-panel-meta">
                                آخرین اندازه‌گیری:{' '}
                                {formatRelativeMeasurementDate(lastMeasureDate) || 'نامشخص'}
                            </p>
                            <div className="cg-growth-stats">
                                <div>
                                    <span>قد</span>
                                    <strong>
                                        {heightAnalysis?.value != null
                                            ? `${heightAnalysis.value} سانتی‌متر`
                                            : '—'}
                                    </strong>
                                    <small>
                                        بر اساس اندازه‌گیری‌های ثبت‌شده، روند قد در نمودار قابل مشاهده است.
                                    </small>
                                </div>
                                <div>
                                    <span>وزن</span>
                                    <strong>
                                        {weightAnalysis?.value != null
                                            ? `${weightAnalysis.value} کیلوگرم`
                                            : '—'}
                                    </strong>
                                    <small>
                                        از یک اندازه‌گیری به‌تنهایی نتیجه پزشکی قطعی گرفته نمی‌شود.
                                    </small>
                                </div>
                            </div>
                            <Link to={`/growth-chart/${childId}`} className="cg-btn is-soft">
                                <FontAwesomeIcon icon={faChartLine} /> مشاهده نمودار رشد
                            </Link>
                        </>
                    )}
                </div>
            </section>

            <section className="cg-section animate-fade-up" style={{ animationDelay: '0.25s' }}>
                <div className="cg-topic-row">
                    {TOPIC_SECTIONS.map((topic) => (
                        <button
                            type="button"
                            key={topic.id}
                            className={`cg-topic-chip${activeTopic === topic.id ? ' is-active' : ''}`}
                            onClick={() => setActiveTopic(activeTopic === topic.id ? null : topic.id)}
                        >
                            <FontAwesomeIcon icon={topic.icon} />
                            {topic.title}
                        </button>
                    ))}
                </div>
                {activeTopic && (
                    <div className="cg-panel cg-topic-panel">
                        <h4>
                            <FontAwesomeIcon icon={faLightbulb} />{' '}
                            {TOPIC_SECTIONS.find((t) => t.id === activeTopic)?.title} در این مرحله
                        </h4>
                        <ul>
                            {(band[TOPIC_SECTIONS.find((t) => t.id === activeTopic)?.key] || []).map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            <section className="cg-section animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <div className="cg-section-head">
                    <span className="cg-section-emoji" aria-hidden="true">❓</span>
                    <h3>چیزی نگرانتان کرده؟</h3>
                </div>
                <div className="cg-panel">
                    {!concernTopic ? (
                        <>
                            <p className="cg-panel-text">
                                موضوع را انتخاب کنید تا چند سؤال کوتاه بپرسیم. این بخش تشخیص پزشکی نمی‌دهد.
                            </p>
                            <div className="cg-concern-grid">
                                {CONCERN_TOPICS.map((topic) => (
                                    <button type="button" key={topic} onClick={() => startConcern(topic)}>
                                        {topic}
                                    </button>
                                ))}
                                <button type="button" onClick={() => startConcern('موضوع دیگر')}>
                                    موضوع دیگری
                                </button>
                            </div>
                        </>
                    ) : concernResult ? (
                        <div className={`cg-concern-result level-${concernResult}`}>
                            <FontAwesomeIcon
                                icon={
                                    concernResult === 'professional'
                                        ? faQuestionCircle
                                        : concernResult === 'yellow'
                                          ? faLightbulb
                                          : faCheckCircle
                                }
                            />
                            {concernResult === 'green' && (
                                <p>
                                    در پاسخ‌های شما مورد فوری مشخصی دیده نمی‌شود. می‌توانید مهارت‌های مرتبط را در
                                    ماه‌های آینده دنبال کنید.
                                </p>
                            )}
                            {concernResult === 'yellow' && (
                                <p>
                                    بهتر است این موضوع را بیشتر مشاهده کنید و در صورت ادامه نگرانی با پزشک کودک
                                    مطرح کنید.
                                </p>
                            )}
                            {concernResult === 'professional' && (
                                <p>
                                    با توجه به پاسخ شما، بهتر است این موضوع را با پزشک/متخصص کودک مطرح کنید.
                                </p>
                            )}
                            <button type="button" className="cg-btn is-soft" onClick={resetConcern}>
                                بازگشت
                            </button>
                        </div>
                    ) : (
                        <div className="cg-concern-flow">
                            <p className="cg-panel-meta">موضوع: {concernTopic}</p>
                            <p className="cg-panel-text">{concernQuestions[concernStep].text}</p>
                            <div className="cg-concern-actions">
                                <button
                                    type="button"
                                    className="cg-btn"
                                    onClick={() => answerConcern(concernQuestions[concernStep].yes)}
                                >
                                    {concernQuestions[concernStep].yesLabel}
                                </button>
                                <button
                                    type="button"
                                    className="cg-btn is-soft"
                                    onClick={() => answerConcern(concernQuestions[concernStep].no)}
                                >
                                    {concernQuestions[concernStep].noLabel}
                                </button>
                            </div>
                            <button type="button" className="cg-text-btn" onClick={resetConcern}>
                                انصراف
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <p className="cg-disclaimer">
                <FontAwesomeIcon icon={faSeedling} /> این راهنما جنبه آموزشی دارد و جایگزین تشخیص، درمان یا
                توصیه پزشکی تخصصی نیست.
            </p>

            {selectedActivity && (
                <div
                    className="cg-modal-overlay"
                    role="presentation"
                    onClick={() => setSelectedActivity(null)}
                >
                    <div
                        className="cg-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={selectedActivity.title}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>{selectedActivity.title}</h3>
                        <p className="cg-panel-meta">⏱ {selectedActivity.duration} دقیقه</p>
                        <p>
                            <strong>هدف:</strong> {selectedActivity.goal}
                        </p>
                        <p>
                            <strong>وسایل:</strong> {selectedActivity.materials}
                        </p>
                        <h4>چطور بازی کنیم؟</h4>
                        <ol>
                            {selectedActivity.instructions.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                        <p className="cg-tip">💡 اگر کودک علاقه نداشت: {selectedActivity.tip}</p>
                        <p className="cg-safety">⚠️ نکته ایمنی: {selectedActivity.safety}</p>
                        <div className="cg-modal-actions">
                            <button
                                type="button"
                                className="cg-btn"
                                onClick={() => handleCompleteActivity(selectedActivity)}
                            >
                                شروع / انجام شد
                            </button>
                            <button
                                type="button"
                                className="cg-btn is-soft"
                                onClick={() => setSelectedActivity(null)}
                            >
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
