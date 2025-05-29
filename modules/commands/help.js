const fs = require('fs');
const path = require('path');
const Canvas = require('canvas'); // npm install canvas

module.exports.config = {
    name: "help",
    version: "2.0.0",
    hasPermission: 0,
    credits: "DC-Nam, Canvas UI by Kenne401k",
    description: "Xem danh sách lệnh và thông tin chi tiết (canvas)",
    commandCategory: "Người dùng",
    usePrefix: false,
    usages: "[tên lệnh/all/số trang]",
    cooldowns: 0
};

module.exports.languages = {
    "vi": {},
    "en": {}
};

const pageSize = 50;

function getPermissionText(permission) {
    return permission === 0 ? "Thành Viên" 
         : permission === 1 ? "QTV Nhóm" 
         : permission === 2 ? "Admin Bot" 
         : "Toàn Quyền";
}

// Canvas rendering function
async function renderHelpMenuCanvas(cmds, page, totalPages, totalCmds, prefix) {
    const width = 1000, height = 60 + cmds.length * 36 + 70;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = "#222831";
    ctx.fillRect(0, 0, width, height);

    ctx.font = "bold 42px Arial";
    ctx.fillStyle = "#FFD369";
    ctx.fillText(`✨ MENU LỆNH BOT ✨`, 40, 50);

    ctx.font = "20px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(`Trang ${page}/${totalPages} - Tổng: ${totalCmds} lệnh | Tiền tố: ${prefix}`, 40, 80);

    let y = 120, stt = (page - 1) * pageSize;
    for (const cmd of cmds) {
        ctx.fillStyle = "#FFD369";
        ctx.fillText(`${++stt}.`, 60, y);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.fillText(cmd.config.name, 110, y);
        ctx.font = "18px Arial";
        ctx.fillStyle = "#aaa";
        ctx.fillText(cmd.config.description || "", 250, y);
        y += 36;
    }

    ctx.font = "italic 18px Arial";
    ctx.fillStyle = "#FFD369";
    ctx.fillText("💡 Reply số trang để sang trang, hoặc số thứ tự để xem chi tiết.", 40, height - 22);

    return canvas.toBuffer();
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const cmds = global.client.commands;

    if (!cmds || cmds.size === 0) {
        return api.sendMessage("⚠️ Bot chưa có lệnh nào!", threadID, messageID);
    }

    const threadData = global.data.threadData.get(threadID) || {};
    const prefix = threadData.PREFIX || global.config.PREFIX || "!";
    const input = args[0] ? args[0].toLowerCase() : "";
    let msg = "";

    // Uptime
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    // Hiển thị tất cả lệnh dạng canvas phân trang
    const allCmds = [...cmds.values()];
    const totalCmds = allCmds.length;
    const totalPages = Math.ceil(totalCmds / pageSize);
    let page = 1;

    // Nếu là số thì hiểu là số trang hoặc số thứ tự lệnh
    if (/^\d+$/.test(input)) {
        const num = parseInt(input);
        // Nếu là trang
        if (num >= 1 && num <= totalPages) {
            const cmdsToShow = allCmds.slice((num - 1) * pageSize, num * pageSize);
            const buffer = await renderHelpMenuCanvas(cmdsToShow, num, totalPages, totalCmds, prefix);
            return api.sendMessage({
                body: `📜 Danh sách lệnh (Canvas UI)\nTrang ${num}/${totalPages} (${totalCmds} lệnh)\n💡 Reply số trang hoặc số lệnh.`,
                attachment: buffer
            }, threadID, (err, info) => {
                global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, type: 'canvasMenu', totalPages });
            }, messageID);
        }
        // Nếu là số thứ tự lệnh
        const idx = num - 1;
        if (idx >= 0 && idx < totalCmds) {
            const cmd = allCmds[idx].config;
            msg = `=== 📖 HƯỚNG DẪN SỬ DỤNG ===\n`
                + `🔹 𝗧𝗲̂𝗻: ${cmd.name}\n`
                + `📌 𝗣𝗵𝗶𝗲̂𝗻 𝗯𝗮̉𝗻: ${cmd.version}\n`
                + `🔗 𝗤𝘂𝘆𝗲̂̀𝗻 𝗵𝗮̣𝗻: ${getPermissionText(cmd.hasPermission)}\n`
                + `👤 𝗧𝗮́𝗰 𝗴𝗶𝗮̉: ${cmd.credits}\n`
                + `📝 𝗠𝗼̂ 𝘁𝗮̉: ${cmd.description}\n`
                + `📂 𝗡𝗵𝗼́𝗺: ${cmd.commandCategory}\n`
                + `💬 𝗖𝗮́𝗰𝗵 𝘀𝘂̛̉ 𝗱𝘂̣𝗻𝗴: ${cmd.usages || "Không có hướng dẫn"}\n`
                + `⏳ 𝗧𝗵𝗼̛̀𝗶 𝗴𝗶𝗮𝗻 𝗰𝗵𝗼̛̀: ${cmd.cooldowns}s`;
            return api.sendMessage({ body: msg }, threadID, messageID);
        }
        return api.sendMessage({ body: `⚠️ Số không hợp lệ` }, threadID, messageID);
    }

    // Hiển thị tất cả lệnh dạng text (all)
    if (input === "all") {
        let i = 0;
        for (const cmd of cmds.values()) {
            msg += `${++i}. 📌 Lệnh: ${cmd.config.name}\n🔹 Mô tả: ${cmd.config.description}\n\n`;
        }
        return api.sendMessage({ body: msg }, threadID, messageID);
    }

    // Hiển thị chi tiết nếu là tên lệnh
    if (input) {
        if (!cmds.has(input)) {
            const stringSimilarity = require("string-similarity");
            const allCommandNames = Array.from(cmds.keys());
            const checker = stringSimilarity.findBestMatch(input, allCommandNames);

            if (checker.bestMatch.rating >= 0.6) {
                return api.sendMessage(
                    { body: `❌ Không tìm thấy lệnh '${input}'.\n⚡ Có phải bạn muốn dùng '${checker.bestMatch.target}' không?` },
                    threadID,
                    messageID
                );
            }
            return api.sendMessage({ body: `❌ Không tìm thấy lệnh '${input}'.` }, threadID, messageID);
        }

        const cmd = cmds.get(input).config;
        msg = `=== 📖 HƯỚNG DẪN SỬ DỤNG ===\n`
            + `🔹 𝗧𝗲̂𝗻: ${cmd.name}\n`
            + `📌 𝗣𝗵𝗶𝗲̂𝗻 𝗯𝗮̉𝗻: ${cmd.version}\n`
            + `🔗 𝗤𝘂𝘆𝗲̂̀𝗻 𝗵𝗮̣𝗻: ${getPermissionText(cmd.hasPermission)}\n`
            + `👤 𝗧𝗮́𝗰 𝗴𝗶𝗮̉: ${cmd.credits}\n`
            + `📝 𝗠𝗼̂ 𝘁𝗮̉: ${cmd.description}\n`
            + `📂 𝗡𝗵𝗼́𝗺: ${cmd.commandCategory}\n`
            + `💬 𝗖𝗮́𝗰𝗵 𝘀𝘂̛̉ 𝗱𝘂̣𝗻𝗴: ${cmd.usages || "Không có hướng dẫn"}\n`
            + `⏳ 𝗧𝗵𝗼̛̀𝗶 𝗴𝗶𝗮𝗻 𝗰𝗵𝗼̛̀: ${cmd.cooldowns}s`;

        return api.sendMessage({ body: msg }, threadID, messageID);
    }

    // Mặc định: Trang đầu, canvas
    const cmdsToShow = allCmds.slice(0, pageSize);
    const buffer = await renderHelpMenuCanvas(cmdsToShow, 1, totalPages, totalCmds, prefix);

    return api.sendMessage({
        body: `📜 Danh sách lệnh (Canvas UI)\nTrang 1/${totalPages} (${totalCmds} lệnh)\n💡 Reply số trang hoặc số lệnh.`,
        attachment: buffer
    }, threadID, (err, info) => {
        global.client.handleReply.push({ name: this.config.name, messageID: info.messageID, author: event.senderID, type: 'canvasMenu', totalPages });
    }, messageID);
};

module.exports.handleReply = async function ({ handleReply: $, api, event }) {
    const { threadID, messageID, senderID, body } = event;
    if ($.author && senderID != $.author && !global.config.ADMINBOT.includes(senderID)) {
        return api.sendMessage(`⛔ Không phải việc của mày đâu!`, threadID, messageID);
    }
    const cmds = [...global.client.commands.values()];
    const pageSize = 50;
    const totalPages = $.totalPages || Math.ceil(cmds.length / pageSize);

    if (/^\d+$/.test(body)) {
        const num = parseInt(body);
        if (num >= 1 && num <= totalPages) {
            const cmdsToShow = cmds.slice((num - 1) * pageSize, num * pageSize);
            const buffer = await renderHelpMenuCanvas(cmdsToShow, num, totalPages, cmds.length, global.config.PREFIX || "!");
            api.unsendMessage($.messageID);
            return api.sendMessage({
                body: `📜 Trang ${num}/${totalPages} (${cmds.length} lệnh)`,
                attachment: buffer
            }, threadID, (err, info) => {
                global.client.handleReply.push({ name: module.exports.config.name, messageID: info.messageID, author: senderID, type: 'canvasMenu', totalPages });
            }, messageID);
        }
        const globalStt = num - 1;
        if (globalStt >= 0 && globalStt < cmds.length) {
            api.unsendMessage($.messageID);
            const conf = cmds[globalStt].config;
            return api.sendMessage(`Tên: ${conf.name}\nMô tả: ${conf.description}\nCách dùng: ${conf.usages}\nCooldown: ${conf.cooldowns}s`, threadID, messageID);
        }
        return api.sendMessage(`⚠️ Số không hợp lệ`, threadID, messageID);
    }
    return api.sendMessage(`⚠️ Vui lòng reply số trang hoặc số thứ tự lệnh!`, threadID, messageID);
};