module.exports.config = {
  name: "uptime",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "pcoder",
  Rent: 2,
  description: "Hiển thị thời gian hoạt động của bot",
  commandCategory: "Admin",
  usages: "",
  cooldowns: 5
};

module.exports.run = ({ event, api }) => {
  const uptime = process.uptime(); // Thời gian hoạt động (giây)
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);

  // Định dạng HH:MM:SS
  const uptimeString = `${uptimeHours.toString().padStart(2, '0')}:${uptimeMinutes.toString().padStart(2, '0')}:${uptimeSeconds.toString().padStart(2, '0')}`;

  const replyMsg = `🤖 Bot đã hoạt động được: ${uptimeString}`;

  // Nếu có global.gaudev là mảng file, gửi đính kèm, nếu không thì chỉ gửi text
  let attachment = undefined;
  if (global.gaudev && Array.isArray(global.gaudev) && global.gaudev.length > 0) {
    attachment = global.gaudev.splice(0, 1);
  }

  return api.sendMessage({
    body: replyMsg,
    attachment
  }, event.threadID, event.messageID);
};