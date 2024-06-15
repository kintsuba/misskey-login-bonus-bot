import MisskeyUtils from "./misskey-utils";
import * as WebSocket from "websocket";
import Bonus from "./bonus";

require("dotenv").config();

if (!process.env.MISSKEY_TOKEN) {
  console.error("Make .env file.");
  process.exit(-1);
}

const token = process.env.MISSKEY_TOKEN;
const instance = "misskey.m544.net";
const botId = "5e2129e264d25837f5c87b6c";

const bonus = new Bonus();

const client = new WebSocket.client();

client.on("connectFailed", (error) => {
  console.log("Connect Error: " + error.toString());
});

client.on("connect", (connection) => {
  console.log("WebSocket Client Connected");

  const misskeyUtils = new MisskeyUtils(token, connection);

  connection.on("error", (error) => {
    console.log("Connection Error: " + error.toString());
    connection.close(-1, error.toString());
  });
  connection.on("close", (reasonCode, description) => {
    console.log("WebSocket Client Closed. Reason: " + description);
    process.exit(reasonCode);
  });
  connection.on("message", (message) => {
    if (!message || message.type !== "utf8") return;
    const data = JSON.parse(message.utf8Data);

    if (data.body.id === "formain" && data.body.type === "followed") {
      misskeyUtils.follow(data.body.body.id);
    } else if (data.body.id === "forhybridtl" && data.body.type == "note") {
      console.debug(data);

      if (/\d{6}/.test(data.body.body.text)) {
        bonus.unlock(
          data.body.body.id,
          data.body.body.user,
          data.body.body.text,
          misskeyUtils
        );
      }

      if (
        /ログインボーナス|ログボ|ろぐいんぼーなす|ろぐぼ/.test(
          data.body.body.text
        )
      ) {
        if (data.body.body.userId === botId) return; // 自分自身は弾く
        bonus.update(data.body.body.id, data.body.body.user, misskeyUtils);
      }
    }
  });

  connection.sendUTF(MisskeyUtils.connectMainJson);
  connection.sendUTF(MisskeyUtils.connectHybridTLJson);
});

client.connect("wss://" + instance + "/streaming?i=" + token);
