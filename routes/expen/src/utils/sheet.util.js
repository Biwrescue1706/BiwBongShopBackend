exports.rowsToObjects = (rows) => {
    if (!rows?.length) return [];

    const headers = rows[0];

    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] ?? "";
        });
        return obj;
    });
};