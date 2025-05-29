
module.exports.config = {
	name: "fl",
	version: "1.0.0",
	hasPermssion: 0,
	credits: "Tiến",
	description: "Tăng Follow TikTok bằng cách sử dụng API",
	commandCategory: "Tiện ích",
	cooldowns: 5,
	usePrefix: true,
};

const axios = require('axios');
const readline = require('readline');

module.exports.run = async function({ api, event, args }) {
    const username = args.join(" ");
    
    if (!username) {
        return api.sendMessage("Vui lòng nhập Username TikTok (không bao gồm @).", event.threadID, event.messageID);
    }

    async function increaseFollow() {
        while (true) {
            try {
                const headers = {
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'accept-language': 'vi,fr-FR;q=0.9,fr;q=0.8,en-US;q=0.7,en;q=0.6',
                    'cache-control': 'max-age=0',
                    'priority': 'u=0, i',
                    'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'cross-site',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                };

                const access = await axios.get('https://tikfollowers.com/free-tiktok-followers', { headers });
                const session = access.headers['set-cookie'][0].split(';')[0].split('=')[1];
                headers['cookie'] = `ci_session=${session}`;
                
                const token = access.data.split("csrf_token = '")[1].split("'")[0];
                const data = JSON.stringify({
                    type: "follow",
                    q: `@${username}`,
                    google_token: "t",
                    token: token
                });

                const searchResponse = await axios.post('https://tikfollowers.com/api/free', data, { headers });
                if (searchResponse.data.success) {
                    const data_follow = searchResponse.data.data;
                    const sendData = JSON.stringify({
                        google_token: "t",
                        token: token,
                        data: data_follow,
                        type: "follow"
                    });

                    const sendFollow = await axios.post('https://tikfollowers.com/api/free/send', sendData, { headers });
                    if (sendFollow.data.o === 'Success!' && sendFollow.data.success) {
                        api.sendMessage("Tăng Follow TikTok thành công!", event.threadID, event.messageID);
                    } else if (sendFollow.data.o === 'Oops...' && !sendFollow.data.success) {
                        const waitTime = parseInt(sendFollow.data.message.match(/\d+/)[0]) * 60;
                        api.sendMessage(`Vui lòng chờ ${waitTime} giây trước khi thử lại.`, event.threadID, event.messageID);
                        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                    }
                } else {
                    throw new Error("Không thể lấy thông tin tăng follow.");
                }
            } catch (error) {
                api.sendMessage("Đã xảy ra lỗi. Vui lòng thử lại sau.", event.threadID, event.messageID);
                break;
            }
        }
    }

    increaseFollow();
};
