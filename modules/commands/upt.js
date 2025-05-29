const os = require('os');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

module.exports = {
    config: {
        name: "upt",
        version: "5.1.0",
        hasPermission: 2,
        credits: "pcoder",
        description: "Hiển thị thông tin hệ thống canvas cực đẹp, bố cục chuẩn",
        commandCategory: "Admin",
        usages: "[cpu/ram/all]",
        usePrefix: false,
        cooldowns: 5
    },
    run: async ({ api, event, args }) => {
        const startTime = Date.now();

        function getSystemRAMUsage() {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            return {
                totalMem: Math.round(totalMem / 1024 / 1024),
                usedMem: Math.round(usedMem / 1024 / 1024),
                freeMem: Math.round(freeMem / 1024 / 1024)
            };
        }
        function getHeapMemoryUsage() {
            const heap = process.memoryUsage();
            return {
                heapTotal: Math.round(heap.heapTotal / 1024 / 1024),
                heapUsed: Math.round(heap.heapUsed / 1024 / 1024),
                external: Math.round(heap.external / 1024 / 1024),
                rss: Math.round(heap.rss / 1024 / 1024)
            };
        }
        function getFilteredUptime() {
            const uptime = process.uptime();
            const days = Math.floor(uptime / (24 * 60 * 60));
            const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
            const minutes = Math.floor((uptime % (60 * 60)) / 60);
            const seconds = Math.floor(uptime % 60);
            let uptimeString = '';
            if (days > 0) uptimeString += `${days} ngày `;
            if (hours > 0) uptimeString += `${hours} giờ `;
            if (minutes > 0) uptimeString += `${minutes} phút `;
            if (seconds > 0 || uptimeString === '') uptimeString += `${seconds} giây`;
            return uptimeString.trim();
        }
        async function getDependencyCount() {
            try {
                const packageJsonString = await fs.promises.readFile('package.json', 'utf8');
                const packageJson = JSON.parse(packageJsonString);
                return Object.keys(packageJson.dependencies).length;
            } catch (error) {
                return -1;
            }
        }
        async function getCPUUsage() {
            const startMeasure = process.cpuUsage();
            await new Promise(resolve => setTimeout(resolve, 100));
            const endMeasure = process.cpuUsage(startMeasure);
            const userUsage = endMeasure.user / 1000000;
            const systemUsage = endMeasure.system / 1000000;
            return (userUsage + systemUsage).toFixed(1);
        }

        // Data
        const systemRAM = getSystemRAMUsage();
        const heapMemory = getHeapMemoryUsage();
        const uptimeString = getFilteredUptime();
        const dependencyCount = await getDependencyCount();
        const cpuUsage = await getCPUUsage();
        const pingReal = Date.now() - startTime;
        const botStatus = (pingReal < 200) ? 'Mượt mà' : (pingReal < 800) ? 'Bình thường' : 'Lag';
        const nowTime = moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss | DD/MM/YYYY');
        const cpuCores = os.cpus().length;
        const osType = os.type();
        const osRelease = os.release();
        const osArch = os.arch();
        const prefix = global.config.PREFIX || ".";

        // Canvas
        async function drawSystemCanvas() {
            const width = 1050, height = 720, padding = 55, radius = 38;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Main BG
            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, '#222C3E');
            bgGradient.addColorStop(1, '#181d28');
            ctx.fillStyle = bgGradient;
            roundedRect(ctx, 0, 0, width, height, radius);
            ctx.fill();

            // Window effect
            ctx.save();
            ctx.shadowColor = "#1A1E2A99";
            ctx.shadowBlur = 34;
            ctx.fillStyle = '#23293a';
            roundedRect(ctx, padding/2, padding/2, width-padding, height-padding/2, 32);
            ctx.fill();
            ctx.restore();

            // Header bar (macos style)
            ctx.save();
            ctx.fillStyle = '#232b3e';
            roundedRect(ctx, padding, padding - 28, width - 2*padding, 70, 18);
            ctx.fill();
            ctx.restore();

            // Header traffic lights
            const btnRadius = 12, btnY = padding + 9, btnXStart = padding + 34;
            const btnColors = ['#ff5f57', '#febb2e', '#28c840'];
            btnColors.forEach((color, i) => {
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(btnXStart + i * (btnRadius * 2 + 16), btnY, btnRadius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Header text
            ctx.font = "bold 36px Arial";
            ctx.fillStyle = "#F3F4FA";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "#202b3f55";
            ctx.shadowBlur = 12;
            ctx.fillText("SYSTEM DASHBOARD", width / 2, padding + 29);
            ctx.shadowBlur = 0;
            ctx.textAlign = "left";

            // Thin decor line
            ctx.strokeStyle = "#47b7f5";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(padding + 50, padding + 63);
            ctx.lineTo(width - padding - 50, padding + 63);
            ctx.stroke();

            // Main info box white overlay (glass effect)
            ctx.save();
            ctx.globalAlpha = 0.09;
            ctx.fillStyle = "#fff";
            roundedRect(ctx, padding + 6, padding + 74, width - 2 * padding - 12, height - 2 * padding - 56, 24);
            ctx.fill();
            ctx.restore();

            // --- Info grid (2 columns, wrap OS if too long) ---
            const y0 = padding + 110;
            const colGap = 68;
            const colWidth = (width - 2*padding - colGap) / 2;
            const leftX = padding + 36;
            const rightX = leftX + colWidth + colGap;
            const lineH = 47;
            const labelFont = "bold 23px Arial";
            const valueFont = "bold 23px Arial";
            const labelCol = "#59C0FF";
            const valueCol = "#F7F7F7";
            const labelCol2 = "#FEAD3A";

            // Left column: wrap value nếu dài (OS)
            let y = y0, idx = 0;
            const leftRows = [
                { label: "Thời gian:", value: nowTime, color: labelCol },
                { label: "Uptime:", value: uptimeString, color: labelCol2 },
                { label: "Prefix:", value: prefix, color: labelCol },
                { label: "Package:", value: dependencyCount >= 0 ? dependencyCount + " packages" : "Không xác định", color: labelCol },
                { label: "Trạng thái:", value: botStatus, color: labelCol },
                { label: "OS:", value: `${osType} ${osRelease} (${osArch})`, color: labelCol }
            ];
            let osY = 0;
            leftRows.forEach(row => {
                ctx.font = labelFont;
                ctx.fillStyle = row.color;
                ctx.fillText(row.label, leftX, y);
                ctx.font = valueFont;
                ctx.fillStyle = valueCol;
                // OS wrap nếu dài
                if (row.label === "OS:" && ctx.measureText(row.value).width > colWidth-140) {
                    const lines = wrapText(ctx, row.value, colWidth-140, valueFont);
                    lines.forEach((line, i) => {
                        ctx.fillText(line, leftX + 200, y + i*lineH*0.8);
                    });
                    osY = y + lines.length*lineH*0.8;
                    y += (lines.length-1)*lineH*0.8;
                } else {
                    ctx.fillText(row.value, leftX + 200, y);
                }
                y += lineH;
            });

            // Right column
            let ry = y0;
            const rightRows = [
                { label: "CPU core(s):", value: cpuCores, color: labelCol },
                { label: "CPU Used:", value: `${cpuUsage}%`, color: labelCol2 },
                { label: "RAM:", value: `${systemRAM.usedMem}MB / ${systemRAM.totalMem}MB`, color: labelCol },
                { label: "RAM free:", value: `${(systemRAM.freeMem / 1024).toFixed(2)} GB`, color: labelCol },
                { label: "Heap tổng:", value: `${heapMemory.heapTotal}MB`, color: labelCol },
                { label: "Heap dùng:", value: `${heapMemory.heapUsed}MB`, color: labelCol2 },
                { label: "Heap ngoài:", value: `${heapMemory.external}MB`, color: labelCol },
                { label: "RSS:", value: `${heapMemory.rss}MB`, color: labelCol },
                { label: "Ping:", value: `${pingReal} ms`, color: labelCol }
            ];
            rightRows.forEach(row => {
                ctx.font = labelFont;
                ctx.fillStyle = row.color;
                ctx.fillText(row.label, rightX, ry);
                ctx.font = valueFont;
                ctx.fillStyle = valueCol;
                ctx.fillText(String(row.value), rightX + 180, ry);
                ry += lineH;
            });

            // Footer
            ctx.font = "italic 20px Arial";
            ctx.fillStyle = "#A6B7E8";
            ctx.textAlign = "center";
            ctx.fillText("uptime system dashboard", width / 2, height - 30);

            // Save image
            const filePath = path.join(CACHE_DIR, `upt_${Date.now()}.png`);
            await new Promise((resolve, reject) => {
                const out = fs.createWriteStream(filePath);
                const stream = canvas.createPNGStream();
                stream.pipe(out);
                out.on('finish', resolve);
                out.on('error', reject);
            });
            return filePath;
        }

        function wrapText(ctx, text, maxWidth, font) {
            ctx.font = font;
            let words = text.split(' ');
            let lines = [];
            let line = words[0] || "";
            for (let i = 1; i < words.length; i++) {
                let testLine = line + " " + words[i];
                let metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth) {
                    lines.push(line);
                    line = words[i];
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            return lines;
        }

        function roundedRect(ctx, x, y, width, height, radius) {
            if (typeof radius === 'number') {
                radius = { tl: radius, tr: radius, br: radius, bl: radius };
            }
            ctx.beginPath();
            ctx.moveTo(x + radius.tl, y);
            ctx.lineTo(x + width - radius.tr, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
            ctx.lineTo(x + width, y + height - radius.br);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
            ctx.lineTo(x + radius.bl, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
            ctx.lineTo(x, y + radius.tl);
            ctx.quadraticCurveTo(x, y, x + radius.tl, y);
            ctx.closePath();
        }

        let type = args[0]?.toLowerCase() || "all";
        if (!["cpu", "ram", "all"].includes(type)) type = "all";
        let imagePath;
        try {
            imagePath = await drawSystemCanvas(type);
            await api.sendMessage({
                body: "",
                attachment: fs.createReadStream(imagePath)
            }, event.threadID, event.messageID);
        } catch (error) {
            api.sendMessage('Đã xảy ra lỗi khi tạo ảnh hệ thống.', event.threadID, event.messageID);
        } finally {
            if (imagePath) try { fs.unlinkSync(imagePath); } catch {}
        }
    }
};