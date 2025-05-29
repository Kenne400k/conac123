module.exports.config = {
  name: "taixiu",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Em bé chỉnh sửa",
  description: "Chơi game tài xỉu có cược xu",
  commandCategory: "game",
  usages: "[tài/xỉu] [số tiền]",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Currencies }) {
  const { threadID, messageID, senderID } = event;

  // Kiểm tra cú pháp
  const choice = args[0]?.toLowerCase();
  const bet = parseInt(args[1]);

  if (!["tài", "xỉu"].includes(choice) || isNaN(bet) || bet <= 0) {
    return api.sendMessage(
      "⚠️ Cú pháp sai!\nDùng: taixiu [tài/xỉu] [số tiền cược]\nVí dụ: taixiu tài 100",
      threadID,
      messageID
    );
  }

  // Lấy tiền người chơi
  const money = (await Currencies.getData(senderID)).money;
  if (money < bet) {
    return api.sendMessage(`💸 Bạn không đủ tiền. Hiện có: ${money} xu`, threadID, messageID);
  }

  // Tung xúc xắc
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const dice3 = Math.floor(Math.random() * 6) + 1;
  const total = dice1 + dice2 + dice3;
  const result = total >= 11 ? "tài" : "xỉu";

  // So kết quả
  let msg = `🎲 Kết quả tung xúc xắc: ${dice1} + ${dice2} + ${dice3} = ${total}\n`;
  msg += `👉 Kết quả là: ${result.toUpperCase()}\n`;

  if (choice === result) {
    await Currencies.increaseMoney(senderID, bet);
    msg += `🎉 Bạn thắng! +${bet} xu`;
  } else {
    await Currencies.decreaseMoney(senderID, bet);
    msg += `💔 Bạn thua! -${bet} xu`;
  }

  return api.sendMessage(msg, threadID, messageID);
};
