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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
                misskeyUtils.reaction("❎", id);
                misskeyUtils.replyHome(`本日は既にログイン済みです。\n現在のレベル: **${(_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.level}**\n次のレベルまで: **${(_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.experienceNextLevelNeed}ポイント**\n連続ログイン: **${(_e = userDoc.data()) === null || _e === void 0 ? void 0 : _e.continuousloginDays}日**\n合計ログイン: **${(_f = userDoc.data()) === null || _f === void 0 ? void 0 : _f.continuousloginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`, id);
            }
            else {
                // ログインしていなかったら
                misskeyUtils.reaction("⭕", id);
                await userDocRef.update({
                    experience: firebase_admin_1.default.firestore.FieldValue.increment(fortune.experience),
                    avatarUrl: user.avatarUrl,
                    username: user.username,
                    name: user.name,
                    isLogin: true,
                    continuousloginDays: ((_g = userDoc.data()) === null || _g === void 0 ? void 0 : _g.isLastLogin) ? firebase_admin_1.default.firestore.FieldValue.increment(1)
                        : 1,
                    totalLoginDays: firebase_admin_1.default.firestore.FieldValue.increment(1)
                });
                const doc = await userDocRef.get();
                const data = doc.data();
                const { level, experienceNextLevelNeed } = experienceToLevel((_h = data) === null || _h === void 0 ? void 0 : _h.experience);
                await userDocRef.update({
                    level: level,
                    experienceNextLevelNeed: experienceNextLevelNeed
                });
                misskeyUtils.replyHome(`${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${(_j = data) === null || _j === void 0 ? void 0 : _j.continuousloginDays}日**\n合計ログイン: **${(_k = data) === null || _k === void 0 ? void 0 : _k.continuousloginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`, id);
            }
        }
        else {
            // 存在しないなら作成処理
            misskeyUtils.reaction("⭕", id);
            const { level, experienceNextLevelNeed } = experienceToLevel(fortune.experience);
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
                host: host
            };
            await userDocRef.set(data);
            misskeyUtils.replyHome(`${fortune.message}\n現在のレベル: **${level}**\n次のレベルまで: **${experienceNextLevelNeed}ポイント**\n連続ログイン: **${(_l = data) === null || _l === void 0 ? void 0 : _l.continuousloginDays}日**\n合計ログイン: **${(_m = data) === null || _m === void 0 ? void 0 : _m.continuousloginDays}日**\n他の人のレベルを見る場合は?[こちら](https://misskey-loginbonus.info)`, id);
        }
    }
    async resetLogin() {
        var _a;
        const hosts = await this.db.collection("hosts").listDocuments();
        for (const host of hosts) {
            const users = await host.collection("users").listDocuments();
            for (const user of users) {
                const userData = await user.get();
                user.update({
                    isLastLogin: (_a = userData.data()) === null || _a === void 0 ? void 0 : _a.isLogin,
                    isLogin: false
                });
            }
        }
    }
}
exports.default = Bonus;
//# sourceMappingURL=bonus.js.map