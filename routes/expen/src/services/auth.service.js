//src/services/auth.service.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sheet = require("./sheet.service");

const JWT_SECRET = process.env.JWT_SECRET;

// Register
exports.register = async (data) => {
    const { username, email, password, prefix, firstName, lastName, phone, citizenId } = data;

    if (!username) throw new Error("กรุณากรอก Username");
    if (!/^\d{10}$/.test(phone)) throw new Error("เบอร์โทรต้องมี 10 หลัก");
    if (!/^\d{13}$/.test(citizenId)) throw new Error("เลขบัตรประชาชนต้องมี 13 หลัก");

    const rows = (await sheet.getRows("Users")).slice(1);

    if (rows.find(row => row[1] === username)) throw new Error("Username นี้ถูกใช้งานแล้ว");
    if (rows.find(row => row[2]?.toLowerCase() === email.toLowerCase())) throw new Error("Email นี้ถูกใช้งานแล้ว");
    if (rows.find(row => row[9] === phone)) throw new Error("เบอร์โทรนี้ถูกใช้งานแล้ว");
    if (rows.find(row => row[10] === citizenId)) throw new Error("เลขบัตรประชาชนนี้ถูกใช้งานแล้ว");

    const hash = await bcrypt.hash(password, 10);
    const fullName = `${prefix}${firstName} ${lastName}`;

    await sheet.appendRow("Users", [
        crypto.randomUUID(), username, email, hash, "user", prefix, firstName,
        lastName, fullName, phone, citizenId, new Date().toISOString()
    ]);

    return { success: true, message: "สมัครสมาชิกสำเร็จ" };
};

// Login
exports.login = async (data) => {
    const { username, password } = data;

    if (!username || !password) {
        throw new Error("กรุณากรอก Username / Email และ Password");
    }

    const allRows = await sheet.getRows("Users");

    const rows = (allRows || []).slice(1);

    const login = String(username).trim().toLowerCase();

    const user = rows.find(row => {
        const userName = String(row[1] || "").trim().toLowerCase();
        const email = String(row[2] || "").trim().toLowerCase();

        return userName === login || email === login;
    });

    if (!user) {
        throw new Error("Username / Email หรือ Password ไม่ถูกต้อง");
    }

    const ok = await bcrypt.compare(password, String(user[3] || ""));

    if (!ok) {
        throw new Error("Username / Email หรือ Password ไม่ถูกต้อง");
    }

    const token = jwt.sign({
        id: user[0],
        username: user[1],
        email: user[2],
        role: user[4],
        prefix: user[5],
        firstName: user[6],
        lastName: user[7],
        fullName: user[8],
        phone: user[9]
    }, JWT_SECRET, {
        expiresIn: "30m"
    });

    return {
        success: true,
        token,
        user: {
            id: user[0],
            username: user[1],
            email: user[2],
            role: user[4],
            prefix: user[5],
            firstName: user[6],
            lastName: user[7],
            fullName: user[8],
            phone: user[9]
        }
    };
};

// Update Profile
exports.updateProfile = async (user, data) => {
    const allowedFields = ["email", "prefix", "firstName", "lastName", "phone", "citizenId"];
    const updateData = {};

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(data, field)) updateData[field] = data[field];
    }

    if (Object.keys(updateData).length === 0) throw new Error("ไม่มีข้อมูลที่ต้องการแก้ไข");
    if (updateData.phone !== undefined && !/^\d{10}$/.test(String(updateData.phone))) throw new Error("เบอร์โทรต้องมี 10 หลัก");
    if (updateData.citizenId !== undefined && !/^\d{13}$/.test(String(updateData.citizenId))) throw new Error("เลขบัตรประชาชนต้องมี 13 หลัก");

    const users = await sheet.getRows("Users");
    if (!users || users.length <= 1) throw new Error("ไม่พบข้อมูลผู้ใช้งาน");

    const rows = users.slice(1);
    const currentIndex = rows.findIndex(row => String(row[0]) === String(user.id));
    if (currentIndex === -1) throw new Error("ไม่พบข้อมูลผู้ใช้งาน");

    const currentRow = rows[currentIndex];
    const email = updateData.email !== undefined ? String(updateData.email).trim() : currentRow[2];
    const prefix = updateData.prefix !== undefined ? updateData.prefix : currentRow[5];
    const firstName = updateData.firstName !== undefined ? updateData.firstName : currentRow[6];
    const lastName = updateData.lastName !== undefined ? updateData.lastName : currentRow[7];
    const phone = updateData.phone !== undefined ? String(updateData.phone) : currentRow[9];
    const citizenId = updateData.citizenId !== undefined ? String(updateData.citizenId) : currentRow[10];

    if (updateData.email !== undefined) {
        const duplicateEmail = rows.find((row, index) =>
            index !== currentIndex &&
            String(row[2] || "").trim().toLowerCase() === email.trim().toLowerCase()
        );
        if (duplicateEmail) throw new Error("Email นี้ถูกใช้งานแล้ว");
    }

    if (updateData.phone !== undefined) {
        const duplicatePhone = rows.find((row, index) =>
            index !== currentIndex && String(row[9] || "") === phone
        );
        if (duplicatePhone) throw new Error("เบอร์โทรนี้ถูกใช้งานแล้ว");
    }

    if (updateData.citizenId !== undefined) {
        const duplicateCitizenId = rows.find((row, index) =>
            index !== currentIndex && String(row[10] || "") === citizenId
        );
        if (duplicateCitizenId) throw new Error("เลขบัตรประชาชนนี้ถูกใช้งานแล้ว");
    }

    const fullName = `${prefix || ""}${firstName || ""} ${lastName || ""}`.trim();

    await sheet.updateRow("Users", user.id, {
        id: currentRow[0], username: currentRow[1], email, password: currentRow[3],
        role: currentRow[4], prefix, firstName, lastName, fullName, phone,
        citizenId, createdAt: currentRow[11]
    });

    return {
        success: true,
        message: "บันทึกข้อมูลส่วนตัวสำเร็จ",
        user: {
            id: currentRow[0], username: currentRow[1], email, role: currentRow[4],
            prefix, firstName, lastName, fullName, phone, citizenId
        }
    };
};

// Change Password
exports.changePassword = async (user, data) => {
    const { currentPassword, newPassword } = data;

    if (!currentPassword) throw new Error("กรุณากรอกรหัสผ่านเดิม");
    if (!newPassword) throw new Error("กรุณากรอกรหัสผ่านใหม่");
    if (newPassword.length < 6) throw new Error("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
    if (currentPassword === newPassword) throw new Error("รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม");

    const rows = (await sheet.getRows("Users")).slice(1);
    const currentIndex = rows.findIndex(row => String(row[0]) === String(user.id));
    if (currentIndex === -1) throw new Error("ไม่พบข้อมูลผู้ใช้งาน");

    const currentRow = rows[currentIndex];
    const valid = await bcrypt.compare(currentPassword, currentRow[3]);
    if (!valid) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");

    const newHash = await bcrypt.hash(newPassword, 10);
    await sheet.updateRow("Users", user.id, { password: newHash });

    return { success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" };
};

// Logout
exports.logout = (req, res) => {
    res.clearCookie("token");
    return res.json({ success: true, message: "ออกจากระบบสำเร็จ" });
};