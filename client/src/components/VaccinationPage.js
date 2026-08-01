import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import moment from 'jalali-moment';
import { toShamsi } from '../utils/dateConverter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { faCheckCircle, faTimesCircle, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Modal from 'react-modal';
import { getChildDisplayName } from '../utils/childName';
import './VaccinationPage.css';

const vaccineDetails = {
    'ب ث ژ': {
        usage: 'پیشگیری از سل.',
        injectionTime: 'بدو تولد',
        symptoms: 'تب خفیف، بی‌قراری، تورم و قرمزی در محل تزریق.',
        care: 'استفاده از کمپرس سرد در محل تزریق؛ در صورت تب بالا یا علائم شدید به پزشک مراجعه شود.'
    },
    'هپاتیت ب': {
        usage: 'پیشگیری از هپاتیت B.',
        injectionTime: 'بدو تولد، ۲ و ۶ ماهگی',
        symptoms: 'تب خفیف، درد در محل تزریق.',
        care: 'استراحت و مایعات کافی؛ در صورت نیاز استامینوفن طبق دستور پزشک.'
    },
    'سه‌گانه': {
        usage: 'پیشگیری از دیفتری، کزاز و سیاه‌سرفه.',
        injectionTime: '۲، ۴، ۶، ۱۸ ماهگی و ۴ تا ۶ سالگی',
        symptoms: 'تب، درد و تورم در محل تزریق، بی‌قراری.',
        care: 'کمپرس سرد و سپس گرم؛ استامینوفن طبق دستور پزشک.'
    },
    'فلج اطفال خوراکی': {
        usage: 'پیشگیری از فلج اطفال.',
        injectionTime: '۲، ۴، ۶، ۱۸ ماهگی و ۴ تا ۶ سالگی',
        symptoms: 'معمولاً بدون علامت یا تب خفیف.',
        care: 'نیاز به اقدام خاصی نیست مگر علائم شدید باشد.'
    },
    'MMR': {
        usage: 'پیشگیری از سرخک، اوریون و سرخجه.',
        injectionTime: '۱۲ و ۱۸ ماهگی',
        symptoms: 'تب، بثورات جلدی خفیف ۷ تا ۱۰ روز پس از تزریق.',
        care: 'مایعات فراوان و استراحت.'
    }
};

const VaccinationPage = () => {
    const { childId } = useParams();
    const history = useHistory();
    const [child, setChild] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [selectedVaccine, setSelectedVaccine] = useState(null);
    const [detailsModalIsOpen, setDetailsModalIsOpen] = useState(false);
    const [reminder, setReminder] = useState({ active: false, daysBefore: 7 });
    const [vaccinationRecords, setVaccinationRecords] = useState({});
    const printRef = useRef();

    const childName = getChildDisplayName(child);

    const fetchData = useCallback(async () => {
        try {
            const [childRes, scheduleRes] = await Promise.all([
                fetch(`http://localhost:5000/api/children/${childId}`),
                fetch('http://localhost:5000/api/vaccination-schedule')
            ]);
            if (!childRes.ok) throw new Error('Failed to fetch child data.');
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
            }
        } catch (error) {
            console.error(error);
            alert('خطا در بارگذاری اطلاعات کودک.');
        }
    }, [childId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExportPDF = async () => {
        const element = printRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
        });
        const data = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`vaccination-card-${childName}.pdf`);
    };

    const handleShare = async () => {
        const shareData = {
            title: `کارت واکسیناسیون ${childName}`,
            text: `اطلاعات واکسیناسیون ${childName} را مشاهده کنید.`,
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert('لینک در کلیپ‌بورد کپی شد!');
            }
        } catch (err) {
            console.error("Share failed:", err.message);
        }
    };

    const handleMarkAsDone = (age, vaccineName) => {
        const today = moment().format('YYYY/MM/DD');
        setVaccinationRecords(prev => ({
            ...prev,
            [age]: {
                ...(prev[age] || {}),
                [vaccineName]: today
            }
        }));
    };

    const handleSaveChanges = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/children/${childId}/vaccination-records`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vaccinationRecords }),
            });
            if (!response.ok) throw new Error('Failed to save changes');
            alert('تغییرات وضعیت واکسن با موفقیت ذخیره شد.');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSaveReminder = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/children/${childId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vaccineReminder: reminder }),
            });
            if (!response.ok) throw new Error('Failed to save reminder settings');
            alert('تنظیمات یادآور با موفقیت ذخیره شد.');
        } catch (error) {
            alert(error.message);
        }
    };

    if (!child) {
        return <div>در حال بارگذاری اطلاعات...</div>;
    }

    const flatVaccines = schedule.flatMap(group =>
        group.vaccines.map(vaccine => ({
            ...vaccine,
            age: group.age,
            label: group.label,
        }))
    );

    return (
        <div className="vaccination-page">
            <nav className="page-nav-final">
                <button onClick={() => history.goBack()} className="back-btn">
                    <span>&larr;</span>
                    <span>بازگشت</span>
                </button>
                <h1>کارت واکسیناسیون</h1>
                <div className="nav-avatar">
                    <img src={child.avatar && child.avatar.startsWith('/uploads') ? `http://localhost:5000${child.avatar}` : (child.avatar || 'https://i.pravatar.cc/50')} alt={childName} />
                    <span>{childName}</span>
                </div>
            </nav>

            <div className="page-actions-vaccine">
                <button onClick={handleShare} className="btn-share">اشتراک گذاری</button>
                <button onClick={handleExportPDF} className="btn-export">خروجی PDF</button>
            </div>

            <div className="content-container" ref={printRef}>
                <section className="child-info-section">
                    <h2>اطلاعات کودک</h2>
                    <div className="info-grid">
                        <div className="info-item"><strong>نام:</strong> {child.firstName || childName}</div>
                        <div className="info-item"><strong>نام خانوادگی:</strong> {child.lastName || '-'}</div>
                        <div className="info-item"><strong>تاریخ تولد:</strong> {toShamsi(child.birthDate)}</div>
                        <div className="info-item"><strong>کد ملی:</strong> {child.nationalId || '-'}</div>
                        <div className="info-item"><strong>جنسیت:</strong> {child.gender === 'boy' ? 'پسر' : child.gender === 'girl' ? 'دختر' : child.gender}</div>
                        <div className="info-item"><strong>نام پدر:</strong> {child.fatherName || '-'}</div>
                    </div>
                    <h3>اطلاعات مربوط به تولد</h3>
                    <div className="info-grid">
                        <div className="info-item"><strong>وزن (g):</strong> {child.birthWeight || child.weight || '-'}</div>
                        <div className="info-item"><strong>قد (cm):</strong> {child.birthHeight || child.height || '-'}</div>
                        <div className="info-item"><strong>دور سر (cm):</strong> {child.birthHeadCircumference || '-'}</div>
                        <div className="info-item"><strong>نوع زایمان:</strong> {child.birthType || '-'}</div>
                        <div className="info-item"><strong>سن بارداری (هفته):</strong> {child.gestationalAge || '-'}</div>
                        <div className="info-item"><strong>محل تولد:</strong> {child.birthPlace || '-'}</div>
                        <div className="info-item"><strong>آپگار دقیقه ۱:</strong> {child.apgar1 || '-'}</div>
                        <div className="info-item"><strong>آپگار دقیقه ۵:</strong> {child.apgar5 || '-'}</div>
                    </div>
                </section>

                <section className="vaccine-table-section">
                    <h2>جدول واکسیناسیون</h2>
                    <div className="vaccine-table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>نام واکسن</th>
                                    <th>نوبت</th>
                                    <th>سن موعود</th>
                                    <th>تاریخ موعود</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flatVaccines.map((vaccine, index) => {
                                    const birth = moment(String(child.birthDate).replace(/\//g, '-'));
                                    const dueDate = birth.clone().add(vaccine.age, 'months');
                                    const today = moment();
                                    const recordValue = vaccinationRecords[vaccine.age] && vaccinationRecords[vaccine.age][vaccine.name];
                                    const isDone = !!recordValue;
                                    let status = 'آینده';
                                    let statusIcon = faTimesCircle;

                                    if (isDone) {
                                        const doneDate = typeof recordValue === 'string' ? toShamsi(recordValue) : '';
                                        status = doneDate ? `تزریق شده در ${doneDate}` : 'تزریق شده';
                                        statusIcon = faCheckCircle;
                                    } else if (dueDate.isBefore(today)) {
                                        status = 'دیر شده';
                                        statusIcon = faExclamationTriangle;
                                    }

                                    const diffDays = dueDate.diff(today, 'days');
                                    if (!isDone && diffDays > 0 && diffDays <= 30) {
                                        status = 'نزدیک';
                                        statusIcon = faExclamationTriangle;
                                    }

                                    return (
                                        <tr key={`${vaccine.age}-${vaccine.name}-${index}`} className={isDone ? 'done-row' : ''}>
                                            <td>
                                                {vaccine.name}
                                                <FontAwesomeIcon
                                                    icon={faInfoCircle}
                                                    className="info-icon"
                                                    onClick={() => {
                                                        setSelectedVaccine(vaccine);
                                                        setDetailsModalIsOpen(true);
                                                    }}
                                                />
                                            </td>
                                            <td>{vaccine.details}</td>
                                            <td>{vaccine.label}</td>
                                            <td>{dueDate.locale('fa').format('YYYY/MM/DD')}</td>
                                            <td className={`status-${statusIcon.iconName}`}>
                                                <FontAwesomeIcon icon={statusIcon} />
                                                <span>{status}</span>
                                            </td>
                                            <td>
                                                {!isDone && (
                                                    <button onClick={() => handleMarkAsDone(vaccine.age, vaccine.name)} className="btn-mark-done">
                                                        ثبت تزریق
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="table-actions">
                        <button onClick={handleSaveChanges} className="btn-save-changes">ذخیره تغییرات وضعیت واکسن‌ها</button>
                    </div>
                </section>

                <section className="reminder-section">
                    <h2>تنظیمات یادآور</h2>
                    <div className="reminder-controls">
                        <div className="reminder-toggle">
                            <label htmlFor="reminder-switch">فعال‌سازی یادآور</label>
                            <label className="switch">
                                <input type="checkbox" id="reminder-switch" checked={reminder.active} onChange={e => setReminder({...reminder, active: e.target.checked})} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        {reminder.active && (
                            <div className="reminder-days">
                                <label htmlFor="days-before">تعداد روز قبل از موعد:</label>
                                <input
                                    type="number"
                                    id="days-before"
                                    value={reminder.daysBefore}
                                    onChange={e => setReminder({...reminder, daysBefore: parseInt(e.target.value) || 1})}
                                    min="1"
                                    max="30"
                                />
                            </div>
                        )}
                    </div>
                     <button onClick={handleSaveReminder} className="btn-save-reminder">ذخیره تنظیمات یادآور</button>
                </section>
            </div>

            <Modal
                isOpen={detailsModalIsOpen}
                onRequestClose={() => setDetailsModalIsOpen(false)}
                contentLabel="Vaccine Details Modal"
                className="details-modal"
                overlayClassName="modal-overlay"
            >
                {selectedVaccine && (
                    <>
                        <h2>{selectedVaccine.name}</h2>
                        <div className="details-content">
                            <p><strong>موارد مصرف:</strong> {vaccineDetails[selectedVaccine.name]?.usage || 'اطلاعاتی ثبت نشده است.'}</p>
                            <p><strong>علائم احتمالی پس از تزریق:</strong> {vaccineDetails[selectedVaccine.name]?.symptoms || 'اطلاعاتی ثبت نشده است.'}</p>
                            <p><strong>مراقبت‌های پس از واکسن:</strong> {vaccineDetails[selectedVaccine.name]?.care || 'اطلاعاتی ثبت نشده است.'}</p>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setDetailsModalIsOpen(false)}>بستن</button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default VaccinationPage;
