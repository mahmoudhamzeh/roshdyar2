import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import moment from 'jalali-moment';
import { toShamsi } from '../utils/dateConverter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    faCheckCircle,
    faExclamationTriangle,
    faClock,
    faInfoCircle,
    faFilePdf,
    faShareNodes,
    faArrowRight,
    faBell,
    faSyringe,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Modal from 'react-modal';
import { getChildDisplayName } from '../utils/childName';
import './VaccinationPage.css';

Modal.setAppElement('#root');

const BIRTH_TYPE_LABELS = {
    natural: 'طبیعی',
    cesarean: 'سزارین',
    طبیعی: 'طبیعی',
    سزارین: 'سزارین',
};

const vaccineDetails = {
    'ب ث ژ': {
        usage: 'پیشگیری از سل.',
        injectionTime: 'بدو تولد',
        symptoms: 'تب خفیف، بی‌قراری، تورم و قرمزی در محل تزریق.',
        care: 'استفاده از کمپرس سرد در محل تزریق؛ در صورت تب بالا یا علائم شدید به پزشک مراجعه شود.',
    },
    'هپاتیت ب': {
        usage: 'پیشگیری از هپاتیت B.',
        injectionTime: 'بدو تولد، ۲ و ۶ ماهگی',
        symptoms: 'تب خفیف، درد در محل تزریق.',
        care: 'استراحت و مایعات کافی؛ در صورت نیاز استامینوفن طبق دستور پزشک.',
    },
    سه‌گانه: {
        usage: 'پیشگیری از دیفتری، کزاز و سیاه‌سرفه.',
        injectionTime: '۲، ۴، ۶، ۱۸ ماهگی و ۴ تا ۶ سالگی',
        symptoms: 'تب، درد و تورم در محل تزریق، بی‌قراری.',
        care: 'کمپرس سرد و سپس گرم؛ استامینوفن طبق دستور پزشک.',
    },
    'فلج اطفال خوراکی': {
        usage: 'پیشگیری از فلج اطفال.',
        injectionTime: '۲، ۴، ۶، ۱۸ ماهگی و ۴ تا ۶ سالگی',
        symptoms: 'معمولاً بدون علامت یا تب خفیف.',
        care: 'نیاز به اقدام خاصی نیست مگر علائم شدید باشد.',
    },
    MMR: {
        usage: 'پیشگیری از سرخک، اوریون و سرخجه.',
        injectionTime: '۱۲ و ۱۸ ماهگی',
        symptoms: 'تب، بثورات جلدی خفیف ۷ تا ۱۰ روز پس از تزریق.',
        care: 'مایعات فراوان و استراحت.',
    },
};

const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('/uploads')) return `http://localhost:5000${avatar}`;
    return avatar;
};

const formatAgeLabel = (birthMoment) => {
    if (!birthMoment?.isValid()) return '';
    const months = moment().diff(birthMoment, 'months');
    if (months < 1) return 'کمتر از یک ماه';
    if (months < 24) return `${months} ماهه`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${years} سال و ${rem} ماه` : `${years} ساله`;
};

const getRecordValue = (records, age, vaccineName) => {
    if (!records?.[age]) return null;
    return records[age][vaccineName] ?? null;
};

const isRecordDone = (value) => value === true || (typeof value === 'string' && value.trim() !== '');

const VaccinationPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [child, setChild] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [selectedVaccine, setSelectedVaccine] = useState(null);
    const [detailsModalIsOpen, setDetailsModalIsOpen] = useState(false);
    const [reminder, setReminder] = useState({ active: false, daysBefore: 7 });
    const [vaccinationRecords, setVaccinationRecords] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const printRef = useRef();
    const saveTimerRef = useRef(null);

    const childName = getChildDisplayName(child);

    const showSaveMessage = useCallback((message) => {
        setSaveMessage(message);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveMessage(''), 3200);
    }, []);

    useEffect(() => () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [childRes, scheduleRes] = await Promise.all([
                fetch(`http://localhost:5000/api/children/${childId}`),
                fetch('http://localhost:5000/api/vaccination-schedule'),
            ]);
            if (!childRes.ok) throw new Error('کودک مورد نظر یافت نشد.');
            const data = await childRes.json();

            if (data.name && !data.firstName) {
                const nameParts = data.name.split(' ');
                data.firstName = nameParts[0];
                data.lastName = nameParts.slice(1).join(' ');
            }

            setChild(data);
            setVaccinationRecords(data.vaccinationRecords || {});
            if (data.vaccineReminder) setReminder(data.vaccineReminder);

            if (scheduleRes.ok) {
                setSchedule(await scheduleRes.json());
            } else {
                setSchedule([]);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'خطا در بارگذاری اطلاعات کودک.');
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const birthMoment = useMemo(() => {
        if (!child?.birthDate) return null;
        return moment(String(child.birthDate).replace(/\//g, '-'));
    }, [child]);

    const vaccineRows = useMemo(() => {
        const today = moment().startOf('day');
        return schedule.flatMap((group) =>
            group.vaccines.map((vaccine) => {
                const dueDate = birthMoment?.isValid()
                    ? birthMoment.clone().add(group.age, 'months')
                    : null;
                const recordValue = getRecordValue(vaccinationRecords, group.age, vaccine.name);
                const done = isRecordDone(recordValue);
                let statusKey = 'upcoming';
                let statusLabel = 'آینده';
                let statusIcon = faClock;

                if (done) {
                    const doneDate = typeof recordValue === 'string' ? toShamsi(recordValue) : '';
                    statusKey = 'done';
                    statusLabel = doneDate ? `تزریق‌شده در ${doneDate}` : 'تزریق‌شده';
                    statusIcon = faCheckCircle;
                } else if (dueDate?.isValid()) {
                    const diffDays = dueDate.diff(today, 'days');
                    if (diffDays < 0) {
                        statusKey = 'overdue';
                        statusLabel = 'عقب‌افتاده';
                        statusIcon = faExclamationTriangle;
                    } else if (diffDays <= 30) {
                        statusKey = 'near';
                        statusLabel = 'نزدیک موعد';
                        statusIcon = faExclamationTriangle;
                    }
                }

                return {
                    age: group.age,
                    label: group.label,
                    name: vaccine.name,
                    details: vaccine.details,
                    dueDate,
                    dueDateLabel: dueDate?.isValid() ? dueDate.locale('fa').format('YYYY/MM/DD') : '—',
                    done,
                    statusKey,
                    statusLabel,
                    statusIcon,
                    recordValue,
                };
            })
        );
    }, [schedule, birthMoment, vaccinationRecords]);

    const stats = useMemo(() => {
        const total = vaccineRows.length;
        const done = vaccineRows.filter((row) => row.statusKey === 'done').length;
        const overdue = vaccineRows.filter((row) => row.statusKey === 'overdue').length;
        const near = vaccineRows.filter((row) => row.statusKey === 'near').length;
        return {
            total,
            done,
            overdue,
            near,
            pending: Math.max(total - done - overdue - near, 0),
            percent: total ? Math.round((done / total) * 100) : 0,
        };
    }, [vaccineRows]);

    const handleExportPDF = async () => {
        const element = printRef.current;
        if (!element || isExporting) return;

        setIsExporting(true);
        try {
            // Wait for web fonts so Persian glyphs don't overlap in the capture
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                onclone: (clonedDoc) => {
                    const report = clonedDoc.querySelector('.vax-pdf-report');
                    if (report) {
                        report.style.fontFamily = '"Vazirmatn", Tahoma, sans-serif';
                    }
                },
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const marginX = 10;
            const marginTop = 10;
            const marginBottom = 14;
            const usableWidth = pageWidth - marginX * 2;
            const usableHeight = pageHeight - marginTop - marginBottom;

            const imgWidth = usableWidth;
            const pageCanvasHeight = Math.floor((usableHeight * canvas.width) / imgWidth);

            const totalPages = Math.max(1, Math.ceil(canvas.height / pageCanvasHeight));
            let renderedHeight = 0;
            let pageIndex = 0;

            while (renderedHeight < canvas.height) {
                const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeight;

                const ctx = pageCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(
                    canvas,
                    0,
                    renderedHeight,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    canvas.width,
                    sliceHeight
                );

                const pageData = pageCanvas.toDataURL('image/jpeg', 0.86);
                const slicePdfHeight = (sliceHeight * imgWidth) / canvas.width;

                if (pageIndex > 0) pdf.addPage();
                pdf.addImage(pageData, 'JPEG', marginX, marginTop, imgWidth, slicePdfHeight, undefined, 'FAST');

                pdf.setFontSize(8);
                pdf.setTextColor(120);
                pdf.text(
                    `${pageIndex + 1} / ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 5,
                    { align: 'center' }
                );

                renderedHeight += sliceHeight;
                pageIndex += 1;
            }

            const safeName = (childName || 'child')
                .replace(/[\\/:*?"<>|]/g, '-')
                .replace(/\s+/g, '-');
            pdf.save(`گزارش-واکسیناسیون-${safeName}.pdf`);
            showSaveMessage('گزارش PDF با موفقیت تهیه شد.');
        } catch (err) {
            console.error('PDF export failed:', err);
            showSaveMessage('خطا در تهیه فایل PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: `کارت واکسیناسیون ${childName}`,
            text: `اطلاعات واکسیناسیون ${childName} را مشاهده کنید.`,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                showSaveMessage('لینک صفحه در کلیپ‌بورد کپی شد.');
            }
        } catch (err) {
            if (err?.name !== 'AbortError') {
                console.error('Share failed:', err.message);
            }
        }
    };

    const handleMarkAsDone = (age, vaccineName) => {
        const today = moment().format('YYYY/MM/DD');
        setVaccinationRecords((prev) => ({
            ...prev,
            [age]: {
                ...(prev[age] || {}),
                [vaccineName]: today,
            },
        }));
    };

    const handleSaveChanges = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/children/${childId}/vaccination-records`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vaccinationRecords }),
            });
            if (!response.ok) throw new Error('ذخیره تغییرات انجام نشد.');
            showSaveMessage('وضعیت واکسن‌ها ذخیره شد.');
        } catch (err) {
            showSaveMessage(err.message || 'خطا در ذخیره تغییرات.');
        }
    };

    const handleSaveReminder = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/children/${childId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vaccineReminder: reminder }),
            });
            if (!response.ok) throw new Error('ذخیره یادآور انجام نشد.');
            showSaveMessage('تنظیمات یادآور ذخیره شد.');
        } catch (err) {
            showSaveMessage(err.message || 'خطا در ذخیره یادآور.');
        }
    };

    if (isLoading) {
        return (
            <div className="vaccination-page">
                <div className="vax-card-loading animate-fade-up">
                    <div className="vax-card-spinner" />
                    <p>در حال بارگذاری کارت واکسیناسیون...</p>
                </div>
            </div>
        );
    }

    if (error || !child) {
        return (
            <div className="vaccination-page">
                <nav className="vax-card-nav">
                    <button type="button" onClick={() => history.goBack()} className="vax-card-back">
                        <FontAwesomeIcon icon={faArrowRight} />
                        <span>بازگشت</span>
                    </button>
                    <h1>کارت واکسیناسیون</h1>
                    <div className="vax-card-nav-spacer" />
                </nav>
                <div className="vax-card-error animate-fade-up">{error || 'کودک مورد نظر یافت نشد.'}</div>
            </div>
        );
    }

    const avatarUrl = getAvatarUrl(child.avatar);
    const ageLabel = formatAgeLabel(birthMoment);
    const genderLabel = child.gender === 'boy' ? 'پسر' : child.gender === 'girl' ? 'دختر' : (child.gender || '—');
    const birthTypeLabel = child.birthType ? (BIRTH_TYPE_LABELS[child.birthType] || child.birthType) : '—';
    const reportDate = moment().locale('fa').format('YYYY/MM/DD');
    const initial = childName.charAt(0) || 'ک';

    return (
        <div className="vaccination-page">
            <nav className="vax-card-nav">
                <button type="button" onClick={() => history.goBack()} className="vax-card-back">
                    <FontAwesomeIcon icon={faArrowRight} />
                    <span>بازگشت</span>
                </button>
                <h1>کارت واکسیناسیون</h1>
                <div className="vax-card-nav-spacer" />
            </nav>

            <div className="vax-card-content">
                <header className="vax-card-hero animate-fade-up">
                    <div className="vax-card-hero-main">
                        {avatarUrl ? (
                            <img className="vax-card-avatar" src={avatarUrl} alt={childName} />
                        ) : (
                            <div className="vax-card-avatar placeholder" aria-hidden="true">{initial}</div>
                        )}
                        <div className="vax-card-hero-text">
                            <p className="vax-card-kicker">
                                <FontAwesomeIcon icon={faSyringe} />
                                کارت واکسیناسیون
                            </p>
                            <h2>{childName}</h2>
                            <p>
                                {child.birthDate ? `متولد ${toShamsi(child.birthDate)}` : 'تاریخ تولد ثبت نشده'}
                                {ageLabel ? ` · ${ageLabel}` : ''}
                                {` · ${genderLabel}`}
                            </p>
                        </div>
                    </div>
                    <div className="vax-card-hero-actions">
                        <button type="button" onClick={handleShare} className="vax-btn ghost">
                            <FontAwesomeIcon icon={faShareNodes} />
                            اشتراک‌گذاری
                        </button>
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            className="vax-btn primary"
                            disabled={isExporting}
                        >
                            <FontAwesomeIcon icon={faFilePdf} />
                            {isExporting ? 'در حال تهیه PDF...' : 'خروجی PDF'}
                        </button>
                    </div>
                </header>

                <section className="vax-card-progress animate-fade-up-delay" aria-label="پیشرفت واکسیناسیون">
                    <div className="vax-card-progress-meta">
                        <strong>پیشرفت برنامه واکسن</strong>
                        <span>{stats.done} از {stats.total} · {stats.percent}٪</span>
                    </div>
                    <div
                        className="vax-card-progress-track"
                        role="progressbar"
                        aria-valuenow={stats.percent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                    >
                        <div className="vax-card-progress-fill" style={{ width: `${stats.percent}%` }} />
                    </div>
                    <div className="vax-card-legend">
                        <span><i className="dot done" /> تزریق‌شده ({stats.done})</span>
                        <span><i className="dot overdue" /> عقب‌افتاده ({stats.overdue})</span>
                        <span><i className="dot near" /> نزدیک موعد ({stats.near})</span>
                        <span><i className="dot upcoming" /> آینده ({stats.pending})</span>
                    </div>
                </section>

                <section className="vax-card-section animate-fade-up-delay-2">
                    <div className="vax-card-section-head">
                        <h3>اطلاعات کودک</h3>
                        <p>مشخصات هویتی و تولد برای گزارش واکسیناسیون</p>
                    </div>
                    <div className="vax-card-fields">
                        <div className="vax-field"><span>نام</span><strong>{child.firstName || childName}</strong></div>
                        <div className="vax-field"><span>نام خانوادگی</span><strong>{child.lastName || '—'}</strong></div>
                        <div className="vax-field"><span>نام پدر</span><strong>{child.fatherName || '—'}</strong></div>
                        <div className="vax-field"><span>کد ملی</span><strong dir="ltr">{child.nationalId || '—'}</strong></div>
                        <div className="vax-field"><span>تاریخ تولد</span><strong>{toShamsi(child.birthDate) || '—'}</strong></div>
                        <div className="vax-field"><span>جنسیت</span><strong>{genderLabel}</strong></div>
                        <div className="vax-field"><span>وزن تولد</span><strong>{child.birthWeight || child.weight ? `${child.birthWeight || child.weight} g` : '—'}</strong></div>
                        <div className="vax-field"><span>قد تولد</span><strong>{child.birthHeight || child.height ? `${child.birthHeight || child.height} cm` : '—'}</strong></div>
                        <div className="vax-field"><span>دور سر</span><strong>{child.birthHeadCircumference ? `${child.birthHeadCircumference} cm` : '—'}</strong></div>
                        <div className="vax-field"><span>نوع زایمان</span><strong>{birthTypeLabel}</strong></div>
                        <div className="vax-field"><span>سن بارداری</span><strong>{child.gestationalAge ? `${child.gestationalAge} هفته` : '—'}</strong></div>
                        <div className="vax-field"><span>محل تولد</span><strong>{child.birthPlace || '—'}</strong></div>
                    </div>
                </section>

                <section className="vax-card-section">
                    <div className="vax-card-section-head">
                        <h3>جدول واکسیناسیون</h3>
                        <p>وضعیت هر نوبت را ثبت کنید و در پایان ذخیره کنید</p>
                    </div>

                    <div className="vax-schedule-groups">
                        {schedule.map((group) => {
                            const groupRows = vaccineRows.filter((row) => row.age === group.age);
                            const groupDone = groupRows.filter((row) => row.done).length;
                            return (
                                <div key={group.age} className="vax-schedule-group">
                                    <div className="vax-schedule-group-head">
                                        <h4>{group.label}</h4>
                                        <span>{groupDone}/{group.vaccines.length}</span>
                                    </div>
                                    <ul className="vax-schedule-list">
                                        {groupRows.map((row) => (
                                            <li
                                                key={`${row.age}-${row.name}`}
                                                className={`vax-schedule-item status-${row.statusKey}`}
                                            >
                                                <div className="vax-schedule-main">
                                                    <div className="vax-schedule-title">
                                                        <strong>{row.name}</strong>
                                                        <button
                                                            type="button"
                                                            className="vax-info-btn"
                                                            aria-label={`جزئیات ${row.name}`}
                                                            onClick={() => {
                                                                setSelectedVaccine(row);
                                                                setDetailsModalIsOpen(true);
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faInfoCircle} />
                                                        </button>
                                                    </div>
                                                    <div className="vax-schedule-meta">
                                                        <span>{row.details}</span>
                                                        <span>موعد: {row.dueDateLabel}</span>
                                                    </div>
                                                    <div className={`vax-status-chip ${row.statusKey}`}>
                                                        <FontAwesomeIcon icon={row.statusIcon} />
                                                        <span>{row.statusLabel}</span>
                                                    </div>
                                                </div>
                                                <div className="vax-schedule-action">
                                                    {!row.done ? (
                                                        <button
                                                            type="button"
                                                            className="vax-btn mark"
                                                            onClick={() => handleMarkAsDone(row.age, row.name)}
                                                        >
                                                            ثبت تزریق
                                                        </button>
                                                    ) : (
                                                        <span className="vax-done-mark">ثبت شده</span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                    <div className="vax-table-actions">
                        <button type="button" onClick={handleSaveChanges} className="vax-btn primary">
                            ذخیره تغییرات وضعیت واکسن‌ها
                        </button>
                    </div>
                </section>

                <section className="vax-card-section reminder-block">
                    <div className="vax-card-section-head">
                        <h3>
                            <FontAwesomeIcon icon={faBell} />
                            تنظیمات یادآور
                        </h3>
                        <p>قبل از موعد واکسن بعدی یادآوری دریافت کنید</p>
                    </div>
                    <div className="vax-reminder-controls">
                        <div className="vax-reminder-row">
                            <label htmlFor="reminder-switch">فعال‌سازی یادآور</label>
                            <label className="vax-switch">
                                <input
                                    type="checkbox"
                                    id="reminder-switch"
                                    checked={!!reminder.active}
                                    onChange={(e) => setReminder({ ...reminder, active: e.target.checked })}
                                />
                                <span className="vax-slider" />
                            </label>
                        </div>
                        {reminder.active && (
                            <div className="vax-reminder-row">
                                <label htmlFor="days-before">تعداد روز قبل از موعد</label>
                                <input
                                    type="number"
                                    id="days-before"
                                    value={reminder.daysBefore}
                                    onChange={(e) => setReminder({
                                        ...reminder,
                                        daysBefore: Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)),
                                    })}
                                    min="1"
                                    max="30"
                                />
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={handleSaveReminder} className="vax-btn primary">
                        ذخیره تنظیمات یادآور
                    </button>
                </section>
            </div>

            {/* Print-only report used for PDF export */}
            <div className="vax-pdf-root" aria-hidden="true">
                <div className="vax-pdf-report" ref={printRef}>
                    <header className="vax-pdf-header">
                        <div>
                            <p className="vax-pdf-brand">تات کیدز</p>
                            <h1>گزارش کارت واکسیناسیون</h1>
                        </div>
                        <div className="vax-pdf-meta">
                            <div>تاریخ گزارش: {reportDate}</div>
                            <div>پیشرفت: {stats.done} از {stats.total} ({stats.percent}٪)</div>
                        </div>
                    </header>

                    <section className="vax-pdf-section">
                        <h2>اطلاعات کودک</h2>
                        <table className="vax-pdf-info-table">
                            <tbody>
                                <tr>
                                    <th>نام و نام خانوادگی</th>
                                    <td>{childName}</td>
                                    <th>نام پدر</th>
                                    <td>{child.fatherName || '—'}</td>
                                </tr>
                                <tr>
                                    <th>تاریخ تولد</th>
                                    <td>{toShamsi(child.birthDate) || '—'}</td>
                                    <th>جنسیت</th>
                                    <td>{genderLabel}</td>
                                </tr>
                                <tr>
                                    <th>کد ملی</th>
                                    <td dir="ltr">{child.nationalId || '—'}</td>
                                    <th>محل تولد</th>
                                    <td>{child.birthPlace || '—'}</td>
                                </tr>
                                <tr>
                                    <th>وزن / قد / دور سر</th>
                                    <td>
                                        {child.birthWeight || child.weight || '—'} g
                                        {' / '}
                                        {child.birthHeight || child.height || '—'} cm
                                        {' / '}
                                        {child.birthHeadCircumference || '—'} cm
                                    </td>
                                    <th>نوع زایمان</th>
                                    <td>{birthTypeLabel}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="vax-pdf-section">
                        <h2>جدول واکسیناسیون</h2>
                        <table className="vax-pdf-vax-table">
                            <thead>
                                <tr>
                                    <th>نام واکسن</th>
                                    <th>نوبت</th>
                                    <th>سن موعود</th>
                                    <th>تاریخ موعود</th>
                                    <th>وضعیت</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vaccineRows.map((row) => (
                                    <tr key={`pdf-${row.age}-${row.name}`} className={row.done ? 'is-done' : ''}>
                                        <td>{row.name}</td>
                                        <td>{row.details}</td>
                                        <td>{row.label}</td>
                                        <td>{row.dueDateLabel}</td>
                                        <td className={`pdf-status ${row.statusKey}`}>{row.statusLabel}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <footer className="vax-pdf-footer">
                        این گزارش به‌صورت خودکار از سامانه تات کیدز تهیه شده است و جنبه اطلاع‌رسانی دارد.
                    </footer>
                </div>
            </div>

            {saveMessage && (
                <div className="vax-toast" role="status">{saveMessage}</div>
            )}

            <Modal
                isOpen={detailsModalIsOpen}
                onRequestClose={() => setDetailsModalIsOpen(false)}
                contentLabel="جزئیات واکسن"
                className="vax-details-modal"
                overlayClassName="vax-modal-overlay"
            >
                {selectedVaccine && (
                    <>
                        <h2>{selectedVaccine.name}</h2>
                        <div className="vax-details-content">
                            <p>
                                <strong>موارد مصرف:</strong>{' '}
                                {vaccineDetails[selectedVaccine.name]?.usage || 'اطلاعاتی ثبت نشده است.'}
                            </p>
                            <p>
                                <strong>زمان تزریق:</strong>{' '}
                                {vaccineDetails[selectedVaccine.name]?.injectionTime || selectedVaccine.label}
                            </p>
                            <p>
                                <strong>علائم احتمالی:</strong>{' '}
                                {vaccineDetails[selectedVaccine.name]?.symptoms || 'اطلاعاتی ثبت نشده است.'}
                            </p>
                            <p>
                                <strong>مراقبت‌های پس از واکسن:</strong>{' '}
                                {vaccineDetails[selectedVaccine.name]?.care || 'اطلاعاتی ثبت نشده است.'}
                            </p>
                        </div>
                        <div className="vax-modal-actions">
                            <button type="button" onClick={() => setDetailsModalIsOpen(false)} className="vax-btn primary">
                                بستن
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default VaccinationPage;
