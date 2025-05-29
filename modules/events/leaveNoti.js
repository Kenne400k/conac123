module.exports.config = {
	name: "leaveNoti",
	eventType: ["log:unsubscribe"],
	version: "1.0.0",
	credits: "HĐGN", // Mod by H.Thanh
	description: "Thông báo Bot hoặc người rời khỏi nhóm có random gif/ảnh/video",
	dependencies: {
		"fs-extra": "",
		"path": ""
	}
};

const checkttPath = __dirname + '/../commands/tuongtac/checktt/';

module.exports.onLoad = function () {
    const { existsSync, mkdirSync } = require("fs-extra");
    const { join } = require("path");

    const path = join(__dirname, "cache", "leaveGif", "randomgif");
    if (!existsSync(path)) mkdirSync(path, { recursive: true });

    return;
};

module.exports.run = async function ({ api, event, Users, Threads }) {
    if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;
    const { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require("fs-extra");
    const { join } = require(["path");
    const { threadID } = event;
    var fullYear = global.client.getTime("fullYear");
    var getHours = await global.client.getTime("hours");
    const moment = require("moment-timezone");
    const time = moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY || HH:mm:s");
    const hours = moment.tz("Asia/Ho_Chi_Minh").format("HH");
    const data = global.data.threadData.get(parseInt(threadID)) || (await Threads.getData(threadID)).data;
    const iduser = event.logMessageData.leftParticipantFbId;
    const name = global.data.userName.get(event.logMessageData.leftParticipantFbId) || await Users.getNameUser(event.logMessageData.leftParticipantFbId);
	const type = (event.author == event.logMessageData.leftParticipantFbId) ? "Cút" : "Bị Đuổi Khỏi Nhóm";
	const path = join(__dirname, "cache", "leaveGif","randomgif");
	const pathGif = join(path, `${threadID}`);
	var msg, formPush;

	if (existsSync(checkttPath + threadID + '.json')) {
        const threadData = JSON.parse(readFileSync(checkttPath + threadID + '.json'));
        const userData_week_index = threadData.week.findIndex(e => e.id == event.logMessageData.leftParticipantFbId);
        const userData_day_index = threadData.day.findIndex(e => e.id == event.logMessageData.leftParticipantFbId);
        const userData_total_index = threadData.total.findIndex(e => e.id == event.logMessageData.leftParticipantFbId);
        if (userData_total_index != -1) {
            threadData.total.splice(userData_total_index, 1);
        }
        if (userData_week_index != -1) {
            threadData.week.splice(userData_week_index, 1);
        }
        if (userData_day_index != -1) {
            threadData.day.splice(userData_day_index, 1);
        }

        writeFileSync(checkttPath + threadID + '.json', JSON.stringify(threadData, null, 4));
    }

	(typeof data.customLeave == "undefined") ? msg = "🐶 {name} đã {type} khỏi grup !!!\n📎 Url: m.me/{iduser}\n⏰ Thời Gian out: Buổi {session} || {time}\n📅 ngày ra: {fullYear}" : msg = data.customLeave;
	msg = msg
    .replace(/\{iduser}/g, iduser)
    .replace(/\{name}/g, name)
    .replace(/\{type}/g, type)
    .replace(/\{session}/g, hours <= 10 ? "𝑠𝑎́𝑛𝑔" : 
    hours > 10 && hours <= 12 ? "Trưa" :
    hours > 12 && hours <= 18 ? "Chiều" : "Tối")
    .replace(/\{fullYear}/g, fullYear)
    .replace(/\{time}/g, time);

	const randomPath = readdirSync(join(__dirname, "cache", "leaveGif", "randomgif"));

	if (existsSync(pathGif)) formPush = { body: msg, attachment: createReadStream(pathGif) };
	else if (randomPath.length != 0) {
		const pathRandom = join(__dirname, "cache", "leaveGif", "randomgif", `${randomPath[Math.floor(Math.random() * randomPath.length)]}`);
		formPush = { body: msg, attachment: createReadStream(pathRandom) };
	} else {
		formPush = { body: msg };
	}

	const sentMessage = await api.sendMessage({body:msg,attachment: global.khanhdayr.splice(0, 1)
                              },  threadID);

    // Thu hồi tin nhắn sau 10 giây
    setTimeout(() => {
        api.unsendMessage(sentMessage.messageID);
    }, 10000); // 10000ms = 10s
};