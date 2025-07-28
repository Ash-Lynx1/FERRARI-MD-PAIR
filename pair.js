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

// Clear auth folder on startup
const authFolder = './auth_info_baileys';
if (fs.existsSync(authFolder)) {
    fs.emptyDirSync(authFolder);
}

// Default message with branding
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

    async function startSuhailSession() {
        // Ensure auth folder is clean
        await fs.ensureDir(authFolder);
        await fs.emptyDir(authFolder);

        const { state, saveCreds } = await useMultiFileAuthState(authFolder);

        try {
            const Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Safari"),
            });

            // On successful connection
            Smd.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
                if (connection === "close") {
                    const reason = new Boom(lastDisconnect?.error)?.output.statusCode;

                    if (reason === DisconnectReason.restartRequired) {
                        console.log("[RESTART] Restarting session...");
                        startSuhailSession();
                    } else if (reason === DisconnectReason.connectionClosed ||
                               reason === DisconnectReason.connectionLost ||
                               reason === DisconnectReason.timedOut) {
                        console.log("[CLOSED] Connection lost. Restarting...");
                        await delay(3000);
                        exec('pm2 restart qasim', (err) => {
                            if (err) console.error("PM2 restart failed:", err);
                        });
                    } else {
                        console.log("Connection closed:", reason);
                    }
                    return;
                }

                // Pairing code phase
                if (!Smd.authState.creds.registered) {
                    await delay(1500);
                    const cleanedNumber = num.replace(/[^0-9]/g, '');
                    try {
                        const pairingCode = await Smd.requestPairingCode(cleanedNumber);
                        if (!res.headersSent) {
                            await res.send({ code: pairingCode });
                        }
                        console.log("Pairing code sent:", pairingCode);
                    } catch (err) {
                        console.error("Failed to request pairing code:", err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: "Failed to generate pairing code." });
                        }
                    }
                }

                // Connection open: session is ready
                if (connection === "open") {
                    console.log("✅ WhatsApp connection opened successfully.");

                    try {
                        const userJid = Smd.user.id;

                        // Wait a bit for stability
                        await delay(8000);

                        // Ensure creds.json exists
                        const credsPath = `${authFolder}/creds.json`;
                        if (!fs.existsSync(credsPath)) {
                            console.error("creds.json not found!");
                            return;
                        }

                        // Generate random ID for Mega filename
                        function randomMegaId(length = 6, numberLength = 4) {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        // Upload creds.json to Mega
                        const fileName = `${randomMegaId()}.json`;
                        const megaLink = await upload(fs.createReadStream(credsPath), fileName);
                        const sessionId = megaLink.replace('https://mega.nz/file/', '');

                        // Step 1: Send Session ID
                        const idMsg = await Smd.sendMessage(userJid, {
                            text: `*Session ID:*\n\`\`\`${sessionId}\`\`\`\n_Sending session file..._`
                        });

                        // Step 2: Send Banner Image + Success Message
                        const bannerUrl = 'https://files.catbox.moe/3l444i.jpg';
                        await Smd.sendMessage(userJid, {
                            image: { url: bannerUrl },
                            caption: `✅ *Pair Successful!*\n\n${MESSAGE}`
                        }, { quoted: idMsg });

                        console.log("✅ Session ID and banner sent to user.");

                        // Cleanup: Clear auth folder
                        await delay(2000);
                        await fs.emptyDir(authFolder);

                    } catch (uploadError) {
                        console.error("Error during upload or send:", uploadError);
                        try {
                            await Smd.sendMessage(Smd.user.id, {
                                text: "❌ Failed to upload or send session. Please try again later."
                            });
                        } catch (e) { /* ignore */ }
                    } finally {
                        // Ensure cleanup
                        await fs.emptyDir(authFolder).catch(console.error);
                    }
                }
            });

            // Save credentials when updated
            Smd.ev.on("creds.update", saveCreds);

        } catch (error) {
            console.error("Critical error in session creation:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: "Session creation failed. Restarting..." });
            }
            exec('pm2 restart qasim', (err) => {
                if (err) console.error("PM2 restart command failed:", err);
            });
            await fs.emptyDir(authFolder);
        }
    }

    // Start session
    await startSuhailSession();
});

module.exports = router;
