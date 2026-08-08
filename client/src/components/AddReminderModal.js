import React, { useState } from 'react';
import Modal from 'react-modal';
import DatePicker from 'react-modern-calendar-datepicker';
import 'react-modern-calendar-datepicker/lib/DatePicker.css';
import { fromShamsi, getCurrentShamsiDate } from '../utils/dateConverter';
import './AddReminderModal.css';

const AddReminderModal = ({ isOpen, onRequestClose, childId, onReminderAdded }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(getCurrentShamsiDate());
    const [alarmTime, setAlarmTime] = useState('09:00');
    const [error, setError] = useState('');

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDate(getCurrentShamsiDate());
        setAlarmTime('09:00');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onRequestClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !date) {
            setError('لطفاً عنوان و تاریخ را مشخص کنید.');
            return;
        }
        setError('');

        try {
            const gregorianDate = fromShamsi(date);
            const normalizedDate = String(gregorianDate).replace(/\//g, '-');
            const alarmAt = alarmTime
                ? new Date(`${normalizedDate}T${alarmTime}:00`).toISOString()
                : null;

            const res = await fetch(`/api/reminders/manual/${childId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    date: gregorianDate,
                    description,
                    alarmAt
                }),
            });

            if (res.ok) {
                onReminderAdded();
                handleClose();
            } else {
                setError('خطا در ثبت یادآور. لطفاً دوباره تلاش کنید.');
            }
        } catch (err) {
            setError('خطای ارتباط با سرور.');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={handleClose}
            className="add-reminder-modal"
            overlayClassName="modal-overlay"
        >
            <h2>افزودن یادآور جدید</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="reminder-title">عنوان</label>
                    <input
                        id="reminder-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثلاً: مراجعه به دندانپزشک"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reminder-description">توضیحات</label>
                    <textarea
                        id="reminder-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="توضیحات یادآوری را بنویسید..."
                        rows="3"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reminder-date">تاریخ</label>
                    <DatePicker
                        value={date}
                        onChange={setDate}
                        shouldHighlightWeekends
                        locale="fa"
                        calendarClassName="responsive-calendar"
                        renderInput={({ ref }) => (
                            <input
                                readOnly
                                ref={ref}
                                value={date ? `${date.year}/${date.month}/${date.day}` : ''}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="reminder-alarm-time">ساعت آلارم</label>
                    <input
                        id="reminder-alarm-time"
                        type="time"
                        value={alarmTime}
                        onChange={(e) => setAlarmTime(e.target.value)}
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <div className="modal-actions">
                    <button type="submit" className="btn-submit">ثبت یادآور</button>
                    <button type="button" className="btn-cancel" onClick={handleClose}>انصراف</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddReminderModal;
