const { Server } = require("socket.io");
const { subscribeSymbols, unsubscribeSymbols } = require("../market/websocketManager");

let io = null;

const initGateway = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("subscribe", (data) => {
      if (data && data.symbols) {
        subscribeSymbols(data.symbols);
      }
    });

    socket.on("unsubscribe", (data) => {
      if (data && data.symbols) {
        unsubscribeSymbols(data.symbols);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

module.exports = {
  initGateway,
  getIo: () => io
};
