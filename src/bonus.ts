import MisskeyUtils from "./misskey-utils";
import experienceTable from "./experience-table";
import { FieldValue, Filter, Firestore } from "firebase-admin/firestore";
import { applicationDefault, initializeApp } from "firebase-admin/app";

interface User {
  id: string;
  username: string;
  name: string | undefined;
  host: string | undefined;
  description: string | undefined;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  notesCount: number;
  isBot: boolean;
  isCat: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  isLocked: boolean;
  avatarUrl: string;
}

const getTodayFortune = (): { message: string; experience: number } => {
  const rand = Math.random() * 100;

  if (0 <= rand && rand < 1) {
    return {
      message: "**Awesome!** 経験値を**100ポイント**手に入れた！",
      experience: 100,
    };
  } else if (1 <= rand && rand < 6) {
    return {
      message: "**Great!** 経験値を**50ポイント**手に入れた！",
      experience: 50,
    };
  } else if (6 <= rand && rand < 26) {
    return {
      message: "**Lucky!** 経験値を**20ポイント**手に入れた！",
      experience: 20,
    };
  } else if (26 <= rand && rand < 100) {
    return {
      message: "経験値を**10ポイント**手に入れた！",
      experience: 10,
    };
  } else {
    return {
      message: "経験値が手に入らなかった……",
      experience: 0,
    };
  }
};

const experienceToLevel = (
  experience: number,
  level = 1
): { level: number; experienceNextLevelNeed: number } => {
  if (experience >= experienceTable[level - 1]) {
    return experienceToLevel(
      experience - experienceTable[level - 1],
      level + 1
    );
  } else {
    return {
      level: level,
      experienceNextLevelNeed: experienceTable[level - 1] - experience,
    };
  }
};

export default class Bonus {
  private db: Firestore;

  constructor() {
    initializeApp({
      credential: applicationDefault(),
    });

    this.db = new Firestore();
  }

  public createUnlockCode(): string {
    return Math.floor(Math.random() * (999999 - 100000) + 100000).toString();
  }

  public async update(
    id: string,
    user: User,
    misskeyUtils: MisskeyUtils
  ): Promise<void> {
    const fortune = getTodayFortune();

    const host = user.host ?? "misskey.m544.net";
    const userRef = this.db.doc(`hosts/${host}/users/${user.id}`);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();

      // 存在するなら更新処理
      if (userData?.isLogin) {
        // ログインしていたら
        misskeyUtils.reaction("❎", id);

        misskeyUtils.replySpecified(
          `本日は既にログイン済みです。\n現在のレベル: **${userData.level}**\n次のレベルまで: **${userData.experienceNextLevelNeed}ポイント**\n連続ログイン: **${userData.continuousloginDays}日**\n合計ログイン: **${userData.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
          id,
          [user.id]
        );
      } else {
        // ログインしていなかったら

        // ロックされているか確認する
        if (userData?.isLocked !== undefined && userData?.isLocked) {
          // されていたらロックを解除する方法を教える

          const code = this.createUnlockCode();
          await userRef.update({ unlockCode: code });

          misskeyUtils.replySpecified(
            `自動化対策のため、あなたのアカウントはロックされています。\n以下の6文字のコードをメンション付きでこのアカウント宛に送信してください。\n\nコード: **${code}**`,
            id,
            [user.id]
          );
        } else {
          // ロックされていなかったら
          const now = new Date();

          if (userData?.lastLoginDate) {
            // 最後にログインした日時が取得できる場合
            const lastLoginDate = userData?.lastLoginDate.toDate();
            const elapsedTime =
              now.getTime() - lastLoginDate.getTime() - 86400000;

            if (elapsedTime >= -5000 && elapsedTime <= 5000) {
              // 前回のログイン日時から±5秒以内の場合、自動化を疑ってロックする
              const code = this.createUnlockCode();
              await userRef.update({ isLocked: true, unlockCode: code });

              misskeyUtils.replySpecified(
                `自動化対策のため、あなたのアカウントはロックされています。\n以下の6文字のコードをメンション付きでこのアカウント宛に送信してください。\n\nコード: **${code}**`,
                id,
                [user.id]
              );
            }
          } else {
            // 通常のログイン処理
            misskeyUtils.reaction("⭕", id);

            await userRef.update({
              experience: FieldValue.increment(fortune.experience),
              avatarUrl: user.avatarUrl,
              username: user.username,
              name: user.name,
              isLogin: true,
              continuousloginDays: userDoc.data()?.isLastLogin
                ? FieldValue.increment(1)
                : 1,
              totalLoginDays: FieldValue.increment(1),
              lastLoginDate: now,
            });
            const doc = await userRef.get();
            const data = doc.data();
            const { level, experienceNextLevelNeed } = experienceToLevel(
              data?.experience
            );
            await userRef.update({
              level: level,
              experienceNextLevelNeed: experienceNextLevelNeed,
            });

            misskeyUtils.replySpecified(
              `${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${data?.continuousloginDays}日**\n合計ログイン: **${data?.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
              id,
              [user.id]
            );
          }
        }
      }
    } else {
      // 存在しないなら作成処理
      misskeyUtils.reaction("⭕", id);

      const { level, experienceNextLevelNeed } = experienceToLevel(
        fortune.experience
      );

      const data = {
        avatarUrl: user.avatarUrl,
        username: user.username,
        experience: fortune.experience,
        name: user.name,
        level: level,
        experienceNextLevelNeed: experienceNextLevelNeed,
        isLogin: true,
        isLastLogin: false,
        continuousloginDays: 1,
        totalLoginDays: 1,
        host: host,
        lastLoginDate: new Date(),
      };
      await userRef.set(data);
      misskeyUtils.replySpecified(
        `${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${data?.continuousloginDays}日**\n合計ログイン: **${data?.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
        id,
        [user.id]
      );
    }
  }

  public async unlock(
    id: string,
    user: User,
    note: string,
    misskeyUtils: MisskeyUtils
  ): Promise<void> {
    const execResult = /\d{6}/.exec(note);
    if (!execResult) return;

    const inputCode = execResult[0];

    const host = user.host ?? "misskey.m544.net";
    const userRef = this.db.doc(`hosts/${host}/users/${user.id}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return;

    const userData = userDoc.data();

    if (userData?.isLocked && userData?.unlockCode == inputCode) {
      await userRef.update({ isLocked: false });

      misskeyUtils.replySpecified(
        `**ロックを解除しました！**\nログインボーナスを取得する場合は改めて「ログボ」と送信してください。`,
        id,
        [user.id]
      );
    }
  }

  public async resetLogin(): Promise<void> {
    const usersQuery = this.db
      .collectionGroup("users")
      .where(
        Filter.or(
          Filter.where("isLogin", "==", true),
          Filter.where("isLastLogin", "==", true)
        )
      );
    const usersQuerySnap = await usersQuery.get();

    usersQuerySnap.forEach(async (doc) => {
      await doc.ref.update({
        isLastLogin: doc.data()?.isLogin,
        isLogin: false,
      });
    });
  }
}
