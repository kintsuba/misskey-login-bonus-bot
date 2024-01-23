import MisskeyUtils from "./misskey-utils";
import experienceTable from "./experience-table";
import * as firebase from "firebase/app";
import "firebase/firestore";
import admin from "firebase-admin";
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as serviceAccount from "../key/misskey-login-bonus-c1453cb75c30.json";

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
  private db: FirebaseFirestore.Firestore;

  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyDYyN8Tl4vSpil1r1xdlTqVEDoaxzBrMMY",
      authDomain: "misskey-login-bonus.firebaseapp.com",
      databaseURL: "https://misskey-login-bonus.firebaseio.com",
      projectId: "misskey-login-bonus",
      storageBucket: "misskey-login-bonus.appspot.com",
      messagingSenderId: "1046728037357",
      appId: "1:1046728037357:web:81576eae5e5fc01715cde4",
    };
    firebase.initializeApp(firebaseConfig);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as unknown as string),
    });

    this.db = admin.firestore();
  }

  public async update(
    id: string,
    user: User,
    misskeyUtils: MisskeyUtils
  ): Promise<void> {
    const fortune = getTodayFortune();

    const host = user.host ?? "misskey.m544.net";
    const userDocRef = await this.db
      .collection("hosts")
      .doc(host)
      .collection("users")
      .doc(user.id);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      // 存在するなら更新処理
      if (userDoc.data()?.isLogin) {
        // ログインしていたら
        misskeyUtils.reaction("❎", id);

        misskeyUtils.replySpecified(
          `本日は既にログイン済みです。\n現在のレベル: **${
            userDoc.data()?.level
          }**\n次のレベルまで: **${
            userDoc.data()?.experienceNextLevelNeed
          }ポイント**\n連続ログイン: **${
            userDoc.data()?.continuousloginDays
          }日**\n合計ログイン: **${
            userDoc.data()?.totalLoginDays
          }日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
          id,
          [user.id]
        );
      } else {
        // ログインしていなかったら
        misskeyUtils.reaction("⭕", id);

        await userDocRef.update({
          experience: admin.firestore.FieldValue.increment(fortune.experience),
          avatarUrl: user.avatarUrl,
          username: user.username,
          name: user.name,
          isLogin: true,
          continuousloginDays: userDoc.data()?.isLastLogin
            ? admin.firestore.FieldValue.increment(1)
            : 1,
          totalLoginDays: admin.firestore.FieldValue.increment(1),
          lastLoginDate: new Date(),
        });
        const doc = await userDocRef.get();
        const data = doc.data();
        const { level, experienceNextLevelNeed } = experienceToLevel(
          data?.experience
        );
        await userDocRef.update({
          level: level,
          experienceNextLevelNeed: experienceNextLevelNeed,
        });

        misskeyUtils.replySpecified(
          `${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${data?.continuousloginDays}日**\n合計ログイン: **${data?.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
          id,
          [user.id]
        );
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
      await userDocRef.set(data);
      misskeyUtils.replySpecified(
        `${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${data?.continuousloginDays}日**\n合計ログイン: **${data?.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
        id,
        [user.id]
      );
    }
  }

  public async resetLogin(): Promise<void> {
    const hosts = await this.db.collection("hosts").listDocuments();
    for (const host of hosts) {
      const users = await host.collection("users").listDocuments();
      for (const user of users) {
        const userData = await user.get();
        user.update({
          isLastLogin: userData.data()?.isLogin,
          isLogin: false,
        });
      }
    }
  }
}
