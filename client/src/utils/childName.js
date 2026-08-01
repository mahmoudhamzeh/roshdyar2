export const getChildDisplayName = (child) => {
    if (!child) return 'کودک';
    if (child.name) return child.name;
    const fullName = `${child.firstName || ''} ${child.lastName || ''}`.trim();
    return fullName || 'کودک';
};
