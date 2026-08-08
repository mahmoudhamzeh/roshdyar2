import React, { useCallback, useEffect, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faAppleAlt,
    faBookOpen,
    faHeartbeat,
    faLightbulb,
    faSeedling
} from '@fortawesome/free-solid-svg-icons';
import { getChildDisplayName } from '../utils/childName';
import {
    formatAgeLabel,
    getAgeInMonths,
    getGuidanceForAgeMonths,
    personalizeGuidanceNotes
} from '../utils/age-guidance';
import './AgeGuidancePage.css';

const AgeGuidancePage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [child, setChild] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadChild = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/children/${childId}`);
            if (!res.ok) throw new Error('کودک یافت نشد');
            const data = await res.json();
            setChild(data);
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

    if (isLoading) {
        return (
            <div className="age-guidance-page">
                <p className="ag-status">در حال آماده‌سازی راهنما...</p>
            </div>
        );
    }

    if (error || !child) {
        return (
            <div className="age-guidance-page">
                <nav className="page-nav-final">
                    <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                        &rarr; <span>خانه</span>
                    </button>
                    <h1>راهنمای سنی</h1>
                    <div className="nav-placeholder" />
                </nav>
                <p className="ag-status">{error || 'اطلاعاتی یافت نشد.'}</p>
            </div>
        );
    }

    const ageMonths = getAgeInMonths(child.birthDate);
    const band = getGuidanceForAgeMonths(ageMonths);
    const personalNotes = personalizeGuidanceNotes(child, band);
    const displayName = getChildDisplayName(child);

    const sections = [
        { key: 'health', title: 'سلامت و مراقبت', icon: faHeartbeat, items: band.health, tone: 'health' },
        { key: 'nutrition', title: 'تغذیه', icon: faAppleAlt, items: band.nutrition, tone: 'nutrition' },
        { key: 'education', title: 'تربیت و رشد ذهنی', icon: faBookOpen, items: band.education, tone: 'education' }
    ];

    return (
        <div className="age-guidance-page">
            <nav className="page-nav-final">
                <button type="button" className="back-btn" onClick={() => history.goBack()}>
                    &rarr; <span>بازگشت</span>
                </button>
                <h1>راهنمای سنی</h1>
                <div className="nav-placeholder" />
            </nav>

            <header className="ag-hero">
                <div className="ag-hero-icon" aria-hidden="true">
                    <FontAwesomeIcon icon={faSeedling} />
                </div>
                <div className="ag-hero-text">
                    <p className="ag-kicker">مراقبت متناسب با سن</p>
                    <h2>{displayName}</h2>
                    <p className="ag-meta">
                        سن تقریبی: <strong>{formatAgeLabel(ageMonths)}</strong>
                        <span>·</span>
                        دوره: <strong>{band.title}</strong>
                    </p>
                    <p className="ag-focus">{band.subtitle} — تمرکز این دوره: {band.focus}</p>
                </div>
                <div className="ag-hero-actions">
                    <Link to={`/health-analysis/${childId}`} className="ag-btn">تحلیل سلامت</Link>
                    <Link to={`/growth-chart/${childId}`} className="ag-btn is-soft">نمودار رشد</Link>
                </div>
            </header>

            {personalNotes.length > 0 && (
                <section className="ag-personal">
                    <h3><FontAwesomeIcon icon={faLightbulb} /> نکته مخصوص وضعیت این کودک</h3>
                    <ul>
                        {personalNotes.map((note) => (
                            <li key={note}>{note}</li>
                        ))}
                    </ul>
                </section>
            )}

            <main className="ag-sections">
                {sections.map((section) => (
                    <section key={section.key} className={`ag-card ag-card-${section.tone}`}>
                        <div className="ag-card-head">
                            <span className="ag-card-icon" aria-hidden="true">
                                <FontAwesomeIcon icon={section.icon} />
                            </span>
                            <h3>{section.title}</h3>
                        </div>
                        <ul>
                            {section.items.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </main>

            <p className="ag-disclaimer">
                این راهنما جنبه آموزشی و عمومی دارد و جایگزین تشخیص یا تجویز پزشک نیست.
            </p>
        </div>
    );
};

export default AgeGuidancePage;
