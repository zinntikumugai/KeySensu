const configFile = require('./config.json');
const sensu = require('sensu.js');
const sc = new sensu.Client(configFile.sensu_api_key);
const KeybaseChatBot = require('keybase-chat-bot');
const kcb = new KeybaseChatBot.Bot();
const http = require('http');

//ping
if(configFile.ping.enable) {
    http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('{"status":"ok","platform":"keybase"}');
    }).listen(configFile.ping.port);
}

//keybase
kcb.init({verbose: false}, (err) => {
    if(err){
        console.log(JSON.stringify(err))
        throw new Error("Keybase Bot Error");
    }

    kcb.chatList(null, (err, out) => {
        if(err) {
            console.log(JSON.stringify(err));
            throw new Error("Keybase Bot : chatList Error");
        }
        console.log(out.conversations.length + " ch");
        out.conversations.forEach(ch => {
            kcb.chatRead({
                unreadOnly: true,   //未読を取得
                peek: false,        //取得したものは既読
                channel: ch.channel
            }, (err, out) => {
                if(err != null) {
                    console.log(err);
                    return;
                }
                console.log("\n" + out.messages.length);
                out.messages.forEach(message => {
                    if(message.msg.content.type == "text" && message.msg.content.text.body.indexOf(configFile.prefix) >= 0) {
                        console.log(message.msg);
                        console.log("[Command]");
                        let command = message.msg.content.text.body
                            .replace(/[\s　\n]+/g, ' ').split(' ').filter(v => v);
                        let command_old = command;
                        command = [];
                        command_old.forEach(element => {
                            if(element.indexOf(configFile.prefix) === 0)
                                element = element.slice(configFile.prefix.length);
                            command.push(element);
                        });
                        console.log(message.msg.sender.uid);
                        console.log(command);

                        //not Support tip
                        if(command.indexOf('tip') >= 0) {
                            let content = "Sorry Can not use `tip` Command";
                            kcb.chatSend({
                                channel: ch.channel,
                                message: {
                                    body: "@" + message.msg.sender.username +"\n" + content
                                }
                            }, (err, res) => {
                                console.log(res);
                            });
                            return;
                        }
                        sc.post(command, message.msg.sender.uid, (err, res, body) => {
                            if(res.statusCode !== 200) {
                                let content = "SensuCore Error... :" + res.statusCode;
                                console.log("[Sensu Error]: " + res.statusCode);
                            }
                            if (JSON.parse(body).status === "COMMAND_NOT_FOUND") {
                                console.log("[User Missing] COMMAND NOT FOUND :", command);
                                return;
                            }
                            console.log("[Sensu] :" + JSON.parse(body).status);
                            if(JSON.parse(body).message){
                                let content = JSON.parse(body).message;
                                kcb.chatSend({
                                    channel: ch.channel,
                                    message: {
                                        body: "@" + message.msg.sender.username + "\n```" + content + "```"
                                    }
                                }, (err, res) => {
                                    console.log(res);
                                });
                            }
                            /*
                            if (JSON.parse(body).push_message) {
                                let content = JSON.parse(body).push_message;
                                kcb.chatSend({
                                    channel: {
                                        name: kcb.myInfo().username + "username..",
                                        public: false,
                                        topic_tpe: 'chat'
                                    },
                                    message: {
                                        body: "@" + message.msg.sender.username + "\n" + content
                                    }
                                }, (err, res) => {
                                    console.log(res);
                                });
                            }*/
                        });
                        /*
                        kcb.chatSend({
                            channel: ch.channel,
                            message: {
                                body: ""
                            }
                        }, (err, res) => {

                        });
                        */
                    }
                });
            })
        });
    });
})