const sheet = require("./sheet.service");

exports.getDashboard = async (userId) => {
    const transactions = (await sheet.getRows("Transactions")).slice(1);
    const myTransactions = transactions.filter(row => String(row[1] || "") === String(userId));

    let totalIncome = 0;
    let totalExpense = 0;
    let incomeTransactions = 0;
    let expenseTransactions = 0;

    myTransactions.forEach(row => {
        const income = Number(row[5] || 0);
        const expense = Number(row[6] || 0);

        totalIncome += income;
        totalExpense += expense;
        if (income > 0) incomeTransactions++;
        if (expense > 0) expenseTransactions++;
    });

    const balance = totalIncome - totalExpense;
    const typeRows = (await sheet.getRows("Types")).slice(1);
    const categoryRows = (await sheet.getRows("Categories")).slice(1);

    const latestTransactions = myTransactions.slice().reverse().slice(0, 5).map(row => {
        const type = typeRows.find(item => String(item[0]) === String(row[3]));
        const category = categoryRows.find(item => String(item[0]) === String(row[4]));

        return {
            id: row[0],
            userId: row[1],
            date: row[2],
            typeId: row[3],
            categoryId: row[4],
            typeName: type ? type[1] : "-",
            categoryName: category ? category[2] : "-",
            income: Number(row[5] || 0),
            expense: Number(row[6] || 0),
            balance: Number(row[7] || 0),
            note: row[8] || "",
            createdAt: row[9] || "",
            updateAt: row[10] || ""
        };
    });

    return {
        summary: {
            totalIncome,
            totalExpense,
            balance,
            totalTransactions: myTransactions.length,
            incomeTransactions,
            expenseTransactions
        },
        latestTransactions
    };
};