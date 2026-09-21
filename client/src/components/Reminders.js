import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faTimes, faPlusCircle, faCalendarAlt, faListUl } from '@fortawesome/free-solid-svg-icons';
import AddReminderModal from './AddReminderModal';
import RemindersCalendar from './RemindersCalendar';
import { fetchAllReminders } from '../utils/reminders';
import { formatToShamsi } from '../utils/dateConverter';
import './Reminders.css';

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [calendarReminders, setCalendarReminders] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeChildId, setActiveChildId] = useState(null);
    const [panelStyle, setPanelStyle] = useState(null);
    const [panelView, setPanelView] = useState('list');
    const [selectedCalKey, setSelectedCalKey] = useState('');
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth <= 768 : true
    );
    const bellRef = useRef(null);
    const panelRef = useRef(null);
    const location = useLocation();

    const updateLayout = useCallback(() => {
        const mobile = window.innerWidth <= 768;
        setIsMobile(mobile);
        if (!isOpen || !bellRef.current) return;

        const nav = document.querySelector('.navbar');
        const topOffset = nav ? Math.round(nav.getBoundingClientRect().bottom + 8) : 72;

        if (mobile) {
            setPanelStyle({
                position: 'fixed',
                left: '0.75rem',
                right: '0.75rem',
                top: `${topOffset}px`,
                bottom: 'auto',
                width: 'auto',
                maxWidth: 'none'
            });
            return;
        }

        const bellRect = bellRef.current.getBoundingClientRect();
        const panelWidth = Math.min(360, window.innerWidth - 16);
        let left = bellRect.left + bellRect.width / 2 - panelWidth / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

        setPanelStyle({
            position: 'fixed',
            top: `${Math.max(bellRect.bottom + 10, topOffset)}px`,
            left: `${left}px`,
            right: 'auto',
            bottom: 'auto',
            width: `${panelWidth}px`,
            maxWidth: `${panelWidth}px`
        });
    }, [isOpen]);

    useEffect(() => {
        updateLayout();
        window.addEventListener('resize', updateLayout);
        window.addEventListener('scroll', updateLayout, true);
        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('scroll', updateLayout, true);
        };
    }, [updateLayout]);

    const loadReminders = useCallback(async () => {
        try {
            const [badge, all] = await Promise.all([
                fetchAllReminders({ includeSeen: false }),
                fetchAllReminders({ includeSeen: true }),
            ]);
            setReminders(badge.reminders);
            setCalendarReminders(all.reminders);
            setActiveChildId(all.activeChildId);
        } catch (error) {
            console.error('Failed to fetch reminders', error);
            setReminders([]);
            setCalendarReminders([]);
        }
    }, []);

    useEffect(() => {
        loadReminders();
    }, [location.pathname, loadReminders]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handlePointer = (event) => {
            const t = event.target;
            if (bellRef.current && bellRef.current.contains(t)) return;
            if (panelRef.current && panelRef.current.contains(t)) return;
            setIsOpen(false);
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', handlePointer);
            document.addEventListener('touchstart', handlePointer);
        }, 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('touchstart', handlePointer);
        };
    }, [isOpen]);

    const addSeenReminder = (reminderId) => {
        try {
            const seen = JSON.parse(localStorage.getItem('seenReminders') || '[]');
            if (!seen.includes(reminderId)) {
                localStorage.setItem('seenReminders', JSON.stringify([...seen, reminderId]));
            }
        } catch {
            localStorage.setItem('seenReminders', JSON.stringify([reminderId]));
        }
    };

    const handleDismiss = async (reminder) => {
        if (reminder.source === 'manual' && reminder.childId) {
            try {
                const response = await fetch(
                    `/api/reminders/manual/${reminder.childId}/${reminder.id}`,
                    { method: 'DELETE' }
                );
                if (!response.ok) {
                    alert('خطا در حذف یادآور از سرور.');
                    return;
                }
            } catch (error) {
                alert('خطا در ارتباط با سرور برای حذف یادآور.');
                return;
            }
        }

        if (reminder.source === 'user') {
            try {
                const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
                await fetch(`/api/user-reminders/${reminder.id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': loggedInUser.id }
                });
            } catch (error) {
                console.error(error);
            }
        }

        addSeenReminder(reminder.id);
        setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
        setCalendarReminders((prev) => prev.filter((r) => r.id !== reminder.id));
    };

    const openAddModal = () => {
        if (!activeChildId) {
            alert('ابتدا یک کودک اضافه کنید تا بتوانید یادآور بسازید.');
            return;
        }
        setIsModalOpen(true);
    };

    const panel = isOpen
        ? createPortal(
            <>
                <div className="reminders-backdrop" onClick={() => setIsOpen(false)} />
                <div
                    className={`reminders-dropdown is-top${isMobile ? ' is-mobile' : ''}`}
                    ref={panelRef}
                    style={panelStyle || undefined}
                >
                    <div className="reminders-header">
                        <h4>یادآورها</h4>
                        <div className="reminders-header-actions">
                            <button
                                type="button"
                                className={`add-reminder-btn${panelView === 'calendar' ? ' is-on' : ''}`}
                                title="تقویم یادآوری‌ها"
                                onClick={() => setPanelView((view) => (view === 'calendar' ? 'list' : 'calendar'))}
                            >
                                <FontAwesomeIcon icon={panelView === 'calendar' ? faListUl : faCalendarAlt} />
                            </button>
                            <button type="button" className="add-reminder-btn" title="ثبت یادآوری" onClick={openAddModal}>
                                <FontAwesomeIcon icon={faPlusCircle} />
                            </button>
                            <button type="button" className="reminders-close-btn" aria-label="بستن" onClick={() => setIsOpen(false)}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>
                    {panelView === 'calendar' ? (
                        <RemindersCalendar
                            reminders={calendarReminders}
                            compact
                            showLink
                            selectedKey={selectedCalKey}
                            onSelectDay={(key) => setSelectedCalKey(key)}
                        />
                    ) : reminders.length === 0 ? (
                        <p className="no-reminders">
                            یادآوری فعالی ندارید.
                            {activeChildId ? ' با دکمه + می‌توانید یادآور جدید بسازید.' : ' ابتدا از بخش فرزندان، یک کودک اضافه کنید.'}
                        </p>
                    ) : (
                        <ul className="reminders-list">
                            {reminders.map((r) => {
                                const body = (
                                    <li className={`reminder-item type-${r.type || 'info'}`}>
                                        <div className="reminder-content">
                                            <strong>{r.title}</strong>
                                            {r.childName ? <p className="reminder-child">{r.childName}</p> : null}
                                            {r.description || r.message ? <p>{r.description || r.message}</p> : null}
                                            {r.source === 'manual' && r.date && <p>تاریخ: {formatToShamsi(r.date)}</p>}
                                            {r.alarmAt && (
                                                <p>
                                                    آلارم: {formatToShamsi(r.alarmAt)}{' '}
                                                    {new Date(r.alarmAt).toLocaleTimeString('fa-IR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="dismiss-btn"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDismiss(r);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </li>
                                );

                                if (r.link) {
                                    return (
                                        <Link to={r.link} key={r.id} className="reminder-link" onClick={() => setIsOpen(false)}>
                                            {body}
                                        </Link>
                                    );
                                }
                                return <React.Fragment key={r.id}>{body}</React.Fragment>;
                            })}
                        </ul>
                    )}
                    {panelView === 'list' && (
                        <Link className="reminders-cal-link" to="/reminders" onClick={() => setIsOpen(false)}>
                            تقویم یادآوری‌ها
                        </Link>
                    )}
                </div>
            </>,
            document.body
        )
        : null;

    return (
        <div className="reminders-widget">
            <button
                type="button"
                className="reminders-bell"
                onClick={() => setIsOpen((open) => !open)}
                ref={bellRef}
                aria-label="یادآورها"
                aria-expanded={isOpen}
            >
                <FontAwesomeIcon icon={faBell} />
                {reminders.length > 0 && <span className="reminder-count">{reminders.length}</span>}
            </button>
            {panel}
            {activeChildId && (
                <AddReminderModal
                    isOpen={isModalOpen}
                    onRequestClose={() => setIsModalOpen(false)}
                    childId={activeChildId}
                    onReminderAdded={loadReminders}
                />
            )}
        </div>
    );
};

export default Reminders;
