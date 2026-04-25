/**
 * Safely parses a date string into a Date object.
 * Supports standard formats and "Month DD, YYYY" (e.g., March 11, 2026).
 */
export const parseMaintenanceDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // Strip accidental literal quotes and trim
    let cleaned = dateStr.replace(/['"]/g, '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined' || cleaned.toLowerCase() === 'false') return null;

    const MONTHS = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };

    // Aggressive pattern matching for Month Name formats
    let monthNum = -1;
    let monthNameMatched = false;
    let tempStr = cleaned.toLowerCase();
    
    for (const [mName, mVal] of Object.entries(MONTHS)) {
        // Ensure we match whole words for abbreviated months (like "mar")
        const regex = new RegExp(`\\b${mName}\\b`, 'i');
        if (regex.test(tempStr)) {
            monthNum = mVal;
            monthNameMatched = true;
            tempStr = tempStr.replace(regex, ''); // Remove month to easily find numbers
            break;
        }
    }

    if (monthNameMatched) {
        // Extract day and year from remaining string
        const numbers = tempStr.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            let day = -1;
            let year = -1;
            numbers.forEach(n => {
                const val = parseInt(n, 10);
                if (val >= 2020 && val <= 2100) year = val;
                else if (val >= 1 && val <= 31 && day === -1) day = val;
            });
            if (day !== -1 && year !== -1) {
                const manualDate = new Date(year, monthNum, day);
                if (!isNaN(manualDate.getTime())) return manualDate;
            }
        }
    }

    // Try standard JS Date parsing
    const standardD = new Date(cleaned);
    if (!isNaN(standardD.getTime())) return standardD;

    // Try DD-MM-YYYY or DD/MM/YYYY
    const parts = cleaned.split(/[-/]/);
    if (parts.length === 3) {
        let day, month, year;
        if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
        }
        const fullYear = year < 100 ? 2000 + year : year;
        const manualDate2 = new Date(fullYear, month, day);
        if (!isNaN(manualDate2.getTime())) return manualDate2;
    }
    
    return null;
};

/**
 * Checks if a date is today or in the future.
 */
export const isTodayOrFuture = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return compareDate.getTime() >= today.getTime();
};
