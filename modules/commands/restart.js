module.exports.config = {
	name: "restart",
	version: "2.0.0",
	hasPermssion: 3,
	credits: "Chill with Tea, cải tiến Kenne401k",
	description: "Khởi động lại Bot và thông báo khi lên lại",
	commandCategory: "Admin",
	usages: "[giây]",
	cooldowns: 5
};

const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const restartNotifyPath = path.join(__dirname, "../../cache/restart_notify.json");

function getThuVN(thu) {
	switch (thu) {
		case "Sunday": return "Chủ Nhật";
		case "Monday": return "Thứ Hai";
		case "Tuesday": return "Thứ Ba";
		case "Wednesday": return "Thứ Tư";
		case "Thursday": return "Thứ Năm";
		case "Friday": return "Thứ Sáu";
		case "Saturday": return "Thứ Bảy";
		default: return thu;
	}
}

module.exports.run = async ({ api, event, args }) => {
	const { threadID, messageID, senderID } = event;
	const { commands } = global.client;
	const adminIDs = global.config.ADMINBOT || [];
	if (!adminIDs.includes(senderID))
		return api.sendMessage("⚠️ Bạn không có quyền sử dụng lệnh này!", threadID, messageID);

	// Xác định thời gian đếm ngược restart
	let rstime = parseInt(args[0], 10);
	if (isNaN(rstime) || rstime < 1) rstime = 5;

	// Lưu notify để khi bot lên lại sẽ gửi cho admin đã restart
	const restartNotify = {
		threadID,
		senderID,
		time: Date.now()
	};
	try {
		fs.writeFileSync(restartNotifyPath, JSON.stringify(restartNotify, null, 2), "utf8");
	} catch (e) { /* Bỏ qua lỗi ghi file */ }

	const now = moment.tz("Asia/Ho_Chi_Minh");
	const thuVN = getThuVN(now.format("dddd"));

	api.sendMessage(
		`🔄 Đang chuẩn bị khởi động lại bot...\n→ Thời gian: ${now.format("HH:mm:ss - DD/MM/YYYY")} - ${thuVN}\n→ Tổng lệnh hiện tại: ${commands.size} lệnh\n──────────────────\n[𝗕𝗼𝘁] → Sẽ khởi động lại sau ${rstime} giây nữa.`,
		threadID
	);

	setTimeout(() => {
		api.sendMessage("[𝗕𝗼𝘁] → Tiến hành khởi động lại!", threadID, () => process.exit(1));
	}, rstime * 1000);
};


// ====== Thêm vào code khởi động bot (ví dụ ở listen.js hoặc main.js) ======
/*
const fs = require("fs");
const path = require("path");
const restartNotifyPath = path.join(__dirname, "cache/restart_notify.json");
setTimeout(async () => {
	try {
		if (fs.existsSync(restartNotifyPath)) {
			const notify = JSON.parse(fs.readFileSync(restartNotifyPath, "utf8"));
			const { threadID, senderID, time } = notify;
			const moment = require("moment-timezone");
			const now = moment.tz("Asia/Ho_Chi_Minh");
			const msg = `✅ [BOT ĐÃ KHỞI ĐỘNG LẠI]\n→ Thời gian: ${now.format("HH:mm:ss - DD/MM/YYYY")}\n→ Gửi bởi Admin: https://facebook.com/${senderID}\n→ Uptime: ${(Math.floor(process.uptime()))} giây`;
			global.client.api.sendMessage(msg, threadID);
			fs.unlinkSync(restartNotifyPath);
		}
	} catch (e) { /* bỏ qua lỗi *\/ }
}, 5000);
// ====== Kết thúc phần bổ sung ======
*/