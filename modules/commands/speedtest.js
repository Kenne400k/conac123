module.exports.config = {
  name: "speedtest",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Mirai Team",
  description: "Kiểm tra tốc độ mạng",
  commandCategory: "Công cụ",
  cooldowns: 15,
  dependencies: {
  "fast-speedtest-api": ""
}
};

module.exports.run = async function({ api, event }) {
try {
  const fast = global.nodemodule["fast-speedtest-api"];
  const speedTest = new fast({
    token: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm",
    verbose: false,
    timeout: 10000,
    https: true,
    urlCount: 5,
    bufferSize: 8,
    unit: fast.UNITS.Mbps
  });
  const resault = await speedTest.getSpeed();
  return api.sendMessage(
    "=== Result ===" + 
    "\n- Tốc độ mạng: " + resault + " Mbps",
    event.threadID, event.messageID
  );
}
catch {
  return api.sendMessage("Không thể speedtest ngay lúc này, hãy thử lại sau!", event.threadID, event.messageID);
}
}