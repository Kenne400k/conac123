const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ITEMS_PER_PAGE = 30;
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

module.exports.config = {
    name: "11111111111menu",
    version: "3.6.0",
    hasPermssion: 0,
    credits: "Pcoder",
    description: "Hiển thị menu lệnh hiện đại, ảnh canvas 2 cột, phân trang.",
    usages: "[all | tên nhóm] [trang] | [trang] | next | back",
    commandCategory: "Tiện ích",
    cooldowns: 5,
    dependencies: { "canvas": "" }
};

// Helper: Vẽ card menu
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Helper: wrap text canvas
function wrapText(ctx, text, maxWidth, font) {
    if (font) ctx.font = font;
    const words = text.split(' ');
    let lines = [];
    let line = '';
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    return lines;
}

// Tạo ảnh menu canvas
async function createMenuImage(title, items, footer = [], total = 0, prefix = "/", page = 1, perPage = ITEMS_PER_PAGE) {
    const start = (page - 1) * perPage;
    const showItems = items.slice(start, start + perPage);
    const width = 1000, col = 2, padding = 30, cardH = 72, gapY = 18, gapX = 26, cardR = 16, cardPad = 14;
    const headerH = 80, footerH = 48 + (footer.length * 26);
    const rows = Math.ceil(showItems.length / col);
    const colW = (width - (padding * 2) - gapX) / col;
    const height = headerH + rows * (cardH + gapY) + footerH + padding * 2;
    const canvas = createCanvas(width, height > 700 ? height : 700);
    const ctx = canvas.getContext('2d');

    // Bg
    ctx.fillStyle = "#202535";
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.font = "bold 38px Arial";
    ctx.fillStyle = "#58A6FF";
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 55);

    // Card
    let i = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < col; c++) {
            if (i >= showItems.length) break;
            const x = padding + (colW + gapX) * c;
            const y = headerH + padding + (cardH + gapY) * r;
            ctx.save();
            ctx.shadowColor = "#0008";
            ctx.shadowBlur = 10;
            roundRect(ctx, x, y, colW, cardH, cardR);
            ctx.fillStyle = "#2d3441";
            ctx.fill();
            ctx.restore();

            // Text
            ctx.font = "bold 21px Arial";
            ctx.fillStyle = "#FFD369";
            ctx.textAlign = "left";
            ctx.fillText(`${start + i + 1}. ${showItems[i].name || showItems[i].group || "?"}`, x + cardPad, y + 28);
            ctx.font = "16px Arial";
            ctx.fillStyle = "#B0B8C8";
            ctx.fillText(showItems[i].description || "", x + cardPad, y + 54);
            i++;
        }
    }

    // Footer
    ctx.font = "18px Arial";
    ctx.fillStyle = "#C0C8D8";
    ctx.textAlign = "center";
    let fy = headerH + padding + rows * (cardH + gapY) + 30;
    footer.forEach(line => {
        ctx.fillText(line, width / 2, fy);
        fy += 26;
    });
    if (total && title.toUpperCase().includes("TẤT CẢ LỆNH")) {
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = "#C975DC";
        ctx.fillText(`Tổng cộng: ${total} lệnh trong hệ thống`, width / 2, fy);
        fy += 26;
    }
    if (items.length > perPage) {
        ctx.font = "italic 16px Arial";
        ctx.fillStyle = "#9098A8";
        ctx.fillText(`Trang ${page}/${Math.ceil(items.length / perPage)}. Gửi "next" hoặc "back" để lật trang.`, width / 2, fy);
    }

    // Ghi file tạm (bắt buộc ghi file vì fca không nhận buffer trực tiếp)
    const filePath = path.join(CACHE_DIR, `menu_${Date.now()}.png`);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(filePath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
    });
    return filePath;
}

// ==== HANDLE REPLY ====
module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { commands, config: botConfig } = global.client;
    const prefix = botConfig.PREFIX || "/";
    const { messageID, threadID, body, senderID } = event;
    const { name, content } = handleReply;
    if (name !== this.config.name) return;
    if (senderID !== handleReply.author) return api.sendMessage("⚠️ Bạn không phải là người đã yêu cầu menu này.", threadID, messageID);

    let {
        allItems, currentPage, itemsPerPage, totalPages,
        replyTypeForNextStep, originalArgs, menuTitle
    } = content;

    const input = body.trim().toLowerCase();
    let imagePath;

    if (input === "next" || input === "back") {
        if (!totalPages || totalPages <= 1) return api.sendMessage("Menu chỉ có một trang.", threadID, messageID);
        currentPage = input === "next"
            ? (currentPage < totalPages ? currentPage + 1 : 1)
            : (currentPage > 1 ? currentPage - 1 : totalPages);
        const footer = [`Gửi STT hoặc "next/back" để chuyển trang.`, `Dùng ${prefix}menu để quay lại menu chính.`];
        try {
            imagePath = await createMenuImage(menuTitle, allItems, footer, commands.size, prefix, currentPage, itemsPerPage);
            const info = await api.sendMessage({
                body: `📄 Trang ${currentPage}/${totalPages} của "${menuTitle}"`,
                attachment: fs.createReadStream(imagePath)
            }, threadID);
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                content: { ...content, currentPage }
            });
        } finally {
            if (imagePath) try { fs.unlinkSync(imagePath); } catch {}
        }
        return;
    }

    const num = parseInt(input);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const showOnPage = allItems.slice(startIdx, startIdx + itemsPerPage).length;
    if (isNaN(num) || num < 1 || num > showOnPage) {
        return api.sendMessage(`⚠️ Số bạn chọn không hợp lệ (1 - ${showOnPage})`, threadID, messageID);
    }
    const globalIdx = (currentPage - 1) * itemsPerPage + num - 1;
    const selected = allItems[globalIdx];

    if (replyTypeForNextStep === "cmd_group") {
        // Nhóm lệnh
        const groupData = selected;
        let lst = [];
        groupData.cmds.forEach(cmdName => {
            const conf = commands.get(cmdName)?.config;
            if (conf && !conf.hidden) lst.push({ name: cmdName, description: conf.description || "" });
        });
        lst.sort((a,b) => a.name.localeCompare(b.name));
        const subTitle = `Lệnh Nhóm: ${groupData.group.toUpperCase()}`;
        const subPages = Math.ceil(lst.length / ITEMS_PER_PAGE);
        const subFooter = [`Gửi STT để xem chi tiết.`, `Dùng "next/back" để lật trang.`];
        let imgPath;
        try {
            imgPath = await createMenuImage(subTitle, lst, subFooter, 0, prefix, 1, ITEMS_PER_PAGE);
            const info = await api.sendMessage({
                body: `📁 Nhóm lệnh: ${groupData.group.toUpperCase()} (Trang 1/${subPages})`,
                attachment: fs.createReadStream(imgPath)
            }, threadID);
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                content: {
                    allItems: lst,
                    currentPage: 1,
                    itemsPerPage: ITEMS_PER_PAGE,
                    totalPages: subPages,
                    replyTypeForNextStep: "cmd_info",
                    originalArgs: `group_${groupData.group.toLowerCase()}`,
                    menuTitle: subTitle
                }
            });
        } finally { if (imgPath) try { fs.unlinkSync(imgPath); } catch {} }
    } else if (replyTypeForNextStep === "cmd_info") {
        // Chi tiết lệnh
        const cmdName = selected.name || selected.originalCmdName || (typeof selected === 'string' ? selected.split(':')[0].trim() : "N/A");
        const conf = commands.get(cmdName)?.config;
        if (!conf) return api.sendMessage(`❌ Lệnh "${cmdName}" không còn tồn tại.`, threadID, messageID);
        let msg = `📌 Thông tin lệnh: ${cmdName}\n`;
        msg += `\n📖 Mô tả: ${conf.description || "N/A"}`;
        msg += `\n🛠️ Cách dùng: ${prefix}${cmdName} ${conf.usages || ""}`;
        msg += `\n⏳ Cooldown: ${conf.cooldowns || 3} giây`;
        msg += `\n⚖️ Quyền hạn: ${conf.hasPermssion == 0 ? "Mọi người" : conf.hasPermssion == 1 ? "QTV Nhóm" : conf.hasPermssion == 2 ? "QTV Bot" : "Không rõ"}`;
        msg += `\n💡 Credits: ${conf.credits || "N/A"}`;
        return api.sendMessage(msg, threadID, messageID);
    } else {
        api.sendMessage("⚠️ Lỗi: Không xác định hành động tiếp theo.", threadID, messageID);
    }
};

// ==== MAIN RUN ====
module.exports.run = async function ({ api, event, args }) {
    const { commands, config: botConfig } = global.client;
    const { threadID, senderID, messageID } = event;
    const prefix = botConfig.PREFIX || "/";
    let allItems = [];
    let menuTitle = "DANH MỤC LỆNH";
    let footer = [];
    let replyType;
    let requestedPage = 1;
    if (args.length > 0 && /^\d+$/.test(args[args.length - 1])) {
        requestedPage = parseInt(args.pop());
        if (requestedPage <= 0) requestedPage = 1;
    }
    const arg = args.length > 0 ? args.join(" ").toLowerCase() : "default";
    // TẤT CẢ LỆNH
    if (arg === "all" || arg === "-a") {
        menuTitle = "TẤT CẢ LỆNH";
        commands.forEach(cmd => {
            if (cmd.config && cmd.config.name && !cmd.config.hidden && cmd.config.commandCategory !== "NSFW") {
                allItems.push({ name: cmd.config.name, description: cmd.config.description || "" });
            }
        });
        allItems.sort((a,b) => a.name.localeCompare(b.name));
        footer = [`Có ${allItems.length} lệnh có thể dùng.`];
        replyType = "cmd_info";
    } else {
        // Nhóm lệnh
        menuTitle = "NHÓM LỆNH";
        let groups = {};
        let specificGroup = false;
        commands.forEach(cmd => {
            if (cmd.config && cmd.config.commandCategory && cmd.config.name && !cmd.config.hidden && cmd.config.commandCategory !== "NSFW") {
                const cat = cmd.config.commandCategory.trim();
                if (arg !== "default" && cat.toLowerCase() === arg) {
                    if (!specificGroup) {
                        allItems = [];
                        menuTitle = `Lệnh Nhóm: ${cat.toUpperCase()}`;
                        specificGroup = true;
                    }
                    allItems.push({ name: cmd.config.name, description: cmd.config.description || "" });
                } else if (arg === "default" && !specificGroup) {
                    if (!groups[cat]) groups[cat] = { group: cat, cmds: [] };
                    groups[cat].cmds.push(cmd.config.name);
                }
            }
        });
        if (specificGroup) {
            allItems.sort((a,b) => a.name.localeCompare(b.name));
            footer = [`Các lệnh trong nhóm "${arg.toUpperCase()}".`];
            replyType = "cmd_info";
        } else {
            if (arg !== "default") {
                return api.sendMessage(`Không tìm thấy nhóm lệnh "${arg}". Dùng '${prefix}menu' để xem danh sách nhóm.`, threadID, messageID);
            }
            allItems = Object.values(groups).map(g => ({
                group: g.group,
                description: `(${g.cmds.length} lệnh)`,
                cmds: g.cmds
            }));
            footer = [`Bot có ${commands.size} lệnh, chia thành ${allItems.length} nhóm.`];
            replyType = "cmd_group";
        }
    }

    if (allItems.length === 0) {
        let msg = (arg === "all" || arg === "-a")
            ? `Không có lệnh công khai nào!`
            : (arg !== "default" ? `Nhóm "${arg.toUpperCase()}" không có lệnh hoặc không tồn tại.` : `Không có gì để hiển thị.`);
        return api.sendMessage(msg, threadID, messageID);
    }

    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    if (requestedPage > totalPages) requestedPage = totalPages;
    if (allItems.length > ITEMS_PER_PAGE) {
        footer.push(`Gửi STT để chọn, hoặc "next/back" để lật trang.`);
    } else {
        footer.push(`Gửi STT để chọn mục bạn muốn.`);
    }
    footer.push(`Dùng ${prefix}help <tên lệnh> để xem nhanh chi tiết.`);

    let imagePath;
    try {
        imagePath = await createMenuImage(menuTitle, allItems, footer, (arg === "all" ? commands.size : 0), prefix, requestedPage, ITEMS_PER_PAGE);
        let msg = `🌟 ${menuTitle} 🌟`;
        if (totalPages > 1) msg += ` (Trang ${requestedPage}/${totalPages})`;
        const info = await api.sendMessage({
            body: msg,
            attachment: fs.createReadStream(imagePath)
        }, threadID);
        if (allItems.length > 0)
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: senderID,
                content: {
                    allItems,
                    currentPage: requestedPage,
                    itemsPerPage: ITEMS_PER_PAGE,
                    totalPages,
                    replyTypeForNextStep: replyType,
                    originalArgs: arg,
                    menuTitle
                }
            });
    } finally {
        if (imagePath) try { fs.unlinkSync(imagePath); } catch {}
    }
};