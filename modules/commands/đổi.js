module.exports.config = {
  name: "đổi",
  version: "1.1.1",
  hasPermssion: 0,
  credits: "Quất",
  description: "Chuyển đổi link từ pastebin sang runmocky và ngược lại",
  commandCategory: "Admin",
  usages: "",
  cooldowns: 0,
  dependencies: {
    "axios": "",
    "pastebin-api": ""
  }
};

const axios = require('axios');

module.exports.run = async function ({ api, event, args }) {
  // Chỉ hoạt động khi reply tin nhắn chứa link
  if (event.type === 'message_reply' && event.messageReply.body && typeof event.messageReply.body === 'string') {
    const attachment = event.messageReply.body.trim();

    // --- PASTEBIN -> RUNMOCKY ---
    if (attachment.includes('pastebin.com')) {
      let pastebinLink = attachment;
      // Đảm bảo có raw nếu là link pastebin thường
      if (!pastebinLink.includes('/raw/')) {
        // Lấy id và chuyển sang raw
        const match = pastebinLink.match(/pastebin\.com\/(?:raw\/)?([A-Za-z0-9]+)/);
        if (match && match[1]) {
          pastebinLink = `https://pastebin.com/raw/${match[1]}`;
        }
      }

      try {
        const response = await axios.get(pastebinLink);
        const sourceCode = response.data;
        const upRes = await axios.post("https://api.mocky.io/api/mock", {
          "status": 200,
          "content": sourceCode,
          "content_type": "application/json",
          "charset": "UTF-8",
          "secret": "NguyenMinhHuy",
          "expiration": "never"
        });
        return api.sendMessage(`${upRes.data.link}`, event.threadID, event.messageID);
      } catch (e) {
        console.log(e);
        return api.sendMessage('⚠️ Lỗi khi chuyển từ Pastebin sang Runmocky. Kiểm tra lại link đầu vào hoặc thử lại sau.', event.threadID, event.messageID);
      }

    // --- RUNMOCKY -> PASTEBIN ---
    } else if (attachment.includes('run.mocky.io')) {
      const runmockyLink = attachment;
      try {
        const response = await axios.get(runmockyLink);
        const sourceCode = typeof response.data === "string" ? response.data : JSON.stringify(response.data, null, 2);
        const { PasteClient } = require('pastebin-api');
        const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");
        const name = "runmocky_" + generateId();

        const url = await client.createPaste({
          code: sourceCode,
          expireDate: 'N',
          format: "javascript",
          name: name,
          publicity: 1
        });
        // Đảm bảo trả về link RAW
        const id = url.split('/')[3];
        return api.sendMessage(`https://pastebin.com/raw/${id}`, event.threadID, event.messageID);

      } catch (e) {
        console.log(e);
        return api.sendMessage('⚠️ Lỗi khi chuyển từ Runmocky sang Pastebin. Kiểm tra lại link đầu vào hoặc thử lại sau.', event.threadID, event.messageID);
      }
    } else {
      return api.sendMessage('⚠️ Bạn cần reply một link pastebin hoặc runmocky để chuyển đổi.', event.threadID, event.messageID);
    }
  } else {
    return api.sendMessage('⚠️ Vui lòng reply một tin nhắn chứa link pastebin hoặc runmocky.', event.threadID, event.messageID);
  }
};

function generateId() {
  // Sinh ID random cho pastebin name
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}