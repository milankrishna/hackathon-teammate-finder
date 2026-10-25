const mongoose = require('mongoose');
const dns = require('node:dns');

// A warm function instance shares one driver pool and one in-flight connection.
// The driver handles reconnecting established pools; don't connect per request.
let connectionPromise;

async function connectHackathonDB() {
  if (connectionPromise) return connectionPromise;

  if (!process.env.MONGO_URI) {
    console.error('Missing configuration: MONGO_URI is required to connect to MongoDB.');
    throw new Error('Database configuration is missing.');
  }

  dns.setServers(['8.8.8.8']);
  connectionPromise = mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  }).then(() => {
    console.log('MongoDB connected');
    return mongoose;
  }).catch((error) => {
    // A rejected cold-start attempt must not poison subsequent invocations.
    connectionPromise = undefined;
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
    throw new Error('Database connection unavailable.');
  });

  return connectionPromise;
}

module.exports = connectHackathonDB;
