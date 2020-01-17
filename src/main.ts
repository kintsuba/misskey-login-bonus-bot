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

const bonus = new Bonus();

const client = new WebSocket.client();

client.on("connectFailed", error => {
  console.log("Connect Error: " + error.toString());
  setTimeout(
    () => client.connect("wss://misskey.m544.net/streaming?i=" + token),
    6000
  );
});

client.on("connect", connection => {
  console.log("WebSocket Client Connected");

  const misskeyUtils = new MisskeyUtils(token, connection);

  connection.on("error", error => {
    console.log("Connection Error: " + error.toString());
    connection.close();
  });
  connection.on("close", () => {
    console.log("WebSocket Client Closed");
    setTimeout(
      () => client.connect("wss://misskey.m544.net/streaming?i=" + token),
      6000
    );
  });
  connection.on("message", message => {
    if (!message.utf8Data) return;
    const data = JSON.parse(message.utf8Data);

    if (data.body.id === "formain" && data.body.type === "followed") {
      misskeyUtils.follow(data.body.body.id);
    } else if (data.body.id === "forhybridtl" && data.body.type == "note") {
      if (/ログインボーナス/.test(data.body.body.text)) {
        bonus.update(message);
      }
    }
  });

  connection.sendUTF(MisskeyUtils.connectMainJson);
  connection.sendUTF(MisskeyUtils.connectHybridTLJson);
});

client.connect("wss://" + instance + "/streaming?i=" + token);
