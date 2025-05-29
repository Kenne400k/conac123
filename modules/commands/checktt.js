const fs = require("fs");
const moment = require("moment-timezone");

module.exports.config = {
  name: "checktt",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "pcoder",
  description: "Thống kê tương tác ngày/tuần/tổng trong nhóm, giao diện đẹp",
  commandCategory: "Thống kê",
  usages: "[all/week/day] hoặc tag/reply 1 người để xem cá nhân",
  cooldowns: 5,
  dependencies: {
    "fs": "",
    "moment-timezone": ""
  }
};

const dataDir = __dirname + '/checktt/';

module.exports.onLoad = () => {
  if (!fs.existsSync(dataDir) || !fs.statSync(dataDir).isDirectory()) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  setInterval(() => {
    const today = moment.tz("Asia/Ho_Chi_Minh").day();
    fs.readdirSync(dataDir).forEach(file => {
      let fileData = JSON.parse(fs.readFileSync(dataDir + file));
      if (fileData.time != today) {
        setTimeout(() => {
          fileData = JSON.parse(fs.readFileSync(dataDir + file));
          if (fileData.time != today) {
            fileData.time = today;
            fs.writeFileSync(dataDir + file, JSON.stringify(fileData, null, 4));
          }
        }, 60 * 1000);
      }
    });
  }, 60 * 1000);
};

function getDayVN() {
  const thuEn = moment.tz('Asia/Ho_Chi_Minh').format('dddd');
  return ({
    'Sunday': 'Chủ Nhật',
    'Monday': 'Thứ Hai',
    'Tuesday': 'Thứ Ba',
    'Wednesday': 'Thứ Tư',
    'Thursday': 'Thứ Năm',
    'Friday': 'Thứ Sáu',
    'Saturday': 'Thứ Bảy'
  })[thuEn] || thuEn;
}

module.exports.handleEvent = async function ({ api, event, Threads }) {
  if (!event.isGroup) return;
  if (global.client.sending_top) return;
  const { threadID, senderID } = event;
  const today = moment.tz("Asia/Ho_Chi_Minh").day();

  const filePath = dataDir + threadID + '.json';
  if (!fs.existsSync(filePath)) {
    const newObj = { total: [], week: [], day: [], time: today };
    const threadInfo = await Threads.getInfo(threadID) || {};
    if (threadInfo.isGroup) {
      for (let user of threadInfo.participantIDs) {
        newObj.total.push({ id: user, count: 0 });
        newObj.week.push({ id: user, count: 0 });
        newObj.day.push({ id: user, count: 0 });
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(newObj, null, 4));
  }

  const threadData = JSON.parse(fs.readFileSync(filePath));
  // Update time: reset day/week if sang ngày mới
  if (threadData.time != today) {
    threadData.day.forEach(e => e.count = 0);
    if (today == 1) threadData.week.forEach(e => e.count = 0);
    threadData.time = today;
    fs.writeFileSync(filePath, JSON.stringify(threadData, null, 4));
    global.client.sending_top = true;
    setTimeout(() => global.client.sending_top = false, 5 * 60 * 1000);
  }

  // Tăng count cho sender
  const update = (arr) => {
    let i = arr.findIndex(e => e.id == senderID);
    if (i == -1) arr.push({ id: senderID, count: 1 });
    else arr[i].count++;
  };
  update(threadData.total);
  update(threadData.week);
  update(threadData.day);

  fs.writeFileSync(filePath, JSON.stringify(threadData, null, 4));
};

module.exports.run = async function ({ api, event, args, Users, Threads }) {
  await new Promise(resolve => setTimeout(resolve, 400));
  const { threadID, messageID, senderID, mentions } = event;
  const filePath = dataDir + threadID + '.json';
  if (!fs.existsSync(filePath)) return api.sendMessage("⚠️ Nhóm chưa có dữ liệu tương tác!", threadID, messageID);

  const threadData = JSON.parse(fs.readFileSync(filePath));
  const query = args[0] ? args[0].toLowerCase() : '';
  const mapType = { all: "TỔNG", "-a": "TỔNG", week: "TUẦN", "-w": "TUẦN", day: "NGÀY", "-d": "NGÀY" };
  let data = threadData.total;
  let typeStr = "TỔNG";
  if (query in mapType) {
    typeStr = mapType[query];
    if (typeStr == "TUẦN") data = threadData.week;
    else if (typeStr == "NGÀY") data = threadData.day;
    else data = threadData.total;
  }

  // Xử lý tên từng user
  let storage = [];
  for (const item of data) {
    const name = await Users.getNameUser(item.id) || 'Facebook User';
    storage.push({ id: item.id, count: item.count, name });
  }

  // Nếu tag/reply thì show cá nhân
  let showPersonal = false, UID;
  if ((!mapType[query] && Object.keys(mentions).length) || event.type == 'message_reply') {
    showPersonal = true;
    UID = event.messageReply ? event.messageReply.senderID : Object.keys(mentions)[0];
  }
  if (!showPersonal && !mapType[query] && args.length) showPersonal = true, UID = args[0];

  // Sắp xếp giảm dần theo count, cùng điểm thì theo tên
  storage.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  if (showPersonal) {
    UID = UID || senderID;
    const user = storage.find(e => e.id == UID);
    if (!user) return api.sendMessage("Người này chưa có dữ liệu tương tác.", threadID, messageID);

    // Hạng cá nhân
    const totalRank = threadData.total.sort((a, b) => b.count - a.count).findIndex(e => e.id == UID) + 1;
    const weekRank = threadData.week.sort((a, b) => b.count - a.count).findIndex(e => e.id == UID) + 1;
    const dayRank = threadData.day.sort((a, b) => b.count - a.count).findIndex(e => e.id == UID) + 1;
    const totalCount = threadData.total.find(e => e.id == UID)?.count || 0;
    const weekCount = threadData.week.find(e => e.id == UID)?.count || 0;
    const dayCount = threadData.day.find(e => e.id == UID)?.count || 0;
    const nameUID = user.name;

    // Chức vụ
    const threadInfo = await api.getThreadInfo(threadID);
    let role = "Thành viên";
    if (global.config.ADMINBOT.includes(UID)) role = "Admin Bot";
    else if (global.config.NDH && global.config.NDH.includes(UID)) role = "Người hỗ trợ";
    else if (threadInfo.adminIDs.some(i => i.id == UID)) role = "Quản trị viên";
    const nameThread = threadInfo.threadName;

    // Giao diện gọn, đẹp, rõ ràng
    const msg =
`[📊]==== 『 CHECK TƯƠNG TÁC 』 ==== [📊]
━━━━━━━━━━━━━━━━━━━━━━
👥 Nhóm: ${nameThread}
👤 Thành viên: ${nameUID} (${role})
━━━━━━━━━━━━━━━━━━━━━━
📅 Hôm nay: ${getDayVN()}
🕒 Thời gian: ${moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss | DD/MM/YYYY")}
━━━━━━━━━━━━━━━━━━━━━━
🗓️ Tin nhắn hôm nay: ${dayCount} (Hạng: ${dayRank})
🗓️ Tin nhắn tuần: ${weekCount} (Hạng: ${weekRank})
🗓️ Tổng tin nhắn: ${totalCount} (Hạng: ${totalRank})
━━━━━━━━━━━━━━━━━━━━━━`;

    return api.sendMessage(msg, threadID, messageID);
  } else {
    // Top 20 (hoặc tất cả nếu < 20)
    storage = storage.slice(0, 20);
    let body = storage.map((item, idx) => `${idx + 1}. ${item.name}: ${item.count} tn`).join("\n");
    const sum = storage.reduce((a, b) => a + b.count, 0);

    const msg =
`[📊]==== 『 TOP TƯƠNG TÁC: ${typeStr} 』 ==== [📊]
━━━━━━━━━━━━━━━━━━━━━━
${body}
━━━━━━━━━━━━━━━━━━━━━━
Tổng tin nhắn: ${sum}
Dùng: ${global.config.PREFIX}checktt [all/week/day] hoặc tag/reply để xem cá nhân`;

    return api.sendMessage(msg, threadID, messageID);
  }
};