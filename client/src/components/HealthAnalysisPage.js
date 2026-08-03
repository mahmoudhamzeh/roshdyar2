import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRight,
    faAllergies,
    faStethoscope,
    faChartLine,
    faCalendarCheck,
    faFileMedical,
    faArrowUp,
    faArrowDown,
    faMinus,
    faSyringe,
    faBrain,
    faRulerVertical,
    faWeightScale,
    faCircleNotch,
    faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import VaccinationStatus from './VaccinationStatus';
import SmartRecommendations from './SmartRecommendations';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import { getChildDisplayName } from '../utils/childName';
import './HealthAnalysisPage.css';
import './SmartRecommendations.css';

const getActiveTags = (section) => {
    if (!section) return [];
    if (typeof section === 'string') {
        return section.trim() ? [section.trim()] : [];
    }
    if (!section.types || typeof section.types !== 'object') return [];
    return Object.entries(section.types)
        .filter(([, active]) => Boolean(active))
        .map(([label]) => label);
};

const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(String(birthDate).replace(/\//g, '-'));
    if (Number.isNaN(birth.getTime())) return null;

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
        months -= 1;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    if (years <= 0 && months <= 0) {
        return days > 0 ? `${days} روز` : 'نوزاد';
    }
    if (years <= 0) return `${months} ماه`;
    if (months === 0) return `${years} سال`;
    return `${years} سال و ${months} ماه`;
};

const formatFaDate = (value) => {
    if (!value) return '—';
    const date = new Date(String(value).replace(/\//g, '-'));
    if (Number.isNaN(date.getTime())) return String(value).replace(/-/g, '/');
    try {
        return date.toLocaleDateString('fa-IR');
    } catch {
        return String(value).replace(/-/g, '/');
    }
};

const statusClass = (status) => {
    if (status === 'نرمال') return 'is-ok';
    if (status === 'کمبود' || status === 'اضافه') return 'is-warn';
    return 'is-muted';
};

const trendMeta = (trend) => {
    if (trend === 'improving') {
        return { label: 'رو به بهبود', icon: faArrowUp, className: 'is-up' };
    }
    if (trend === 'declining') {
        return { label: 'رو به کاهش', icon: faArrowDown, className: 'is-down' };
    }
    return { label: 'ثابت', icon: faMinus, className: 'is-flat' };
};

const MetricCard = ({ title, icon, metric, unit }) => {
    if (!metric || metric.value == null) {
        return (
            <article className="ha-metric is-empty">
                <div className="ha-metric-head">
                    <FontAwesomeIcon icon={icon} />
                    <h4>{title}</h4>
                </div>
                <p className="ha-metric-empty">داده‌ای ثبت نشده</p>
            </article>
        );
    }

    const trend = trendMeta(metric.trend);
    return (
        <article className="ha-metric">
            <div className="ha-metric-head">
                <FontAwesomeIcon icon={icon} />
                <h4>{title}</h4>
            </div>
            <p className="ha-metric-value">
                <bdi>{metric.value}</bdi>
                <span>{unit}</span>
            </p>
            <div className="ha-metric-chips">
                <span className={`ha-chip ${statusClass(metric.status)}`}>وضعیت: {metric.status}</span>
                <span className={`ha-chip trend ${trend.className}`}>
                    <FontAwesomeIcon icon={trend.icon} />
                    {trend.label}
                </span>
            </div>
        </article>
    );
};

const HealthAnalysisPage = () => {
    const history = useHistory();
    const { childId } = useParams();
    const [child, setChild] = useState(null);
    const [visits, setVisits] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [vaccinationStatus, setVaccinationStatus] = useState([]);
    const [growthTrend, setGrowthTrend] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const childRes = await fetch(`http://localhost:5000/api/children/${childId}`);
            if (!childRes.ok) throw new Error('Child not found');
            const childData = await childRes.json();
            setChild(childData);

            const [visitsRes, docsRes, vacRes] = await Promise.all([
                fetch(`http://localhost:5000/api/visits/${childId}`),
                fetch(`http://localhost:5000/api/documents/${childId}`),
                fetch(`http://localhost:5000/api/vaccination-status/${childId}`),
            ]);

            setVisits(visitsRes.ok ? await visitsRes.json() : []);
            setDocuments(docsRes.ok ? await docsRes.json() : []);
            setVaccinationStatus(vacRes.ok ? await vacRes.json() : []);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('بارگذاری تحلیل پرونده ممکن نشد.');
            setChild(null);
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        if (!child) {
            setGrowthTrend({});
            return;
        }
        setGrowthTrend({
            height: analyzeGrowthMetric('height', child),
            weight: analyzeGrowthMetric('weight', child),
            headCircumference: analyzeGrowthMetric('headCircumference', child),
        });
    }, [child]);

    if (isLoading) {
        return (
            <div className="health-analysis-page">
                <nav className="ha-nav">
                    <button type="button" onClick={() => history.push('/my-children')} className="ha-back-btn">
                        <FontAwesomeIcon icon={faArrowRight} />
                        <span>بازگشت</span>
                    </button>
                    <h1>تحلیل پرونده</h1>
                    <div className="ha-nav-spacer" />
                </nav>
                <div className="ha-state">
                    <div className="ha-spinner" aria-hidden="true" />
                    <p>در حال آماده‌سازی تحلیل...</p>
                </div>
            </div>
        );
    }

    if (!child) {
        return (
            <div className="health-analysis-page">
                <nav className="ha-nav">
                    <button type="button" onClick={() => history.push('/my-children')} className="ha-back-btn">
                        <FontAwesomeIcon icon={faArrowRight} />
                        <span>بازگشت</span>
                    </button>
                    <h1>تحلیل پرونده</h1>
                    <div className="ha-nav-spacer" />
                </nav>
                <div className="ha-state">
                    <FontAwesomeIcon icon={faCircleNotch} />
                    <p>{error || 'اطلاعاتی برای نمایش وجود ندارد.'}</p>
                    <button type="button" className="ha-primary-btn" onClick={() => history.push('/my-children')}>
                        بازگشت به لیست کودکان
                    </button>
                </div>
            </div>
        );
    }

    const displayName = getChildDisplayName(child);
    const ageLabel = calculateAge(child.birthDate);
    const avatarUrl = child.avatar
        ? (child.avatar.startsWith('/uploads') ? `http://localhost:5000${child.avatar}` : child.avatar)
        : null;
    const allergyTags = getActiveTags(child.allergies);
    const illnessTags = getActiveTags(child.special_illnesses);
    const allergyDescription = typeof child.allergies === 'object' ? child.allergies?.description : '';
    const illnessDescription = typeof child.special_illnesses === 'object' ? child.special_illnesses?.description : '';
    const vaccinatedCount = Array.isArray(vaccinationStatus)
        ? vaccinationStatus.filter((item) => item.status === 'done').length
        : 0;
    const totalVaccines = Array.isArray(vaccinationStatus) ? vaccinationStatus.length : 0;
    const overdueCount = Array.isArray(vaccinationStatus)
        ? vaccinationStatus.filter((item) => item.status === 'overdue').length
        : 0;

    return (
        <div className="health-analysis-page">
            <nav className="ha-nav">
                <button
                    type="button"
                    onClick={() => history.push(`/health-profile/${childId}`)}
                    className="ha-back-btn"
                >
                    <FontAwesomeIcon icon={faArrowRight} />
                    <span>پرونده سلامت</span>
                </button>
                <h1>تحلیل پرونده</h1>
                <div className="ha-nav-spacer" />
            </nav>

            <main className="ha-content">
                <header className="ha-hero animate-fade-up">
                    <div className="ha-hero-main">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="ha-avatar" />
                        ) : (
                            <div className="ha-avatar placeholder" aria-hidden="true">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <div className="ha-hero-text">
                            <p className="ha-kicker">تحلیل سلامت رشدیار</p>
                            <h2>{displayName}</h2>
                            <p className="ha-hero-meta">
                                {ageLabel && <span>{ageLabel}</span>}
                                {child.gender && (
                                    <span>
                                        {child.gender === 'boy' ? 'پسر' : child.gender === 'girl' ? 'دختر' : child.gender}
                                    </span>
                                )}
                                {child.bloodType && (
                                    <span>
                                        گروه خونی <bdi>{child.bloodType}</bdi>
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <ul className="ha-summary" aria-label="خلاصه وضعیت">
                        <li>
                            <strong>{visits.length}</strong>
                            <span>مراجعه</span>
                        </li>
                        <li>
                            <strong>{documents.length}</strong>
                            <span>مدرک</span>
                        </li>
                        <li>
                            <strong>{totalVaccines ? `${vaccinatedCount}/${totalVaccines}` : '—'}</strong>
                            <span>واکسن</span>
                        </li>
                        {overdueCount > 0 && (
                            <li className="is-alert">
                                <strong>{overdueCount}</strong>
                                <span>عقب‌افتاده</span>
                            </li>
                        )}
                    </ul>
                </header>

                <section className="ha-panel ha-recs animate-fade-up-delay" aria-labelledby="ha-recs-title">
                    <div className="ha-panel-heading">
                        <h3 id="ha-recs-title">
                            <FontAwesomeIcon icon={faBrain} />
                            توصیه‌های هوشمند
                        </h3>
                        <p>بر اساس رشد، آلرژی و وضعیت واکسیناسیون</p>
                    </div>
                    <SmartRecommendations
                        child={child}
                        growthTrend={growthTrend}
                        vaccinationStatus={vaccinationStatus}
                    />
                </section>

                <section className="ha-panel animate-fade-up-delay-2" aria-labelledby="ha-growth-title">
                    <div className="ha-panel-heading">
                        <h3 id="ha-growth-title">
                            <FontAwesomeIcon icon={faChartLine} />
                            تحلیل رشد
                        </h3>
                        <p>آخرین اندازه‌گیری و روند صدک نسبت به استاندارد WHO</p>
                    </div>
                    <div className="ha-metrics">
                        <MetricCard title="قد" icon={faRulerVertical} metric={growthTrend.height} unit="cm" />
                        <MetricCard title="وزن" icon={faWeightScale} metric={growthTrend.weight} unit="kg" />
                        <MetricCard
                            title="دور سر"
                            icon={faCircleNotch}
                            metric={growthTrend.headCircumference}
                            unit="cm"
                        />
                    </div>
                </section>

                <div className="ha-split">
                    <section
                        className={`ha-panel ha-alert-panel ${allergyTags.length ? 'allergy' : ''}`}
                        aria-labelledby="ha-allergy-title"
                    >
                        <div className="ha-panel-heading">
                            <h3 id="ha-allergy-title">
                                <FontAwesomeIcon icon={faAllergies} />
                                آلرژی‌ها
                            </h3>
                        </div>
                        {allergyTags.length > 0 ? (
                            <>
                                <div className="ha-tags">
                                    {allergyTags.map((tag) => (
                                        <span key={tag} className="ha-tag allergy">{tag}</span>
                                    ))}
                                </div>
                                {allergyDescription && <p className="ha-note">{allergyDescription}</p>}
                            </>
                        ) : (
                            <p className="ha-empty-note">هیچ آلرژی ثبت نشده است.</p>
                        )}
                    </section>

                    <section
                        className={`ha-panel ha-alert-panel ${illnessTags.length ? 'illness' : ''}`}
                        aria-labelledby="ha-illness-title"
                    >
                        <div className="ha-panel-heading">
                            <h3 id="ha-illness-title">
                                <FontAwesomeIcon icon={faStethoscope} />
                                بیماری‌های خاص
                            </h3>
                        </div>
                        {illnessTags.length > 0 ? (
                            <>
                                <div className="ha-tags">
                                    {illnessTags.map((tag) => (
                                        <span key={tag} className="ha-tag illness">{tag}</span>
                                    ))}
                                </div>
                                {illnessDescription && <p className="ha-note">{illnessDescription}</p>}
                            </>
                        ) : (
                            <p className="ha-empty-note">هیچ بیماری خاصی ثبت نشده است.</p>
                        )}
                    </section>
                </div>

                <section className="ha-panel" aria-labelledby="ha-visits-title">
                    <div className="ha-panel-heading">
                        <h3 id="ha-visits-title">
                            <FontAwesomeIcon icon={faCalendarCheck} />
                            تاریخچه مراجعات پزشکی
                        </h3>
                        <p>{visits.length ? `${visits.length} مراجعه ثبت‌شده` : 'هنوز مراجعه‌ای ثبت نشده'}</p>
                    </div>
                    {visits.length > 0 ? (
                        <ol className="ha-timeline">
                            {visits.map((visit) => (
                                <li key={visit.id}>
                                    <time dateTime={visit.date}>{formatFaDate(visit.date)}</time>
                                    <div>
                                        <strong>{visit.reason || 'بدون عنوان'}</strong>
                                        {visit.description && <p>{visit.description}</p>}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="ha-empty-note">هیچ مراجعه‌ای ثبت نشده است.</p>
                    )}
                </section>

                <section className="ha-panel" aria-labelledby="ha-docs-title">
                    <div className="ha-panel-heading">
                        <h3 id="ha-docs-title">
                            <FontAwesomeIcon icon={faFileMedical} />
                            مدارک پزشکی
                        </h3>
                        <p>{documents.length ? `${documents.length} مدرک` : 'هنوز مدرکی ثبت نشده'}</p>
                    </div>
                    {documents.length > 0 ? (
                        <ul className="ha-docs">
                            {documents.map((doc) => (
                                <li key={doc.id}>
                                    <a
                                        href={`http://localhost:5000${doc.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <span>{doc.title || 'مدرک بدون عنوان'}</span>
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    </a>
                                    <time dateTime={doc.date}>{formatFaDate(doc.date)}</time>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="ha-empty-note">هیچ مدرکی ثبت نشده است.</p>
                    )}
                </section>

                <section className="ha-panel" aria-labelledby="ha-vax-title">
                    <div className="ha-panel-heading">
                        <h3 id="ha-vax-title">
                            <FontAwesomeIcon icon={faSyringe} />
                            وضعیت واکسیناسیون
                        </h3>
                        <p>
                            {totalVaccines
                                ? `${vaccinatedCount} از ${totalVaccines} دوز ثبت‌شده`
                                : 'برنامه واکسیناسیون کودک'}
                        </p>
                    </div>
                    {totalVaccines > 0 && (
                        <div className="ha-vax-progress" aria-hidden="true">
                            <div className="ha-vax-progress-track">
                                <div
                                    className="ha-vax-progress-fill"
                                    style={{ width: `${Math.round((vaccinatedCount / totalVaccines) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <VaccinationStatus />
                </section>
            </main>
        </div>
    );
};

export default HealthAnalysisPage;
