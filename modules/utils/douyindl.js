const axios = require('axios');
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
