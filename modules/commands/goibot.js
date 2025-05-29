const fs = global.nodemodule["fs-extra"];
const gradient = require("gradient-string");
const chalk = require("chalk");
const moment = require("moment-timezone");
const figlet = require("figlet");

module.exports.config = {
  name: "goibotv2",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "pcoder",
  description: "goibot siêu xịn, cá nhân hóa, emoji, UI động, gradient, banner",
  commandCategory: "noprefix",
  usages: "noprefix",
  cooldowns: 3,
};

const EMOJIS = ["🤖", "💬", "🌈", "✨", "🦄", "💜", "🌸", "⚡", "😎", "🥰", "🎀", "🎉", "❣️", "💌", "🧸", "💎", "🍀", "⚜️", "🪐"];
const SLOGANS = [
  "Xin chào, tôi là Bot xịn!", "Bot v2 - Ready!", "Messenger AI", "Bot Cute", "Realtime Chat", "Kết nối mọi người", "Bot Siêu Tốc", "Bot All-in-One"
];

function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}
function randomSlogan() {
  return SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
}
function colorLine(str, grad) {
  return grad ? grad(str) : chalk.hex("#ff9aff")(str);
}

function getTimeVN() {
  const now = moment.tz("Asia/Ho_Chi_Minh");
  let gio = now.format("D/MM/YYYY || HH:mm:ss");
  let thu = now.format('dddd');
  const days = {
    Sunday: 'Chủ Nhật', Monday: 'Thứ Hai', Tuesday: 'Thứ Ba', Wednesday: 'Thứ Tư',
    Thursday: 'Thứ Năm', Friday: 'Thứ Sáu', Saturday: 'Thứ Bảy'
  };
  thu = days[thu] || thu;
  return `${thu} | ${gio}`;
}

module.exports.handleEvent = async function({ api, event }) {
  var { threadID, messageID, senderID, body } = event;
  if (!body || typeof body !== "string") return;

  // Câu trả lời đặc biệt cho key word
  const lowerBody = body.toLowerCase();

  // -- CÂU CHỬI/BẮT BẺ, BOT PHẢN ỨNG NGẦU HƠN --
  const insultedWords = [
    ["bot chó", "bot cho"],
    ["bot óc chó", "bot óc cho"],
    ["đmm bot", "dmm bot", "đm bot", "dm bot", "clmm bot", "clmm bot lon", "bot cc", "bot ncc", "bot clmm", "bot ngu", "cc bot", "bot lon", "bot lồn"]
  ];
  const insultReplies = [
    "Ồ, bạn lịch sự chút nhé 😏",
    "Văn minh lên bạn ơi, đừng toxic 😎",
    "Bot không thích bị xúc phạm đâu nha 😢",
    "Bạn nói vậy là bot buồn đó 🥺",
    "Một cái ôm online cho bạn bớt toxic 🤗"
  ];
  for (let arr of insultedWords) {
    if (arr.some(w => lowerBody === w)) {
      let reply = insultReplies[Math.floor(Math.random() * insultReplies.length)];
      return api.sendMessage(reply, threadID, messageID);
    }
  }

  // -- CÂU ĐẶC BIỆT, UI ĐỘNG CHO CHỮ "bot" --
  if (lowerBody.startsWith("bot")) {
    // Banner, time, gradient
    let banner = figlet.textSync(randomSlogan(), { font: "Standard" });
    let header = gradient.rainbow.multiline(banner);
    let EMO = randomEmoji();
    // Thông tin người dùng
    let name = "Bạn";
    try { name = (await api.getUserInfo(senderID))[senderID].name || "Bạn"; } catch {}
    let timeNow = getTimeVN();

    // Gợi ý trả lời random
    const responses = [
      "Xin chào, mình là bot siêu cute 🦄, mình luôn sẵn sàng giúp bạn!",
      `Hey ${name}! ${EMO} Có gì cần bot hỗ trợ không nè?`,
      "Bạn gọi bot có việc gì không nhỉ? 🚀",
      "Bot nghe đây, bạn cần gì? 💬",
      "Chúc bạn một ngày tuyệt vời! 🌈",
      "Bot sẵn sàng nhận lệnh từ bạn, thử hỏi gì đi! ✨",
      "Bạn ơi, bot ở đây nè, i love youuuu 😘",
      "Lệnh admin: https://www.facebook.com/lekhanhhihi nếu cần liên hệ nhé!",
      "Bot cute nhất hệ mặt trời đã xuất hiện đây 🤖",
      "Mình là bot thông minh, bạn muốn nghe thơ, nhạc, hay kể chuyện?",
      "Bot luôn đồng hành cùng bạn 🧸",
      "Hỏi gì cũng được, bot không ngại đâu 😁"
    ];
    let reply = responses[Math.floor(Math.random() * responses.length)];

    // Giao diện động
    let footer = gradient.instagram("━━━━━━━━━━━━[ Bot v2 by JRT x Kenne401k ]━━━━━━━━━━━━");
    let bodyUI =
      header + "\n" +
      chalk.hex("#ffb3ff")(`👤 Người gọi: `) + chalk.hex("#67e8f9")(name) + "\n" +
      chalk.hex("#ffd700")(`⏰ Thời gian: `) + chalk.hex("#c084fc")(timeNow) + "\n" +
      chalk.hex("#ffaccf")(`💬 Nội dung: `) + chalk.hex("#90ee90")(body) + "\n\n" +
      chalk.bold.cyanBright(reply) + "\n" +
      footer;
    // Log đẹp lên terminal
    console.log(bodyUI);

    // Gửi trả lời ngắn gọn trên Messenger
    return api.sendMessage(`${randomEmoji()} ${reply}`, threadID, messageID);
  }

  // Phản hồi các từ khoá đặc biệt khác (ví dụ: yêu, chửi, v.v...) dùng như cũ hoặc tự tuỳ biến...

  // Nếu không khớp gì thì trả lời random ngọt ngào
  if (body.toLowerCase().includes("bot")) {
    let name = "Bạn";
    try { name = (await api.getUserInfo(senderID))[senderID].name || "Bạn"; } catch {}
    let reply = [
      "Bot nghe nè, bạn cần gì không? 🤗",
      "Bạn gọi gì bot đó? 😄",
      "Bot luôn ở đây nếu bạn cần tâm sự 🧸",
      `Có mình ở đây rồi, ${name} cứ yên tâm nhé!`
    ][Math.floor(Math.random() * 4)];
    return api.sendMessage(`${randomEmoji()} ${reply}`, threadID, messageID);
  }
};

module.exports.run = async function ({ api, event }) {
  api.sendMessage(`Tự động trả lời siêu xịn khi có chữ "bot" đầu tin trong câu. Dùng thử luôn nhé!`, event.threadID, event.messageID);
};

/* 
❗️Yêu cầu: npm install gradient-string chalk moment-timezone figlet
- Trả lời thông minh, giao diện log động lên terminal.
- Giao diện Messenger nhẹ nhàng, không spam, không nhàm chán.
- Tự động nhận diện và trả lời ngầu/lịch sự khi bị chửi hay hỏi bot.
- Cực đẹp, cực xịn, cực cá nhân hoá!
*/