const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Lấy danh sách video từ file JSON
const urls = require(path.join(__dirname, "../../data_dongdev/datajson/vdanime.json"));

// Tạo thư mục cache nếu chưa có
const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

class Command {
    constructor(config) {
        this.config = config;
        if (!global.khanhdayr) global.khanhdayr = [];
        this.status = false;
        this.uploadInterval = null;
    }

    async onLoad(o) {
        // Tránh setInterval nhiều lần
        if (this.uploadInterval) return;
        this.uploadInterval = setInterval(async () => {
            if (this.status || global.khanhdayr.length > 10) return;
            this.status = true;
            try {
                // Upload 5 random video lên Facebook CDN mỗi 5s
                const jobs = [];
                for (let i = 0; i < 5; i++) {
                    const randUrl = urls[Math.floor(Math.random() * urls.length)];
                    jobs.push(this.upload(randUrl, o));
                }
                const results = await Promise.all(jobs);
                global.khanhdayr.push(...results.filter(Boolean));
            } catch (e) {
                console.error("Upload video lỗi:", e);
            }
            this.status = false;
        }, 1000 * 5);
    }

    async streamURL(url, type = "mp4") {
        // Lấy stream từ URL và xóa file sau 1 phút
        const res = await axios.get(url, { responseType: "arraybuffer" });
        const filePath = path.join(cacheDir, `${Date.now()}_${Math.floor(Math.random() * 9999)}.${type}`);
        fs.writeFileSync(filePath, res.data);
        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 1000 * 60);
        return fs.createReadStream(filePath);
    }

    async upload(url, o) {
        try {
            const stream = await this.streamURL(url, "mp4");
            const response = await o.api.httpPostFormData(
                "https://upload.facebook.com/ajax/mercury/upload.php",
                { upload_1024: stream }
            );
            const json = JSON.parse(response.replace("for (;;);", ""));
            const meta = json.payload?.metadata?.[0];
            if (!meta) return null;
            const [[, value]] = Object.entries(meta);
            return value;
        } catch (e) {
            // Nếu upload thất bại, bỏ qua
            return null;
        }
    }

    async run(o) {
        // Lấy random "thính" từ API
        let thinhMsg = "Không lấy được thính!";
        try {
            const response = await axios.get('https://raw.githubusercontent.com/Sang070801/api/main/thinh1.json');
            const data = response.data;
            const thinhArray = Object.values(data.data || {});
            thinhMsg = thinhArray[Math.floor(Math.random() * thinhArray.length)] || thinhMsg;
        } catch (e) { }

        // Tính uptime
        const t = process.uptime();
        const h = Math.floor(t / 3600);
        const p = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);

        // Lấy video random đã up
        let attachment = [];
        if (global.khanhdayr.length > 0) attachment.push(global.khanhdayr.shift());

        // Gửi tin nhắn
        const body = `⏰ Thời gian hoạt động: ${h.toString().padStart(2, "0")}:${p.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}\n💌 Thính: ${thinhMsg}`;
        await o.api.sendMessage({ body, attachment }, o.event.threadID, o.event.messageID);
    }
}

module.exports = new Command({
    name: "global",
    version: "1.1.0",
    hasPermssion: 2,
    credits: "DC-Nam (fix/cải tiến bởi Kenne401k)",
    description: "Gửi uptime và random video + thính",
    commandCategory: "Tiện ích",
    usages: "[]",
    cooldowns: 0,
});