const dgram = require('dgram');
const dns = require('dns');

function isValidIPv4(ip) {
    const pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
    return pattern.test(ip);
}

function resolveDomainToIP(domain) {
    return new Promise((resolve, reject) => {
        dns.lookup(domain, (err, address) => {
            if (err) {
                reject(err);
            } else {
                resolve(address);
            }
        });
    });
}

async function queryServer(ip, port, callback) {
    let message = Buffer.from('SAMP');
    let timeout;

    if(!isValidIPv4(ip)) {
        ip = await resolveDomainToIP(ip);
        if(!ip) return callback("Ip andress not found by dns lookup");
    }

    ip.split('.').forEach(segment => {
        message = Buffer.concat([message, Buffer.from([parseInt(segment)])]);
    });
    message = Buffer.concat([message, Buffer.from([port & 0xFF, port >> 8 & 0xFF]), Buffer.from('i')]);

    const client = dgram.createSocket('udp4');
    client.send(message, 0, message.length, port, ip, (err) => {
        if (err) {
            clearTimeout(timeout);
            client.close();
            return callback(err);
        }
    });

    client.on('message', (msg) => {
        clearTimeout(timeout);
        const response = parseResponse(msg, ip);
        client.close();
        callback(null, response);
    });

    client.on('error', (err) => {
        clearTimeout(timeout);
        client.close();
        callback(err);
    });

    timeout = setTimeout(() => {
        client.close();
        callback(new Error('Request timed out'));
    }, 5000); // Timeout after 5 seconds
}

function parseResponse(msg, ip) {
    const data = {
        ip: ip,
        passwordProtected: false,
        players: 0,
        maxPlayers: 0,
        hostname: "",
        gameMode: "",
        language: ""
    };

    if (msg.length > 11) {
        let offset = 11;

        // Password protected (1 byte)
        data.passwordProtected = msg[offset] !== 0;
        offset += 1;

        // Players (2 bytes)
        data.players = msg.readUInt16LE(offset);
        offset += 2;

        // Max Players (2 bytes)
        data.maxPlayers = msg.readUInt16LE(offset);
        offset += 2;

        // Hostname
        let hostnameLength = msg.readInt32LE(offset);
        offset += 4;
        data.hostname = msg.toString('latin1', offset, offset + hostnameLength).trim();
        offset += hostnameLength;

        // Game Mode
        let gameModeLength = msg.readInt32LE(offset);
        offset += 4;
        data.gameMode = msg.toString('latin1', offset, offset + gameModeLength).trim();
        offset += gameModeLength;

        // Language
        let languageLength = msg.readInt32LE(offset);
        offset += 4;
        data.language = msg.toString('latin1', offset, offset + languageLength).trim();
    }
    return data;
}

module.exports = {
    queryServer
};