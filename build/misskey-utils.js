"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
var Visibility;
(function (Visibility) {
    Visibility["Home"] = "home";
    Visibility["Public"] = "public";
    Visibility["Followers"] = "followers";
    Visibility["Specified"] = "specified";
    Visibility["Private"] = "private";
})(Visibility || (Visibility = {}));
class MisskeyUtils {
    constructor(token, connection) {
        this.fetchJson = async (url, json, credentials = "omit") => {
            const postData = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: credentials,
                body: json
            };
            const response = await node_fetch_1.default(url, postData);
            if (response.ok) {
                console.log(`${response.status} OK`);
                // console.log(await response.text());
                return await response.json();
            }
            else {
                console.log(`${response.status} Error`);
                // console.log(await response.text());
                return await response.json();
            }
        };
        this.note = ({ text, visibility, replyId = "", renoteId = "", cw, localOnly = false, poll = { multiple: false }, visibleUserIds }) => {
            const noteObj = {
                visibility: visibility,
                text: text,
                replyId: replyId,
                renoteId: renoteId,
                localOnly: localOnly,
                cw: cw,
                poll: poll,
                visibleUserIds: visibleUserIds,
                i: this.token
            };
            if (!cw)
                delete noteObj.cw;
            if (!replyId)
                delete noteObj.replyId;
            if (!renoteId)
                delete noteObj.renoteId;
            if (!poll.choices || poll.choices.length === 0)
                delete noteObj.poll;
            if (!visibleUserIds || visibleUserIds.length === 0)
                delete noteObj.visibleUserIds;
            const noteJson = JSON.stringify(noteObj);
            return this.fetchJson("https://misskey.m544.net/api/notes/create", noteJson, "include");
        };
        this.noteHome = (text) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Home
            });
        };
        this.noteFollowers = (text) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Followers
            });
        };
        this.notePublic = (text) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Public
            });
        };
        this.replyHome = (text, replyId) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Home,
                replyId: replyId
            });
        };
        this.replyFollowers = (text, replyId) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Followers,
                replyId: replyId
            });
        };
        this.replyPublic = (text, replyId) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Public,
                replyId: replyId
            });
        };
        this.replySpecified = (text, replyId, visibleUserIds) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Specified,
                replyId: replyId,
                visibleUserIds: visibleUserIds
            });
        };
        this.replyHomeWithPoll = (text, replyId, poll) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Home,
                replyId: replyId,
                poll: poll
            });
        };
        this.replySpecifiedWithPoll = (text, replyId, visibleUserIds, poll) => {
            return this.note({
                text: text,
                visibility: MisskeyUtils.Visibility.Specified,
                replyId: replyId,
                visibleUserIds: visibleUserIds,
                poll: poll
            });
        };
        this.message = (text, userId) => {
            const messageJson = JSON.stringify({
                userId: userId,
                text: text,
                i: this.token
            });
            return this.fetchJson("https://misskey.m544.net/api/messaging/messages/create", messageJson, "include");
        };
        this.follow = (userId) => {
            const followJson = JSON.stringify({
                userId: userId,
                i: this.token
            });
            return this.fetchJson("https://misskey.m544.net/api/following/create", followJson, "include");
        };
        this.unfollow = (userId) => {
            const unfollowJson = JSON.stringify({
                userId: userId,
                i: this.token
            });
            return this.fetchJson("https://misskey.m544.net/api/following/create", unfollowJson, "include");
        };
        this.capture = (id) => {
            this.connection.sendUTF(JSON.stringify({
                type: "subNote",
                body: {
                    id: id
                }
            }));
        };
        this.unCapture = (id) => {
            this.connection.sendUTF(JSON.stringify({
                type: "unsubNote",
                body: {
                    id: id
                }
            }));
        };
        this.token = token;
        this.connection = connection;
    }
}
exports.default = MisskeyUtils;
MisskeyUtils.Visibility = Visibility;
MisskeyUtils.connectMainJson = JSON.stringify({
    type: "connect",
    body: {
        channel: "main",
        id: "formain"
    }
});
MisskeyUtils.connectLocalTLJson = JSON.stringify({
    type: "connect",
    body: {
        channel: "localTimeline",
        id: "forlocaltl"
    }
});
MisskeyUtils.connectHybridTLJson = JSON.stringify({
    type: "connect",
    body: {
        channel: "hybridTimeline",
        id: "forhybridtl"
    }
});
MisskeyUtils.connectHomeTLJson = JSON.stringify({
    type: "connect",
    body: {
        channel: "localTimeline",
        id: "forhometl"
    }
});
MisskeyUtils.connectGlobalTLJson = JSON.stringify({
    type: "connect",
    body: {
        channel: "globalTimeline",
        id: "forglobaltl"
    }
});
//# sourceMappingURL=misskey-utils.js.map