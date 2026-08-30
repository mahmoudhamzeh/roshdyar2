import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAppleAlt,
    faBed,
    faChartLine,
    faCheck,
    faCheckCircle,
    faChild,
    faCircle,
    faClipboardList,
    faHeart,
    faHeartbeat,
    faLightbulb,
    faPuzzlePiece,
    faQuestionCircle,
    faSeedling,
    faShieldAlt,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import {
    DOMAINS,
    MILESTONE_STATUS,
    STATUS_LABELS,
    TREND_LABELS,
    completeActivity,
    fetchAgeGuide,
    formatRelativeMeasurementDate,
    submitConcern,
    updateMilestoneStatus,
} from '../utils/child-growth';
import './ChildGrowthPage.css';

const TABS = [
    { id: 'home', label: 'این ماه', icon: faSeedling },
    { id: 'milestones', label: 'مهارت‌ها', icon: faClipboardList },
    { id: 'activities', label: 'فعالیت‌ها', icon: faPuzzlePiece },
    { id: 'health', label: 'سلامت', icon: faHeartbeat },
    { id: 'nutrition', label: 'تغذیه', icon: faAppleAlt },
    { id: 'sleep', label: 'خواب', icon: faBed },
    { id: 'behavior', label: 'رفتار', icon: faHeart },
    { id: 'safety', label: 'ایمنی', icon: faShieldAlt },
    { id: 'concern', label: 'نگرانی من', icon: faQuestionCircle },
];

const CONCERN_TOPICS = [
    'گفتار', 'حرکت', 'تغذیه', 'خواب', 'رفتار', 'قد', 'وزن', 'بینایی', 'شنوایی', 'موضوع دیگر',
];

const ChildGrowthPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [guide, setGuide] = useState(null);
    const [childRaw, setChildRaw] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('home');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [expandedProblem, setExpandedProblem] = useState(null);
    const [busyKey, setBusyKey] = useState('');
    const [concernTopic, setConcernTopic] = useState(null);
    const [concernStep, setConcernStep] = useState(0);
    const [concernAnswers, setConcernAnswers] = useState([]);
    const [concernResult, setConcernResult] = useState(null);

    const loadGuide = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [guideData, childRes] = await Promise.all([
                fetchAgeGuide(childId),
                fetch(`/api/children/${childId}`),
            ]);
            if (!childRes.ok) throw new Error('کودک یافت نشد');
            const childData = await childRes.json();
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

    const domainGroups = useMemo(() => {
        const items = guide?.milestones?.items || [];
        return Object.values(DOMAINS)
            .map((domain) => ({
                ...domain,
                items: items.filter((m) => m.domain === domain.id),
            }))
            .filter((g) => g.items.length > 0);
    }, [guide]);

    const handleMilestone = async (milestoneId, status) => {
        setBusyKey(`m-${milestoneId}`);
        try {
            await updateMilestoneStatus(childId, milestoneId, status);
            setGuide((prev) => {
                if (!prev) return prev;
                const items = prev.milestones.items.map((m) =>
                    m.id === milestoneId ? { ...m, status } : m
                );
                const checked = items.filter((m) => m.status !== MILESTONE_STATUS.NOT_CHECKED).length;
                const observed = items.filter((m) => m.status === MILESTONE_STATUS.OBSERVED).length;
                return {
                    ...prev,
                    milestones: { ...prev.milestones, items, checked, observed },
                };
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
            setGuide((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    activities: prev.activities.map((a) =>
                        a.id === activity.id ? { ...a, completed: true } : a
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

    const startConcern = (topic) => {
        setConcernTopic(topic);
        setConcernStep(0);
        setConcernAnswers([]);
        setConcernResult(null);
        setTab('concern');
    };

    const answerConcern = async (answer) => {
        const next = [...concernAnswers, answer];
        setConcernAnswers(next);
        if (concernStep < 2) {
            setConcernStep(concernStep + 1);
            return;
        }
        let result = 'green';
        if (answer === 'regression_yes') result = 'professional';
        else if (next.includes('no_progress') || next.filter((a) => a === 'worried').length >= 1) {
            result = 'yellow';
        }
        setConcernResult(result);
        try {
            await submitConcern(childId, { topic: concernTopic, answers: next, result });
        } catch {
            /* non-blocking */
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
                <div className="cg-center">
                    <button type="button" className="cg-btn" onClick={loadGuide}>تلاش دوباره</button>
                </div>
            </div>
        );
    }

    const { child, band, monthlyFocus, milestones, activities, sleep, nutrition, health, behavior, safety, growthSummary, disclaimer } = guide;
    const lastMeasure = growthSummary?.lastMeasurement;

    const concernQuestions = [
        {
            text: `آیا درباره «${concernTopic}» اخیراً بیشتر نگران شده‌اید؟`,
            yes: { value: 'worried', label: 'بله، نگرانم' },
            no: { value: 'unsure', label: 'هنوز مطمئن نیستم' },
        },
        {
            text: 'آیا در این موضوع نسبت به قبل پیشرفتی دیده‌اید؟',
            yes: { value: 'progress', label: 'بله، پیشرفت داشته' },
            no: { value: 'no_progress', label: 'خیر / مشخص نیست' },
        },
        {
            text: 'آیا مهارتی هست که قبلاً داشته و اکنون از دست داده باشد؟',
            yes: { value: 'regression_yes', label: 'بله' },
            no: { value: 'regression_no', label: 'خیر' },
        },
    ];

    const renderHome = () => (
        <>
            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faSeedling} />
                    <div>
                        <h3>تمرکز این ماه</h3>
                        <p>مهم‌ترین حوزه‌های رشدی این مرحله برای {child.name}</p>
                    </div>
                </header>
                <div className="cg-focus-list">
                    {monthlyFocus.map((item) => {
                        const domain = DOMAINS[item.domain] || DOMAINS.COGNITIVE;
                        return (
                            <article key={`${item.domain}-${item.title}`} className={`cg-focus cg-tone-${domain.tone}`}>
                                <div className="cg-focus-top">
                                    <span className="cg-chip">{domain.labelFull}</span>
                                </div>
                                <h4>{item.title}</h4>
                                <p className="cg-lead">{item.summary}</p>
                                <p className="cg-detail">{item.detail}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faPuzzlePiece} />
                    <div>
                        <h3>امروز چه کار کنیم؟</h3>
                        <p>فعالیت‌های پیشنهادی متناسب با سن و وضعیت مهارت‌ها</p>
                    </div>
                </header>
                <div className="cg-list">
                    {activities.slice(0, 3).map((activity) => (
                        <button
                            type="button"
                            key={activity.id}
                            className={`cg-list-item${activity.completed ? ' is-done' : ''}`}
                            onClick={() => setSelectedActivity(activity)}
                        >
                            <div>
                                <strong>{activity.title}</strong>
                                <span>
                                    {activity.duration} دقیقه
                                    {' · '}
                                    {(activity.domains || []).map((d) => DOMAINS[d]?.label).filter(Boolean).join(' + ')}
                                </span>
                                {activity.shortDescription && <em>{activity.shortDescription}</em>}
                                {activity.reasons?.length > 0 && (
                                    <small>چرا پیشنهاد شد: {activity.reasons.slice(0, 2).join('، ')}</small>
                                )}
                            </div>
                            <span className="cg-list-cta">{activity.completed ? 'انجام شد' : 'شروع'}</span>
                        </button>
                    ))}
                </div>
                <button type="button" className="cg-link-btn" onClick={() => setTab('activities')}>
                    مشاهده همه فعالیت‌ها
                </button>
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faClipboardList} />
                    <div>
                        <h3>مهارت‌ها</h3>
                        <p>
                            {milestones.checked} از {milestones.total} مهارت بررسی شده
                            {milestones.observed > 0 ? ` · ${milestones.observed} مشاهده‌شده` : ''}
                        </p>
                    </div>
                </header>
                <div className="cg-progress" aria-hidden="true">
                    <div
                        style={{
                            width: `${milestones.total ? (milestones.checked / milestones.total) * 100 : 0}%`,
                        }}
                    />
                </div>
                <button type="button" className="cg-btn" onClick={() => setTab('milestones')}>
                    مشاهده و ثبت مهارت‌ها
                </button>
            </section>

            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faChartLine} />
                    <div>
                        <h3>رشد جسمی</h3>
                        <p>
                            آخرین اندازه‌گیری:{' '}
                            {formatRelativeMeasurementDate(lastMeasure?.date) || 'هنوز ثبت نشده'}
                        </p>
                    </div>
                </header>
                {!lastMeasure ? (
                    <div className="cg-empty">
                        <p>هنوز اندازه‌گیری جدیدی ثبت نکرده‌اید.</p>
                        <Link to={`/growth-chart/${childId}`} className="cg-btn">ثبت قد و وزن</Link>
                    </div>
                ) : (
                    <>
                        <div className="cg-growth-grid">
                            <div>
                                <span>قد</span>
                                <strong>{lastMeasure.height != null ? `${lastMeasure.height} سم` : '—'}</strong>
                                <small>
                                    {heightAnalysis?.percentile != null
                                        ? `حدود صدک ${Math.round(heightAnalysis.percentile)}`
                                        : growthSummary?.indicators?.heightForAge?.note}
                                </small>
                            </div>
                            <div>
                                <span>وزن</span>
                                <strong>{lastMeasure.weight != null ? `${lastMeasure.weight} کگ` : '—'}</strong>
                                <small>
                                    {weightAnalysis?.percentile != null
                                        ? `حدود صدک ${Math.round(weightAnalysis.percentile)}`
                                        : growthSummary?.indicators?.weightForAge?.note}
                                </small>
                            </div>
                        </div>
                        <p className="cg-note">
                            روند: {TREND_LABELS[growthSummary?.trend] || 'نامشخص'} — {growthSummary?.note}
                        </p>
                        <Link to={`/growth-chart/${childId}`} className="cg-btn is-soft">
                            مشاهده نمودار کامل
                        </Link>
                    </>
                )}
            </section>

            <section className="cg-block">
                <div className="cg-quick-grid">
                    {[
                        { id: 'sleep', label: 'خواب', icon: faBed },
                        { id: 'nutrition', label: 'تغذیه', icon: faAppleAlt },
                        { id: 'behavior', label: 'رفتار', icon: faHeart },
                        { id: 'safety', label: 'ایمنی', icon: faShieldAlt },
                    ].map((item) => (
                        <button type="button" key={item.id} onClick={() => setTab(item.id)}>
                            <FontAwesomeIcon icon={item.icon} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </section>

            <section className="cg-block cg-concern-teaser">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={faQuestionCircle} />
                    <div>
                        <h3>چیزی نگرانتان کرده؟</h3>
                        <p>چند سؤال کوتاه — بدون تشخیص پزشکی</p>
                    </div>
                </header>
                <button type="button" className="cg-btn" onClick={() => setTab('concern')}>
                    بررسی نگرانی
                </button>
            </section>
        </>
    );

    const renderMilestones = () => (
        <section className="cg-block">
            <header className="cg-block-head">
                <FontAwesomeIcon icon={faClipboardList} />
                <div>
                    <h3>مهارت‌های {band?.title}</h3>
                    <p>وضعیت را بر اساس مشاهده خودتان ثبت کنید؛ این فهرست تشخیص نیست.</p>
                </div>
            </header>
            {domainGroups.map((group) => (
                <div key={group.id} className="cg-domain-group">
                    <h4 className={`cg-tone-${group.tone}`}>{group.labelFull}</h4>
                    <ul className="cg-milestone-list">
                        {group.items.map((milestone) => {
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
                                        {[
                                            MILESTONE_STATUS.OBSERVED,
                                            MILESTONE_STATUS.NOT_YET_OBSERVED,
                                            MILESTONE_STATUS.UNSURE,
                                            MILESTONE_STATUS.NOT_CHECKED,
                                        ].map((s) => (
                                            <button
                                                type="button"
                                                key={s}
                                                disabled={busyKey === `m-${milestone.id}`}
                                                className={status === s ? 'is-active' : ''}
                                                onClick={() => handleMilestone(milestone.id, s)}
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
            ))}
        </section>
    );

    const renderActivities = () => (
        <section className="cg-block">
            <header className="cg-block-head">
                <FontAwesomeIcon icon={faPuzzlePiece} />
                <div>
                    <h3>فعالیت‌های پیشنهادی امروز</h3>
                    <p>قلب محصول: تمرین‌های کوتاه خانگی متناسب با سن {child.name}</p>
                </div>
            </header>
            <div className="cg-list">
                {activities.map((activity, index) => (
                    <button
                        type="button"
                        key={activity.id}
                        className={`cg-list-item${activity.completed ? ' is-done' : ''}`}
                        onClick={() => setSelectedActivity(activity)}
                    >
                        <div>
                            <strong>
                                {index + 1}. {activity.title}
                            </strong>
                            <span>
                                {activity.duration} دقیقه
                                {activity.difficulty ? ` · ${activity.difficulty === 'easy' ? 'آسان' : 'متوسط'}` : ''}
                                {' · '}
                                {(activity.domains || []).map((d) => DOMAINS[d]?.label).filter(Boolean).join(' + ')}
                            </span>
                            {activity.goal && <em>هدف: {activity.goal}</em>}
                        </div>
                        <span className="cg-list-cta">{activity.completed ? 'انجام شد' : 'جزئیات'}</span>
                    </button>
                ))}
            </div>
        </section>
    );

    const renderTopicSection = (type, data, icon, title) => {
        if (!data) {
            return (
                <section className="cg-block">
                    <p className="cg-empty-text">محتوایی برای این بخش یافت نشد.</p>
                </section>
            );
        }
        const problems = data.problems || data.situations || [];
        const priorities = data.priorities || data.topics || data.items || data.routine || [];
        return (
            <section className="cg-block">
                <header className="cg-block-head">
                    <FontAwesomeIcon icon={icon} />
                    <div>
                        <h3>{title}</h3>
                        <p>{band?.title}</p>
                    </div>
                </header>
                {data.overview && <p className="cg-overview">{data.overview}</p>}

                {type === 'sleep' && data.routine?.length > 0 && (
                    <>
                        <h4 className="cg-subhead">روتین پیشنهادی</h4>
                        <ol className="cg-steps">
                            {data.routine.map((step) => (
                                <li key={step.title}>
                                    <strong>{step.title}</strong>
                                    <span>{step.detail}</span>
                                </li>
                            ))}
                        </ol>
                    </>
                )}

                {priorities.length > 0 && type !== 'sleep' && (
                    <>
                        <h4 className="cg-subhead">چه چیزهایی مهم است؟</h4>
                        <div className="cg-priority-list">
                            {priorities.map((item) => (
                                <article key={item.id || item.title}>
                                    <h5>{item.title}</h5>
                                    <p>{item.detail}</p>
                                </article>
                            ))}
                        </div>
                    </>
                )}

                {data.guidance?.length > 0 && (
                    <>
                        <h4 className="cg-subhead">راهنمای عملی</h4>
                        <ul className="cg-bullets">
                            {data.guidance.map((g) => (
                                <li key={g}>{g}</li>
                            ))}
                        </ul>
                    </>
                )}

                {problems.length > 0 && (
                    <>
                        <h4 className="cg-subhead">مشکل شما چیست؟</h4>
                        <div className="cg-problem-grid">
                            {problems.map((problem) => {
                                const open = expandedProblem === `${type}-${problem.id}`;
                                return (
                                    <div key={problem.id} className={`cg-problem${open ? ' is-open' : ''}`}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedProblem(open ? null : `${type}-${problem.id}`)
                                            }
                                        >
                                            {problem.title}
                                        </button>
                                        {open && (
                                            <ul>
                                                {(problem.guidance || []).map((g) => (
                                                    <li key={g}>{g}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>
        );
    };

    const renderConcern = () => (
        <section className="cg-block">
            <header className="cg-block-head">
                <FontAwesomeIcon icon={faQuestionCircle} />
                <div>
                    <h3>چیزی درباره کودک نگرانتان کرده؟</h3>
                    <p>این بخش تشخیص نمی‌دهد؛ فقط کمک می‌کند زمان مشورت با متخصص را بهتر تشخیص دهید.</p>
                </div>
            </header>
            {!concernTopic ? (
                <div className="cg-problem-grid">
                    {CONCERN_TOPICS.map((topic) => (
                        <button type="button" key={topic} className="cg-problem-btn" onClick={() => startConcern(topic)}>
                            {topic}
                        </button>
                    ))}
                </div>
            ) : concernResult ? (
                <div className={`cg-result level-${concernResult}`}>
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
                            در پاسخ‌های شما مورد فوری مشخصی دیده نمی‌شود. می‌توانید مهارت‌های مرتبط را در ماه‌های
                            آینده دنبال کنید.
                        </p>
                    )}
                    {concernResult === 'yellow' && (
                        <p>
                            بهتر است این موضوع را بیشتر مشاهده کنید و در صورت ادامه نگرانی با پزشک کودک مطرح کنید.
                        </p>
                    )}
                    {concernResult === 'professional' && (
                        <p>
                            با توجه به پاسخ شما (از دست رفتن مهارت قبلی)، بهتر است این موضوع را با پزشک/متخصص کودک
                            مطرح کنید.
                        </p>
                    )}
                    <div className="cg-inline-actions">
                        <button type="button" className="cg-btn is-soft" onClick={() => { setConcernTopic(null); setConcernResult(null); }}>
                            موضوع دیگر
                        </button>
                        <button type="button" className="cg-btn" onClick={() => setTab('milestones')}>
                            مشاهده مهارت‌ها
                        </button>
                    </div>
                </div>
            ) : (
                <div className="cg-concern-flow">
                    <p className="cg-note">موضوع: {concernTopic}</p>
                    <p className="cg-overview">{concernQuestions[concernStep].text}</p>
                    <div className="cg-inline-actions">
                        <button
                            type="button"
                            className="cg-btn"
                            onClick={() => answerConcern(concernQuestions[concernStep].yes.value)}
                        >
                            {concernQuestions[concernStep].yes.label}
                        </button>
                        <button
                            type="button"
                            className="cg-btn is-soft"
                            onClick={() => answerConcern(concernQuestions[concernStep].no.value)}
                        >
                            {concernQuestions[concernStep].no.label}
                        </button>
                    </div>
                    <button
                        type="button"
                        className="cg-link-btn"
                        onClick={() => { setConcernTopic(null); setConcernStep(0); }}
                    >
                        انصراف
                    </button>
                </div>
            )}
        </section>
    );

    return (
        <div className="child-growth-page">
            <nav className="page-nav-final">
                <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                    &rarr; <span>خانه</span>
                </button>
                <h1>رشد کودک من</h1>
                <div className="nav-placeholder" />
            </nav>

            <header className="cg-hero">
                <div className="cg-hero-avatar" aria-hidden="true">
                    {childRaw?.avatar ? (
                        <img
                            src={childRaw.avatar.startsWith('/uploads') ? childRaw.avatar : childRaw.avatar}
                            alt=""
                        />
                    ) : (
                        <FontAwesomeIcon icon={faChild} />
                    )}
                </div>
                <div className="cg-hero-text">
                    <p className="cg-kicker">این ماه کودک من</p>
                    <h2>{child.name}</h2>
                    <p className="cg-age">{child.ageLabel}</p>
                    {child.isPremature && child.ageInMonths < 24 && (
                        <p className="cg-corrected">
                            سن اصلاح‌شده برای محتوا:{' '}
                            {child.correctedAgeInMonths != null ? `${child.correctedAgeInMonths} ماه` : '—'}
                            <span>بر اساس سن بارداری ثبت‌شده — جنبه آموزشی</span>
                        </p>
                    )}
                    <p className="cg-band">
                        {band?.title}
                        {band?.subtitle ? ` — ${band.subtitle}` : ''}
                    </p>
                </div>
            </header>

            <div className="cg-tabs" role="tablist" aria-label="بخش‌های رشد کودک من">
                {TABS.map((item) => (
                    <button
                        type="button"
                        key={item.id}
                        role="tab"
                        aria-selected={tab === item.id}
                        className={tab === item.id ? 'is-active' : ''}
                        onClick={() => setTab(item.id)}
                    >
                        <FontAwesomeIcon icon={item.icon} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="cg-tab-panel" role="tabpanel">
                {tab === 'home' && renderHome()}
                {tab === 'milestones' && renderMilestones()}
                {tab === 'activities' && renderActivities()}
                {tab === 'health' && renderTopicSection('health', health, faHeartbeat, 'سلامت در این مرحله')}
                {tab === 'nutrition' && renderTopicSection('nutrition', nutrition, faAppleAlt, 'تغذیه این مرحله')}
                {tab === 'sleep' && renderTopicSection('sleep', sleep, faBed, 'خواب در این مرحله')}
                {tab === 'behavior' && renderTopicSection('behavior', behavior, faHeart, 'رفتار و احساسات')}
                {tab === 'safety' && renderTopicSection('safety', safety, faShieldAlt, 'ایمنی متناسب با سن')}
                {tab === 'concern' && renderConcern()}
            </div>

            <p className="cg-disclaimer">
                <FontAwesomeIcon icon={faLightbulb} /> {disclaimer}
            </p>

            {selectedActivity && (
                <div className="cg-modal-overlay" role="presentation" onClick={() => setSelectedActivity(null)}>
                    <div
                        className="cg-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={selectedActivity.title}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>{selectedActivity.title}</h3>
                        <p className="cg-note">⏱ {selectedActivity.duration} دقیقه</p>
                        {selectedActivity.goal && (
                            <p><strong>هدف:</strong> {selectedActivity.goal}</p>
                        )}
                        {selectedActivity.materials && (
                            <p><strong>وسایل:</strong> {selectedActivity.materials}</p>
                        )}
                        <h4>چطور بازی کنیم؟</h4>
                        <ol>
                            {(selectedActivity.instructions || []).map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                        {selectedActivity.tip && <p className="cg-tip">💡 {selectedActivity.tip}</p>}
                        {selectedActivity.safety && <p className="cg-safety">⚠️ {selectedActivity.safety}</p>}
                        <div className="cg-modal-actions">
                            <button
                                type="button"
                                className="cg-btn"
                                disabled={busyKey === `a-${selectedActivity.id}`}
                                onClick={() => handleCompleteActivity(selectedActivity)}
                            >
                                <FontAwesomeIcon icon={faCheck} /> شروع / انجام شد
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
