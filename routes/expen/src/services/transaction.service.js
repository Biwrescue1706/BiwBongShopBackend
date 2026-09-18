const crypto = require("crypto");
const sheet = require("./sheet.service");

const getAccountType = async (accountTypesId, userId = null) => {
    const rows = await sheet.getRows("AccountTypes");

    return rows.slice(1).find(row =>
        String(row[0]).trim() === String(accountTypesId).trim() &&
        (
            userId === null ||
            String(row[1]).trim() === String(userId).trim()
        )
    );
};

const getAccount = async (userId, accountName) => {
    const rows = await sheet.getRows("Accounts");

    return rows.slice(1).find(row =>
        String(row[1]).trim() === String(userId).trim() &&
        String(row[2] || "").trim().toLowerCase() ===
        String(accountName || "").trim().toLowerCase()
    );
};

const updateAccountBalance = async (
    userId,
    accountName,
    change
) => {
    const account = await getAccount(
        userId,
        accountName
    );

    const now = new Date().toISOString();

    if (!account) {
        const id = crypto.randomUUID();

        await sheet.appendRow("Accounts", [
            id,
            userId,
            accountName,
            change,
            now,
            now
        ]);

        return change;
    }

    const currentBalance =
        Number(account[3] || 0);

    const newBalance =
        currentBalance + change;

    await sheet.updateRow(
        "Accounts",
        account[0],
        {
            id: account[0],
            userId: account[1],
            name: account[2],
            balance: newBalance,
            createdAt: account[4],
            updateAt: now
        }
    );

    return newBalance;
};

const getTransactionBalance = async (
    userId,
    excludeId = null
) => {
    const rows =
        await sheet.getRows("Transactions");

    return rows
        .slice(1)
        .filter(row =>
            String(row[1]).trim() ===
            String(userId).trim() &&
            (
                !excludeId ||
                String(row[0]).trim() !==
                String(excludeId).trim()
            )
        )
        .reduce((total, row) => {
            const income =
                Number(row[6] || 0);

            const expense =
                Number(row[7] || 0);

            return total + income - expense;
        }, 0);
};

// ==============================
// GET
// ==============================

exports.getAll = async (userId) => {
    const rows =
        await sheet.getRows("Transactions");

    const transactions =
        rows.slice(1);

    const typeRows = (
        await sheet.getRows("Types")
    ).slice(1);

    const categoryRows = (
        await sheet.getRows("Categories")
    ).slice(1);

    const accountTypeRows = (
        await sheet.getRows("AccountTypes")
    ).slice(1);

    let runningBalance = 0;

    const userTransactions =
        transactions
            .filter(row =>
                String(row[1]).trim() ===
                String(userId).trim()
            )
            .sort((a, b) => {
                const dateA =
                    new Date(
                        a[2] || 0
                    ).getTime();

                const dateB =
                    new Date(
                        b[2] || 0
                    ).getTime();

                if (dateA !== dateB) {
                    return dateA - dateB;
                }

                return new Date(
                    a[10] || 0
                ).getTime() -
                new Date(
                    b[10] || 0
                ).getTime();
            });

    const data =
        userTransactions.map(row => {
            const type =
                typeRows.find(item =>
                    String(item[0]).trim() ===
                    String(row[3]).trim()
                );

            const category =
                categoryRows.find(item =>
                    String(item[0]).trim() ===
                    String(row[4]).trim()
                );

            const accountType =
                accountTypeRows.find(item =>
                    String(item[0]).trim() ===
                    String(row[5]).trim() &&
                    String(item[1]).trim() ===
                    String(userId).trim()
                );

            const income =
                Number(row[6] || 0);

            const expense =
                Number(row[7] || 0);

            runningBalance +=
                income - expense;

            return {
                id: row[0],
                userId: row[1],
                date: row[2],

                typeId: row[3],
                categoryId: row[4],
                accountTypesId: row[5],

                income,
                expense,
                balance: runningBalance,

                note: row[9] || "",

                createdAt: row[10] || "",
                updateAt: row[11] || "",

                typeName:
                    type?.[1] || "",

                categoryName:
                    category?.[2] || "",

                accountTypeName:
                    accountType?.[2] || ""
            };
        });

    // ==============================
    // สรุปแยกตามบัญชี
    // ==============================

    const accountSummary = {};

    data.forEach(transaction => {
        const accountId =
            transaction.accountTypesId;

        if (!accountId) return;

        const accountName =
            transaction.accountTypeName ||
            "ไม่ระบุช่องทาง";

        if (!accountSummary[accountId]) {
            accountSummary[accountId] = {
                id: accountId,
                accountTypesId: accountId,
                name: accountName,
                accountTypeName: accountName,
                income: 0,
                expense: 0,
                balance: 0
            };
        }

        accountSummary[accountId].income +=
            Number(transaction.income || 0);

        accountSummary[accountId].expense +=
            Number(transaction.expense || 0);

        accountSummary[accountId].balance =
            accountSummary[accountId].income -
            accountSummary[accountId].expense;
    });

    // ==============================
    // ยอดรวมทั้งหมด
    // ==============================

    const total = data.reduce(
        (result, transaction) => {
            result.income +=
                Number(transaction.income || 0);

            result.expense +=
                Number(transaction.expense || 0);

            result.balance +=
                Number(transaction.income || 0) -
                Number(transaction.expense || 0);

            return result;
        },
        {
            income: 0,
            expense: 0,
            balance: 0
        }
    );

    return {
        transactions: data,

        accountSummary:
            Object.values(accountSummary),

        total
    };
};

// ==============================
// CREATE
// ==============================

exports.create = async (
    userId,
    data
) => {
    const {
        date,
        typeId,
        categoryId,
        accountTypesId,
        amount,
        note
    } = data;

    if (
        !date ||
        !typeId ||
        !categoryId ||
        !accountTypesId ||
        amount === undefined ||
        amount === null ||
        amount === ""
    ) {
        throw new Error(
            "กรุณากรอกข้อมูลให้ครบ"
        );
    }

    const money = Number(amount);

    if (
        isNaN(money) ||
        money <= 0
    ) {
        throw new Error(
            "จำนวนเงินไม่ถูกต้อง"
        );
    }

    // ==============================
    // ตรวจสอบประเภท
    // ==============================

    const typeRows =
        await sheet.getRows("Types");

    const type =
        typeRows.slice(1).find(row =>
            String(row[0]).trim() ===
            String(typeId).trim()
        );

    if (!type) {
        throw new Error(
            "ไม่พบประเภทที่เลือก"
        );
    }

    const typeName =
        String(type[1] || "").trim();

    if (
        typeName !== "รายรับ" &&
        typeName !== "รายจ่าย"
    ) {
        throw new Error(
            "ประเภทไม่ถูกต้อง"
        );
    }

    // ==============================
    // ตรวจสอบหมวดหมู่
    // ==============================

    const categoryRows =
        await sheet.getRows("Categories");

    const category =
        categoryRows.slice(1).find(row =>
            String(row[0]).trim() ===
            String(categoryId).trim()
        );

    if (!category) {
        throw new Error(
            "ไม่พบหมวดหมู่ที่เลือก"
        );
    }

    if (
        String(category[1]).trim() !==
        String(typeId).trim()
    ) {
        throw new Error(
            "หมวดหมู่นี้ไม่ได้อยู่ในประเภทที่เลือก"
        );
    }

    // ==============================
    // ตรวจสอบ AccountTypes
    // ==============================

    const accountType =
        await getAccountType(
            accountTypesId,
            userId
        );

    if (!accountType) {
        throw new Error(
            "ไม่พบช่องทางบัญชีที่เลือก"
        );
    }

    // AccountTypes
    // id | userId | name | createdAt | updateAt

    const accountName =
        String(
            accountType[2] || ""
        ).trim();

    if (!accountName) {
        throw new Error(
            "ชื่อช่องทางบัญชีไม่ถูกต้อง"
        );
    }

    // ==============================
    // คำนวณรายรับ / รายจ่าย
    // ==============================

    let income = 0;
    let expense = 0;
    let accountChange = 0;

    if (typeName === "รายรับ") {
        income = money;
        accountChange = money;
    }

    if (typeName === "รายจ่าย") {
        expense = money;
        accountChange = -money;
    }

    // ==============================
    // อัปเดตบัญชี
    // ==============================

    const accountBalance =
        await updateAccountBalance(
            userId,
            accountName,
            accountChange
        );

    // ==============================
    // คำนวณ Balance Transaction
    // ==============================

    const previousBalance =
        await getTransactionBalance(
            userId
        );

    const transactionBalance =
        previousBalance +
        income -
        expense;

    const now =
        new Date().toISOString();

    const id =
        crypto.randomUUID();

    // ==============================
    // บันทึก Transaction
    // ==============================

    await sheet.appendRow(
        "Transactions",
        [
            id,
            userId,
            date,
            typeId,
            categoryId,
            accountTypesId,
            income,
            expense,
            transactionBalance,
            note || "",
            now,
            now
        ]
    );

    return {
        success: true,
        message: "เพิ่มรายการสำเร็จ",

        data: {
            id,
            userId,
            date,
            typeId,
            categoryId,
            accountTypesId,

            income,
            expense,
            balance: transactionBalance,

            accountBalance,

            accountTypeName:
                accountName,

            note: note || "",

            createdAt: now,
            updateAt: now
        }
    };
};

// ==============================
// UPDATE
// ==============================

exports.update = async (
    userId,
    id,
    data
) => {
    const rows =
        await sheet.getRows("Transactions");

    const transactions =
        rows.slice(1);

    const index =
        transactions.findIndex(row =>
            String(row[0]).trim() ===
            String(id).trim() &&
            String(row[1]).trim() ===
            String(userId).trim()
        );

    if (index === -1) {
        throw new Error(
            "ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไขรายการนี้"
        );
    }

    const oldRow =
        transactions[index];

    const date =
        data.date ?? oldRow[2];

    const typeId =
        data.typeId ?? oldRow[3];

    const categoryId =
        data.categoryId ?? oldRow[4];

    const accountTypesId =
        data.accountTypesId ?? oldRow[5];

    const note =
        data.note ?? oldRow[9];

    const oldIncome =
        Number(oldRow[6] || 0);

    const oldExpense =
        Number(oldRow[7] || 0);

    const oldChange =
        oldIncome > 0
            ? oldIncome
            : -oldExpense;

    let amount;

    if (
        data.amount !== undefined &&
        data.amount !== null &&
        data.amount !== ""
    ) {
        amount = Number(data.amount);
    } else {
        amount =
            oldIncome > 0
                ? oldIncome
                : oldExpense;
    }

    if (
        isNaN(amount) ||
        amount <= 0
    ) {
        throw new Error(
            "จำนวนเงินไม่ถูกต้อง"
        );
    }

    // ==============================
    // ตรวจสอบ Type
    // ==============================

    const typeRows =
        await sheet.getRows("Types");

    const type =
        typeRows.slice(1).find(row =>
            String(row[0]).trim() ===
            String(typeId).trim()
        );

    if (!type) {
        throw new Error(
            "ไม่พบประเภทที่เลือก"
        );
    }

    const typeName =
        String(type[1] || "").trim();

    let income = 0;
    let expense = 0;
    let newChange = 0;

    if (typeName === "รายรับ") {
        income = amount;
        newChange = amount;
    } else if (typeName === "รายจ่าย") {
        expense = amount;
        newChange = -amount;
    } else {
        throw new Error(
            "ประเภทไม่ถูกต้อง"
        );
    }

    // ==============================
    // ตรวจสอบ Category
    // ==============================

    const categoryRows =
        await sheet.getRows("Categories");

    const category =
        categoryRows.slice(1).find(row =>
            String(row[0]).trim() ===
            String(categoryId).trim()
        );

    if (!category) {
        throw new Error(
            "ไม่พบหมวดหมู่ที่เลือก"
        );
    }

    if (
        String(category[1]).trim() !==
        String(typeId).trim()
    ) {
        throw new Error(
            "หมวดหมู่นี้ไม่ได้อยู่ในประเภทที่เลือก"
        );
    }

    // ==============================
    // บัญชีใหม่
    // ==============================

    const newAccountType =
        await getAccountType(
            accountTypesId,
            userId
        );

    if (!newAccountType) {
        throw new Error(
            "ไม่พบช่องทางบัญชีที่เลือก"
        );
    }

    const newAccountName =
        String(
            newAccountType[2] || ""
        ).trim();

    if (!newAccountName) {
        throw new Error(
            "ชื่อช่องทางบัญชีไม่ถูกต้อง"
        );
    }

    // ==============================
    // บัญชีเดิม
    // ==============================

    const oldAccountType =
        await getAccountType(
            oldRow[5],
            userId
        );

    if (!oldAccountType) {
        throw new Error(
            "ไม่พบบัญชีเดิมของรายการ"
        );
    }

    const oldAccountName =
        String(
            oldAccountType[2] || ""
        ).trim();

    const oldAccount =
        await getAccount(
            userId,
            oldAccountName
        );

    if (!oldAccount) {
        throw new Error(
            "ไม่พบบัญชีเดิมของรายการ"
        );
    }

    const oldAccountBalance =
        Number(oldAccount[3] || 0);

    // คืนยอดรายการเดิม
    const restoredBalance =
        oldAccountBalance -
        oldChange;

    const updatedAt =
        new Date().toISOString();

    await sheet.updateRow(
        "Accounts",
        oldAccount[0],
        {
            id: oldAccount[0],
            userId: oldAccount[1],
            name: oldAccount[2],
            balance: restoredBalance,
            createdAt: oldAccount[4],
            updateAt: updatedAt
        }
    );

    let newAccountBalance;

    try {
        // ถ้าเป็นบัญชีเดิม
        if (
            String(oldAccountName).trim().toLowerCase() ===
            String(newAccountName).trim().toLowerCase()
        ) {
            newAccountBalance =
                restoredBalance +
                newChange;

            await sheet.updateRow(
                "Accounts",
                oldAccount[0],
                {
                    id: oldAccount[0],
                    userId: oldAccount[1],
                    name: oldAccount[2],
                    balance: newAccountBalance,
                    createdAt: oldAccount[4],
                    updateAt: updatedAt
                }
            );
        } else {
            // ถ้าเปลี่ยนบัญชี
            newAccountBalance =
                await updateAccountBalance(
                    userId,
                    newAccountName,
                    newChange
                );
        }
    } catch (error) {
        await sheet.updateRow(
            "Accounts",
            oldAccount[0],
            {
                id: oldAccount[0],
                userId: oldAccount[1],
                name: oldAccount[2],
                balance: oldAccountBalance,
                createdAt: oldAccount[4],
                updateAt: updatedAt
            }
        );

        throw error;
    }

    // ==============================
    // Transaction Balance
    // ==============================

    const previousBalance =
        await getTransactionBalance(
            userId,
            id
        );

    const transactionBalance =
        previousBalance +
        income -
        expense;

    // ==============================
    // Update Transaction
    // ==============================

    await sheet.updateRow(
        "Transactions",
        id,
        {
            id: oldRow[0],
            userId: oldRow[1],
            date,
            typeId,
            categoryId,
            accountTypesId,
            income,
            expense,
            balance: transactionBalance,
            note,
            createdAt: oldRow[10],
            updateAt: updatedAt
        }
    );

    return {
        success: true,
        message: "แก้ไขรายการสำเร็จ",

        data: {
            id,
            userId,
            date,
            typeId,
            categoryId,
            accountTypesId,

            income,
            expense,
            balance: transactionBalance,

            accountBalance:
                newAccountBalance,

            accountTypeName:
                newAccountName,

            note,

            createdAt: oldRow[10],
            updateAt: updatedAt
        }
    };
};

// ==============================
// DELETE
// ==============================

exports.remove = async (
    userId,
    id
) => {
    const rows =
        await sheet.getRows("Transactions");

    if (
        !rows ||
        rows.length <= 1
    ) {
        throw new Error(
            "ไม่พบข้อมูลรายการ"
        );
    }

    const transaction =
        rows.slice(1).find(row =>
            String(row[0] ?? "").trim() ===
            String(id ?? "").trim() &&
            String(row[1] ?? "").trim() ===
            String(userId ?? "").trim()
        );

    if (!transaction) {
        throw new Error(
            "ไม่พบรายการ หรือไม่มีสิทธิ์ลบรายการนี้"
        );
    }

    const accountType =
        await getAccountType(
            transaction[5],
            userId
        );

    if (!accountType) {
        throw new Error(
            "ไม่พบช่องทางบัญชีของรายการ"
        );
    }

    const accountName =
        String(
            accountType[2] || ""
        ).trim();

    const income =
        Number(transaction[6] || 0);

    const expense =
        Number(transaction[7] || 0);

    const change =
        income > 0
            ? income
            : -expense;

    const account =
        await getAccount(
            userId,
            accountName
        );

    if (account) {
        const currentBalance =
            Number(account[3] || 0);

        const newBalance =
            currentBalance - change;

        await sheet.updateRow(
            "Accounts",
            account[0],
            {
                id: account[0],
                userId: account[1],
                name: account[2],
                balance: newBalance,
                createdAt: account[4],
                updateAt:
                    new Date().toISOString()
            }
        );
    }

    const ok =
        await sheet.deleteRow(
            "Transactions",
            id
        );

    if (!ok) {
        // คืนยอดกลับถ้าลบ Transaction ไม่สำเร็จ
        if (account) {
            const currentBalance =
                Number(account[3] || 0);

            await sheet.updateRow(
                "Accounts",
                account[0],
                {
                    id: account[0],
                    userId: account[1],
                    name: account[2],
                    balance: currentBalance,
                    createdAt: account[4],
                    updateAt:
                        new Date().toISOString()
                }
            );
        }

        throw new Error(
            "ลบรายการไม่สำเร็จ"
        );
    }

    return {
        success: true,
        message: "ลบรายการสำเร็จ"
    };
};