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
type BonusUser = Parameters<Bonus["update"]>[1];
type StreamEnvelope = {
  body: {
    id: string;
    type: string;
    body: unknown;
  };
};
type FollowedBody = {
  id: string;
};
type NoteBody = {
  id: string;
  userId: string;
  user: BonusUser;
  text: string;
};

const client = new WebSocket.client();
const streamingUrl = "wss://" + instance + "/streaming?i=" + token;
const maxReconnectDelay = 60000;
let reconnectDelay = 1000;
let reconnectTimer: NodeJS.Timeout | undefined;

const errorToString = (error: unknown): string => {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === "object";
};

const isBonusUser = (value: unknown): value is BonusUser => {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.username === "string" &&
    typeof value.avatarUrl === "string"
  );
};

const isStreamEnvelope = (value: unknown): value is StreamEnvelope => {
  return (
    isRecord(value) &&
    isRecord(value.body) &&
    typeof value.body.id === "string" &&
    typeof value.body.type === "string" &&
    "body" in value.body
  );
};

const isFollowedBody = (value: unknown): value is FollowedBody => {
  return isRecord(value) && typeof value.id === "string";
};

const isNoteBody = (value: unknown): value is NoteBody => {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.text === "string" &&
    isBonusUser(value.user)
  );
};

const parseStreamingMessage = (text: string): StreamEnvelope | undefined => {
  try {
    const data: unknown = JSON.parse(text);
    if (isStreamEnvelope(data)) return data;
    console.log(`Unexpected streaming message shape: ${text.slice(0, 500)}`);
  } catch (error) {
    console.log(`Failed to parse streaming message: ${errorToString(error)}`);
  }
  return;
};

const scheduleReconnect = (reason: string) => {
  if (reconnectTimer) return;

  const delay = reconnectDelay;
  console.log(`Reconnect in ${delay}ms. Reason: ${reason}`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    client.connect(streamingUrl);
  }, delay);
  reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
};

client.on("connectFailed", (error) => {
  console.log("Connect Error: " + error.toString());
  scheduleReconnect(error.toString());
});

client.on("connect", (connection) => {
  console.log("WebSocket Client Connected");
  reconnectDelay = 1000;

  const misskeyUtils = new MisskeyUtils(token, connection);

  connection.on("error", (error) => {
    console.log("Connection Error: " + error.toString());
    connection.close(-1, error.toString());
  });
  connection.on("close", (reasonCode, description) => {
    console.log(
      `WebSocket Client Closed. Code: ${reasonCode}. Reason: ${description}`
    );
    scheduleReconnect(description || reasonCode.toString());
  });
  connection.on("message", async (message) => {
    try {
      if (!message || message.type !== "utf8") return;
      const data = parseStreamingMessage(message.utf8Data);
      if (!data) return;

      const streamBody = data.body;
      if (streamBody.id === "formain" && streamBody.type === "followed") {
        if (!isFollowedBody(streamBody.body)) {
          console.log("Unexpected followed message body");
          return;
        }
        await misskeyUtils.follow(streamBody.body.id);
      } else if (streamBody.id === "forhybridtl" && streamBody.type == "note") {
        if (!isNoteBody(streamBody.body)) {
          console.log("Unexpected note message body");
          return;
        }
        const note = streamBody.body;
        console.debug(data);

        if (/\d{6}/.test(note.text)) {
          await bonus.unlock(note.id, note.user, note.text, misskeyUtils);
        }

        if (
          /ログインボーナス|ログボ|ろぐいんぼーなす|ろぐぼ/.test(
            note.text
          )
        ) {
          if (note.userId === botId) return; // 自分自身は弾く
          await bonus.update(note.id, note.user, misskeyUtils);
        }
      }
    } catch (error) {
      console.log(
        `Failed to handle streaming message: ${errorToString(error)}`
      );
    }
  });

  connection.sendUTF(MisskeyUtils.connectMainJson);
  connection.sendUTF(MisskeyUtils.connectHybridTLJson);
});

client.connect(streamingUrl);
