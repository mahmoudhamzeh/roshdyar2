import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faTimes, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import AddReminderModal from './AddReminderModal';
import { formatToShamsi } from '../utils/dateConverter';
import './Reminders.css';

const Reminders = () => {
    const [reminders, setReminders] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeChildId, setActiveChildId] = useState(null);
    const [panelStyle, setPanelStyle] = useState(null);
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth <= 768 : true
    );
    const bellRef = useRef(null);
    const panelRef = useRef(null);
    const location = useLocation();

    const getSeenReminders = () => {
        try {
            return JSON.parse(localStorage.getItem('seenReminders') || '[]');
        } catch {
            return [];
        }
    };

    const updateLayout = useCallback(() => {
        const mobile = window.innerWidth <= 768;
        setIsMobile(mobile);
        if (!isOpen || !bellRef.current) return;

        if (mobile) {
            setPanelStyle({
                position: 'fixed',
                left: '0.75rem',
                right: '0.75rem',
                bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
                top: 'auto',
                width: 'auto',
                maxWidth: 'none'
            });
            return;
        }

        const bellRect = bellRef.current.getBoundingClientRect();
        const panelWidth = Math.min(350, window.innerWidth - 16);
        let left = bellRect.left + bellRect.width / 2 - panelWidth / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

        setPanelStyle({
            position: 'fixed',
            top: `${bellRect.bottom + 10}px`,
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

    const fetchReminders = useCallback(async () => {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
            if (!loggedInUser || !loggedInUser.id) {
                setReminders([]);
                setActiveChildId(null);
                return;
            }

            const seen = getSeenReminders();
            const collected = [];

            const childrenRes = await fetch('http://localhost:5000/api/children', {
                headers: { 'x-user-id': loggedInUser.id }
            });
            let childrenData = [];
            if (childrenRes.ok) {
                childrenData = await childrenRes.json();
            }

            if (childrenData.length > 0) {
                setActiveChildId(childrenData[0].id);
                const childReminderLists = await Promise.all(
                    childrenData.map(async (child) => {
                        try {
                            const res = await fetch(`http://localhost:5000/api/reminders/all/${child.id}`);
                            if (!res.ok) return [];
                            const data = await res.json();
                            return (data || []).map((r) => ({
                                ...r,
                                childId: child.id,
                                childName: child.name || `${child.firstName || ''} ${child.lastName || ''}`.trim()
                            }));
                        } catch {
                            return [];
                        }
                    })
                );
                childReminderLists.flat().forEach((r) => collected.push(r));
            } else {
                setActiveChildId(null);
            }

            try {
                const userRes = await fetch('http://localhost:5000/api/user-reminders', {
                    headers: { 'x-user-id': loggedInUser.id }
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    (userData || []).forEach((r) => {
                        collected.push({
                            ...r,
                            type: r.type || 'custom',
                            source: 'user',
                            message: r.description || r.message
                        });
                    });
                }
            } catch (error) {
                console.error('Failed to fetch user reminders', error);
            }

            setReminders(
                collected.filter((r) => {
                    if (r.source === 'auto' && r.type === 'danger') return true;
                    return !seen.includes(r.id);
                })
            );
        } catch (error) {
            console.error('Failed to fetch reminders', error);
            setReminders([]);
        }
    }, []);

    useEffect(() => {
        fetchReminders();
    }, [location.pathname, fetchReminders]);

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
        const seen = getSeenReminders();
        if (!seen.includes(reminderId)) {
            localStorage.setItem('seenReminders', JSON.stringify([...seen, reminderId]));
        }
    };

    const handleDismiss = async (reminder) => {
        if (reminder.source === 'manual' && reminder.childId) {
            try {
                const response = await fetch(
                    `http://localhost:5000/api/reminders/manual/${reminder.childId}/${reminder.id}`,
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
                await fetch(`http://localhost:5000/api/user-reminders/${reminder.id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': loggedInUser.id }
                });
            } catch (error) {
                console.error(error);
            }
        }

        addSeenReminder(reminder.id);
        setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
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
                    className={`reminders-dropdown${isMobile ? ' is-mobile' : ''}`}
                    ref={panelRef}
                    style={panelStyle || undefined}
                >
                    <div className="reminders-header">
                        <h4>یادآورها</h4>
                        <div className="reminders-header-actions">
                            <button type="button" className="add-reminder-btn" title="افزودن یادآور جدید" onClick={openAddModal}>
                                <FontAwesomeIcon icon={faPlusCircle} />
                            </button>
                            <button type="button" className="reminders-close-btn" aria-label="بستن" onClick={() => setIsOpen(false)}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>
                    {reminders.length === 0 ? (
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
                    onReminderAdded={fetchReminders}
                />
            )}
        </div>
    );
};

export default Reminders;
