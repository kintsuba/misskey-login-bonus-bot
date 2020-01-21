/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import schedule from "node-schedule";
import moment from "moment";
import "moment/locale/ja";
import MisskeyUtils from "./misskey-utils";
import Bonus from "./bonus";

const removeNotFollowed = async (
  misskeyUtils: MisskeyUtils
): Promise<boolean> => {
  const checkFollowJson = JSON.stringify({
    username: "cordreel"
  });
  const response = misskeyUtils.fetchJson(
    "https://misskey.m544.net/api/users/following",
    checkFollowJson
  );
  const followingData = await response;
  followingData.users.forEach(async (user: any) => {
    const checkFollowByIdJson = JSON.stringify({
      userId: user.id
    });
    const response = misskeyUtils.fetchJson(
      "https://misskey.m544.net/api/users/following",
      checkFollowByIdJson
    );
    const followingUserFollowingData = await response;
    if (
      !followingUserFollowingData.users.some(
        (user: any) => user.username === "cordreel"
      )
    ) {
      misskeyUtils.unfollow(user.id);
      return true;
    } else {
      return false;
    }
  });
  return false;
};

const periodicallyJobs = (misskeyUtils: MisskeyUtils, bonus: Bonus): void => {
  const fiveOclockJob = schedule.scheduleJob("00 05 * * *", () => {
    bonus.resetLogin();
    removeNotFollowed(misskeyUtils);
    misskeyUtils.noteHome(
      `5時になったので、**${moment().format(
        "M月D日"
      )}**のログインボーナスが受け取れるようになりました。`
    );
  });
};

export default periodicallyJobs;
