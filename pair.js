const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

let router = express.Router();

const authFolder = './auth_info_baileys';

// Clear auth folder on startup
if (fs.existsSync(authFolder)) {
    fs.emptyDirSync(authFolder);
}

// Default message
const MESSAGE = process.env.MESSAGE || `
*𝐒𝐄𝐒𝐒𝐈𝐎𝐍 𝐂𝐑𝐄𝐀𝐓𝐄𝐃 𝐀𝐍𝐃 𝐑𝐄𝐀𝐃𝐘 𝐅𝐎𝐑 𝐃𝐄𝐏𝐋𝐎𝐘*

*★ 𝐆𝐢𝐯𝐞 𝐀 𝐒𝐭𝐚𝐫 𝐀𝐧𝐝 𝐅𝐨𝐫𝐤 𝐓𝐡𝐞 𝐑𝐞𝐩𝐨*
https://github.com/ALPHA-KING-TECH/FERRARI-MD-V1  

*✍︎ 𝐉𝐨𝐢𝐧 𝐎𝐮𝐫 𝐂𝐡𝐚𝐧𝐧𝐞𝐥𝐬 𝐅𝐨𝐫 𝐔𝐩𝐝𝐚𝐭𝐞𝐬* 
https://t.me/SecUnitDevs  

https://whatsapp.com/channel/0029VbBD719C1Fu3FOqzhb2R  

*𝐅𝐞𝐫𝐫𝐚𝐫𝐢-𝐌𝐃_𝐕1 | 𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐒𝐞𝐜𝐔𝐧𝐢𝐭𝐃𝐞𝐯𝐬*
> ✔︎ 𝐀𝐥𝐥 𝐫𝐢𝐠𝐡𝐭𝐬 𝐫𝐞𝐬𝐞𝐫𝐯𝐞𝐝
`;

// Main route to generate session
router.get('/', async (req, res) => {
    const num = req.query.number;

    if (!num) {
        return res.status(400).json({ error: "Phone number is required." });
    }

    async function startSuhailSession() {
        await fs.ensureDir(authFolder);
        await fs.emptyDir(authFolder);

        const { state, saveCreds } = await useMultiFileAuthState(authFolder);

        let Smd;
        let pairingAttempts = 0;
        const maxAttempts = 6; // ~3 mins if each attempt waits 30s
        const attemptInterval = 30_000; // 30 seconds per code

        try {
            Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Safari"),
            });

            // Handle connection updates
            Smd.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
                if (connection === "close") {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;

                    if (reason === DisconnectReason.restartRequired) {
                        console.log("[RESTART] Restarting...");
                        startSuhailSession();
                    } else if (
                        reason === DisconnectReason.connectionClosed ||
                        reason === DisconnectReason.connectionLost ||
                        reason === DisconnectReason.timedOut
                    ) {
                        console.log("[LOST] Connection lost. Restarting...");
                        await delay(3000);
                        exec('pm2 restart qasim', (err) => {
                            if (err) console.error("PM2 restart failed:", err);
                        });
                    } else {
                        console.log("Connection closed:", reason);
                    }
                    return;
                }

                if (connection === "open") {
                    console.log("✅ WhatsApp connection opened successfully.");
                    try {
                        const userJid = Smd.user.id;
                        await delay(5000); // Wait for stability

                        const credsPath = `${authFolder}/creds.json`;
                        if (!fs.existsSync(credsPath)) {
                            console.error("creds.json not found!");
                            return;
                        }

                        // Generate random filename
                        const randomMegaId = (length = 6, numberLength = 4) => {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        };

                        const fileName = `${randomMegaId()}.json`;
                        const megaLink = await upload(fs.createReadStream(credsPath), fileName);
                        const sessionId = megaLink.replace('https://mega.nz/file/', '');

                        // Send session ID
                        const idMsg = await Smd.sendMessage(userJid, {
                            text: `*Session ID:*\n\`\`\`${sessionId}\`\`\`\n_Sending session file..._`
                        });

                        // Send banner + success message
                        const bannerUrl = 'https://files.catbox.moe/3l444i.jpg';
                        await Smd.sendMessage(userJid, {
                            image: { url: bannerUrl },
                            caption: `✅ *Pair Successful!*\n\n${MESSAGE}`
                        }, { quoted: idMsg });

                        console.log("✅ Session ID and banner sent.");

                        // Cleanup
                        await delay(2000);
                        await fs.emptyDir(authFolder);

                    } catch (uploadError) {
                        console.error("Upload/send error:", uploadError);
                        try {
                            await Smd.sendMessage(Smd.user.id, {
                                text: "❌ Failed to upload or send session file."
                            });
                        } catch (e) { /* ignore */ }
                    } finally {
                        await fs.emptyDir(authFolder).catch(console.error);
                    }
                }
            });

            Smd.ev.on("creds.update", saveCreds);

            // === Pairing Code Retry Loop (Up to 3 minutes) ===
            const cleanedNumber = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

            const requestCode = async () => {
                if (pairingAttempts >= maxAttempts) {
                    console.log("❌ Max pairing attempts reached. Aborting.");
                    if (!res.headersSent) {
                        res.status(500).json({ error: "Pairing code expired after 3 minutes." });
                    }
                    await fs.emptyDir(authFolder);
                    return;
                }

                try {
                    await delay(1000); // Avoid rate-limiting
                    const code = await Smd.requestPairingCode(cleanedNumber);
                    pairingAttempts++;

                    if (!res.headersSent) {
                        res.write(JSON.stringify({ code, attempt: pairingAttempts }) + "\n");
                        console.log(`📲 Pairing code sent (Attempt ${pairingAttempts}):`, code);
                    }

                    // Schedule next attempt if not connected
                    setTimeout(requestCode, attemptInterval);
                } catch (err) {
                    if (pairingAttempts >= maxAttempts) {
                        if (!res.headersSent) {
                            res.status(500).json({ error: "Failed to generate pairing code after 3 minutes." });
                        }
                        await fs.emptyDir(authFolder);
                        return;
                    }
                    console.error(`Attempt ${pairingAttempts + 1} failed:`, err.message);
                    pairingAttempts++;
                    setTimeout(requestCode, attemptInterval);
                }
            };

            // Start retry loop
            setTimeout(requestCode, 2000);

        } catch (error) {
            console.error("Critical error:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Session creation failed." });
            }
            exec('pm2 restart qasim', (err) => {
                if (err) console.error("PM2 restart failed:", err);
            });
            await fs.emptyDir(authFolder);
        }
    }

    await startSuhailSession();
});

module.exports = router;
