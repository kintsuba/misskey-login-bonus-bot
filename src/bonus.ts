import * as WebSocket from "websocket";

export default class Bonus {
  // constructor() {}

  update(message: WebSocket.IMessage): void {
    console.log(message);
  }
}
