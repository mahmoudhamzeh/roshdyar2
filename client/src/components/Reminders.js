import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const widgetRef = useRef(null);
    const bellRef = useRef(null);
    const dropdownMenuRef = useRef(null);
    const location = useLocation();

    // This effect handles the dynamic positioning of the dropdown on desktop
    useEffect(() => {
        if (isOpen && bellRef.current && dropdownMenuRef.current) {
            // We only apply JS positioning for screens wider than 1024px
            if (window.innerWidth > 1024) {
                const bellRect = bellRef.current.getBoundingClientRect();
                const menuNode = dropdownMenuRef.current;

                // Position dropdown vertically below the bell icon
                menuNode.style.top = `${bellRect.bottom + 10}px`;

                // Position dropdown horizontally. Align its right edge with the bell's right edge.
                const menuWidth = 350; // As defined in CSS
                menuNode.style.left = `${bellRect.right - menuWidth}px`;

                // Ensure it doesn't go off the left side of the screen
                if ((bellRect.right - menuWidth) < 10) {
                    menuNode.style.left = '10px';
                }

                // We need to use fixed position to escape the navbar's overflow context
                menuNode.style.position = 'fixed';
            } else {
                // On mobile, reset styles to let CSS handle the centered modal
                const menuNode = dropdownMenuRef.current;
                menuNode.style.position = '';
                menuNode.style.top = '';
                menuNode.style.left = '';
            }
        }
    }, [isOpen]);

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

            const freshReminders = collected.filter((r) => {
                if (r.source === 'auto' && r.type === 'danger') return true;
                return !seen.includes(r.id);
            });

            setReminders(freshReminders);
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
        const handleClickOutside = (event) => {
            if (widgetRef.current && !widgetRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        const timer = window.setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }, 0);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    const getSeenReminders = () => {
        try {
            return JSON.parse(localStorage.getItem('seenReminders') || '[]');
        } catch {
            return [];
        }
    };

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

    const handleReminderAdded = () => {
        fetchReminders();
    };

    const openAddModal = () => {
        if (!activeChildId) {
            alert('ابتدا یک کودک اضافه کنید تا بتوانید یادآور بسازید.');
            return;
        }
        setIsModalOpen(true);
    };

    return (
        <div className="reminders-widget" ref={widgetRef}>
            <button
                type="button"
                className="reminders-bell"
                onClick={() => setIsOpen(!isOpen)}
                ref={bellRef}
                aria-label="یادآورها"
                aria-expanded={isOpen}
            >
                <FontAwesomeIcon icon={faBell} />
                {reminders.length > 0 && <span className="reminder-count">{reminders.length}</span>}
            </button>
            {isOpen && (
                <>
                    <div className="reminders-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="reminders-dropdown" ref={dropdownMenuRef}>
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
                                {reminders.map(r => {
                                    const reminderContent = (
                                        <li key={r.id} className={`reminder-item type-${r.type || 'info'}`}>
                                            <div className="reminder-content">
                                                <strong>{r.title}</strong>
                                                {r.childName ? <p className="reminder-child">{r.childName}</p> : null}
                                                {r.description || r.message ? (
                                                    <p>{r.description || r.message}</p>
                                                ) : null}
                                                {r.source === 'manual' && r.date && (
                                                    <p>تاریخ: {formatToShamsi(r.date)}</p>
                                                )}
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
                                            {(r.source === 'manual' || r.source === 'user' || r.source === 'auto') && (
                                                <button type="button" className="dismiss-btn" onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDismiss(r);
                                                }}>
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </button>
                                            )}
                                        </li>
                                    );

                                    if (r.link) {
                                        return (
                                            <Link to={r.link} key={r.id} className="reminder-link" onClick={() => setIsOpen(false)}>
                                                {reminderContent}
                                            </Link>
                                        );
                                    }
                                    return <React.Fragment key={r.id}>{reminderContent}</React.Fragment>;
                                })}
                            </ul>
                        )}
                    </div>
                </>
            )}
            {activeChildId && (
                <AddReminderModal
                    isOpen={isModalOpen}
                    onRequestClose={() => setIsModalOpen(false)}
                    childId={activeChildId}
                    onReminderAdded={handleReminderAdded}
                />
            )}
        </div>
    );
};

export default Reminders;
