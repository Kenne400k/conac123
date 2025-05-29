module.exports.config = {
  name: "baucua",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Fix by em bé của anh bé",
  description: "Game bầu cua có đặt cược",
  commandCategory: "Game",
  usages: "<bầu/cua/tôm/cá/gà/nai> <số tiền>",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args, Currencies }) {
  const { threadID, messageID, senderID } = event;
  const list = ["bầu", "cua", "tôm", "cá", "gà", "nai"];

  if (args.length < 2)
    return api.sendMessage("💬 Cú pháp: baucua <chọn> <số tiền>\n📌 Ví dụ: baucua cá 500", threadID, messageID);

  const choose = args[0].toLowerCase();
  const moneyBet = parseInt(args[1]);

  if (!list.includes(choose))
    return api.sendMessage("❌ Bạn chỉ được chọn: bầu, cua, tôm, cá, gà, nai!", threadID, messageID);

  if (isNaN(moneyBet) || moneyBet <= 0)
    return api.sendMessage("❌ Số tiền cược không hợp lệ.", threadID, messageID);

  const userMoney = (await Currencies.getData(senderID)).money;
  if (moneyBet > userMoney)
    return api.sendMessage("❌ Bạn không đủ tiền để cược!", threadID, messageID);

  // Quay ra 3 con ngẫu nhiên
  const result = [];
  for (let i = 0; i < 3; i++) {
    result.push(list[Math.floor(Math.random() * list.length)]);
  }

  // Đếm số lần trùng với lựa chọn
  const count = result.filter(item => item === choose).length;

  let text = `🎲 Kết quả: ${result.join(" | ")}\n`;
  if (count === 0) {
    await Currencies.decreaseMoney(senderID, moneyBet);
    text += `😢 Bạn không trúng ô nào.\n💸 Mất ${moneyBet}$.`;
  } else {
    const reward = moneyBet * count;
    await Currencies.increaseMoney(senderID, reward);
    text += `🎉 Bạn trúng ${count} lần "${choose}".\n💰 Nhận được ${reward}$.`;
  }

  return api.sendMessage(text, threadID, messageID);
};
