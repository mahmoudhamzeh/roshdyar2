import React, { useState, useEffect, useCallback } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faIdCard,
    faAllergies,
    faStethoscope,
    faChartLine,
    faCalendarCheck,
    faFileMedical,
    faArrowUp,
    faArrowDown,
    faMinus,
    faSyringe,
    faLightbulb,
    faChild
} from '@fortawesome/free-solid-svg-icons';
import VaccinationStatus from './VaccinationStatus';
import SmartRecommendations from './SmartRecommendations';
import { analyzeGrowthMetric } from '../utils/growth-analyzer';
import { getChildDisplayName } from '../utils/childName';
import './HealthAnalysisPage.css';
import './SmartRecommendations.css';

const getActiveTags = (field) => {
    if (!field) return { tags: [], description: '' };
    if (typeof field === 'string') {
        return { tags: field.trim() ? [field.trim()] : [], description: '' };
    }
    const types = field.types || {};
    const tags = Object.entries(types)
        .filter(([, active]) => active)
        .map(([key]) => key);
    return { tags, description: field.description || '' };
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

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const childRes = await fetch(`http://localhost:5000/api/children/${childId}`);
            if (!childRes.ok) throw new Error('Child not found');
            const childData = await childRes.json();
            setChild(childData);

            const [visitsRes, docsRes, vacRes] = await Promise.all([
                fetch(`http://localhost:5000/api/visits/${childId}`),
                fetch(`http://localhost:5000/api/documents/${childId}`),
                fetch(`http://localhost:5000/api/vaccination-status/${childId}`)
            ]);

            setVisits(visitsRes.ok ? await visitsRes.json() : []);
            setDocuments(docsRes.ok ? await docsRes.json() : []);
            setVaccinationStatus(vacRes.ok ? await vacRes.json() : []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            history.push('/my-children');
        } finally {
            setIsLoading(false);
        }
    }, [childId, history]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    useEffect(() => {
        if (!child) return;
        setGrowthTrend({
            height: analyzeGrowthMetric('height', child),
            weight: analyzeGrowthMetric('weight', child),
            headCircumference: analyzeGrowthMetric('headCircumference', child)
        });
    }, [child]);

    if (isLoading) {
        return (
            <div className="health-analysis-page">
                <p className="ha-loading">در حال بارگذاری تحلیل...</p>
            </div>
        );
    }

    if (!child) {
        return (
            <div className="health-analysis-page">
                <p className="ha-empty">اطلاعاتی برای نمایش وجود ندارد.</p>
            </div>
        );
    }

    const calculateAge = (birthDate) => {
        if (!birthDate) return { years: 0, months: 0 };
        const today = new Date();
        const birth = new Date(String(birthDate).replace(/\//g, '-'));
        if (Number.isNaN(birth.getTime())) return { years: 0, months: 0 };
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
            years -= 1;
            months = (months + 12) % 12;
        }
        return { years, months };
    };

    const age = calculateAge(child.birthDate);
    const allergies = getActiveTags(child.allergies);
    const illnesses = getActiveTags(child.special_illnesses);
    const displayName = getChildDisplayName(child);

    const growthMetrics = [
        { key: 'height', label: 'قد', unit: 'cm', data: growthTrend.height },
        { key: 'weight', label: 'وزن', unit: 'kg', data: growthTrend.weight },
        { key: 'headCircumference', label: 'دور سر', unit: 'cm', data: growthTrend.headCircumference }
    ];

    const trendMeta = {
        improving: { label: 'رو به بهبود', icon: faArrowUp, className: 'is-up' },
        declining: { label: 'رو به کاهش', icon: faArrowDown, className: 'is-down' },
        stable: { label: 'ثابت', icon: faMinus, className: 'is-stable' }
    };

    const statusClass = (status) => {
        if (status === 'نرمال') return 'is-ok';
        if (status === 'کمبود' || status === 'اضافه') return 'is-warn';
        return 'is-muted';
    };

    return (
        <div className="health-analysis-page">
            <nav className="page-nav-final">
                <button type="button" onClick={() => history.goBack()} className="back-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    <span>بازگشت</span>
                </button>
                <h1>تحلیل سلامت</h1>
                <div className="nav-placeholder" />
            </nav>

            <header className="ha-hero">
                <div className="ha-hero-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faChild} />
                </div>
                <div className="ha-hero-text">
                    <p className="ha-hero-kicker">پرونده سلامت</p>
                    <h2>{displayName}</h2>
                    <p className="ha-hero-meta">
                        {age.years} سال و {age.months} ماه
                        <span>·</span>
                        {child.gender === 'boy' ? 'پسر' : 'دختر'}
                        {child.bloodType ? (
                            <>
                                <span>·</span>
                                گروه خونی {child.bloodType}
                            </>
                        ) : null}
                    </p>
                </div>
                <div className="ha-hero-actions">
                    <Link to={`/growth-chart/${childId}`} className="ha-link-btn">نمودار رشد</Link>
                    <Link to={`/vaccination/${childId}`} className="ha-link-btn is-soft">واکسیناسیون</Link>
                </div>
            </header>

            <main className="ha-main">
                <section className="ha-section">
                    <div className="ha-section-head">
                        <h3><FontAwesomeIcon icon={faLightbulb} /> توصیه‌های هوشمند</h3>
                    </div>
                    <SmartRecommendations
                        child={child}
                        growthTrend={growthTrend}
                        vaccinationStatus={vaccinationStatus}
                    />
                </section>

                <section className="ha-section">
                    <div className="ha-section-head">
                        <h3><FontAwesomeIcon icon={faChartLine} /> وضعیت رشد</h3>
                    </div>
                    <div className="ha-metric-grid">
                        {growthMetrics.map((metric) => {
                            const data = metric.data || {};
                            const trend = trendMeta[data.trend] || trendMeta.stable;
                            const hasValue = data.value !== null && data.value !== undefined && data.value !== '';
                            return (
                                <article key={metric.key} className="ha-metric-card">
                                    <p className="ha-metric-label">{metric.label}</p>
                                    <p className="ha-metric-value">
                                        {hasValue ? (
                                            <>
                                                {data.value}
                                                <span>{metric.unit}</span>
                                            </>
                                        ) : (
                                            '—'
                                        )}
                                    </p>
                                    <div className="ha-metric-foot">
                                        <span className={`ha-status ${statusClass(data.status)}`}>
                                            {data.status || 'نامشخص'}
                                        </span>
                                        <span className={`ha-trend ${trend.className}`}>
                                            <FontAwesomeIcon icon={trend.icon} />
                                            {trend.label}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="ha-section ha-overview-grid">
                    <article className="ha-panel">
                        <h3><FontAwesomeIcon icon={faIdCard} /> اطلاعات پایه</h3>
                        <dl className="ha-facts">
                            <div>
                                <dt>نام</dt>
                                <dd>{displayName}</dd>
                            </div>
                            <div>
                                <dt>سن</dt>
                                <dd>{age.years} سال و {age.months} ماه</dd>
                            </div>
                            <div>
                                <dt>جنسیت</dt>
                                <dd>{child.gender === 'boy' ? 'پسر' : 'دختر'}</dd>
                            </div>
                            <div>
                                <dt>گروه خونی</dt>
                                <dd>{child.bloodType || 'ثبت نشده'}</dd>
                            </div>
                        </dl>
                    </article>

                    <article className="ha-panel">
                        <h3><FontAwesomeIcon icon={faAllergies} /> آلرژی‌ها</h3>
                        {allergies.tags.length > 0 ? (
                            <>
                                <div className="ha-tags">
                                    {allergies.tags.map((tag) => (
                                        <span key={tag} className="ha-tag is-allergy">{tag}</span>
                                    ))}
                                </div>
                                {allergies.description ? <p className="ha-note">{allergies.description}</p> : null}
                            </>
                        ) : (
                            <p className="ha-empty-text">آلرژی ثبت نشده است.</p>
                        )}
                    </article>

                    <article className="ha-panel">
                        <h3><FontAwesomeIcon icon={faStethoscope} /> بیماری‌های خاص</h3>
                        {illnesses.tags.length > 0 ? (
                            <>
                                <div className="ha-tags">
                                    {illnesses.tags.map((tag) => (
                                        <span key={tag} className="ha-tag is-illness">{tag}</span>
                                    ))}
                                </div>
                                {illnesses.description ? <p className="ha-note">{illnesses.description}</p> : null}
                            </>
                        ) : (
                            <p className="ha-empty-text">بیماری خاصی ثبت نشده است.</p>
                        )}
                    </article>
                </section>

                <section className="ha-section">
                    <div className="ha-section-head">
                        <h3><FontAwesomeIcon icon={faCalendarCheck} /> مراجعات پزشکی</h3>
                    </div>
                    {visits.length > 0 ? (
                        <ul className="ha-timeline">
                            {visits.map((visit) => (
                                <li key={visit.id}>
                                    <div className="ha-timeline-meta">
                                        <span className="ha-date">
                                            {visit.date ? new Date(visit.date).toLocaleDateString('fa-IR') : 'بدون تاریخ'}
                                        </span>
                                        <strong>{visit.reason || 'مراجعه'}</strong>
                                    </div>
                                    {visit.description ? <p>{visit.description}</p> : null}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="ha-empty-text">هنوز مراجعه‌ای ثبت نشده است.</p>
                    )}
                </section>

                <section className="ha-section">
                    <div className="ha-section-head">
                        <h3><FontAwesomeIcon icon={faFileMedical} /> مدارک پزشکی</h3>
                    </div>
                    {documents.length > 0 ? (
                        <ul className="ha-docs">
                            {documents.map((doc) => (
                                <li key={doc.id}>
                                    <a href={`http://localhost:5000${doc.url}`} target="_blank" rel="noopener noreferrer">
                                        {doc.title || 'مدرک پزشکی'}
                                    </a>
                                    <span className="ha-date">
                                        {doc.date ? new Date(doc.date).toLocaleDateString('fa-IR') : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="ha-empty-text">مدرکی ثبت نشده است.</p>
                    )}
                </section>

                <section className="ha-section">
                    <div className="ha-section-head">
                        <h3><FontAwesomeIcon icon={faSyringe} /> وضعیت واکسیناسیون</h3>
                    </div>
                    <div className="ha-vax-wrap">
                        <VaccinationStatus />
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HealthAnalysisPage;
