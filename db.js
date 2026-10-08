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
        process.env.ATLASDB_URL;

    if (uri && uri.trim() !== "") {
        return uri.trim();
    }

    // Localhost fallback sirf tab jab bilkul koi cloud env na mile
    if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
        return "mongodb://127.0.0.1:27017/wanderlust";
    }

    return "";
}

async function connectDB() {
    const uri = getMongoUri();

    if (!uri) {
        throw new Error(
            "MongoDB URI is not configured. Add MONGO_URL in your environment variables."
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
                serverSelectionTimeoutMS: 8000,
                connectTimeoutMS: 8000,
                socketTimeoutMS: 15000,
                maxPoolSize: 10,
                minPoolSize: 0,
                maxIdleTimeMS: 60000,
            })
            .then((mongooseInstance) => {
                globalCache.connection =
                    mongooseInstance.connection;

                console.log("Connected to Cloud MongoDB Atlas successfully");

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