const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
    config: {
        name: "ảnh",
        version: "1.0.3",
        hasPermssion: 0,
        credits: "DongDev",
        description: "Xem ảnh/video theo yêu cầu của bạn!",
        usages: "phản hồi 1/2/3",
        commandCategory: "Người dùng",
        cooldowns: 5,
        images: [],
        dependencies: {
            axios: ""
        }
    },
    run: async function({ event, api, args }) {
        if (!args[0]) 
            return api.sendMessage(`[ Kho Ảnh & Video Của Bot ]\n────────────────\n|› 1. Ảnh Gái\n|› 2. Ảnh Trai\n|› 3. Ảnh Anime\n|› 4. Ảnh Cosplay\n|› 5. Ảnh Mông\n|› 6. Ảnh Dú\n|› 7. Video Anime\n|› 8. Video Gái\n|› 9. Video Cosplay\n|› 10. Video chill \n|› 11. Ảnh meme \n────────────────\n|› 📌 Reply (phản hồi) theo stt để xem\n|› 💵 Phí xem mỗi hình ảnh là 500$`, event.threadID, (error, info) => {
                global.client.handleReply.push({
                    name: this.config.name,
                    messageID: info.messageID,
                    author: event.senderID,
                    type: "create"
                });
            }, event.messageID);
    },
    handleReply: async function({ api, event, client, handleReply, Currencies, Users }) {
        api.unsendMessage(handleReply.messageID);
        await new Promise(resolve => setTimeout(resolve, 1000));
        let name = await Users.getNameUser(event.senderID);
        const $ = 500;
        const money = (await Currencies.getData(event.senderID)).money;
        if (money < $) 
            return api.sendMessage(`❎ ${name} cần ${$}$ để xem`, event.threadID, event.messageID);
    
        Currencies.decreaseMoney(event.senderID, $);
        const { p, link } = linkanh(event);
    
        if (handleReply.type === "create") {
            try {
                const res = await p.get(link, { responseType: "stream" });
                const message = {
                    body: `✅ ${name} đã bị trừ ${$}$`,
                    attachment: res.data,
                    mentions: [{
                        tag: name,
                        id: event.senderID
                    }]
                };
                api.sendMessage(message, event.threadID, event.messageID);
            } catch (error) {
                console.error("Error sending image:", error);
                return api.sendMessage("❎ Đã có lỗi xảy ra khi xử lý", event.threadID, event.messageID);
            }
        }
    }
};

function linkanh(event) {
    const filepath = path.join(__dirname, "../../includes", "datajson");
    let h;
    switch (event.body) {
        case "1":
            h = path.join(filepath, "gai.json");
            break;
        case "2":
            h = path.join(filepath, "trai.json");
            break;
        case "3":
            h = path.join(filepath, "anime1.json");
            break;
        case "4":
            h = path.join(filepath, "cosplay.json");
            break;
        case "5":
            h = path.join(filepath, "mong.json");
            break;
        case "6":
            h = path.join(filepath, "du.json");
            break;
        case "7":
            h = path.join(filepath, "vdanime.json");
            break;
        case "8":
            h = path.join(filepath, "vdgai.json");
            break;
        case "9":
            h = path.join(filepath, "vdcos.json");
            break;
        case "10":
            h = path.join(filepath, "vdchill.json");
            break;
        default:
            break;
       case "11":
            h = path.join(filepath, "meme.json");
            break;
    }
    
    const links = JSON.parse(fs.readFileSync(h));
    const randomIndex = Math.floor(Math.random() * links.length);
    const link = links[randomIndex];
    return { p: axios, link };
}
