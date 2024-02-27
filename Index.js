const express = require('express');
const socket = require('./Functions/Socket.js');
require('dotenv/config');

const app = express();
const port = process.env.PORT;

app.get('/samp/:ip/:port', (req, res) => {
    const { ip, port } = req.params;
    if (!ip || !port) {
        return res.status(400).json({ error: "Invalid IP or port" });
    }

    socket.queryServer(ip, parseInt(port), (err, serverInfo) => {
        if (err) {
            console.error("Error querying the server:", err.message);
            return res.status(500).json({ error: "Failed to query the server" });
        }

        res.json(serverInfo);
    });
});

app.listen(port, () => {
    console.log(`🌐 Server Running at ${process.env.SERVER_URL}:${port}`);
    console.log(`📝 Usage: ${process.env.SERVER_URL}:${port}/ip/port`);
});