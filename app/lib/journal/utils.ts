
export const groupEntriesByDate = (entries: any[]) => {
    const grouped: Record<string, any[]> = {};

    entries.forEach(entry => {
        const date = new Date(entry.created_at);
        // Use local date string for grouping to avoid timezone issues splitting days weirdly
        const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format

        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(entry);
    });

    return grouped;
};

export const formatHeaderDate = (dateString: string) => {
    const date = new Date(dateString); // dateString is YYYY-MM-DD, treating as local
    // Adjust because new Date('YYYY-MM-DD') is UTC, but we want local day interpretation if it came from local grouping.
    // Actually, 'en-CA' gives YYYY-MM-DD. 
    // Let's just use standard formatting.

    // To ensure we parse YYYY-MM-DD correctly as local time for display:
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);

    return localDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
