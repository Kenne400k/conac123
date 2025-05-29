module.exports.config = {
    name: "test",
    version: "1.1.2",
    hasPermssion: 0,
    credits: "DC-Nam , fix PCODER",
    description: "Download video từ link video Facebook",
    commandCategory: "Phương tiện",
    usages: "fbvideo [Link video]",
    cooldowns: 5,
    dependencies: {
        "image-downloader": "",
        "fs-extra": "",
        "axios": ""
    }
};

const fs = require("fs-extra");
const axios = require("axios");
const imageDownloader = require("image-downloader");
const path = require("path");

const DownLoad = async (link, filePath) => {
    await imageDownloader.image({
        url: link,
        dest: filePath
    });
    return fs.createReadStream(filePath);
};

module.exports.run = async function({ api, event, args }) {
    if (!args[0]) return api.sendMessage("[⚜️]➜ Thiếu link Facebook video.", event.threadID, event.messageID);

    let res;
    try {
        res = await axios.get(`https://www.nguyenmanh.name.vn/api/fbDL?url=${encodeURIComponent(args[0])}&apikey=DU6MdNmh`);
    } catch (e) {
        return api.sendMessage("❌ Không thể lấy dữ liệu từ API. Vui lòng kiểm tra lại link hoặc thử lại sau.", event.threadID, event.messageID);
    }

    const os = res.data;
    if (!os || !os.result || !os.result.sd) {
        return api.sendMessage("❌ Không thể lấy link download từ API, hoặc video không ở chế độ công khai.", event.threadID, event.messageID);
    }
    const fileName = `fbvideo_${event.senderID}_${Date.now()}.mp4`;
    const filePath = path.join(__dirname, "cache", fileName);

    // Đảm bảo thư mục cache tồn tại
    if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));

    api.sendMessage("[⚜️]➜ Đang tải xuống... Xin chờ trong giây lát!", event.threadID, async (err, info) => {
        try {
            await DownLoad(os.result.sd, filePath);
            await api.sendMessage({
                body: os.result.title || "🎬 Video Facebook",
                attachment: fs.createReadStream(filePath)
            }, event.threadID, () => {
                // Xóa file sau khi gửi xong
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        } catch (e) {
            api.sendMessage("❌ Đã xảy ra lỗi khi tải video. Vui lòng thử lại sau.", event.threadID, event.messageID);
        }
        // Xóa tin nhắn báo đang tải
        if (info && info.messageID) api.unsendMessage(info.messageID);
    }, event.messageID);
};