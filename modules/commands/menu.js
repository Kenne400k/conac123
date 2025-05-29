module.exports.config = {
    name: "menu",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "pcoder",
    description: "Xem danh sách lệnh theo nhóm, reply để xem chi tiết lệnh",
    commandCategory: "Người dùng",
    usages: "[all/số trang/tên lệnh]",
    cooldowns: 3
};

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const cmds = global.client.commands;
    const events = global.client.events;
    const threadData = global.data.threadData.get(threadID) || {};
    const prefix = threadData.PREFIX || global.config.PREFIX;
    let msg = "";
    let array = [];
    let i = 0;

    // Uptime
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);

    // Nếu nhập tên lệnh (menu <command>)
    if (args[0] && cmds.has(args[0].toLowerCase())) {
        const cmd = cmds.get(args[0].toLowerCase()).config;
        msg = `=== HƯỚNG DẪN SỬ DỤNG ===\n🌟 Tên lệnh: ${cmd.name}\n📝 Phiên bản: ${cmd.version}\n👤 Quyền hạn: ${TextPr(cmd.hasPermssion)}\n🧪 Credit: ${cmd.credits}\n✏ Mô tả: ${cmd.description}\n📎 Nhóm: ${cmd.commandCategory}\n📌 Cách dùng: ${cmd.usages}\n⏳ Cooldowns: ${cmd.cooldowns}s`;
        return api.sendMessage(msg, threadID, messageID);
    }

    // Nếu nhập "all" hoặc "tất cả" thì liệt kê hết
    if (args[0] && ["all", "tatca", "tấtcả"].includes(args[0].toLowerCase())) {
        for (const cmd of cmds.values()) {
            msg += `${++i}. Tên lệnh: ${cmd.config.name}\n📌 Mô tả: ${cmd.config.description}\n\n`;
        }
        return api.sendMessage(msg, threadID, messageID);
    }

    // Gom nhóm lệnh theo category
    for (const cmd of cmds.values()) {
        const { commandCategory, hasPermssion, name: nameModule } = cmd.config;
        let found = array.find(i => i.cmdCategory == commandCategory);
        if (!found) {
            array.push({
                cmdCategory: commandCategory,
                permission: hasPermssion,
                nameModule: [nameModule]
            });
        } else {
            found.nameModule.push(nameModule);
        }
    }

    // Phân trang (10 nhóm/trang)
    const perPage = 10;
    const pageNum = parseInt(args[0]) > 0 ? parseInt(args[0]) : 1;
    const totalPages = Math.ceil(array.length / perPage);
    const page = Math.max(1, Math.min(pageNum, totalPages));
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const showArray = array.slice(start, end);

    // Hiển thị menu từng nhóm
    msg += `⭐━━「 DANH MỤC LỆNH 」━━⭐\n`;
    showArray.forEach((cmd, idx) => {
        msg += `\n${start + idx + 1}. 〈 ${cmd.cmdCategory.toUpperCase()} 〉\n`;
        msg += `👤 Quyền hạn: ${TextPr(cmd.permission)}\n`;
        msg += `📝 Tổng: ${cmd.nameModule.length} lệnh\n`;
        msg += `✏️ Lệnh: ${cmd.nameModule.join(", ")}\n`;
    });

    msg += `\n──────────────────\n📄 Trang ${page}/${totalPages}\n📥 Tổng lệnh: ${cmds.size}\n📝 Tổng events: ${events.size}\n🔥 Reply số thứ tự nhóm để xem chi tiết lệnh trong nhóm\n💧 ${prefix}menu <tên lệnh> để xem chi tiết lệnh\n🔢 ${prefix}menu <số trang> để đổi trang\n⏳ Uptime: ${h}h${m}m${s}s`;

    return api.sendMessage(msg, threadID, async (err, info) => {
        global.client.handleReply.push({
            type: "group_menu",
            name: this.config.name,
            author: event.senderID,
            messageID: info.messageID,
            array: showArray
        });
    }, messageID);
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const num = parseInt(event.body.trim());
    if (isNaN(num) || num < 1 || num > handleReply.array.length) {
        return api.sendMessage("Vui lòng reply số thứ tự hợp lệ để xem chi tiết nhóm lệnh!", event.threadID, event.messageID);
    }
    const group = handleReply.array[num - 1];
    const { commands } = global.client;
    let msg = `⭐━━〈 ${group.cmdCategory.toUpperCase()} 〉━━⭐\n`;
    group.nameModule.forEach((name, idx) => {
        const cmd = commands.get(name).config;
        msg += `\n${idx + 1}. ${cmd.name}\n📌 ${cmd.description}`;
    });
    msg += `\n\nReply số thứ tự để xem hướng dẫn chi tiết lệnh!`;
    api.sendMessage(msg, event.threadID, (err, info) => {
        global.client.handleReply.push({
            type: "cmd_menu",
            name: this.config.name,
            author: event.senderID,
            messageID: info.messageID,
            cmds: group.nameModule
        });
    }, event.messageID);
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    // Nếu là nhóm -> xem list lệnh nhóm
    if (handleReply.type === "group_menu") {
        const num = parseInt(event.body.trim());
        if (isNaN(num) || num < 1 || num > handleReply.array.length) {
            return api.sendMessage("Vui lòng reply số thứ tự hợp lệ để xem chi tiết nhóm lệnh!", event.threadID, event.messageID);
        }
        const group = handleReply.array[num - 1];
        const { commands } = global.client;
        let msg = `⭐━━〈 ${group.cmdCategory.toUpperCase()} 〉━━⭐\n`;
        group.nameModule.forEach((name, idx) => {
            const cmd = commands.get(name).config;
            msg += `\n${idx + 1}. ${cmd.name}\n📌 ${cmd.description}`;
        });
        msg += `\n\nReply số thứ tự để xem hướng dẫn chi tiết lệnh!`;
        return api.sendMessage(msg, event.threadID, (err, info) => {
            global.client.handleReply.push({
                type: "cmd_menu",
                name: this.config.name,
                author: event.senderID,
                messageID: info.messageID,
                cmds: group.nameModule
            });
        }, event.messageID);
    }
    // Nếu là nhóm lệnh -> xem chi tiết lệnh
    if (handleReply.type === "cmd_menu") {
        const num = parseInt(event.body.trim());
        const cmds = handleReply.cmds;
        if (isNaN(num) || num < 1 || num > cmds.length) {
            return api.sendMessage("Vui lòng reply số thứ tự hợp lệ để xem chi tiết lệnh!", event.threadID, event.messageID);
        }
        const { commands } = global.client;
        const cmd = commands.get(cmds[num - 1]).config;
        let msg = `=== HƯỚNG DẪN SỬ DỤNG ===\n🌟 Tên lệnh: ${cmd.name}\n📝 Phiên bản: ${cmd.version}\n👤 Quyền hạn: ${TextPr(cmd.hasPermssion)}\n🧪 Credit: ${cmd.credits}\n✏ Mô tả: ${cmd.description}\n📎 Nhóm: ${cmd.commandCategory}\n📌 Cách dùng: ${cmd.usages}\n⏳ Cooldowns: ${cmd.cooldowns}s`;
        return api.sendMessage(msg, event.threadID, event.messageID);
    }
};

// Helper function quyền
function TextPr(permission) {
    switch (permission) {
        case 0: return "Thành Viên";
        case 1: return "Qtv Nhóm";
        case 2: return "Admin Bot";
        default: return "Toàn Quyền";
    }
}