import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRight,
    faChartLine,
    faVial,
    faUserDoctor,
    faFileMedical,
    faNotesMedical,
    faIdCard,
    faBaby,
    faHeartbeat,
    faAllergies,
    faStethoscope,
    faPen,
    faSyringe,
    faDroplet,
    faCalendarDay,
    faVenusMars,
    faUser,
    faLocationDot,
    faWeightScale,
    faRulerVertical,
    faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { getChildDisplayName } from '../utils/childName';
import './HealthProfilePage.css';

Modal.setAppElement('#root');

const BIRTH_TYPE_LABELS = {
    natural: 'طبیعی',
    cesarean: 'سزارین',
    'طبیعی': 'طبیعی',
    'سزارین': 'سزارین',
};

const formatValue = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') return null;
    return `${value}${suffix}`;
};

const formatBirthDate = (birthDate) => {
    if (!birthDate) return null;
    const normalized = String(birthDate).replace(/\//g, '-');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return String(birthDate).replace(/-/g, '/');
    try {
        return date.toLocaleDateString('fa-IR');
    } catch {
        return String(birthDate).replace(/-/g, '/');
    }
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
    if (years <= 0) {
        return `${months} ماه`;
    }
    if (months === 0) {
        return `${years} سال`;
    }
    return `${years} سال و ${months} ماه`;
};

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

const getLatestGrowth = (growthData = []) => {
    if (!Array.isArray(growthData) || growthData.length === 0) return null;
    return [...growthData].sort((a, b) => {
        const da = new Date(String(a.date || '').replace(/\//g, '-')).getTime();
        const db = new Date(String(b.date || '').replace(/\//g, '-')).getTime();
        return db - da;
    })[0];
};

const InfoField = ({ label, value, icon }) => (
    <div className={`hp-field${!value ? ' is-empty' : ''}`}>
        <div className="hp-field-label">
            {icon && <FontAwesomeIcon icon={icon} className="hp-field-icon" />}
            <span>{label}</span>
        </div>
        <div className="hp-field-value">{value || 'ثبت نشده'}</div>
    </div>
);

const HealthProfilePage = () => {
    const history = useHistory();
    const { childId } = useParams();
    const [child, setChild] = useState(null);
    const [visits, setVisits] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [vaccinationStatus, setVaccinationStatus] = useState([]);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const abortController = new AbortController();
        const { signal } = abortController;

        const fetchAllData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [childRes, visitsRes, docsRes, vacRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/children/${childId}`, { signal }),
                    fetch(`http://localhost:5000/api/visits/${childId}`, { signal }),
                    fetch(`http://localhost:5000/api/documents/${childId}`, { signal }),
                    fetch(`http://localhost:5000/api/vaccination-status/${childId}`, { signal }),
                ]);

                if (!childRes.ok) throw new Error('Child not found');

                const childData = await childRes.json();
                setChild(childData);
                setVisits(visitsRes.ok ? await visitsRes.json() : []);
                setDocuments(docsRes.ok ? await docsRes.json() : []);
                setVaccinationStatus(vacRes.ok ? await vacRes.json() : []);
            } catch (err) {
                if (err.name === 'AbortError') return;
                setError('پرونده سلامت یافت نشد.');
                setChild(null);
            } finally {
                if (!signal.aborted) setIsLoading(false);
            }
        };

        fetchAllData();
        return () => abortController.abort();
    }, [childId]);

    if (isLoading) {
        return (
            <div className="health-profile-page">
                <div className="hp-loading" role="status" aria-live="polite">
                    <div className="hp-spinner" />
                    <p>در حال بارگذاری پرونده سلامت...</p>
                </div>
            </div>
        );
    }

    if (!child) {
        return (
            <div className="health-profile-page">
                <nav className="hp-nav">
                    <button type="button" onClick={() => history.push('/my-children')} className="hp-back-btn">
                        <FontAwesomeIcon icon={faArrowRight} />
                        <span>لیست کودکان</span>
                    </button>
                    <h1>پرونده سلامت</h1>
                    <div className="hp-nav-spacer" />
                </nav>
                <div className="hp-empty-state">
                    <FontAwesomeIcon icon={faCircleInfo} />
                    <p>{error || 'کودک یافت نشد.'}</p>
                    <button type="button" className="hp-primary-btn" onClick={() => history.push('/my-children')}>
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
    const latestGrowth = getLatestGrowth(child.growthData);
    const currentHeight = formatValue(latestGrowth?.height ?? child.height, ' سانتی‌متر');
    const currentWeight = formatValue(latestGrowth?.weight ?? child.weight, ' کیلوگرم');
    const currentHead = formatValue(latestGrowth?.headCircumference, ' سانتی‌متر');
    const birthTypeLabel = child.birthType ? (BIRTH_TYPE_LABELS[child.birthType] || child.birthType) : null;

    const vaccinatedCount = Array.isArray(vaccinationStatus)
        ? vaccinationStatus.filter((item) => item.status === 'done').length
        : 0;
    const totalVaccines = Array.isArray(vaccinationStatus) ? vaccinationStatus.length : 0;

    const quickActions = [
        {
            key: 'growth',
            title: 'نمودار رشد',
            subtitle: latestGrowth ? `آخرین ثبت: ${formatBirthDate(latestGrowth.date) || '—'}` : 'ثبت و پیگیری رشد',
            icon: faChartLine,
            tone: 'teal',
            onClick: () => history.push(`/growth-chart/${childId}`),
        },
        {
            key: 'labs',
            title: 'چکاپ و آزمایش‌ها',
            subtitle: 'مدیریت نتایج آزمایش',
            icon: faVial,
            tone: 'amber',
            onClick: () => history.push(`/lab-tests/${childId}`),
        },
        {
            key: 'visits',
            title: 'مراجعات پزشکی',
            subtitle: visits.length ? `${visits.length} مراجعه ثبت‌شده` : 'هنوز مراجعه‌ای نیست',
            icon: faUserDoctor,
            tone: 'sky',
            onClick: () => setIsVisitModalOpen(true),
        },
        {
            key: 'docs',
            title: 'مدارک پزشکی',
            subtitle: documents.length ? `${documents.length} مدرک ثبت‌شده` : 'هنوز مدرکی نیست',
            icon: faFileMedical,
            tone: 'rose',
            onClick: () => setIsDocModalOpen(true),
        },
        {
            key: 'vax',
            title: 'وضعیت واکسن',
            subtitle: totalVaccines ? `${vaccinatedCount} از ${totalVaccines} تزریق‌شده` : 'مشاهده برنامه واکسیناسیون',
            icon: faSyringe,
            tone: 'mint',
            onClick: () => history.push(`/vaccination-status/${childId}`),
        },
        {
            key: 'edit',
            title: 'ویرایش اطلاعات',
            subtitle: 'به‌روزرسانی پرونده',
            icon: faPen,
            tone: 'slate',
            onClick: () => history.push(`/edit-child/${childId}`),
        },
    ];

    return (
        <div className="health-profile-page">
            <nav className="hp-nav">
                <button type="button" onClick={() => history.push('/my-children')} className="hp-back-btn">
                    <FontAwesomeIcon icon={faArrowRight} />
                    <span>لیست کودکان</span>
                </button>
                <h1>پرونده سلامت</h1>
                <div className="hp-nav-spacer" />
            </nav>

            <div className="hp-content">
                <header className="hp-hero">
                    <div className="hp-hero-main">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="hp-avatar" />
                        ) : (
                            <div className="hp-avatar placeholder" aria-hidden="true">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        <div className="hp-hero-text">
                            <h2>{displayName}</h2>
                            <p className="hp-hero-meta">
                                {ageLabel && <span>{ageLabel}</span>}
                                {child.gender && (
                                    <span>{child.gender === 'boy' ? 'پسر' : child.gender === 'girl' ? 'دختر' : child.gender}</span>
                                )}
                                {child.bloodType && <span>گروه خونی {child.bloodType}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="hp-hero-actions">
                        <button
                            type="button"
                            className="hp-primary-btn"
                            onClick={() => history.push(`/health-analysis/${child.id}`)}
                        >
                            <FontAwesomeIcon icon={faNotesMedical} />
                            تحلیل کامل پرونده
                        </button>
                        <button
                            type="button"
                            className="hp-secondary-btn"
                            onClick={() => history.push(`/edit-child/${childId}`)}
                        >
                            <FontAwesomeIcon icon={faPen} />
                            ویرایش
                        </button>
                    </div>
                </header>

                <section className="hp-main-card" aria-labelledby="hp-comprehensive-title">
                    <div className="hp-section-heading">
                        <h3 id="hp-comprehensive-title">
                            <FontAwesomeIcon icon={faHeartbeat} />
                            اطلاعات جامع سلامت
                        </h3>
                        <p>خلاصه هویتی، تولد، وضعیت فعلی و سوابق حساسیت و بیماری</p>
                    </div>

                    <div className="hp-info-block">
                        <h4>
                            <FontAwesomeIcon icon={faIdCard} />
                            اطلاعات هویتی
                        </h4>
                        <div className="hp-info-grid">
                            <InfoField label="نام و نام خانوادگی" value={displayName} icon={faUser} />
                            <InfoField label="کد ملی" value={formatValue(child.nationalId)} icon={faIdCard} />
                            <InfoField label="نام پدر" value={formatValue(child.fatherName)} icon={faUser} />
                            <InfoField
                                label="جنسیت"
                                value={child.gender === 'boy' ? 'پسر' : child.gender === 'girl' ? 'دختر' : formatValue(child.gender)}
                                icon={faVenusMars}
                            />
                            <InfoField label="تاریخ تولد" value={formatBirthDate(child.birthDate)} icon={faCalendarDay} />
                            <InfoField label="سن فعلی" value={ageLabel} icon={faCalendarDay} />
                        </div>
                    </div>

                    <div className="hp-info-block">
                        <h4>
                            <FontAwesomeIcon icon={faBaby} />
                            اطلاعات هنگام تولد
                        </h4>
                        <div className="hp-info-grid">
                            <InfoField label="وزن تولد" value={formatValue(child.birthWeight, ' گرم')} icon={faWeightScale} />
                            <InfoField label="قد تولد" value={formatValue(child.birthHeight, ' سانتی‌متر')} icon={faRulerVertical} />
                            <InfoField
                                label="دور سر تولد"
                                value={formatValue(child.birthHeadCircumference, ' سانتی‌متر')}
                                icon={faRulerVertical}
                            />
                            <InfoField label="نوع زایمان" value={birthTypeLabel} icon={faBaby} />
                            <InfoField
                                label="سن بارداری"
                                value={formatValue(child.gestationalAge, ' هفته')}
                                icon={faCalendarDay}
                            />
                            <InfoField label="محل تولد" value={formatValue(child.birthPlace)} icon={faLocationDot} />
                            <InfoField label="آپگار دقیقه ۱" value={formatValue(child.apgar1)} icon={faHeartbeat} />
                            <InfoField label="آپگار دقیقه ۵" value={formatValue(child.apgar5)} icon={faHeartbeat} />
                        </div>
                    </div>

                    <div className="hp-info-block">
                        <h4>
                            <FontAwesomeIcon icon={faHeartbeat} />
                            وضعیت فعلی
                        </h4>
                        <div className="hp-info-grid">
                            <InfoField label="قد فعلی" value={currentHeight} icon={faRulerVertical} />
                            <InfoField label="وزن فعلی" value={currentWeight} icon={faWeightScale} />
                            <InfoField label="دور سر فعلی" value={currentHead} icon={faRulerVertical} />
                            <InfoField label="گروه خونی" value={formatValue(child.bloodType)} icon={faDroplet} />
                            <InfoField
                                label="آخرین اندازه‌گیری رشد"
                                value={latestGrowth ? formatBirthDate(latestGrowth.date) : null}
                                icon={faChartLine}
                            />
                            <InfoField
                                label="پیشرفت واکسیناسیون"
                                value={totalVaccines ? `${vaccinatedCount} از ${totalVaccines}` : null}
                                icon={faSyringe}
                            />
                        </div>
                    </div>

                    <div className="hp-split-blocks">
                        <div className="hp-info-block">
                            <h4>
                                <FontAwesomeIcon icon={faAllergies} />
                                آلرژی‌ها
                            </h4>
                            {allergyTags.length > 0 ? (
                                <>
                                    <div className="hp-tags">
                                        {allergyTags.map((tag) => (
                                            <span key={tag} className="hp-tag allergy">{tag}</span>
                                        ))}
                                    </div>
                                    {allergyDescription && <p className="hp-note">{allergyDescription}</p>}
                                </>
                            ) : (
                                <p className="hp-empty-note">هیچ آلرژی ثبت نشده است.</p>
                            )}
                        </div>

                        <div className="hp-info-block">
                            <h4>
                                <FontAwesomeIcon icon={faStethoscope} />
                                بیماری‌های خاص
                            </h4>
                            {illnessTags.length > 0 ? (
                                <>
                                    <div className="hp-tags">
                                        {illnessTags.map((tag) => (
                                            <span key={tag} className="hp-tag illness">{tag}</span>
                                        ))}
                                    </div>
                                    {illnessDescription && <p className="hp-note">{illnessDescription}</p>}
                                </>
                            ) : (
                                <p className="hp-empty-note">هیچ بیماری خاصی ثبت نشده است.</p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="hp-actions" aria-label="میانبرهای پرونده">
                    {quickActions.map((action, index) => (
                        <button
                            key={action.key}
                            type="button"
                            className={`hp-action-card tone-${action.tone}`}
                            style={{ animationDelay: `${0.04 * index}s` }}
                            onClick={action.onClick}
                        >
                            <span className="hp-action-icon" aria-hidden="true">
                                <FontAwesomeIcon icon={action.icon} />
                            </span>
                            <span className="hp-action-text">
                                <strong>{action.title}</strong>
                                <small>{action.subtitle}</small>
                            </span>
                        </button>
                    ))}
                </section>
            </div>

            <Modal
                isOpen={isVisitModalOpen}
                onRequestClose={() => setIsVisitModalOpen(false)}
                className="hp-modal"
                overlayClassName="modal-overlay"
                contentLabel="مراجعات پزشکی"
            >
                <div className="hp-modal-header">
                    <h2>مراجعات پزشکی</h2>
                    <button type="button" className="hp-modal-close" onClick={() => setIsVisitModalOpen(false)} aria-label="بستن">
                        ×
                    </button>
                </div>
                {visits.length > 0 ? (
                    <ul className="hp-modal-list">
                        {visits.map((visit) => (
                            <li key={visit.id || `${visit.date}-${visit.reason}`}>
                                <div className="hp-modal-item-top">
                                    <strong>{visit.reason || 'مراجعه پزشکی'}</strong>
                                    <span>{visit.date ? formatBirthDate(visit.date) : '—'}</span>
                                </div>
                                {visit.description && <p>{visit.description}</p>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="hp-empty-note">هیچ مراجعه‌ای ثبت نشده است.</p>
                )}
            </Modal>

            <Modal
                isOpen={isDocModalOpen}
                onRequestClose={() => setIsDocModalOpen(false)}
                className="hp-modal"
                overlayClassName="modal-overlay"
                contentLabel="مدارک پزشکی"
            >
                <div className="hp-modal-header">
                    <h2>مدارک پزشکی</h2>
                    <button type="button" className="hp-modal-close" onClick={() => setIsDocModalOpen(false)} aria-label="بستن">
                        ×
                    </button>
                </div>
                {documents.length > 0 ? (
                    <ul className="hp-modal-list">
                        {documents.map((doc) => (
                            <li key={doc.id || doc.url || doc.title}>
                                <div className="hp-modal-item-top">
                                    <a
                                        href={doc.url ? `http://localhost:5000${doc.url}` : '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {doc.title || 'مدرک پزشکی'}
                                    </a>
                                    <span>{doc.date ? formatBirthDate(doc.date) : '—'}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="hp-empty-note">هیچ مدرکی ثبت نشده است.</p>
                )}
            </Modal>
        </div>
    );
};

export default HealthProfilePage;
