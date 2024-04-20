import MisskeyUtils from "./misskey-utils";
import experienceTable from "./experience-table";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collectionGroup,
  getDocs,
  Firestore,
  query,
  where,
  or,
  doc,
  getDoc,
  setDoc,
  increment,
  updateDoc,
} from "firebase/firestore/lite";
// eslint-disable-next-line @typescript-eslint/no-var-requires

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
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };
    const app = initializeApp(firebaseConfig);
    this.db = getFirestore(app);
  }

  public async update(
    id: string,
    user: User,
    misskeyUtils: MisskeyUtils
  ): Promise<void> {
    const fortune = getTodayFortune();

    const host = user.host ?? "misskey.m544.net";
    const userRef = doc(this.db, "hosts", host, "users", user.id);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // 存在するなら更新処理
      if (userData.isLogin) {
        // ログインしていたら
        misskeyUtils.reaction("❎", id);

        misskeyUtils.replySpecified(
          `本日は既にログイン済みです。\n現在のレベル: **${userData.level}**\n次のレベルまで: **${userData.experienceNextLevelNeed}ポイント**\n連続ログイン: **${userData.continuousloginDays}日**\n合計ログイン: **${userData.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
          id,
          [user.id]
        );
      } else {
        // ログインしていなかったら
        misskeyUtils.reaction("⭕", id);

        await updateDoc(userRef, {
          experience: increment(fortune.experience),
          avatarUrl: user.avatarUrl,
          username: user.username,
          name: user.name,
          isLogin: true,
          continuousloginDays: userDoc.data()?.isLastLogin ? increment(1) : 1,
          totalLoginDays: increment(1),
          lastLoginDate: new Date(),
        });
        const doc = await getDoc(userRef);
        const data = doc.data();
        const { level, experienceNextLevelNeed } = experienceToLevel(
          data?.experience
        );
        await updateDoc(userRef, {
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
      await setDoc(userRef, data);
      misskeyUtils.replySpecified(
        `${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${data?.continuousloginDays}日**\n合計ログイン: **${data?.totalLoginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`,
        id,
        [user.id]
      );
    }
  }

  public async resetLogin(): Promise<void> {
    const usersQuery = query(
      collectionGroup(this.db, "users"),
      or(where("isLogin", "==", true), where("isLastLogin", "==", true))
    );
    const usersQuerySnap = await getDocs(usersQuery);

    usersQuerySnap.forEach(async (doc) => {
      await updateDoc(doc.ref, {
        isLastLogin: doc.data()?.isLogin,
        isLogin: false,
      });
    });
  }
}
