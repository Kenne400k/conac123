/**
 * RENT BOT FULL CHỨC NĂNG + CANVAS PRO + DEL/GIA HẠN TỪ LIST
 * - Tự động tạo file/folder.
 * - Giao diện canvas đẹp, cập nhật đầy đủ thông tin (group name, user, ngày thuê, hạn, trạng thái...).
 * - Lệnh list: gửi từng canvas, mỗi canvas có nút reply [del <stt>] hoặc [giahan <stt> <ngày mới>].
 * - Đổi biệt danh bot trong nhóm khi add và tự động mỗi 0h.
 * - Xử lý lỗi an toàn, không emoji, show lỗi đầy đủ và xác thực input.
 * - Vẽ cả MENU bằng CANVAS!
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const crypto = require('crypto');
const cron = require('node-cron');
const { createCanvas } = require("canvas");

const DATA_DIR = path.join(__dirname, 'cache', 'data');
const RENT_DATA_PATH = path.join(DATA_DIR, 'thuebot.json');
const RENT_KEY_PATH = path.join(DATA_DIR, 'keys.json');
const setNameCheckPath = path.join(DATA_DIR, 'setnamecheck.json');
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const CANVAS_DIR = path.join(DATA_DIR, 'rent_canvas');

// Ensure directories exist
[DATA_DIR, CANVAS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Safe JSON helpers
function safeReadJSON(file, defaultValue) {
    try {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf8');
            return defaultValue;
        }
        const raw = fs.readFileSync(file, 'utf8');
        try {
            return JSON.parse(raw);
        } catch (err) {
            fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), 'utf8');
            return defaultValue;
        }
    } catch (e) {
        console.error(`Lỗi đọc file JSON: ${file}`, e);
        return defaultValue;
    }
}
function safeWriteJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Lỗi ghi file JSON: ${file}`, e);
    }
}

let setNameCheck = safeReadJSON(setNameCheckPath, {});
let data = safeReadJSON(RENT_DATA_PATH, []);
let keys = safeReadJSON(RENT_KEY_PATH, {});

const saveData = () => safeWriteJSON(RENT_DATA_PATH, data);
const saveKeys = () => safeWriteJSON(RENT_KEY_PATH, keys);
const saveSetName = () => safeWriteJSON(setNameCheckPath, setNameCheck);

const formatDate = input => input.split('/').reverse().join('/');
const isInvalidDate = date => isNaN(new Date(date).getTime());

const generateKey = () => {
    const randomString = crypto.randomBytes(6).toString('hex').slice(0, 6);
    return `pcoder_${randomString}_key_2025`.toLowerCase();
};

/**
 * Vẽ canvas info đẹp, nhiều thông tin nhất có thể (không emoji)
 */
async function drawRentInfoCanvas({ groupName, userName, groupId, userId, timeStart, timeEnd, daysLeft, status, key, index, canDel, canGiaHan }) {
    const width = 820, height = 470, radius = 30;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // BG gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#23293a");
    gradient.addColorStop(1, "#181d28");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Main box (glass)
    ctx.save();
    ctx.shadowColor = "#1A1E2A99";
    ctx.shadowBlur = 34;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#23293a";
    roundedRect(ctx, 24, 24, width-48, height-48, radius);
    ctx.fill();
    ctx.restore();

    // Header
    ctx.font = "bold 38px Arial";
    ctx.fillStyle = "#FEAD3A";
    ctx.textAlign = "center";
    ctx.fillText("THÔNG TIN THUÊ BOT", width/2, 70);

    // Group name
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#47b7f5";
    ctx.fillText(`${groupName}`, width/2, 110);

    // Info grid
    ctx.textAlign = "left";
    let x0 = 60, y0 = 160, pad = 46;
    ctx.font = "21px Arial";
    ctx.fillStyle = "#F3F3F7";
    ctx.fillText("Người thuê:", x0, y0);
    ctx.fillText("ID:", x0, y0 + pad);
    ctx.fillText("FB:", x0, y0 + pad*2);
    ctx.fillText("Ngày thuê:", x0, y0 + pad*3);
    ctx.fillText("Hết hạn:", x0, y0 + pad*4);
    ctx.fillText("Còn hạn:", x0, y0 + pad*5);
    ctx.fillText("Tình trạng:", x0, y0 + pad*6);

    ctx.font = "bold 21px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(userName, x0 + 170, y0);
    ctx.fillText(userId, x0 + 170, y0 + pad);
    ctx.fillStyle = "#47b7f5";
    ctx.fillText("https://facebook.com/profile.php?id=" + userId, x0 + 170, y0 + pad*2);
    ctx.fillStyle = "#fff";
    ctx.fillText(timeStart, x0 + 170, y0 + pad*3);
    ctx.fillText(timeEnd, x0 + 170, y0 + pad*4);
    ctx.fillText(daysLeft >= 0 ? `${daysLeft} ngày` : "0 ngày", x0 + 170, y0 + pad*5);

    ctx.font = "bold 21px Arial";
    ctx.fillStyle = status === "Hết hạn" ? "#ff5f57" : "#36ea36";
    ctx.fillText(status, x0 + 170, y0 + pad*6);

    // Key info
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#8cf";
    ctx.fillText("Key:", x0, y0 + pad*7);
    ctx.font = "20px Arial";
    ctx.fillStyle = key && key.length > 6 ? "#fff" : "#ccc";
    ctx.fillText(key || "Chưa có key", x0 + 80, y0 + pad*7);

    // Group id
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#8cf";
    ctx.fillText("Group ID:", x0, y0 + pad*8);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(groupId, x0 + 120, y0 + pad*8);

    // Footer: STT, action
    ctx.textAlign = "center";
    ctx.font = "22px Arial";
    ctx.fillStyle = "#8cf";
    ctx.fillText(`STT: ${index}`, width/2, height-80);
    if (canDel || canGiaHan) {
        ctx.font = "italic 19px Arial";
        ctx.fillStyle = "#FEAD3A";
        ctx.fillText(
            `Reply: del ${index} để xóa | giahan ${index} DD/MM/YYYY để gia hạn`,
            width/2, height-50
        );
    }
    ctx.font = "italic 16px Arial";
    ctx.fillStyle = "#A6B7E8";
    ctx.fillText("rent bot dashboard", width / 2, height-22);

    const imgPath = path.join(CANVAS_DIR, `rentinfo_${Date.now()}_${index}.png`);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(imgPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
    });
    return imgPath;
}

/**
 * Vẽ canvas MENU siêu đẹp
 */
async function drawMenuCanvas(prefix) {
    const width = 750, height = 590, radius = 32;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // BG gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#22213a");
    gradient.addColorStop(0.8, "#181d28");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Main rounded box
    ctx.save();
    ctx.shadowColor = "#1A1E2A99";
    ctx.shadowBlur = 32;
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "#23293a";
    roundedRect(ctx, 24, 24, width-48, height-48, radius);
    ctx.fill();
    ctx.restore();

    // Header
    ctx.font = "bold 38px Arial";
    ctx.fillStyle = "#FEAD3A";
    ctx.textAlign = "center";
    ctx.fillText("QUẢN LÝ THUÊ BOT - MENU", width/2, 70);

    // Menu grid
    ctx.font = "22px Arial";
    ctx.textAlign = "left";
    ctx.fillStyle = "#F3F3F7";
    let x0 = 80, y0 = 130, pad = 60;
    ctx.fillText(`${prefix}rent add <ngày HH/MM/YYYY>`, x0, y0 + pad * 0);
    ctx.fillStyle = "#A0C6FF";
    ctx.fillText("➔ Thêm nhóm vào danh sách thuê", x0 + 30, y0 + pad * 0 + 32);

    ctx.fillStyle = "#F3F3F7";
    ctx.fillText(`${prefix}rent newkey <số ngày>`, x0, y0 + pad * 1);
    ctx.fillStyle = "#A0C6FF";
    ctx.fillText("➔ Tạo key thuê bot", x0 + 30, y0 + pad * 1 + 32);

    ctx.fillStyle = "#F3F3F7";
    ctx.fillText(`${prefix}rent info`, x0, y0 + pad * 2);
    ctx.fillStyle = "#A0C6FF";
    ctx.fillText("➔ Xem thông tin thuê bot của nhóm", x0 + 30, y0 + pad * 2 + 32);

    ctx.fillStyle = "#F3F3F7";
    ctx.fillText(`${prefix}rent check`, x0, y0 + pad * 3);
    ctx.fillStyle = "#A0C6FF";
    ctx.fillText("➔ Xem danh sách key đã tạo", x0 + 30, y0 + pad * 3 + 32);

    ctx.fillStyle = "#F3F3F7";
    ctx.fillText(`${prefix}rent list`, x0, y0 + pad * 4);
    ctx.fillStyle = "#A0C6FF";
    ctx.fillText("➔ Xem danh sách nhóm đang thuê", x0 + 30, y0 + pad * 4 + 32);

    // Footer
    ctx.textAlign = "center";
    ctx.font = "italic 20px Arial";
    ctx.fillStyle = "#A6B7E8";
    ctx.fillText("Tham khảo thêm tại github.com/kenne401k", width / 2, height-26);

    // Export
    const imgPath = path.join(CANVAS_DIR, `rentmenu_${Date.now()}.png`);
    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(imgPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
    });
    return imgPath;
}

function roundedRect(ctx, x, y, width, height, radius) {
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

async function changeBotNicknameInGroup(threadID, time_end) {
    const currentDate = moment().tz(TIMEZONE);
    const endDate = moment(time_end, 'DD/MM/YYYY');
    const daysRemaining = endDate.diff(currentDate, 'days');
    let botName;
    if (daysRemaining <= 0) {
        botName = `『 ${global.config.PREFIX} 』⪼ ${global.config.BOTNAME} | Hết hạn`;
    } else if (daysRemaining <= 3) {
        botName = `『 ${global.config.PREFIX} 』⪼ ${global.config.BOTNAME} | Còn ${daysRemaining} ngày`;
    } else {
        botName = `『 ${global.config.PREFIX} 』⪼ ${global.config.BOTNAME} | HSD: ${time_end} | Còn: ${daysRemaining} ngày`;
    }
    try {
        const botUserID = await global.client.api.getCurrentUserID();
        await global.client.api.changeNickname(botName, threadID, botUserID);
    } catch (e) { }
}

module.exports = {
    config: {
        name: 'rent',
        version: '3.2.0',
        hasPermssion: 0,
        credits: 'Pcoder',
        description: "Quản lý thuê bot, tạo/gia hạn nhóm bằng key, hiển thị info + menu bằng canvas đẹp",
        commandCategory: 'Nhóm',
        usePrefix: false,
        usage: '[add/list/info/newkey/check/...]',
        cooldowns: 1
    },

    async run(o) {
        const send = (msg, callback, attachment) =>
            o.api.sendMessage({ body: msg, attachment }, o.event.threadID, callback, o.event.messageID);
        const prefix = global.config.PREFIX;

        if (global.config.ADMINBOT[0] !== o.event.senderID) {
            return send(
                `Chỉ Admin chính mới có thể sử dụng lệnh này!\n\n== HƯỚNG DẪN ==\n` +
                `- ${prefix}rent add <ngày HH/MM/YYYY>\n- ${prefix}rent list\n- ${prefix}rent info\n- ${prefix}rent newkey <số ngày>\n- ${prefix}rent check\n- ${prefix}rent`
            );
        }

        switch (o.args[0]) {
            case 'add': {
                if (!o.args[1]) return send(`Sai cú pháp! Dùng: ${prefix}rent add <ngày HH/MM/YYYY> (hoặc reply người cần thuê)`);
                let userId = o.event.senderID;
                if (o.event.type === "message_reply") userId = o.event.messageReply.senderID;
                else if (Object.keys(o.event.mentions).length > 0) userId = Object.keys(o.event.mentions)[0];
                let t_id = o.event.threadID;
                let time_start = moment.tz(TIMEZONE).format('DD/MM/YYYY');
                let time_end = o.args[1];
                if (o.args.length === 4 && !isNaN(o.args[1]) && !isNaN(o.args[2]) && o.args[3].match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                    t_id = o.args[1];
                    userId = o.args[2];
                    time_end = o.args[3];
                } else if (o.args.length === 3 && !isNaN(o.args[1]) && o.args[2].match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
                    userId = o.args[1];
                    time_end = o.args[2];
                }
                if (isNaN(userId) || isNaN(t_id) || isInvalidDate(formatDate(time_start)) || isInvalidDate(formatDate(time_end)))
                    return send(`ID hoặc Thời Gian Không Hợp Lệ!`);
                const existingData = data.find(entry => entry.t_id === t_id);
                if (existingData) return send(`Nhóm này đã có dữ liệu thuê bot!`);
                data.push({ t_id, id: userId, time_start, time_end });
                saveData();
                await changeBotNicknameInGroup(t_id, time_end);
                const groupName = (global.data.threadInfo.get(t_id) || {}).threadName || "Group";
                const userName = global.data.userName.get(userId) || userId;
                const endDate = moment(time_end, 'DD/MM/YYYY');
                const daysLeft = endDate.diff(moment().tz(TIMEZONE), 'days');
                const keyEntry = Object.entries(keys).find(([key, info]) => info.groupId === t_id);
                const key = keyEntry ? keyEntry[0] : "";
                const imgPath = await drawRentInfoCanvas({
                    groupName, userName, groupId: t_id, userId, timeStart: time_start, timeEnd: time_end, daysLeft, status: daysLeft > 0 ? "Còn hạn" : "Hết hạn", key, index: data.length, canDel: true, canGiaHan: true
                });
                send(`Đã thêm nhóm vào thuê bot!`, null, fs.createReadStream(imgPath));
                setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 8000);
                break;
            }
            case 'list': {
                if (data.length === 0) return send('Chưa có nhóm nào đang thuê bot!');
                let msg = `Danh sách nhóm thuê bot (${data.length}):\n`;
                for (let i = 0; i < data.length; i++) {
                    const item = data[i];
                    const groupName = (global.data.threadInfo.get(item.t_id) || {}).threadName || "Group";
                    const userName = global.data.userName.get(item.id) || item.id;
                    const endDate = moment(item.time_end, 'DD/MM/YYYY');
                    const daysLeft = endDate.diff(moment().tz(TIMEZONE), 'days');
                    const keyEntry = Object.entries(keys).find(([key, info]) => info.groupId === item.t_id);
                    const key = keyEntry ? keyEntry[0] : "";
                    const imgPath = await drawRentInfoCanvas({
                        groupName, userName, groupId: item.t_id, userId: item.id, timeStart: item.time_start, timeEnd: item.time_end, daysLeft, status: daysLeft > 0 ? "Còn hạn" : "Hết hạn", key, index: i + 1, canDel: true, canGiaHan: true
                    });
                    send(
                        `STT ${i + 1}: ${groupName}\nNgười thuê: ${userName}\nNgày thuê: ${item.time_start}\nHết hạn: ${item.time_end}\nCòn hạn: ${daysLeft > 0 ? daysLeft : 0} ngày\nTình trạng: ${daysLeft > 0 ? "Còn hạn" : "Hết hạn"}`, null, fs.createReadStream(imgPath)
                    );
                    setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 8000);
                }
                msg += `\nReply: del <STT> để xóa nhóm | giahan <STT> <ngày mới> để gia hạn nhóm!`;
                send(msg);
                break;
            }
            case 'info': {
                const rentInfo = data.find(entry => entry.t_id === o.event.threadID);
                if (!rentInfo) return send(`Không có dữ liệu thuê bot cho nhóm này`);
                const groupName = (global.data.threadInfo.get(rentInfo.t_id) || {}).threadName || "Group";
                const userName = global.data.userName.get(rentInfo.id) || rentInfo.id;
                const endDate = moment(rentInfo.time_end, 'DD/MM/YYYY');
                const daysLeft = endDate.diff(moment().tz(TIMEZONE), 'days');
                const keyEntry = Object.entries(keys).find(([key, info]) => info.groupId === rentInfo.t_id);
                const key = keyEntry ? keyEntry[0] : "";
                const imgPath = await drawRentInfoCanvas({
                    groupName, userName, groupId: rentInfo.t_id, userId: rentInfo.id, timeStart: rentInfo.time_start, timeEnd: rentInfo.time_end, daysLeft, status: daysLeft > 0 ? "Còn hạn" : "Hết hạn", key, index: data.findIndex(e => e.t_id === rentInfo.t_id) + 1, canDel: true, canGiaHan: true
                });
                send(
                    `THÔNG TIN THUÊ BOT\nNhóm: ${groupName}\nNgười thuê: ${userName}\nNgày thuê: ${rentInfo.time_start}\nHết hạn: ${rentInfo.time_end}\nCòn hạn: ${daysLeft > 0 ? daysLeft : 0} ngày\nTình trạng: ${daysLeft > 0 ? "Còn hạn" : "Hết hạn"}`,
                    null, fs.createReadStream(imgPath)
                );
                setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 8000);
                break;
            }
            case 'newkey': {
                const days = parseInt(o.args[1], 10) || 31;
                if (isNaN(days) || days <= 0) return send(`Số ngày không hợp lệ!`);
                const generatedKey = generateKey();
                keys[generatedKey] = { days: days, used: false, groupId: null };
                saveKeys();
                send(`Key mới: ${generatedKey}\nThời hạn sử dụng: ${days} ngày`);
                break;
            }
            case 'check': {
                if (Object.keys(keys).length === 0) return send('Không có key nào được tạo!');
                let msg = `[ DANH SÁCH KEY ]\n`;
                Object.entries(keys).forEach(([key, info], i) => {
                    msg += `STT ${i + 1}: ${key}\nThời hạn: ${info.days} ngày\nTrạng thái: ${info.used ? 'Đã sử dụng' : 'Chưa sử dụng'}\nID Nhóm: ${info.groupId || 'Chưa sử dụng'}\n\n`;
                });
                send(msg.trim());
                break;
            }
            default: {
                // Vẽ ra menu bằng canvas!
                const imgPath = await drawMenuCanvas(prefix);
                send(
                    "🌟 QUẢN LÝ THUÊ BOT - MENU 🌟\nCác chức năng và cú pháp sử dụng:",
                    null,
                    fs.createReadStream(imgPath)
                );
                setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 8000);
            }
        }
        saveData();
    },

    async handleReply(o) {
        const send = (msg, callback, attachment) => o.api.sendMessage({ body: msg, attachment }, o.event.threadID, callback, o.event.messageID);
        const args = o.event.body.split(' ');
        const command = args.shift().toLowerCase();
        const index = parseInt(args[0]);
        if (isNaN(index) || index < 1 || index > data.length) return send('STT không hợp lệ!');
        switch (command) {
            case 'del': {
                const groupId = data[index - 1].t_id;
                data.splice(index - 1, 1);
                saveData();
                send(`Đã xóa thành công nhóm STT ${index}!`);
                break;
            }
            case 'giahan': {
                const newDate = args[1];
                if (!newDate || isInvalidDate(formatDate(newDate))) return send('Ngày không hợp lệ!');
                data[index - 1].time_end = newDate;
                saveData();
                await changeBotNicknameInGroup(data[index - 1].t_id, newDate);
                send(`Đã gia hạn nhóm STT ${index} đến ${newDate}!`);
                break;
            }
            default: send('Sai cú pháp! Dùng: del <STT> hoặc giahan <STT> <ngày mới>');
        }
    }
};

// Đổi biệt danh của bot cho tất cả nhóm vào 00h mỗi ngày
cron.schedule('0 0 * * *', async () => {
    for (const entry of data) await changeBotNicknameInGroup(entry.t_id, entry.time_end);
});