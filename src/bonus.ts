import MisskeyUtils from "./misskey-utils";

const getTodayFortune = (): { message: string; experience: number } => {
  const rand = Math.random() * 100;

  if (rand === 0) {
    return {
      message: "**Awesome!** 経験値を**100ポイント**手に入れた！",
      experience: 100
    };
  } else if (1 <= rand && rand < 6) {
    return {
      message: "**Great!** 経験値を**50ポイント**手に入れた！",
      experience: 50
    };
  } else if (6 <= rand && rand < 26) {
    return {
      message: "**Lucky!** 経験値を**20ポイント**手に入れた！",
      experience: 20
    };
  } else if (26 <= rand && rand < 100) {
    return {
      message: "経験値を**10ポイント**手に入れた！",
      experience: 10
    };
  } else {
    return {
      message: "経験値が手に入らなかった……",
      experience: 0
    };
  }
};

export default class Bonus {
  // constructor() {}

  update(id: string, userId: string, misskeyUtils: MisskeyUtils): void {
    const fortune = getTodayFortune();
    misskeyUtils.replyHome(fortune.message, id);
  }
}
