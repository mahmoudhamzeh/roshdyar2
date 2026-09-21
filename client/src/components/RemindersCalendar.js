import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { reminderDayKey } from '../utils/reminders';
import { formatToShamsi } from '../utils/dateConverter';
import './RemindersCalendar.css';

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const startOfMonth = (year, month) => moment(`${year}/${month}/1`, 'jYYYY/jM/jD');

const RemindersCalendar = ({
    reminders = [],
    compact = false,
    selectedKey,
    onSelectDay,
    showLink = false,
}) => {
    const today = moment();
    const [cursor, setCursor] = useState({
        year: today.jYear(),
        month: today.jMonth() + 1,
    });

    const daysInMonth = moment.jDaysInMonth(cursor.year, cursor.month - 1);
    const leadingBlanks = (startOfMonth(cursor.year, cursor.month).day() + 1) % 7;
    const monthLabel = startOfMonth(cursor.year, cursor.month).locale('fa').format('jMMMM jYYYY');
    const todayKey = today.format('YYYY-MM-DD');

    const byDay = useMemo(() => {
        const map = {};
        reminders.forEach((reminder) => {
            const key = reminderDayKey(reminder);
            if (!key) return;
            if (!map[key]) map[key] = [];
            map[key].push(reminder);
        });
        return map;
    }, [reminders]);

    const cells = [];
    for (let i = 0; i < leadingBlanks; i += 1) {
        cells.push({ key: `blank-${i}`, blank: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const m = moment(`${cursor.year}/${cursor.month}/${day}`, 'jYYYY/jM/jD');
        const key = m.format('YYYY-MM-DD');
        cells.push({
            key,
            day,
            gregorianKey: key,
            count: (byDay[key] || []).length,
            isToday: key === todayKey,
        });
    }

    const shiftMonth = (delta) => {
        const next = startOfMonth(cursor.year, cursor.month).add(delta, 'jMonth');
        setCursor({ year: next.jYear(), month: next.jMonth() + 1 });
    };

    const selectedReminders = selectedKey ? (byDay[selectedKey] || []) : [];

    return (
        <div className={`reminders-cal${compact ? ' is-compact' : ''}`}>
            <div className="reminders-cal-head">
                <button type="button" aria-label="ماه بعد" onClick={() => shiftMonth(1)}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
                <strong>{monthLabel}</strong>
                <button type="button" aria-label="ماه قبل" onClick={() => shiftMonth(-1)}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
            </div>
            <div className="reminders-cal-week">
                {WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                ))}
            </div>
            <div className="reminders-cal-grid">
                {cells.map((cell) => (
                    cell.blank ? (
                        <span key={cell.key} className="reminders-cal-blank" />
                    ) : (
                        <button
                            type="button"
                            key={cell.key}
                            className={[
                                'reminders-cal-day',
                                cell.isToday ? 'is-today' : '',
                                cell.count ? 'has-items' : '',
                                selectedKey === cell.gregorianKey ? 'is-on' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => onSelectDay && onSelectDay(cell.gregorianKey, byDay[cell.gregorianKey] || [])}
                        >
                            <em>{cell.day}</em>
                            {cell.count > 0 && <i>{cell.count > 3 ? '•••' : '•'.repeat(cell.count)}</i>}
                        </button>
                    )
                ))}
            </div>
            {showLink && (
                <Link className="reminders-cal-link" to="/reminders">مشاهده تقویم کامل یادآوری‌ها</Link>
            )}
            {selectedKey && (
                <div className="reminders-cal-daylist">
                    <h4>یادآوری‌های {formatToShamsi(selectedKey)}</h4>
                    {selectedReminders.length === 0 ? (
                        <p>برای این روز یادآوری ثبت نشده است.</p>
                    ) : (
                        <ul>
                            {selectedReminders.map((item) => (
                                <li key={item.id}>
                                    <strong>{item.title}</strong>
                                    {item.childName ? <span>{item.childName}</span> : null}
                                    {item.description || item.message ? (
                                        <small>{item.description || item.message}</small>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default RemindersCalendar;
