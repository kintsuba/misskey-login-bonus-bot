"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const misskey_utils_1 = __importDefault(require("./misskey-utils"));
const WebSocket = __importStar(require("websocket"));
const bonus_1 = __importDefault(require("./bonus"));
const periodically_jobs_1 = __importDefault(require("./periodically-jobs"));
require("dotenv").config();
if (!process.env.MISSKEY_TOKEN) {
    console.error("Make .env file.");
    process.exit(-1);
}
const token = process.env.MISSKEY_TOKEN;
const instance = "misskey.m544.net";
const botId = "5e2129e264d25837f5c87b6c";
const bonus = new bonus_1.default();
let isRunOnceFunction = false;
const client = new WebSocket.client();
client.on("connectFailed", error => {
    console.log("Connect Error: " + error.toString());
    setTimeout(() => client.connect("wss://misskey.m544.net/streaming?i=" + token), 6000);
});
client.on("connect", connection => {
    console.log("WebSocket Client Connected");
    const misskeyUtils = new misskey_utils_1.default(token, connection);
    if (!isRunOnceFunction) {
        periodically_jobs_1.default(misskeyUtils, bonus);
        isRunOnceFunction = true;
    }
    connection.on("error", error => {
        console.log("Connection Error: " + error.toString());
        connection.close();
    });
    connection.on("close", () => {
        console.log("WebSocket Client Closed");
        setTimeout(() => client.connect("wss://misskey.m544.net/streaming?i=" + token), 6000);
    });
    connection.on("message", message => {
        if (!message.utf8Data)
            return;
        const data = JSON.parse(message.utf8Data);
        if (data.body.id === "formain" && data.body.type === "followed") {
            misskeyUtils.follow(data.body.body.id);
        }
        else if (data.body.id === "forhybridtl" && data.body.type == "note") {
            console.debug(data);
            if (/ログインボーナス|ログボ|ろぐいんぼーなす|ろぐぼ/.test(data.body.body.text)) {
                if (data.body.body.userId === botId)
                    return; // 自分自身は弾く
                bonus.update(data.body.body.id, data.body.body.user, misskeyUtils);
            }
        }
    });
    connection.sendUTF(misskey_utils_1.default.connectMainJson);
    connection.sendUTF(misskey_utils_1.default.connectHybridTLJson);
});
client.connect("wss://" + instance + "/streaming?i=" + token);
//# sourceMappingURL=main.js.map