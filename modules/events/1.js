module.exports.config = {
    name: "updateQtv",
    eventType: ["log:thread-admins"],
    version: "1.0.1",
    author: "DongDev",
    info: "Tự động làm mới danh sách quản trị viên nhóm",
};

module.exports.run = async function({ event: { threadID, logMessageType }, api, Threads }) {
    try {
        console.log("Nhận sự kiện:", logMessageType); // Kiểm tra sự kiện

        switch (logMessageType) {
            case "log:thread-admins": {
                console.log("Bắt đầu lấy thông tin nhóm..."); // Thông báo bắt đầu
                const threadInfo = await api.getThreadInfo(threadID);
                console.log("Thông tin nhóm:", threadInfo); // In ra thông tin nhóm

                if (threadInfo && threadInfo.adminIDs) {
                    const qtvCount = threadInfo.adminIDs.length;

                    // Cập nhật dữ liệu của nhóm
                    await Threads.setData(threadID, { threadInfo });
                    global.data.threadInfo.set(threadID, threadInfo);

                    // Gửi tin nhắn thông báo và lấy lại messageID
                    api.sendMessage(`✅ Auto Update ${qtvCount} Quản trị viên!`, threadID, (err, info) => {
                        if (err) return console.error(err);

                        // Thu hồi tin nhắn sau 3 giây
                        setTimeout(() => {
                            api.unsendMessage(info.messageID, (err) => {
                                if (err) console.error(`Không thể thu hồi tin nhắn: ${err}`);
                            });
                        }, 3000); // 3000ms = 3 giây
                    });
                } else {
                    api.sendMessage(`⚠️ Không thể lấy thông tin nhóm hoặc không có quản trị viên.`, threadID, (err, info) => {
                        if (err) return console.error(err);

                        // Thu hồi tin nhắn sau 3 giây
                        setTimeout(() => {
                            api.unsendMessage(info.messageID, (err) => {
                                if (err) console.error(`Không thể thu hồi tin nhắn: ${err}`);
                            });
                        }, 3000);
                    });
                }
                break; // Thêm break để thoát khỏi switch case
            }
            default:
                console.log("Loại sự kiện không được xử lý:", logMessageType); // Thông báo loại sự kiện không được xử lý
                break; // Bỏ qua các loại sự kiện không cần thiết
        }
    } catch (error) {
        console.error(`❌ Đã xảy ra lỗi khi cập nhật quản trị viên: ${error}`);
        api.sendMessage(`❌ Đã xảy ra lỗi khi cập nhật quản trị viên.`, threadID, (err, info) => {
            if (err) return console.error(err);

            // Thu hồi tin nhắn sau 3 giây
            setTimeout(() => {
                api.unsendMessage(info.messageID, (err) => {
                    if (err) console.error(`Không thể thu hồi tin nhắn: ${err}`);
                });
            }, 3000);
        });
    }
};