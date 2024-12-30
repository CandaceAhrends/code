import WebSocket from "websocket";

const client = new WebSocket.client();

const ActiveSocket = (sendMessage, uri) => {
    return new Promise((resolve, reject) => {
        client.on("connectFailed", function (error) {
            console.log("Connect Error: " + error.toString());
            reject("connection failed");
        });

        client.on("connect", function (connection) {
            console.log("WebSocket Client Connected");
            connection.on("error", function (error) {
                console.log("Connection Error: " + error.toString());
            });
            connection.on("close", function () {
                console.log("echo-protocol Connection Closed");
            });
            connection.on("message", function (message) {
                const msgObj = JSON.parse(message.utf8Data);
                sendMessage(msgObj)

            });
            resolve(connection);
        });

        client.connect(uri);
    });
};

export default ActiveSocket;
