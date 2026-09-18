const crypto = require("crypto");
const bcrypt = require("bcrypt");
const sheet = require("./sheet.service");

// GET ALL
exports.getAll = async () => {
    const rows = (await sheet.getRows("Users")).slice(1);

    return rows.map(row => ({
        id: row[0],
        username: row[1],
        email: row[2],
        role: row[4],
        prefix: row[5],
        firstName: row[6],
        lastName: row[7],
        fullName: row[8],
        phone: row[9],
        citizenId: row[10],
        createdAt: row[11]
    }));
};

// GET BY ID
exports.getById = async (id) => {
    const rows = (await sheet.getRows("Users")).slice(1);
    const user = rows.find(row => String(row[0]) === String(id));

    if (!user) return null;

    return {
        id: user[0],
        username: user[1],
        email: user[2],
        role: user[4],
        prefix: user[5],
        firstName: user[6],
        lastName: user[7],
        fullName: user[8],
        phone: user[9],
        citizenId: user[10],
        createdAt: user[11]
    };
};

// CREATE
exports.create = async (data) => {
    const { username, email, password, role, prefix, firstName, lastName, phone, citizenId } = data;

    if (!username || !email || !password || !prefix || !firstName || !lastName || !phone || !citizenId) {
        throw new Error("กรุณากรอกข้อมูลให้ครบ");
    }

    if (!/^\d{10}$/.test(phone)) throw new Error("เบอร์โทรศัพท์ต้องมี 10 หลัก");
    if (!/^\d{13}$/.test(citizenId)) throw new Error("เลขบัตรประชาชนต้องมี 13 หลัก");

    const users = (await sheet.getRows("Users")).slice(1);

    if (users.find(u => u[1]?.toLowerCase() === username.toLowerCase())) throw new Error("Username นี้ถูกใช้งานแล้ว");
    if (users.find(u => u[2]?.toLowerCase() === email.toLowerCase())) throw new Error("Email นี้ถูกใช้งานแล้ว");
    if (users.find(u => u[9] === phone)) throw new Error("เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว");
    if (users.find(u => u[10] === citizenId)) throw new Error("เลขบัตรประชาชนนี้ถูกใช้งานแล้ว");

    const hash = await bcrypt.hash(password, 10);
    const fullName = `${prefix}${firstName} ${lastName}`;

    await sheet.appendRow("Users", [
        crypto.randomUUID(), username, email, hash, role || "user",
        prefix, firstName, lastName, fullName, phone, citizenId,
        new Date().toISOString()
    ]);

    return { success: true, message: "เพิ่มสมาชิกสำเร็จ" };
};

// UPDATE
exports.update = async (id, data) => {
    const rows = await sheet.getRows("Users");
    const users = rows.slice(1);
    const index = users.findIndex(row => String(row[0]) === String(id));

    if (index === -1) throw new Error("ไม่พบข้อมูล");

    const oldUser = users[index];
    const username = data.username !== undefined ? data.username : oldUser[1];
    const email = data.email !== undefined ? data.email : oldUser[2];
    const role = data.role !== undefined ? data.role : oldUser[4];
    const prefix = data.prefix !== undefined ? data.prefix : oldUser[5];
    const firstName = data.firstName !== undefined ? data.firstName : oldUser[6];
    const lastName = data.lastName !== undefined ? data.lastName : oldUser[7];
    const phone = data.phone !== undefined ? data.phone : oldUser[9];
    const citizenId = data.citizenId !== undefined ? data.citizenId : oldUser[10];
    const password = data.password?.trim() ? await bcrypt.hash(data.password, 10) : oldUser[3];
    const fullName = `${prefix}${firstName} ${lastName}`;

    await sheet.updateRow("Users", id, {
        id,
        username,
        email,
        password,
        role,
        prefix,
        firstName,
        lastName,
        fullName,
        phone,
        citizenId,
        createdAt: oldUser[11]
    });

    return { success: true, message: "แก้ไขสมาชิกสำเร็จ" };
};

// DELETE
exports.remove = async (id) => {
    const ok = await sheet.deleteRow("Users", id);
    if (!ok) throw new Error("ไม่พบข้อมูล");

    return { success: true, message: "ลบสมาชิกสำเร็จ" };
};