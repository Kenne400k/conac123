const Deku = require("dekuai");
const deku = new Deku();
const fs = require("fs");
  module.exports = {
    config: {
      name: "sdxl",
      version: "1.0",
      author: "Deku",
      countDown: 1,
      role: 0,
      shortDescription: "Generate image using sdxl",
      longDescription: "",
      category: "image",
      guide: {
        en: "{p}{n} prompt | style (optional)",
      }
    },
  onStart: async function ({ api, event, args }) {
    function reply(msg) {
      api.sendMessage(msg, event.threadID, event.messageID);
    }
    try {
      const t = args["join"](" ");
      if (t == "list") {
        const styles = await deku.sdxl("list");
        const msg = styles.map((style, index) => `${index + 1}. ${style.name} (${style.style})`).join("\n");
        reply(msg);
      }
      const path = __dirname + "/cache/sdxl.png";
      let fmt =
        "Wrong Format\nUse: " + this.config.name + " " + this.config.usages;
      if (!t) return reply(fmt);
      const z = t.split(" | ");
      const prompt = z[0],
        style = z[1] || ""; // optional
      if (!prompt) return reply(fmt);
      const image = await deku.sdxl(prompt, style);
      fs.writeFileSync(path, image);
      let ms = {
        attachment: fs.createReadStream(path),
      };
      reply(ms);
    } catch (e) {
      return reply(e.message);
    }
  },
};
