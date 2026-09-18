const crypto = require("crypto");
const sheet = require("./sheet.service");

exports.getAll = async (userId) => {
    const rows = await sheet.getRows("Accounts");

    return rows
        .slice(1)
        .filter(row =>
            String(row[1]) === String(userId)
        )
        .map(row => ({
            id: row[0],
            userId: row[1],
            name: row[2] || "",
            balance: Number(row[3] || 0),
            createdAt: row[4] || "",
            updatedAt: row[5] || ""
        }));
};

// CREATE
exports.create = async (userId, data) => {
    const {
        name,
        balance
    } = data;

    if (!name || !String(name).trim()) {
        throw new Error(
            "กรุณากรอกชื่อบัญชี"
        );
    }

    const accountName =
        String(name).trim();

    const initialBalance =
        Number(balance || 0);

    if (
        isNaN(initialBalance) ||
        initialBalance < 0
    ) {
        throw new Error(
            "จำนวนเงินไม่ถูกต้อง"
        );
    }

    const rows =
        await sheet.getRows("Accounts");

    const accounts =
        rows
            .slice(1)
            .filter(row =>
                String(row[1]) ===
                String(userId)
            );

    const duplicate =
        accounts.find(row =>
            String(row[2] || "")
                .trim()
                .toLowerCase() ===
            accountName.toLowerCase()
        );

    if (duplicate) {
        throw new Error(
            "มีบัญชื่อนี้อยู่แล้ว"
        );
    }

    const id =
        crypto.randomUUID();

    const now =
        new Date().toISOString();

    await sheet.appendRow(
        "Accounts",
        [
            id,
            userId,
            accountName,
            initialBalance,
            now,
            now
        ]
    );

    return {
        success: true,
        message: "เพิ่มบัญชีสำเร็จ",
        data: {
            id,
            userId,
            name: accountName,
            balance: initialBalance,
            createdAt: now,
            updatedAt: now
        }
    };
};

exports.update = async (
    userId,
    id,
    data
) => {
    const rows =
        await sheet.getRows("Accounts");

    const accounts =
        rows.slice(1);

    const index =
        accounts.findIndex(row =>
            String(row[0]) === String(id) &&
            String(row[1]) === String(userId)
        );

    if (index === -1) {
        throw new Error(
            "ไม่พบบัญชี หรือไม่มีสิทธิ์แก้ไขบัญชีนี้"
        );
    }

    const oldRow =
        accounts[index];

    const name =
        data.name !== undefined
            ? String(data.name).trim()
            : String(oldRow[2] || "").trim();

    if (!name) {
        throw new Error(
            "กรุณากรอกชื่อบัญชี"
        );
    }

    const balance =
        data.balance !== undefined
            ? Number(data.balance)
            : Number(oldRow[3] || 0);

    if (
        isNaN(balance) ||
        balance < 0
    ) {
        throw new Error(
            "จำนวนเงินไม่ถูกต้อง"
        );
    }

    const duplicate =
        accounts.find(row =>
            String(row[0]) !== String(id) &&
            String(row[1]) === String(userId) &&
            String(row[2] || "")
                .trim()
                .toLowerCase() ===
            name.toLowerCase()
        );

    if (duplicate) {
        throw new Error(
            "มีบัญชื่อนี้อยู่แล้ว"
        );
    }

    const updatedAt = new Date().toISOString();

    await sheet.updateRow(
        "Accounts",
        id,
        {
            id: oldRow[0],
            userId: oldRow[1],
            name,
            balance,
            createdAt: oldRow[4],
            updateAt: updatedAt
        }
    );

    return {
        success: true,
        message: "แก้ไขบัญชีสำเร็จ",
        data: {
            id: oldRow[0],
            userId: oldRow[1],
            name,
            balance,
            createdAt: oldRow[4],
            updatedAt
        }
    };
};

exports.remove = async (
    userId,
    id
) => {
    const rows =
        await sheet.getRows("Accounts");

    if (!rows || rows.length <= 1) {
        throw new Error(
            "ไม่พบข้อมูลบัญชี"
        );
    }

    const account =
        rows.slice(1).find(row =>
            String(row[0] || "").trim() ===
            String(id || "").trim() &&
            String(row[1]) ===
            String(userId)
        );

    if (!account) {
        throw new Error(
            "ไม่พบบัญชี หรือไม่มีสิทธิ์ลบบัญชีนี้"
        );
    }

    const ok =
        await sheet.deleteRow(
            "Accounts",
            id
        );

    if (!ok) {
        throw new Error(
            "ลบบัญชีไม่สำเร็จ"
        );
    }

    return {
        success: true,
        message: "ลบบัญชีสำเร็จ"
    };
};