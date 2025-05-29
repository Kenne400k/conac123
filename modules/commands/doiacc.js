const fs = require("fs");
const path = require("path");

module.exports.config = {
	name: "doiacc",
	version: "1.1.0",
	hasPermission: 2,
	credits: "Thịnh",
	description: "Đổi acc nhanh",
	commandCategory: "Admin",
	cooldowns: 0,
};

module.exports.run = async function ({ api, event, args }) {
	const { configPath } = global.client;
	const config = require(configPath);
	const projectHome = path.resolve("./");
	const appstateDir = path.join(projectHome, "appstate");
	let appstates = fs
		.readdirSync(appstateDir)
		.filter((file) => file.endsWith(".json"));

	if (args[0] === "list") {
		const currentAppstate = path.basename(config.APPSTATEPATH);
		return api.sendMessage(
			`Danh Sách Appstate:\n${appstates.join("\n")}\n\nAppstate Hiện Tại: ${currentAppstate}`,
			event.threadID
		);
	}

	try {
		let newAppstate;
		if (args[0]) {
			const index = parseInt(args[0]);
			if (isNaN(index) || index < 1 || index > appstates.length) {
				return api.sendMessage(
					`Danh Sách Appstate:\n${appstates.join("\n")}\n\nChọn từ 1 đến ` +
						appstates.length,
					event.threadID
				);
			}
			newAppstate = `appstate/${appstates[index - 1]}`;
		} else {
			const currentIndex = appstates.indexOf(
				path.basename(config.APPSTATEPATH)
			);
			const nextIndex = (currentIndex + 1) % appstates.length;
			newAppstate = `appstate/${appstates[nextIndex]}`;
		}
		config.APPSTATEPATH = newAppstate;
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");
		api.sendMessage(
			`Đã đổi sang acc bot thứ ${path.basename(newAppstate)} 🐧`,
			event.threadID,
			() => process.exit(1)
		);
	} catch (e) {
		console.log(e);
	}
};
