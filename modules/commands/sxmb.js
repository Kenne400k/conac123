module.exports.config = {
    name: 'xsmb',
    version: '10.02',
    hasPermssion: 0,
    credits: 'DC-Nam',
    description: 'Kiểm tra xổ số miền Bắc',
    commandCategory: 'Hệ Thống',
    usages: '[... | ngày/tháng/năm]',
    cooldowns: 3
};

const { get } = require('axios');

module.exports.onLoad = o => {
    if (!!global.xsmb_setinterval) clearInterval(global.xsmb_setinterval);
    global.xsmb_setinterval = setInterval(async () => {
        const currentTime = new Date(Date.now() + 25200000).toLocaleTimeString('en-US', { hour12: true });
        if (currentTime === '6:30:00 PM') {
            const { data } = (await get(`https://api-ngollll.onrender.com/v2/tien-ich/check-xsmb.json`)).data;
            global.data.allThreadID.forEach(i => {
                const message = formatResult(data[0]);
                o.api.sendMessage(message, i);
            });
        }
    }, 1000);
};

module.exports.run = async function({ api, event, args }) {
    const sendMessage = (message, reply) => api.sendMessage(message, event.threadID, reply ? event.messageID : null);
    try {
        const { data } = (await get(`https://api-ngollll.onrender.com/v2/tien-ich/check-xsmb.json`)).data;
        if (!!args[0]) {
            if (args[0].split('/').length !== 3) {
                return sendMessage(`[🦑] Vui lòng nhập đúng định dạng: ngày/tháng/năm`, true);
            }
            const find = data.find(i => i.date === args[0]);
            if (!find) {
                return sendMessage(`[🦑] Không tìm thấy kết quả xổ số của ngày "${args[0]}"`, true);
            } else {
                sendMessage(`[⏰] Kết quả xổ số ngày ${args[0]}:\n${formatResult(find)}`, true);
            }
        } else {
            const todayResult = data[0];
            sendMessage(`[⏰] Kết quả xổ số hôm nay (${todayResult.date}):\n${formatResult(todayResult)}`, true);
        }
    } catch (err) {
        sendMessage(`Đã xảy ra lỗi: ${err.message}`, true);
    }
};

function formatResult(result) {
    const specialPrizeMatch = result.message.match(/Giải Đặc Biệt: ([\d-]+)/);
    const specialPrize = specialPrizeMatch ? specialPrizeMatch[1] : "Không tìm thấy";
    return `🎉 Giải Đặc Biệt: ${specialPrize}\n${result.message}`;
}