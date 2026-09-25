const TICKET_STATUSES = ['open', 'in_review', 'waiting_user', 'closed'];

function normalizeTicketStatus(status) {
    if (status === 'answered') return 'waiting_user';
    if (TICKET_STATUSES.includes(status)) return status;
    return 'open';
}

function displayUserName(user) {
    if (!user) return 'کاربر حذف‌شده';
    const full = [user.firstName, user.lastName].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
    return full || user.username || user.mobile || `کاربر #${user.id}`;
}

function publicTicketUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        username: user.username || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        mobile: user.mobile || '',
        displayName: displayUserName(user)
    };
}

function ticketNumberOf(ticket) {
    if (!ticket) return '';
    if (ticket.ticketNumber) return String(ticket.ticketNumber);
    if (ticket.id != null) return `TK-${String(ticket.id).padStart(5, '0')}`;
    return '';
}

function normalizeReply(reply, fallback = {}) {
    if (!reply || typeof reply !== 'object') return null;
    const content = String(reply.content || reply.message || '').trim();
    const attachments = Array.isArray(reply.attachments)
        ? reply.attachments.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    if (!content && attachments.length === 0) return null;
    const authorRole = reply.authorRole === 'admin' || reply.role === 'admin' ? 'admin' : 'user';
    const userId = reply.userId != null && reply.userId !== ''
        ? Number(reply.userId)
        : (fallback.userId != null ? Number(fallback.userId) : null);
    return {
        userId: Number.isFinite(userId) ? userId : null,
        authorRole,
        authorName: String(
            reply.authorName
            || fallback.authorName
            || (authorRole === 'admin' ? 'پشتیبانی' : 'کاربر')
        ).trim(),
        content,
        attachments,
        createdAt: reply.createdAt || new Date().toISOString()
    };
}

function ticketPayload(ticket) {
    return {
        subject: ticket.subject || '',
        content: ticket.content || ticket.message || '',
        groupName: ticket.groupName || '',
        subgroup: ticket.subgroup || '',
        attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
        replies: (Array.isArray(ticket.replies) ? ticket.replies : []).map((item) => normalizeReply(item)).filter(Boolean),
        ticketNumber: ticketNumberOf(ticket)
    };
}

function presentTicket(ticket, user) {
    if (!ticket) return null;
    const payload = ticketPayload(ticket);
    const publicUser = publicTicketUser(user);
    return {
        id: ticket.id,
        userId: ticket.userId,
        status: normalizeTicketStatus(ticket.status),
        subject: payload.subject,
        content: payload.content,
        groupName: payload.groupName,
        subgroup: payload.subgroup,
        attachments: payload.attachments,
        replies: payload.replies,
        ticketNumber: payload.ticketNumber,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        user: publicUser,
        userName: publicUser ? publicUser.displayName : displayUserName(null)
    };
}

function foldStatusCounts(rows) {
    const counts = { open: 0, in_review: 0, waiting_user: 0, closed: 0, total: 0 };
    (rows || []).forEach((row) => {
        const key = normalizeTicketStatus(row.status);
        const n = Number(row.n != null ? row.n : row.count) || 0;
        if (counts[key] == null) counts[key] = 0;
        counts[key] += n;
        counts.total += n;
    });
    return counts;
}

module.exports = {
    TICKET_STATUSES,
    normalizeTicketStatus,
    displayUserName,
    publicTicketUser,
    ticketNumberOf,
    normalizeReply,
    ticketPayload,
    presentTicket,
    foldStatusCounts
};
