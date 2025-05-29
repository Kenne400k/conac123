// modules/auto.js
// Đảm bảo cấu trúc module chuẩn và sửa các lỗi tiềm ẩn

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const utilsPath = path.join(__dirname, 'utils', 'douyindl.js');

// Tự động tạo utils/douyindl.js nếu chưa có
if (!fs.existsSync(utilsPath)) {
    const douyindlCode = `const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

/**
 * Tải thông tin Douyin bằng savetik.co
 * @param {string} url - Douyin URL
 * @returns {Promise<Object>} Thông tin video hoặc photo
 */
async function douyindl(url) {
    try {
        const response = await axios.post("https://savetik.co/api/ajaxSearch",
            qs.stringify({
                q: url,
                lang: "vi",
            }),
            {
                headers: {
                    Accept: "*/*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "vi,en;q=0.9",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    Origin: "https://savetik.co",
                    Referer: "https://savetik.co/vi/douyin-downloader",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    "X-Requested-With": "XMLHttpRequest",
                },
            },
        );
        const $ = cheerio.load(response.data.data);
        const result = {
            type: "",
            title: "",
            url: [],
            play: "",
            nickname: "",
            unique_id: "",
            create_at: "",
            likeCount: "",
            shareCount: "",
            commentCount: "",
            collectCount: "",
            music: null
        };
        // Tiêu đề
        result.title = $('div.tik-video div.thumbnail div.content h3').text().trim();
        // Lấy video/photo
        const photos = [];
        $('div.photo-list ul.download-box li div.download-items__thumb img').each((_, el) => {
            const imageUrl = $(el).attr('src');
            if (imageUrl) photos.push(imageUrl);
        });
        const videoUrls = [];
        $('a.tik-button-dl').each((_, el) => {
            const vurl = $(el).attr('href');
            if (vurl) videoUrls.push(vurl);
        });

        if (photos.length > 0) {
            result.type = "Photo";
            result.url = photos;
        } else if (videoUrls.length > 0) {
            result.type = "Video";
            result.play = videoUrls[0];
        }

        // Music/audio (nếu có)
        const musicUrl = $('a#ConvertToVideo').data('audiourl');
        if (musicUrl) {
            result.music = {
                type: "Audio",
                url: musicUrl,
                title: $('div.music-info h3').text().trim() || "Audio"
            };
        }

        // Thông tin phụ: nickname, unique_id, ngày đăng, thống kê
        result.nickname = $('div.tik-video div.thumbnail div.content span.author').text().trim() || "";
        result.unique_id = $('#TikTokId').val() || "";
        result.create_at = $('div.tik-video div.thumbnail div.content span.date').text().trim() || "";
        result.likeCount = $('div.tik-video div.thumbnail div.content span.like').text().trim() || "";
        result.shareCount = $('div.tik-video div.thumbnail div.content span.share').text().trim() || "";
        result.commentCount = $('div.tik-video div.thumbnail div.content span.comment').text().trim() || "";
        result.collectCount = $('div.tik-video div.thumbnail div.content span.collect').text().trim() || "";

        return result;
    } catch (error) {
        console.error("douyindl error:", error);
        return { message: "Error downloading douyin" };
    }
}

module.exports = {
    douyindl
};
`;
    // Đảm bảo thư mục utils tồn tại
    const utilsDir = path.dirname(utilsPath);
    if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir, { recursive: true });
    fs.writeFileSync(utilsPath, douyindlCode, "utf8");
}

// Bây giờ require bình thường, vì đã đảm bảo file tồn tại
const { douyindl } = require('../../utils/douyindl.js');

// Kiểm tra url hợp lệ
function is_url(url) {
    return /^https?:\/\/.+/.test(url);
}

// Tải file từ url, lưu tạm và trả về stream đọc file
async function stream_url(url, type) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const cacheDir = path.join(__dirname, 'cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        const filePath = path.join(cacheDir, `${Date.now()}.${type}`);
        fs.writeFileSync(filePath, res.data);
        // Xoá file sau 60 giây
        setTimeout(p => { fs.existsSync(p) && fs.unlinkSync(p); }, 1000 * 60, filePath);
        return fs.createReadStream(filePath);
    } catch (err) {
        console.error('stream_url error:', err);
        return null;
    }
}

exports.config = {
    name: 'auto',
    version: '0.0.2',
    hasPermssion: 0,
    credits: 'pcoder',
    description: 'Tự động Douyin.',
    commandCategory: 'Tiện ích',
    usages: 'autodowntiktok',
    cooldowns: 0
};

exports.run = function(o) {};

exports.handleEvent = async function(o) {
    if (!o || !o.event || !o.event.args || !Array.isArray(o.event.args)) return;
    const a = o.event.args[0];
    if (!a || !is_url(a)) return;

    if (/douyin\.com/.test(a)) {
        let tiktok;
        try {
            tiktok = await douyindl(a);
        } catch (err) {
            console.error('Lỗi khi lấy data douyindl:', err);
            return;
        }
        if (!tiktok || tiktok.message) {
            console.error('Lỗi phân tích data:', tiktok && tiktok.message);
            return;
        }

        const attachments = [];

        if (tiktok.type === 'Photo' && Array.isArray(tiktok.url)) {
            for (const url of tiktok.url) {
                const stream = await stream_url(url, 'webp');
                if (stream) attachments.push(stream);
            }
        } else if (tiktok.type === 'Video' && tiktok.play) {
            const stream = await stream_url(tiktok.play, 'mp4');
            if (stream) attachments.push(stream);
        }

        if (attachments.length > 0) {
            o.api.sendMessage({
                body: `🎥 [DOUYIN] Tự Động Tải\n\n🖍️ Tiêu đề: ${tiktok.title}\n🧸 Tác giả: ${tiktok.nickname} (${tiktok.unique_id})\n📅 Ngày đăng: ${tiktok.create_at}\n👍 Lượt thích: ${tiktok.likeCount}\n🔄 Lượt chia sẻ: ${tiktok.shareCount}\n💬 Lượt bình luận: ${tiktok.commentCount}\n🔖 Lượt lưu: ${tiktok.collectCount}\n• Thả cảm xúc '😆' để tải nhạc.`,
                attachment: attachments
            }, o.event.threadID, function(error, info) {
                if (error) {
                    console.error('Error sending message:', error);
                    return;
                }
                if (!global.client.handleReaction) global.client.handleReaction = [];
                global.client.handleReaction.push({
                    name: exports.config.name,
                    messageID: info.messageID,
                    author: o.event.senderID,
                    data: tiktok
                });
            }, o.event.messageID);
        }
    }
};

exports.handleReaction = async function (o) {
    const { threadID: t, messageID: m, reaction: r } = o.event;
    if (r !== "😆") return;

    if (!global.client.handleReaction || !Array.isArray(global.client.handleReaction)) return;
    const tiktokData = global.client.handleReaction.find(entry => entry.messageID === m);

    if (!tiktokData) {
        console.error('Không tìm thấy link nhạc.');
        return;
    }

    if (tiktokData.data.music && tiktokData.data.music.type === 'Audio') {
        const stream = await stream_url(tiktokData.data.music.url, "mp3");
        if (stream) {
            o.api.sendMessage({
                body: `🎵 ====『 MUSIC 』====\n\n💬 Tiêu đề: ${tiktokData.data.music.title}`,
                attachment: stream
            }, t, m);
        }
    }
};