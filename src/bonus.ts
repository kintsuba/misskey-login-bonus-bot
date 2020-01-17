import MisskeyUtils from "./misskey-utils";
import firebase from "firebase/app";
import "firebase/firestore";
import admin from "firebase-admin";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require("../key/misskey-login-bonus-c1453cb75c30.json");

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
  constructor() {
    const firebaseConfig = {
      apiKey: "AIzaSyDYyN8Tl4vSpil1r1xdlTqVEDoaxzBrMMY",
      authDomain: "misskey-login-bonus.firebaseapp.com",
      databaseURL: "https://misskey-login-bonus.firebaseio.com",
      projectId: "misskey-login-bonus",
      storageBucket: "misskey-login-bonus.appspot.com",
      messagingSenderId: "1046728037357",
      appId: "1:1046728037357:web:81576eae5e5fc01715cde4"
    };
    firebase.initializeApp(firebaseConfig);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    this.db = admin.firestore();
  }

  db: FirebaseFirestore.Firestore;

  async update(
    id: string,
    user: User,
    misskeyUtils: MisskeyUtils
  ): Promise<void> {
    const fortune = getTodayFortune();
    misskeyUtils.replyHome(fortune.message, id);

    const docRef = await this.db.collection("users").doc(user.id);
    if (docRef) {
      // 存在するなら更新処理
      console.debug("存在するやで");
    } else {
      // 存在しないなら作成処理
      const data = {
        avatarUrl: user.avatarUrl,
        username: user.username,
        experience: fortune.experience
      };
      const setDoc = await this.db
        .collection("users")
        .doc(user.id)
        .set(data);

      console.debug(setDoc + " " + user);
    }
  }
}
