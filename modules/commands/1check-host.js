const axios = require("axios");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "checkhost",
    version: "1.4.0",
    hasPermssion: 0,
    credits: "Kenne401k, Copilot",
    description: "Kiểm tra trạng thái server/website với check-host.net API (canvas banking bảng ngang dọc gọn, đầy đủ node)",
    commandCategory: "Tiện ích",
    usages: "[domain|ip] [A|PING|HTTP|TCP]",
    cooldowns: 5,
};

const TYPE_MAP = {
    "a": "a",
    "ping": "ping",
    "http": "http",
    "tcp": "tcp"
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3, color = "#fff", font = "20px Arial") {
    ctx.font = font;
    ctx.fillStyle = color;
    if (!text) return y;
    let words = text.split(' ');
    let lines = [];
    let line = '';
    let n;
    for (n = 0; n < words.length; n++) {
        let testLine = line + words[n] + " ";
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && line) {
            lines.push(line.trim());
            line = words[n] + " ";
            if (lines.length === maxLines - 1) break;
        } else {
            line = testLine;
        }
    }
    if (lines.length < maxLines) lines.push(line.trim());
    for (let i = 0; i < lines.length; i++) {
        let str = lines[i];
        if (i === maxLines - 1 && n < words.length) str = str.replace(/\s+$/, "") + '...';
        ctx.fillText(str, x, y + (i * lineHeight));
    }
    return y + lines.length * lineHeight;
}

async function drawCheckHostGridCanvas({ target, type, pollResult }) {
    // Tính toán số node
    const locations = Object.keys(pollResult || {});
    const maxPerRow = 6;
    const cellW = 263, cellH = 104, cellPad = 13;
    const cols = maxPerRow, rows = Math.ceil(locations.length / maxPerRow);
    const width = cellW * cols + cellPad * (cols + 1);
    const infoAreaH = 192;
    const height = infoAreaH + cellH * rows + cellPad * (rows + 1) + 52;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // BG gradient
    let bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#19223a");
    bg.addColorStop(1, "#243352");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#253354";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, 82);
    ctx.bezierCurveTo(width-80, 72, 80, 110, 0, 82);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Tiêu đề
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#FEAD3A";
    ctx.textAlign = "center";
    ctx.fillText("CHECK-HOST.NET", width / 2, 48);

    // Info
    ctx.textAlign = "left";
    ctx.font = "21px Arial";
    ctx.fillStyle = "#47b7f5";
    ctx.fillText(`Mục tiêu:`, cellPad, 109);
    ctx.font = "bold 21px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(target, cellPad + 90, 109);

    ctx.font = "21px Arial";
    ctx.fillStyle = "#a0c6ff";
    ctx.fillText(`Loại:`, cellPad, 139);
    ctx.font = "bold 21px Arial";
    ctx.fillStyle = "#ffa55b";
    ctx.fillText(type.toUpperCase(), cellPad + 60, 139);

    ctx.font = "21px Arial";
    ctx.fillStyle = "#A6B7E8";
    ctx.fillText(`Node: ${locations.length}`, cellPad, 169);

    // Kẻ ngang
    ctx.beginPath();
    ctx.moveTo(cellPad, infoAreaH - 10);
    ctx.lineTo(width - cellPad, infoAreaH - 10);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#394a6a";
    ctx.stroke();

    // Node grid
    let i = 0;
    for (const location of locations) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = cellPad + col * (cellW + cellPad);
        const y = infoAreaH + row * (cellH + cellPad);

        // Box
        ctx.save();
        ctx.shadowColor = "#000a";
        ctx.shadowBlur = 6;
        ctx.globalAlpha = 0.98;
        ctx.fillStyle = (row + col) % 2 === 0 ? "#1b263c" : "#243352";
        roundRect(ctx, x, y, cellW, cellH, 12);
        ctx.fill();
        ctx.restore();

        // Tên node
        ctx.font = "bold 17px Arial";
        ctx.fillStyle = "#4ED6F3";
        ctx.fillText(`${i + 1}. [${location}]`, x + 13, y + 27);

        // Kết quả
        const item = pollResult[location];
        let res = "Không có dữ liệu.", color = "#fff";
        if (type === "ping" && Array.isArray(item)) {
            const ok = item.filter(v => v && v[2] !== null);
            if (ok.length === 0) {
                res = "Host unreachable.";
                color = "#ff5f57";
            } else {
                const avg = (ok.reduce((a, b) => a + b[2], 0) / ok.length).toFixed(1);
                res = `Ping tb: ${avg}ms (${ok.length} reply)`;
                color = "#b6ff6c";
            }
        }
        else if (type === "http" && Array.isArray(item)) {
            const http = item.find(v => v && v[1]);
            if (!http) {
                res = "Không có HTTP.";
                color = "#ff5f57";
            } else {
                res = `HTTP: ${http[1]}${http[2] && http[2]['server'] ? " ("+http[2]['server']+")" : ""}`;
                color = "#b6ff6c";
            }
        }
        else if (type === "a" && Array.isArray(item)) {
            const ares = item.find(v => Array.isArray(v[1]));
            if (!ares) {
                res = "Không lấy được IP.";
                color = "#ff5f57";
            } else {
                res = `IP: ${ares[1].join(', ')}`;
                color = "#b6ff6c";
            }
        }
        else if (type === "tcp" && Array.isArray(item)) {
            const ok = item.find(v => v[1] === "OK");
            if (ok) {
                res = "TCP mở (OK)";
                color = "#b6ff6c";
            } else {
                res = "TCP đóng/timeout";
                color = "#ff5f57";
            }
        } else if (item) {
            res = JSON.stringify(item);
            color = "#fff";
        }

        ctx.font = "18px Arial";
        wrapText(ctx, res, x + 13, y + 54, cellW - 26, 23, 3, color);

        i++;
    }

    // Footer
    ctx.font = "italic 16px Arial";
    ctx.fillStyle = "#A6B7E8";
    ctx.textAlign = "center";
    ctx.fillText("Nguồn: check-host.net | credits: Kenne401k", width / 2, height - 19);

    // Xuất file
    const outputDir = path.join(__dirname, '..', 'cache', 'checkhost_canvas');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const imgPath = path.join(outputDir, `checkhost_${Date.now()}.png`);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(imgPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
    });
    return imgPath;
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

module.exports.run = async function({ api, event, args }) {
    if (!args[0]) {
        return api.sendMessage(
            "⚠️ Vui lòng nhập domain hoặc IP cần kiểm tra.\n" +
            "Cách dùng: /checkhost <domain|ip> [A|PING|HTTP|TCP]\n" +
            "Ví dụ: /checkhost google.com ping",
            event.threadID, event.messageID
        );
    }

    let target = args[0];
    let type = args[1] ? args[1].toLowerCase() : "ping";
    if (!TYPE_MAP[type]) type = "ping";
    const typeStr = TYPE_MAP[type];

    try {
        // 1. Start a check
        const startRes = await axios.get(
            `https://check-host.net/check-${typeStr}?host=${encodeURIComponent(target)}`
        );
        const requestId = startRes.data.request_id;
        if (!requestId) {
            return api.sendMessage("❌ Không thể khởi tạo kiểm tra, có thể domain hoặc IP không hợp lệ.", event.threadID, event.messageID);
        }

        // 2. Poll result (try max 7 times)
        let pollResult = null;
        for (let i = 0; i < 7; i++) {
            await new Promise(r => setTimeout(r, 1400));
            const poll = await axios.get(
                `https://check-host.net/check-result/${requestId}`
            );
            if (poll.data && Object.keys(poll.data).length > 0) {
                pollResult = poll.data;
                break;
            }
        }

        if (!pollResult) {
            return api.sendMessage("⏳ Đã gửi yêu cầu kiểm tra, nhưng không nhận được kết quả từ check-host.net. Vui lòng thử lại sau.", event.threadID, event.messageID);
        }

        // 3. Draw canvas grid
        const imgPath = await drawCheckHostGridCanvas({ target, type: typeStr, pollResult });

        return api.sendMessage({
            body: "",
            attachment: fs.createReadStream(imgPath)
        }, event.threadID, () => {
            setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 18000);
        }, event.messageID);

    } catch (e) {
        return api.sendMessage(
            "❌ Lỗi khi truy vấn check-host.net: " + (e.response?.data || e.message),
            event.threadID, event.messageID
        );
    }
};