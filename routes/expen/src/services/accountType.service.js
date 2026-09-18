const crypto = require("crypto");
const sheet = require("./sheet.service");

// GET ALL
exports.getAll = async (userId) => {
    const rows = await sheet.getRows("AccountTypes");

    return rows
        .slice(1)
        .filter(row =>
            String(row[1]) === String(userId)
        )
        .map(row => ({
            id: row[0],
            userId: row[1],
            name: row[2] || "",
            createdAt: row[3] || "",
            updatedAt: row[4] || ""
        }));
};

// CREATE
exports.create = async (userId, data) => {
    const { name } = data;

    if (!name || !String(name).trim()) {
        throw new Error("กรุณากรอกชื่อประเภทบัญชี");
    }

    const accountTypeName = String(name).trim();

    const rows = await sheet.getRows("AccountTypes");
    const accountTypes = rows.slice(1);

    const duplicate = accountTypes.find(row =>
        String(row[1] || "").trim().toLowerCase() ===
        accountTypeName.toLowerCase()
    );

    if (duplicate) {
        throw new Error("มีประเภทบัญชีนี้อยู่แล้ว");
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await sheet.appendRow("AccountTypes", [
        id,
        userId,
        accountTypeName,
        now
    ]);

    return {
        success: true,
        message: "เพิ่มประเภทบัญชีสำเร็จ",
        data: {
            id,
            userId,
            name: accountTypeName,
            createdAt: now
        }
    };
};

// UPDATE
exports.update = async (userId, id, data) => {
    const rows = await sheet.getRows("AccountTypes");
    const accountTypes = rows.slice(1);

    const index = accountTypes.findIndex(row =>
        String(row[0]) === String(id) &&
        String(row[1]) === String(userId)
    );

    if (index === -1) {
        throw new Error("ไม่พบประเภทบัญชี");
    }

    const oldRow = accountTypes[index];

    const name = data.name !== undefined
        ? String(data.name).trim()
        : oldRow[1];

    if (!name) {
        throw new Error("กรุณากรอกชื่อประเภทบัญชี");
    }

    const duplicate = accountTypes.find(row =>
        String(row[0]) !== String(id) &&
        String(row[1] || "").trim().toLowerCase() ===
        name.toLowerCase()
    );

    if (duplicate) {
        throw new Error("มีประเภทบัญชีนี้อยู่แล้ว");
    }

    const updatedAt = new Date().toISOString();

    await sheet.updateRow("AccountTypes", id, {
        id: oldRow[0],
        userId: oldRow[1],
        name,
        createdAt: oldRow[2],
        updatedAt: updatedAt
    });

    return {
        success: true,
        message: "แก้ไขประเภทบัญชีสำเร็จ"
    };
};

// DELETE
exports.remove = async (userId,id) => {
    const rows = await sheet.getRows("AccountTypes");

    if (!rows || rows.length <= 1) {
        throw new Error("ไม่พบข้อมูลประเภทบัญชี");
    }

    const accountType = rows.slice(1).find(row =>
        String(row[0] || "").trim() === String(id || "").trim()
    );

    if (!accountType) {
        throw new Error("ไม่พบประเภทบัญชี");
    }

    const ok = await sheet.deleteRow("AccountTypes", id);

    if (!ok) {
        throw new Error("ลบประเภทบัญชีไม่สำเร็จ");
    }

    return {
        success: true,
        message: "ลบประเภทบัญชีสำเร็จ"
    };
};