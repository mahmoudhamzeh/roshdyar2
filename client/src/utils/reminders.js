import moment from 'jalali-moment';

const getSeenReminders = () => {
    try {
        return JSON.parse(localStorage.getItem('seenReminders') || '[]');
    } catch {
        return [];
    }
};

export const reminderMoment = (reminder) => {
    const raw = reminder?.alarmAt || reminder?.date || reminder?.createdAt;
    if (!raw) return null;
    const parsed = moment(raw);
    return parsed.isValid() ? parsed : null;
};

export const reminderDayKey = (reminder) => {
    const parsed = reminderMoment(reminder);
    return parsed ? parsed.format('YYYY-MM-DD') : '';
};

export const fetchAllReminders = async ({ includeSeen = true } = {}) => {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
    if (!loggedInUser || !loggedInUser.id) {
        return { reminders: [], children: [], activeChildId: null };
    }

    const seen = getSeenReminders();
    const collected = [];
    let childrenData = [];

    const childrenRes = await fetch('/api/children', {
        headers: { 'x-user-id': loggedInUser.id }
    });
    if (childrenRes.ok) {
        childrenData = await childrenRes.json();
    }

    if (childrenData.length > 0) {
        const childReminderLists = await Promise.all(
            childrenData.map(async (child) => {
                try {
                    const res = await fetch(`/api/reminders/all/${child.id}`);
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
    }

    try {
        const userRes = await fetch('/api/user-reminders', {
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

    const reminders = includeSeen
        ? collected
        : collected.filter((r) => {
            if (r.source === 'auto' && r.type === 'danger') return true;
            return !seen.includes(r.id);
        });

    return {
        reminders,
        children: childrenData,
        activeChildId: childrenData[0]?.id || null
    };
};
