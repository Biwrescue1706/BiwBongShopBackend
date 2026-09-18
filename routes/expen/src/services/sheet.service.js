const sheets = require("../config/google");

const spreadsheetId = process.env.SHEET_ID;

// อ่านข้อมูลทั้งหมด
async function getRows(sheetName) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    return response.data.values || [];
}

// เพิ่มข้อมูล
async function appendRow(sheetName, row) {
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetName,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] }
    });
}

// หา ID ล่าสุด
async function nextId(sheetName) {
    const rows = await getRows(sheetName);
    if (rows.length <= 1) return 1;

    const numbers = rows.slice(1)
        .map(row => Number(row[0]))
        .filter(num => !isNaN(num));

    return numbers.length ? Math.max(...numbers) + 1 : 1;
}

// ค้นหาจาก ID
async function findById(sheetName, id) {
    const rows = await getRows(sheetName);
    if (rows.length <= 1) return null;

    const row = rows.slice(1).find(row => row[0] == id);
    if (!row) return null;

    const headers = rows[0];
    const result = {};

    headers.forEach((header, index) => {
        result[header] = row[index] ?? "";
    });

    return result;
}

// ค้นหา 1 รายการ
async function findOne(sheetName, key, value) {
    const rows = await getRows(sheetName);
    if (rows.length <= 1) return null;

    const headers = rows[0];
    const keyIndex = headers.indexOf(key);
    if (keyIndex === -1) return null;

    const row = rows.slice(1).find(row =>
        String(row[keyIndex] ?? "").trim().toLowerCase() ===
        String(value ?? "").trim().toLowerCase()
    );

    if (!row) return null;

    const result = {};
    headers.forEach((header, index) => {
        result[header] = row[index] ?? "";
    });

    return result;
}

// อัปเดตข้อมูล
async function updateRow(sheetName, id, data) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const values = response.data.values;

    if (!values?.length) return false;

    const headers = values[0];
    const index = values.findIndex((row, i) => i > 0 && String(row[0]) === String(id));
    if (index === -1) return false;

    const oldRow = values[index];
    const row = headers.map((header, i) => {
        const key = header.toLowerCase();
        const dataKey = Object.keys(data).find(k => k.toLowerCase() === key);
        return dataKey !== undefined ? data[dataKey] : oldRow[i] ?? "";
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${index + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] }
    });

    return true;
}

// ลบข้อมูล
async function deleteRow(sheetName, id) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const values = response.data.values;

    if (!values || values.length <= 1) return false;

    const headers = values[0];
    const rows = values.slice(1);
    const exists = rows.some(row => String(row[0]) === String(id));

    if (!exists) return false;

    const newRows = rows.filter(row => String(row[0]) !== String(id));

    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: sheetName
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: sheetName,
        valueInputOption: "RAW",
        requestBody: { values: [headers, ...newRows] }
    });

    return true;
}

// Export
module.exports = {
    getRows,
    appendRow,
    nextId,
    findById,
    findOne,
    updateRow,
    deleteRow
};