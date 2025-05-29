module.exports.config = {
  name: "checkbox",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "pcoder",
  description: "Xem số lượng và tên thành viên trong nhóm chat",
  commandCategory: "Tiện ích nhóm",
  usages: "",
  cooldowns: 5
};

module.exports.run = async function({ api, event, Users }) {
  try {
    const threadInfo = await api.getThreadInfo(event.threadID);
    const total = threadInfo.participantIDs.length;
    const admins = threadInfo.adminIDs ? threadInfo.adminIDs.length : 0;
    const name = threadInfo.threadName || "Nhóm này";
    let memberNames = [];
    for (const uid of threadInfo.participantIDs) {
      const userName = await Users.getNameUser(uid) || "Facebook User";
      memberNames.push(userName);
    }
    // Ghép tên thành viên, tối đa 50 dòng cho dễ đọc
    let memberList = memberNames.slice(0, 50).join('\n');
    if (memberNames.length > 50) memberList += `\n...và ${memberNames.length - 50} thành viên nữa.`;

    return api.sendMessage(
      `👥 ${name}\n━━━━━━━━━━━━━━\n• Tổng thành viên: ${total}\n• Quản trị viên: ${admins}\n━━━━━━━━━━━━━━\n👤 Danh sách thành viên:\n${memberList}`,
      event.threadID, event.messageID
    );
  } catch (e) {
    return api.sendMessage("Không thể lấy thông tin nhóm.", event.threadID, event.messageID);
  }
};