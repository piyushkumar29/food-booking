const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

const globalCache = globalThis.__hungrymateMongo || {
    connection: null,
    promise: null,
};

globalThis.__hungrymateMongo = globalCache;

function getMongoUri() {
    const uri =
        process.env.MONGO_URL ||
        process.env.MONGODB_URI ||
        process.env.MONGODB_URL;

    if (uri) {
        return uri;
    }

    // Localhost only
    if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
        return "mongodb://127.0.0.1:27017/wanderlust";
    }

    return "";
}

async function connectDB() {
    const uri = getMongoUri();

    if (!uri) {
        throw new Error(
            "MONGO_URL is not configured. Add MongoDB Atlas connection string in Vercel."
        );
    }

    // Reuse existing connection
    if (
        globalCache.connection &&
        globalCache.connection.readyState === 1
    ) {
        return globalCache.connection;
    }

    // Reuse connection promise
    if (!globalCache.promise) {
        globalCache.promise = mongoose
            .connect(uri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
                socketTimeoutMS: 10000,
                maxPoolSize: 10,
                minPoolSize: 0,
                maxIdleTimeMS: 60000,
            })
            .then((mongooseInstance) => {
                globalCache.connection =
                    mongooseInstance.connection;

                console.log("MongoDB connected successfully");

                return globalCache.connection;
            })
            .catch((error) => {
                globalCache.promise = null;
                globalCache.connection = null;

                console.error(
                    "MongoDB connection failed:",
                    error.message
                );

                throw error;
            });
    }

    return globalCache.promise;
}

module.exports = {
    connectDB,
};
