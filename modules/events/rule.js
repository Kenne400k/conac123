module.exports.config = {
    name: "rule",
    eventType: ["log:subscribe"],
    version: "",
    credits: "Mr.Ben", // Trần Thanh Dương mod từ join của Mr.Ben
    description: "Gửi danh sách luật của nhóm khi có thành viên mới tham gia.",
};

module.exports.run = async function ({ api, event }) {
    const { readFileSync } = require("fs-extra");
    const { join } = require("path");
    const { threadID } = event;
    const pathData = join("modules", "commands", "data", "rule.json");
    const thread = global.data.threadData.get(threadID) || {};

    // Kiểm tra xem luật có được phép hiển thị không
    if (typeof thread["rule"] != "undefined" && thread["rule"] == false) return;

    var dataJson = JSON.parse(readFileSync(pathData, "utf-8"));
    var thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, listRule: [] };

    // Lấy thông tin thành viên mới
    const newMemberID = event.logMessageData.addedParticipants[0].userFbId;
    const newMemberName = event.logMessageData.addedParticipants[0].fullName;

    // Lấy thời gian hiện tại theo định dạng "dd/mm/yyyy hh:mm:ss"
    const getCurrentDateTime = () => {
        const date = new Date();
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const time = date.toLocaleTimeString("vi-VN", { hour12: false });
        return `${day}/${month}/${year} ${time}`;
    };
    const currentDateTime = getCurrentDateTime();

    if (thisThread.listRule.length != 0) {
        var msg = "", index = 0;
        for (const item of thisThread.listRule) msg += `${index += 1}. ${item}\n`;
        
        // Gửi tin nhắn với tag tên thành viên mới và thời gian tham gia
        return api.sendMessage({
            body: `👋 Chào mừng ${newMemberName} \ntham gia nhóm vào lúc ⏰ ${currentDateTime}!\n\n[ LUẬT CỦA NHÓM ]\n\n${msg}`,
            mentions: [{ tag: newMemberName, id: newMemberID }]
        }, threadID);
    }
}