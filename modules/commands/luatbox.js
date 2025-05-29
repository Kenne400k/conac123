const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "cache", "luatbox_data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

module.exports.config = {
    name: "luatbox",
    version: "5.0.0",
    hasPermssion: 0,
    credits: "pcoder",
    description: "Lưu, trình bày quy định/luật nhóm (text + media, đẹp, lịch sử, reply link media, hướng dẫn chi tiết, tối ưu đa nhóm)",
    commandCategory: "Tiện ích nhóm",
    usages: "[set <nội dung> (có thể reply ảnh/video/link)] | [add (reply ảnh/video/link)] | [clear] | [history] | [info] | [help]",
    cooldowns: 3,
};

const URL_MEDIA_REGEX = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv))/i;

function dataFile(threadID) {
    return path.join(DATA_DIR, `${threadID}.json`);
}
function readData(threadID) {
    try {
        const file = dataFile(threadID);
        if (!fs.existsSync(file)) return {};
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        return {};
    }
}
function writeData(threadID, data) {
    try {
        fs.writeFileSync(dataFile(threadID), JSON.stringify(data, null, 2), "utf8");
    } catch (e) {}
}
function isAdmin(event) {
    if (!event.isGroup) return false;
    const threadInfo = global.data.threadInfo.get(event.threadID);
    if (!threadInfo || !threadInfo.adminIDs) return false;
    return threadInfo.adminIDs.some(item => item.id == event.senderID);
}
function formatHistory(hist) {
    if (!Array.isArray(hist) || hist.length === 0) return "Chưa có lịch sử nào.";
    return hist.map((item, idx) =>
        `#${idx + 1}: ${item.type === "media" ? "[MEDIA]" : "[TEXT]"} bởi UID ${item.setBy} lúc ${new Date(item.time).toLocaleString("vi-VN")}\n${item.text ? item.text : ""}${item.media && item.media.length ? " (Có media)" : ""}`
    ).join("\n-----------------------\n");
}
async function prepareAttachments(media) {
    const arr = [];
    for (const url of media) {
        try {
            arr.push(await global.utils.getStreamFromURL(url));
        } catch (e) { /* skip lỗi link */ }
    }
    return arr;
}
function extractMediaFromMsg(msg) {
    let urls = [];
    // Lấy từ attachment
    if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
            if (["photo", "video"].includes(att.type) && att.url) urls.push(att.url);
        }
    }
    // Lấy từ nội dung text (nếu có url media)
    if (msg.body) {
        let match = msg.body.match(URL_MEDIA_REGEX);
        if (match && !urls.includes(match[1])) urls.push(match[1]);
    }
    return urls;
}
function makeDecorLine(char="━", l=32) {
    return Array(l).fill(char).join("");
}

module.exports.run = async function({ api, event, args }) {
    const { threadID, messageID, senderID, isGroup } = event;
    let data = readData(threadID);

    // HELP
    if (args[0] && args[0].toLowerCase() === "help") {
        return api.sendMessage(
`╔═════『 𝗛ƯỚ𝗡𝗚 𝗗Ẫ𝗡 𝗟𝗨Ậ𝗧𝗕𝗢𝗫 』═════╗
${makeDecorLine()}
• {prefix}luatbox set <nội dung> (reply kèm ảnh/video/link)
→ Đặt hoặc thay đổi quy định/luật nhóm (chỉ admin)
→ Nếu reply ảnh/video/link, sẽ lưu luôn media.
→ Nếu chỉ set text, bot sẽ nhắc bạn có thể reply vào tin nhắn set đó để bổ sung media sau.

• {prefix}luatbox add (reply ảnh/video/link)
→ Thêm ảnh/video/link vào luật nhóm (chỉ admin, reply vào ảnh/link rồi dùng lệnh).
→ Có thể cộng dồn nhiều media.

• {prefix}luatbox
→ Xem luật nhóm, hiển thị cả text lẫn ảnh/video đã lưu.

• {prefix}luatbox clear
→ Xóa toàn bộ luật nhóm (chỉ admin).

• {prefix}luatbox history
→ Xem lịch sử tối đa 8 lần thay đổi luật nhóm.

• {prefix}luatbox info
→ Xem ai chỉnh sửa luật gần nhất + thời gian.

${makeDecorLine()}
Bạn cũng có thể reply vào chính tin nhắn set gần nhất để bổ sung media cực nhanh!
Dữ liệu lưu riêng từng nhóm. Gõ {prefix}luatbox để xem luật.
╚════════════════════════════╝`
            , threadID, messageID
        );
    }

    // CLEAR luật
    if (args[0] && args[0].toLowerCase() === "clear") {
        if (!isGroup) return api.sendMessage("Chỉ sử dụng lệnh này trong nhóm!", threadID, messageID);
        if (!isAdmin(event) && senderID != global.config.ADMINBOT[0]) {
            return api.sendMessage("Bạn phải là admin nhóm mới dùng được lệnh này!", threadID, messageID);
        }
        if (fs.existsSync(dataFile(threadID))) fs.unlinkSync(dataFile(threadID));
        return api.sendMessage("✅ Đã xóa toàn bộ luật box!", threadID, messageID);
    }

    // HISTORY
    if (args[0] && args[0].toLowerCase() === "history") {
        if (!data.history || !Array.isArray(data.history) || data.history.length === 0)
            return api.sendMessage("Chưa có lịch sử thay đổi luật nào.", threadID, messageID);
        return api.sendMessage("📜 𝐋Ị𝐂𝐇 𝐒Ử 𝐋𝐔Ậ𝐓 𝐍𝐇Ó𝐌:\n\n" + formatHistory(data.history), threadID, messageID);
    }

    // INFO: ai set gần nhất
    if (args[0] && args[0].toLowerCase() === "info") {
        if (!data || (!data.text && (!data.media || !data.media.length))) {
            return api.sendMessage("Nhóm chưa có luật nào.", threadID, messageID);
        }
        return api.sendMessage(
            `👑 Người cập nhật gần nhất: UID ${data.setBy}\n🕒 Thời gian: ${new Date(data.time).toLocaleString("vi-VN")}\n📝 Loại: ${data.text ? "Text" : ""}${data.media && data.media.length ? (data.text ? " + Media" : "Media") : ""}`,
            threadID, messageID
        );
    }

    // SET: gộp set text + media (nếu reply có ảnh/video hoặc link thì lưu luôn)
    if (args[0] && args[0].toLowerCase() === "set") {
        if (!isGroup) return api.sendMessage("Chỉ sử dụng lệnh này trong nhóm!", threadID, messageID);
        if (!isAdmin(event) && senderID != global.config.ADMINBOT[0]) {
            return api.sendMessage("Bạn phải là admin nhóm mới dùng được lệnh này!", threadID, messageID);
        }
        const text = args.slice(1).join(" ").trim();
        let mediaUrls = [];
        if (event.messageReply) {
            mediaUrls = extractMediaFromMsg(event.messageReply);
        }
        if (!text && mediaUrls.length === 0)
            return api.sendMessage("Vui lòng nhập nội dung quy định hoặc reply kèm ảnh/video/link!", threadID, messageID);

        // Lưu lịch sử
        data.history = data.history || [];
        if (data.text || (data.media && data.media.length)) {
            data.history.push({
                type: mediaUrls.length > 0 ? "media" : "text",
                text: data.text || "",
                media: data.media || [],
                setBy: data.setBy,
                time: data.time
            });
            if (data.history.length > 8) data.history.shift();
        }

        data.text = text;
        if (mediaUrls.length > 0) {
            data.media = mediaUrls; // reset media thành media mới
        } else {
            // Nếu không set media mới thì giữ media cũ
            data.media = data.media || [];
        }
        data.setBy = senderID;
        data.time = Date.now();
        writeData(threadID, data);

        if (mediaUrls.length === 0) {
            // Sau khi set text mà không có ảnh, nhắc có thể thêm media bằng reply hoặc add
            return api.sendMessage(
                "✅ Đã lưu quy định/luật box thành công!\n\n📌 Bạn có thể thêm ảnh/video/link vào luật bằng cách reply tin nhắn này kèm ảnh/video/link hoặc dùng lệnh:\n" +
                `→ ${global.config.PREFIX}luatbox add (reply ảnh/video/link)\n` +
                `→ Hoặc dùng lại lệnh:\n${global.config.PREFIX}luatbox set <nội dung> (reply ảnh/video/link)`,
                threadID,
                (err, info) => {
                    // Lưu lại ID tin nhắn để chấp nhận reply media lên lệnh này
                    if (!err) {
                        data.lastSetMsgId = info.messageID;
                        writeData(threadID, data);
                    }
                }
            );
        } else {
            return api.sendMessage("✅ Đã lưu quy định/luật box thành công (có media)!", threadID, messageID);
        }
    }

    // ADD media qua reply (ảnh/video/link), cộng dồn (cả reply set lệnh lẫn add bình thường)
    if (
        (args[0] && args[0].toLowerCase() === "add")
        ||
        (
            event.messageReply &&
            data.lastSetMsgId && event.messageReply.messageID === data.lastSetMsgId &&
            event.senderID === data.setBy // chỉ người set gần nhất mới được add kiểu này
        )
    ) {
        if (!isGroup) return api.sendMessage("Chỉ sử dụng lệnh này trong nhóm!", threadID, messageID);
        if (!isAdmin(event) && senderID != global.config.ADMINBOT[0]) {
            return api.sendMessage("Bạn phải là admin nhóm mới dùng được lệnh này!", threadID, messageID);
        }
        let replyMsg = event.messageReply;
        let newMedia = extractMediaFromMsg(replyMsg);
        if (!newMedia.length) {
            return api.sendMessage("Không tìm thấy ảnh/video/link hợp lệ để lưu!", threadID, messageID);
        }
        // Lưu lịch sử
        data.history = data.history || [];
        if (data.text || (data.media && data.media.length)) {
            data.history.push({
                type: "media",
                text: data.text || "",
                media: data.media || [],
                setBy: data.setBy,
                time: data.time
            });
            if (data.history.length > 8) data.history.shift();
        }
        // Cộng dồn media, không trùng lặp
        data.media = data.media || [];
        for (const url of newMedia) {
            if (!data.media.includes(url)) data.media.push(url);
        }
        data.setBy = senderID;
        data.time = Date.now();
        writeData(threadID, data);
        return api.sendMessage("✅ Đã thêm ảnh/video/link vào luật box thành công!", threadID, messageID);
    }

    // HIỆN LUẬT (text+media) cho tất cả thành viên với style đẹp
    if (data && (data.text || (data.media && data.media.length))) {
        let msg = "";
        msg += "╔═════『 𝗟𝗨Ậ𝗧 / 𝗤𝗨𝗬 ĐỊ𝗡𝗛 𝗡𝗛Ó𝗠 』═════╗\n\n";
        if (data.text) {
            msg += "📝 " + data.text + "\n";
        }
        msg += `👤 Người cập nhật: UID ${data.setBy}\n🕒 Lúc: ${new Date(data.time).toLocaleString("vi-VN")}\n`;
        msg += "💬 Gõ {prefix}luatbox help để xem hướng dẫn thêm luật.\n";
        msg += "╚════════════════════════════╝";
        // Gửi media nếu có
        if (data.media && data.media.length) {
            try {
                const attachments = await prepareAttachments(data.media);
                if (attachments.length > 0)
                    return api.sendMessage({ body: msg, attachment: attachments }, threadID, messageID);
                else
                    return api.sendMessage(msg + `\n(Lỗi khi tải media đã lưu!)`, threadID, messageID);
            } catch (err) {
                return api.sendMessage(msg + `\n(Lỗi khi tải media đã lưu!)`, threadID, messageID);
            }
        } else {
            return api.sendMessage(msg, threadID, messageID);
        }
    } else {
        return api.sendMessage(
            `⚠️ Nhóm chưa đặt luật hoặc quy định!\n\nDùng:\n${global.config.PREFIX}luatbox set <nội dung quy định> (reply ảnh/video/link được luôn)\nHoặc reply ảnh/video/link với:\n${global.config.PREFIX}luatbox add\nChỉ admin nhóm mới set/add được.\nGõ ${global.config.PREFIX}luatbox help để xem hướng dẫn.`,
            threadID, messageID
        );
    }
};