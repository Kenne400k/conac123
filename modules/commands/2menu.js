const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "enu",
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Kenne401k, DC-Nam, Copilot 4K layout",
    description: "Menu banking canvas, hiện full lệnh 5 nhóm đầu, hình 4K sắc nét, bố cục dễ nhìn",
    commandCategory: "Người dùng",
    usages: "[số trang/tên lệnh]",
    cooldowns: 2
};

function TextPr(permission) {
    switch (permission) {
        case 0: return "Thành Viên";
        case 1: return "Qtv Nhóm";
        case 2: return "Admin Bot";
        default: return "Toàn Quyền";
    }
}

// Wrap text for a given max width, returns array of lines
function wrapLines(ctx, text, maxWidth, maxLines = 3) {
    if (!text) return [""];
    const words = text.split(' ');
    let lines = [], line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line.trim());
            line = words[n] + ' ';
            if (lines.length === maxLines - 1) break;
        } else {
            line = testLine;
        }
    }
    if (lines.length < maxLines) lines.push(line.trim());
    if (lines.length === maxLines && words.length > 0 && ctx.measureText(line).width > maxWidth)
        lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+$/, "") + '...';
    return lines;
}

function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}

// 4K: 3840x2160. We'll do a vertical scrollable design (but only 5 groups).
async function drawMenuBanking4K({ groups, prefix, uptime, totalCmd, totalEvents }) {
    // Calculate needed height
    let groupHeights = [];
    const width = 3840, leftPad = 180, rightPad = 180;
    let y = 340;
    const startY = y;
    let totalHeight = 340 + 120 + groups.reduce((acc, group) => {
        // estimate: 80 + (num lệnh) * 45
        const ncmd = group.nameModule.length;
        const est = 120 + 45 * ncmd;
        groupHeights.push(est);
        return acc + est + 36;
    }, 0) + 320;
    // minimum to look good on 4k
    const height = Math.max(2160, totalHeight);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // BG gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, "#1b2233");
    bgGradient.addColorStop(1, "#11131A");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Header bar
    ctx.save();
    ctx.globalAlpha = 0.985;
    ctx.fillStyle = "#222a39";
    roundRect(ctx, 0, 0, width, 220, { tl: 70, tr: 70, br: 0, bl: 0 });
    ctx.fill();
    ctx.restore();

    // Đèn banking
    [0, 1, 2].forEach(i => {
        ctx.beginPath();
        ctx.fillStyle = ["#ff5f57", "#febb2e", "#28c840"][i];
        ctx.arc(90 + i * 60, 100, 25, 0, Math.PI * 2);
        ctx.fill();
    });

    // Tiêu đề
    ctx.fillStyle = "#FEAD3A";
    ctx.font = "bold 100px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#fff5";
    ctx.shadowBlur = 8;
    ctx.fillText("DANH MỤC LỆNH BOT", width / 2, 110);
    ctx.shadowBlur = 0;

    // Tổng lệnh, tổng event, uptime
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#A0C6FF";
    ctx.textAlign = "center";
    ctx.fillText(`Tổng lệnh: ${totalCmd} • Tổng sự kiện: ${totalEvents} • Uptime: ${uptime}`, width / 2, 205);

    // Box từng nhóm
    y = startY + 30;
    ctx.textAlign = "left";
    ctx.shadowColor = "#000A";
    ctx.shadowBlur = 18;
    groups.forEach((group, idx) => {
        // Outer group box
        const boxH = groupHeights[idx];
        ctx.save();
        ctx.globalAlpha = 0.99;
        ctx.fillStyle = idx % 2 === 0 ? "#1e293b" : "#23293a";
        roundRect(ctx, leftPad, y, width - leftPad - rightPad, boxH, 44);
        ctx.fill();
        ctx.restore();

        // Nhóm title
        ctx.font = "bold 60px Arial";
        ctx.fillStyle = "#4ED6F3";
        ctx.shadowColor = "#000A";
        ctx.shadowBlur = 20;
        ctx.fillText(`${idx + 1}. ${group.cmdCategory.toUpperCase()}`, leftPad + 60, y + 80);

        // Quyền + tổng số
        ctx.font = "40px Arial";
        ctx.fillStyle = "#FEAD3A";
        ctx.shadowBlur = 0;
        ctx.fillText(`Quyền: ${TextPr(group.permission)}   •   ${group.nameModule.length} lệnh`, leftPad + 72, y + 140);

        // Danh sách lệnh
        let lY = y + 200;
        ctx.font = "34px Arial";
        group.nameModule.forEach((name, stt) => {
            const desc = global.client.commands.get(name).config.description;
            // Tên lệnh
            ctx.fillStyle = "#8af";
            ctx.font = "bold 38px Arial";
            ctx.fillText(`› ${prefix}${name}`, leftPad + 90, lY);
            // Mô tả, wrap nếu dài
            ctx.font = "33px Arial";
            ctx.fillStyle = "#fff";
            const lines = wrapLines(ctx, desc, width - leftPad - rightPad - 440, 3);
            lines.forEach((line, i) => {
                ctx.fillText(line, leftPad + 370, lY + i * 41);
            });
            lY += 45 * lines.length;
        });

        y += boxH + 36;
    });
    ctx.shadowBlur = 0;

    // Footer: hướng dẫn reply, prefix
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "#A6B7E8";
    ctx.textAlign = "center";
    ctx.fillText(`Reply số thứ tự nhóm để xem chi tiết. ${prefix}enu <tên lệnh> để xem hướng dẫn.`, width / 2, height - 220);
    ctx.font = "italic 41px Arial";
    ctx.fillStyle = "#A0C6FF";
    ctx.fillText(`Trang này chỉ hiển thị 5 nhóm lệnh đầu tiên.`, width / 2, height - 140);

    // Xuất file
    const outputDir = path.join(__dirname, '..', 'cache', 'menu_canvas');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const imgPath = path.join(outputDir, `menu_4k_${Date.now()}.png`);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(imgPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on("finish", resolve);
        out.on("error", reject);
    });
    return imgPath;
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID } = event;
    const cmds = global.client.commands;
    const events = global.client.events;
    const threadData = global.data.threadData.get(threadID) || {};
    const prefix = threadData.PREFIX || global.config.PREFIX;

    // Uptime
    const uptimeSec = process.uptime() | 0;
    const h = (uptimeSec / 3600) | 0,
        m = ((uptimeSec % 3600) / 60) | 0,
        s = uptimeSec % 60;
    const uptime = `${h}h${m}m${s}s`;

    // Gom nhóm lệnh theo category
    let array = [];
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
    // Hiện 5 nhóm đầu, full lệnh nhóm đó
    const showArray = array.slice(0, 5);

    // Vẽ canvas banking 4k
    const imgPath = await drawMenuBanking4K({
        groups: showArray,
        prefix,
        uptime,
        totalCmd: cmds.size,
        totalEvents: events.size
    });

    return api.sendMessage({
        body: "",
        attachment: fs.createReadStream(imgPath)
    }, threadID, async (err, info) => {
        if (err) return;
        global.client.handleReply.push({
            type: "group_menu",
            name: this.config.name,
            author: event.senderID,
            messageID: info.messageID,
            array: showArray,
            prefix
        });
        setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 18000);
    }, messageID);
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    const { type, array, prefix, author } = handleReply;
    if (event.senderID != author) return;
    const num = parseInt(event.body.trim());
    if (isNaN(num) || num < 1 || num > array.length) {
        return api.sendMessage("Vui lòng reply số thứ tự hợp lệ để xem chi tiết nhóm lệnh!", event.threadID, event.messageID);
    }
    const group = array[num - 1];
    // Gửi chi tiết nhóm bằng text (nếu muốn banking tiếp thì hỏi nhé!)
    let msg = `⭐━━〈 ${group.cmdCategory.toUpperCase()} 〉━━⭐\n`;
    group.nameModule.forEach((name, idx) => {
        const cmd = global.client.commands.get(name).config;
        msg += `\n${idx + 1}. ${prefix}${cmd.name}\n📌 ${cmd.description}`;
    });
    msg += `\n\nReply số thứ tự để xem hướng dẫn chi tiết lệnh!`;
    return api.sendMessage(msg, event.threadID, (err, info) => {
        if (err) return;
        global.client.handleReply.push({
            type: "cmd_menu",
            name: module.exports.config.name,
            author: event.senderID,
            messageID: info.messageID,
            cmds: group.nameModule
        });
    }, event.messageID);
};

module.exports.handleReply = async function({ api, event, handleReply }) {
    if (handleReply.type === "group_menu") {
        const num = parseInt(event.body.trim());
        if (isNaN(num) || num < 1 || num > handleReply.array.length) {
            return api.sendMessage("Vui lòng reply số thứ tự hợp lệ để xem chi tiết nhóm lệnh!", event.threadID, event.messageID);
        }
        const group = handleReply.array[num - 1];
        let msg = `⭐━━〈 ${group.cmdCategory.toUpperCase()} 〉━━⭐\n`;
        group.nameModule.forEach((name, idx) => {
            const cmd = global.client.commands.get(name).config;
            msg += `\n${idx + 1}. ${handleReply.prefix}${cmd.name}\n📌 ${cmd.description}`;
        });
        msg += `\n\nReply số thứ tự để xem hướng dẫn chi tiết lệnh!`;
        return api.sendMessage(msg, event.threadID, (err, info) => {
            if (err) return;
            global.client.handleReply.push({
                type: "cmd_menu",
                name: module.exports.config.name,
                author: event.senderID,
                messageID: info.messageID,
                cmds: group.nameModule
            });
        }, event.messageID);
    }
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