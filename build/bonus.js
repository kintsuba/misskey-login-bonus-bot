"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const experience_table_1 = __importDefault(require("./experience-table"));
const app_1 = __importDefault(require("firebase/app"));
require("firebase/firestore");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require("../key/misskey-login-bonus-c1453cb75c30.json");
const getTodayFortune = () => {
    const rand = Math.random() * 100;
    if (rand === 0) {
        return {
            message: "**Awesome!** 経験値を**100ポイント**手に入れた！",
            experience: 100
        };
    }
    else if (1 <= rand && rand < 6) {
        return {
            message: "**Great!** 経験値を**50ポイント**手に入れた！",
            experience: 50
        };
    }
    else if (6 <= rand && rand < 26) {
        return {
            message: "**Lucky!** 経験値を**20ポイント**手に入れた！",
            experience: 20
        };
    }
    else if (26 <= rand && rand < 100) {
        return {
            message: "経験値を**10ポイント**手に入れた！",
            experience: 10
        };
    }
    else {
        return {
            message: "経験値が手に入らなかった……",
            experience: 0
        };
    }
};
const experienceToLevel = (experience, level = 1) => {
    if (experience >= experience_table_1.default[level - 1]) {
        return experienceToLevel(experience - experience_table_1.default[level - 1], level + 1);
    }
    else {
        return {
            level: level,
            experienceNextLevelNeed: experience_table_1.default[level - 1] - experience
        };
    }
};
class Bonus {
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
        app_1.default.initializeApp(firebaseConfig);
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount)
        });
        this.db = firebase_admin_1.default.firestore();
    }
    async update(id, user, misskeyUtils) {
        var _a, _b, _c;
        const fortune = getTodayFortune();
        const host = (_a = user.host, (_a !== null && _a !== void 0 ? _a : "misskey.m544.net"));
        const userDocRef = await this.db
            .collection("hosts")
            .doc(host)
            .collection("users")
            .doc(user.id);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
            // 存在するなら更新処理
            if ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.isLogin) {
                // ログインしていたら
                misskeyUtils.replyHome("本日は既にログイン済みです", id);
            }
            else {
                // ログインしていなかったら
                await userDocRef.update({
                    experience: firebase_admin_1.default.firestore.FieldValue.increment(fortune.experience),
                    avatarUrl: user.avatarUrl,
                    username: user.username,
                    name: user.name,
                    isLogin: true,
                    isLastLogin: true
                });
                const doc = await userDocRef.get();
                const data = doc.data();
                const { level, experienceNextLevelNeed } = experienceToLevel((_c = data) === null || _c === void 0 ? void 0 : _c.experience);
                await userDocRef.update({
                    level: level,
                    experienceNextLevelNeed: experienceNextLevelNeed
                });
                misskeyUtils.replyHome(`${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**`, id);
            }
        }
        else {
            // 存在しないなら作成処理
            const { level, experienceNextLevelNeed } = experienceToLevel(fortune.experience);
            const data = {
                avatarUrl: user.avatarUrl,
                username: user.username,
                experience: fortune.experience,
                name: user.name,
                level: level,
                experienceNextLevelNeed: experienceNextLevelNeed,
                isLogin: true,
                isLastLogin: true
            };
            await userDocRef.set(data);
            misskeyUtils.replyHome(`${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**`, id);
        }
    }
    async resetLogin() {
        const batch = this.db.batch();
        const hosts = await this.db.collection("hosts").listDocuments();
        for (const host of hosts) {
            const users = await host.collection("users").listDocuments();
            for (const user of users) {
                batch.update(user, { isLogin: false });
            }
        }
        await batch.commit();
    }
}
exports.default = Bonus;
//# sourceMappingURL=bonus.js.map