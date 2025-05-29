const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- REGEX KIỂM TRA LINK ---
const is_douyin_url = url => /(^https:\/\/)((vm|vt|www|v)\.)?(douyin)\.com\//.test(url);
const is_weibo_url = url => /^https?:\/\/(www\.)?weibo\.com\/\d+\/[A-Za-z0-9]+$/.test(url);
const is_xhslink_url = url => /^http:\/\/xhslink\.com\/a\/[A-Za-z0-9]+/.test(url);
const is_twitter_url = url => /^https?:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+(\?t=[A-Za-z0-9_-]+)?(&s=\d+)?$/.test(url);
const is_instagram_url = url => /^https?:\/\/(www\.)?instagram\.com\/(p|tv|reel|stories)\/[A-Za-z0-9._%-]+(\/[0-9]+)?(\/)?(\?[A-Za-z0-9=&_-]+)?$/.test(url);
const is_threads_url = url => /^https:\/\/(www\.)?threads\.net\/@[A-Za-z0-9._%-]+\/(post|status)\/[A-Za-z0-9_-]+(\?xmt=[A-Za-z0-9_-]+)?/.test(url);

function extractUrls(text) {
    let urlPattern = /(https?:\/\/[^\s]+)/g;
    let foundUrls = text.match(urlPattern) || [];
    return foundUrls.filter(url =>
        is_douyin_url(url) ||
        is_weibo_url(url) ||
        is_xhslink_url(url) ||
        is_twitter_url(url) ||
        is_instagram_url(url) ||
        is_threads_url(url)
    );
}

// --- TẢI FILE MEDIA, LƯU TẠM, TRẢ VỀ STREAM ---
async function stream_url(url, type) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const cacheDir = path.join(__dirname, 'cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        const filePath = path.join(cacheDir, `${Date.now()}.${type}`);
        fs.writeFileSync(filePath, res.data);
        setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 1000 * 60);
        return fs.createReadStream(filePath);
    } catch (err) {
        console.error("Lỗi khi tải file:", err);
        return null;
    }
}

async function downloadThreadsMedia(mediaData) {
    let attachments = [];
    for (let media of (mediaData.medias || [])) {
        if (media.url) {
            try {
                let ext = media.extension || (media.type === 'video' ? 'mp4' : 'jpg');
                let fileStream = await stream_url(media.url, ext);
                if (fileStream) attachments.push(fileStream);
            } catch (error) {
                console.error(`Lỗi khi tải ${media.type} từ Threads:`, error);
            }
        }
    }
    return attachments;
}

exports.config = {
    name: 'mediaDownloader',
    version: '0.1.0',
    hasPermssion: 0,
    credits: 'DGK, pcoder fix',
    description: 'Tự động tải video và hình ảnh từ Douyin, Weibo, xhslink, Twitter, Instagram, Threads.',
    commandCategory: 'Tiện ích',
    usages: 'Gửi link video/hình, bot sẽ tải.',
    cooldowns: 0
};

exports.run = function () {};

// --- XỬ LÝ SỰ KIỆN ---
exports.handleEvent = async function(o) {
    if (!o || !o.event || !o.event.body) return;
    const text = o.event.body;

    // Bắt đầu tìm link
    const urls = extractUrls(text);
    if (urls.length === 0) return;

    // Ưu tiên theo nguồn
    const douyinUrl = urls.find(is_douyin_url);
    const weiboUrl = urls.find(is_weibo_url);
    const xhslinkUrl = urls.find(is_xhslink_url);
    const twitterUrl = urls.find(is_twitter_url);
    const instagramUrl = urls.find(is_instagram_url);
    const threadsUrl = urls.find(is_threads_url);

    const mediaUrl = douyinUrl || weiboUrl || xhslinkUrl || twitterUrl || instagramUrl || threadsUrl;
    if (!mediaUrl) return;

    let res;
    try {
        res = await axios.get(`http://sv.gamehosting.vn:31217/media?url=${encodeURIComponent(mediaUrl)}`);
    } catch (err) {
        console.error("Lỗi khi gọi API:", err);
        return o.api.sendMessage("❌ Lỗi khi kết nối đến server media.", o.event.threadID);
    }
    if (!res.data || !res.data.medias) {
        console.error('Lỗi dữ liệu API:', res.data);
        return o.api.sendMessage("❌ Không thể lấy dữ liệu media.", o.event.threadID);
    }

    let { author, title, medias } = res.data;
    let attachments = [];

    // Threads (ưu tiên hàm riêng)
    if (threadsUrl) {
        attachments = await downloadThreadsMedia(res.data);
    } else {
        // Tải tất cả ảnh
        for (let media of medias) {
            if (media.type === 'image' && media.url) {
                let stream = await stream_url(media.url, media.extension || 'jpg');
                if (stream) attachments.push(stream);
            }
        }
        // Tải video ưu tiên chất lượng cao
        let videoMedia;
        if (douyinUrl) {
            videoMedia = medias.find(m => m.type === 'video' && m.quality === 'HD No Watermark') ||
                         medias.find(m => m.type === 'video');
        } else if (weiboUrl || xhslinkUrl || twitterUrl || instagramUrl) {
            videoMedia = medias.find(m => m.type === 'video');
        }
        if (videoMedia && videoMedia.url) {
            let stream = await stream_url(videoMedia.url, videoMedia.extension || 'mp4');
            if (stream) attachments.push(stream);
        }
    }

    // Gửi về Messenger
    if (attachments.length > 0) {
        let msg = `📝 Tiêu đề: ${title || "Không có tiêu đề"}\n🗿 Tác giả: ${author || "Không có tác giả"}`;
        await o.api.sendMessage({ body: msg, attachment: attachments }, o.event.threadID, o.event.messageID);
    } else {
        o.api.sendMessage("❌ Không tìm thấy media hợp lệ để tải.", o.event.threadID, o.event.messageID);
    }
};