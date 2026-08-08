import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import moment from 'jalali-moment';
import { getChildDisplayName } from '../utils/childName';
import { toShamsi } from '../utils/dateConverter';
import './VaccinationStatusPage.css';

const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('/uploads')) return `${avatar}`;
    return avatar;
};

const VaccinationStatusPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [schedule, setSchedule] = useState([]);
    const [child, setChild] = useState(null);
    const [vaccinationRecords, setVaccinationRecords] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingKey, setSavingKey] = useState(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [childRes, scheduleRes] = await Promise.all([
                fetch(`/api/children/${childId}`),
                fetch('/api/vaccination-schedule'),
            ]);

            if (!childRes.ok) {
                throw new Error('کودک مورد نظر یافت نشد.');
            }

            const childData = await childRes.json();
            setChild(childData);
            setVaccinationRecords(childData.vaccinationRecords || {});

            if (scheduleRes.ok) {
                setSchedule(await scheduleRes.json());
            } else {
                setSchedule([]);
            }
        } catch (err) {
            console.error('Failed to fetch vaccination data:', err);
            setError(err.message || 'خطا در بارگذاری اطلاعات واکسیناسیون.');
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

    const isVaccineDone = useCallback((age, vaccineName) => {
        return !!(vaccinationRecords[age] && vaccinationRecords[age][vaccineName]);
    }, [vaccinationRecords]);

    const getVaccineState = useCallback((age, vaccineName) => {
        if (isVaccineDone(age, vaccineName)) return 'done';
        if (!birthMoment || !birthMoment.isValid()) return 'pending';
        const dueDate = birthMoment.clone().add(age, 'months');
        if (dueDate.isBefore(moment(), 'day')) return 'overdue';
        return 'pending';
    }, [birthMoment, isVaccineDone]);

    const stats = useMemo(() => {
        let total = 0;
        let done = 0;
        let overdue = 0;

        schedule.forEach((group) => {
            group.vaccines.forEach((vaccine) => {
                total += 1;
                const state = getVaccineState(group.age, vaccine.name);
                if (state === 'done') done += 1;
                else if (state === 'overdue') overdue += 1;
            });
        });

        return {
            total,
            done,
            overdue,
            pending: Math.max(total - done - overdue, 0),
            percent: total ? Math.round((done / total) * 100) : 0,
        };
    }, [schedule, getVaccineState]);

    const handleVaccineRecordChange = async (age, vaccineName, isDone) => {
        const key = `${age}-${vaccineName}`;
        const previousRecords = vaccinationRecords;
        const updatedRecords = {
            ...vaccinationRecords,
            [age]: {
                ...vaccinationRecords[age],
                [vaccineName]: isDone,
            },
        };

        setVaccinationRecords(updatedRecords);
        setSavingKey(key);

        try {
            const response = await fetch(`/api/children/${childId}/vaccination-records`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vaccinationRecords: updatedRecords }),
            });

            if (!response.ok) {
                setVaccinationRecords(previousRecords);
                alert('خطا در ثبت اطلاعات واکسن.');
            }
        } catch (err) {
            setVaccinationRecords(previousRecords);
            alert('خطای ارتباط با سرور.');
        } finally {
            setSavingKey(null);
        }
    };

    const childName = getChildDisplayName(child);
    const avatarUrl = getAvatarUrl(child?.avatar);
    const initial = childName.charAt(0) || 'ک';

    const ageLabel = useMemo(() => {
        if (!birthMoment?.isValid()) return '';
        const months = moment().diff(birthMoment, 'months');
        if (months < 1) return 'کمتر از یک ماه';
        if (months < 24) return `${months} ماهه`;
        const years = Math.floor(months / 12);
        const rem = months % 12;
        return rem ? `${years} سال و ${rem} ماه` : `${years} ساله`;
    }, [birthMoment]);

    if (isLoading) {
        return (
            <div className="vax-status-page">
                <div className="vax-loading animate-fade-up">در حال بارگذاری وضعیت واکسیناسیون...</div>
            </div>
        );
    }

    if (error || !child) {
        return (
            <div className="vax-status-page">
                <nav className="vax-nav">
                    <button type="button" onClick={() => history.goBack()} className="vax-back-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        <span>بازگشت</span>
                    </button>
                    <h1>وضعیت واکسیناسیون</h1>
                    <div className="vax-nav-spacer" />
                </nav>
                <div className="vax-error animate-fade-up">{error || 'کودک مورد نظر یافت نشد.'}</div>
            </div>
        );
    }

    return (
        <div className="vax-status-page">
            <nav className="vax-nav">
                <button type="button" onClick={() => history.goBack()} className="vax-back-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    <span>بازگشت</span>
                </button>
                <h1>وضعیت واکسیناسیون</h1>
                <div className="vax-nav-spacer" />
            </nav>

            <div className="vax-status-content">
                <header className="vax-hero animate-fade-up">
                    {avatarUrl ? (
                        <img className="vax-hero-avatar" src={avatarUrl} alt={childName} />
                    ) : (
                        <div className="vax-hero-avatar placeholder" aria-hidden="true">{initial}</div>
                    )}
                    <div className="vax-hero-text">
                        <h2>{childName}</h2>
                        <p>
                            {child.birthDate ? `متولد ${toShamsi(child.birthDate)}` : 'تاریخ تولد ثبت نشده'}
                            {ageLabel ? ` · ${ageLabel}` : ''}
                        </p>
                    </div>
                </header>

                <section className="vax-progress-block animate-fade-up-delay" aria-label="پیشرفت واکسیناسیون">
                    <div className="vax-progress-meta">
                        <strong>پیشرفت واکسیناسیون</strong>
                        <span>{stats.done} از {stats.total} · {stats.percent}٪</span>
                    </div>
                    <div className="vax-progress-track" role="progressbar" aria-valuenow={stats.percent} aria-valuemin="0" aria-valuemax="100">
                        <div className="vax-progress-fill" style={{ width: `${stats.percent}%` }} />
                    </div>
                    <div className="vax-legend">
                        <span className="vax-legend-item"><span className="vax-dot done" /> انجام‌شده ({stats.done})</span>
                        <span className="vax-legend-item"><span className="vax-dot overdue" /> عقب‌افتاده ({stats.overdue})</span>
                        <span className="vax-legend-item"><span className="vax-dot pending" /> باقی‌مانده ({stats.pending})</span>
                    </div>
                </section>

                <div className="vax-groups">
                    {schedule.map((group) => {
                        const groupDone = group.vaccines.filter((v) => isVaccineDone(group.age, v.name)).length;
                        return (
                            <section key={group.age} className="vax-group">
                                <div className="vax-group-header">
                                    <h3>{group.label}</h3>
                                    <span className="vax-group-count">{groupDone}/{group.vaccines.length}</span>
                                </div>
                                <ul className="vax-list">
                                    {group.vaccines.map((vaccine) => {
                                        const state = getVaccineState(group.age, vaccine.name);
                                        const done = state === 'done';
                                        const key = `${group.age}-${vaccine.name}`;
                                        const statusLabel = done ? 'انجام شده' : state === 'overdue' ? 'عقب‌افتاده' : 'در انتظار';

                                        return (
                                            <li
                                                key={vaccine.name}
                                                className={`vax-item ${done ? 'is-done' : ''} ${state === 'overdue' ? 'is-overdue' : ''}`}
                                            >
                                                <div className="vax-item-info">
                                                    <strong>{vaccine.name}</strong>
                                                    <div className="vax-item-row">
                                                        <span className="vax-details">{vaccine.details}</span>
                                                        <span className={`vax-badge ${state}`}>{statusLabel}</span>
                                                    </div>
                                                </div>
                                                <label className="vax-switch" title={done ? 'علامت‌گذاری به‌عنوان انجام‌نشده' : 'ثبت انجام واکسن'}>
                                                    <input
                                                        type="checkbox"
                                                        checked={done}
                                                        disabled={savingKey === key}
                                                        onChange={(e) => handleVaccineRecordChange(group.age, vaccine.name, e.target.checked)}
                                                        aria-label={`${vaccine.name} - ${statusLabel}`}
                                                    />
                                                    <span className="vax-slider" />
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VaccinationStatusPage;
