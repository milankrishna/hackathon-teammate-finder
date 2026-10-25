const mongoose = require('mongoose');
const dns = require('node:dns');

async function connectHackathonDB() {
  if (!process.env.MONGO_URI) {
    console.error('Missing configuration: MONGO_URI is required to connect to MongoDB.');
    process.exit(1);
  }

  try {
    dns.setServers(['8.8.8.8']);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    const secrets = [process.env.MONGO_URI, process.env.JWT_SECRET];

    try {
      const uri = new URL(process.env.MONGO_URI);
      for (const credential of [uri.username, uri.password]) {
        secrets.push(credential);
        try {
          secrets.push(decodeURIComponent(credential));
        } catch {
          // Keep the encoded credential redacted even if decoding fails.
        }
      }
    } catch {
      // Connection errors may include an invalid URI; redact it below.
    }

    const redact = (value) => {
      let message = String(value ?? 'Unknown error');
      for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) {
        message = message.split(secret).join('[REDACTED]');
      }
      return message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[REDACTED URI]');
    };

    console.error('MongoDB connection failed:');
    console.error('Error name:', redact(error.name));
    console.error('Error message:', redact(error.message));

    if (error.reason?.servers) {
      for (const [hostname, server] of error.reason.servers) {
        console.error('Server:', redact(hostname), 'Error:', redact(server.error?.message ?? 'No underlying error reported'));
      }
    }

    if (error.cause?.message) {
      console.error('Cause:', redact(error.cause.message));
    }
    process.exit(1);
  }
}

module.exports = connectHackathonDB;
