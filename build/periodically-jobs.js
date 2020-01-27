"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
const node_schedule_1 = __importDefault(require("node-schedule"));
const moment_1 = __importDefault(require("moment"));
require("moment/locale/ja");
const removeNotFollowed = async (misskeyUtils) => {
    const checkFollowJson = JSON.stringify({
        username: "cordreel"
    });
    const response = misskeyUtils.fetchJson("https://misskey.m544.net/api/users/following", checkFollowJson);
    const followingData = await response;
    followingData.users.forEach(async (user) => {
        const checkFollowByIdJson = JSON.stringify({
            userId: user.id
        });
        const response = misskeyUtils.fetchJson("https://misskey.m544.net/api/users/following", checkFollowByIdJson);
        const followingUserFollowingData = await response;
        if (!followingUserFollowingData.users.some((user) => user.username === "LoginBonus")) {
            misskeyUtils.unfollow(user.id);
            return true;
        }
        else {
            return false;
        }
    });
    return false;
};
const periodicallyJobs = (misskeyUtils, bonus) => {
    const fiveOclockJob = node_schedule_1.default.scheduleJob("00 05 * * *", () => {
        bonus.resetLogin();
        removeNotFollowed(misskeyUtils);
        misskeyUtils.noteHome(`5時になったので、**${moment_1.default().format("M月D日")}**のログインボーナスが受け取れるようになりました。`);
    });
};
exports.default = periodicallyJobs;
//# sourceMappingURL=periodically-jobs.js.map