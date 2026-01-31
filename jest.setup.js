// Tests use an in-memory MongoDB (mongodb-memory-server), NOT your production or
// development database. NODE_ENV and MONGODB_URL are set here so the app never
// loads .env (which would point to production). All test data is isolated.
process.env.NODE_ENV = "test";

const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;
global.mongoPromise = MongoMemoryServer.create()
    .then((m) => {
        mongod = m;
        const uri = m.getUri();
        process.env.MONGODB_URL = uri;
        global.TEST_MONGODB_URI = uri; // So app.js can restore it after loading .env
        return m;
    })
    .catch((err) => {
        console.error("MongoDB Memory Server failed to start:", err);
        throw err;
    });
