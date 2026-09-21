import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import MainNavbar from './MainNavbar';
import RemindersCalendar from './RemindersCalendar';
import AddReminderModal from './AddReminderModal';
import { fetchAllReminders } from '../utils/reminders';
import './RemindersPage.css';

const RemindersPage = () => {
    const history = useHistory();
    const [reminders, setReminders] = useState([]);
    const [activeChildId, setActiveChildId] = useState(null);
    const [selectedKey, setSelectedKey] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const data = await fetchAllReminders({ includeSeen: true });
            setReminders(data.reminders);
            setActiveChildId(data.activeChildId);
            setError('');
        } catch (err) {
            setError(err.message || 'خطا در دریافت یادآوری‌ها');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="reminders-page">
            <MainNavbar />
            <nav className="page-nav-final">
                <button type="button" className="back-btn" onClick={() => history.push('/dashboard')}>
                    &rarr; <span>خانه</span>
                </button>
                <h1>تقویم یادآوری‌ها</h1>
                <div className="nav-placeholder" />
            </nav>
            <section className="reminders-page-card">
                <header className="reminders-page-head">
                    <p>روزهایی که نقطه دارند یادآوری ثبت‌شده دارند. روی روز بزنید تا جزئیات را ببینید.</p>
                    <button
                        type="button"
                        className="reminders-page-add"
                        onClick={() => {
                            if (!activeChildId) {
                                alert('ابتدا یک کودک اضافه کنید تا بتوانید یادآور بسازید.');
                                return;
                            }
                            setIsModalOpen(true);
                        }}
                    >
                        <FontAwesomeIcon icon={faPlusCircle} /> ثبت یادآوری
                    </button>
                </header>
                {error && <p className="reminders-page-error">{error}</p>}
                <RemindersCalendar
                    reminders={reminders}
                    selectedKey={selectedKey}
                    onSelectDay={(key) => setSelectedKey(key)}
                />
            </section>
            {activeChildId && (
                <AddReminderModal
                    isOpen={isModalOpen}
                    onRequestClose={() => setIsModalOpen(false)}
                    childId={activeChildId}
                    onReminderAdded={load}
                />
            )}
        </div>
    );
};

export default RemindersPage;
