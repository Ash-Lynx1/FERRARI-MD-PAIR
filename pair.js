const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const { Boom } = require("@hapi/boom");

const MESSAGE = process.env.MESSAGE || `
𝐅𝐄𝐑𝐑𝐀𝐑𝐈-𝐌𝐃 𝐒𝐔𝐂𝐂𝐄𝐅𝐔𝐋𝐋𝐘 𝐏𝐀𝐈𝐑𝐄𝐃

𝐆𝐈𝐕𝐄 𝐀 𝐒𝐓𝐀𝐑 𝐀𝐍𝐃 𝐅𝐎𝐑𝐊 𝐓𝐇𝐄 𝐑𝐄𝐏𝐎
https://github.com/ALPHA-KING-TECH/FERRARI-MD-V1

𝐅𝐎𝐋𝐋𝐎𝐖 𝐔𝐒 𝐅𝐎𝐑 𝐔𝐏𝐃𝐀𝐓𝐄𝐒 | 𝐒𝐎𝐂𝐈𝐀𝐋 𝐋𝐈𝐍𝐊𝐒

https://t.me/SecUnitDevs

https://whatsapp.com/channel/0029VbBD719C1Fu3FOqzhb2R

𝐅𝐄𝐑𝐑𝐀𝐑𝐈-𝐌𝐃 𝐘𝐎𝐔𝐑 𝐒𝐌𝐀𝐑𝐓 𝐀𝐔𝐓𝐎𝐌𝐀𝐓𝐈𝐎𝐍
`;

const { upload } = require('./mega');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// Ensure the directory is empty when the app starts
if (fs.existsSync('./auth_info_baileys')) {
    fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

router.get('/', async (req, res) => {
    let num = req.query.number;

    async function SUHAIL() {
        const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);
        try {
            let Smd = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!Smd.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Smd.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Smd.ev.on('creds.update', saveCreds);
            Smd.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    try {
                        await delay(10000);
                        if (fs.existsSync('./auth_info_baileys/creds.json'));

                        const auth_path = './auth_info_baileys/';
                        let user = Smd.user.id;

                        function randomMegaId(length = 6, numberLength = 4) {
                            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            let result = '';
                            for (let i = 0; i < length; i++) {
                                result += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                            const number = Math.floor(Math.random() * Math.pow(10, numberLength));
                            return `${result}${number}`;
                        }

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${randomMegaId()}.json`);
                        const Id_session = mega_url.replace('https://mega.nz/file/', '');
                        const Scan_Id = Id_session;

                        // Send session ID
                        let msgsss = await Smd.sendMessage(user, { text: Scan_Id });

                        // Send banner image with caption as a forwarded message from the newsletter channel
                        await Smd.sendMessage(user, {
                            image: { url: "https://files.catbox.moe/3l444i.jpg" },
                            caption: MESSAGE,
                            contextInfo: {
                                forwardingScore: 999,
                                isForwarded: true,
                                externalAdReply: {
                                    showAdAttribution: true,
                                    title: "𝐒𝐞𝐜𝐔𝐧𝐢𝐭𝐃𝐞𝐯𝐬",
                                    body: "WhatsApp Channel",
                                    previewType: "PHOTO",
                                    thumbnailUrl: "https://whatsapp.com/channel/0029VbBD719C1Fu3FOqzhb2R",
                                    mediaType: 1,
                                    mediaUrl: "https://whatsapp.com/channel/0029VbBD719C1Fu3FOqzhb2R",
                                    sourceUrl: "https://whatsapp.com/channel/0029VbBD719C1Fu3FOqzhb2R"
                                }
                            }
                        }, { quoted: msgsss });

                        await delay(1000);
                        try { await fs.emptyDirSync(__dirname + '/auth_info_baileys'); } catch (e) { }

                    } catch (e) {
                        console.log("Error during file upload or message send: ", e);
                    }

                    await delay(100);
                    await fs.emptyDirSync(__dirname + '/auth_info_baileys');
                }

                if (connection === "close") {
                    let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
                    if (reason === DisconnectReason.connectionClosed) {
                        console.log("Connection closed!");
                    } else if (reason === DisconnectReason.connectionLost) {
                        console.log("Connection Lost from Server!");
                    } else if (reason === DisconnectReason.restartRequired) {
                        console.log("Restart Required, Restarting...");
                        SUHAIL().catch(err => console.log(err));
                    } else if (reason === DisconnectReason.timedOut) {
                        console.log("Connection TimedOut!");
                    } else {
                        console.log('Connection closed with bot. Please run again.');
                        console.log(reason);
                        await delay(5000);
                        exec('pm2 restart qasim');
                    }
                }
            });

        } catch (err) {
            console.log("Error in SUHAIL function: ", err);
            exec('pm2 restart qasim');
            console.log("Service restarted due to error");
            SUHAIL();
            await fs.emptyDirSync(__dirname + '/auth_info_baileys');
            if (!res.headersSent) {
                await res.send({ code: "Try After Few Minutes" });
            }
        }
    }

    await SUHAIL();
});

module.exports = router;
