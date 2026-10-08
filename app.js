if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");

const session = require("express-session");
const connectMongoModule = require("connect-mongo");
const MongoStore = connectMongoModule.default || connectMongoModule;

const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user.js");
const { connectDB } = require("./db.js");

// OAuth Strategies
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;

// Routers
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const IS_PRODUCTION = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

const BASE_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

const MONGO_URL =
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.ATLASDB_URL ||
    (!IS_PRODUCTION ? "mongodb://127.0.0.1:27017/wanderlust" : "");

const SESSION_SECRET = process.env.SESSION_SECRET || "hungrymate-super-secret-key-2026";

// Express Settings
app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Body Parsers & Static Files
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public"), { maxAge: IS_PRODUCTION ? "1d" : 0 }));

// Database Pre-connection Middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        if (req.path.startsWith("/api/") || req.path.includes("/orders/api/")) {
            return res.status(503).json({ ok: false, error: "Database temporarily unavailable." });
        }
        return res.status(503).render("error.ejs", {
            message: "Hungrymate database is temporarily unavailable. Please try again in a moment.",
        });
    }
});

// Universal MongoStore Init (Safely handles connect-mongo v3, v4, v5, v6)
let mongoSessionStore = undefined;
if (MONGO_URL) {
    if (typeof MongoStore.create === "function") {
        mongoSessionStore = MongoStore.create({
            mongoUrl: MONGO_URL,
            collectionName: "sessions",
            ttl: 7 * 24 * 60 * 60,
            autoRemove: "native",
            touchAfter: 24 * 60 * 60,
        });
    } else if (typeof MongoStore === "function") {
        const ConnectFactory = MongoStore(session);
        mongoSessionStore = new ConnectFactory({
            url: MONGO_URL,
            collection: "sessions",
            ttl: 7 * 24 * 60 * 60,
            autoRemove: "native",
            touchAfter: 24 * 60 * 60,
        });
    }
}

const sessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: mongoSessionStore,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: "lax",
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// Owner Authorization
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "piyushkumarg292007@gmail.com").toLowerCase().trim();
const OWNER_USERNAMES = (process.env.OWNER_USERNAMES || "piyush,piyush kumar,piyushkumar")
    .split(",")
    .map((v) => v.toLowerCase().trim())
    .filter(Boolean);

function checkIsOwner(email, username) {
    const normEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
    const normUser = typeof username === "string" ? username.toLowerCase().trim() : "";
    return normEmail === OWNER_EMAIL || OWNER_USERNAMES.includes(normUser);
}

function createSafeUsername(displayName, email) {
    const base = String(displayName || email || "foodie")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .slice(0, 25) || "foodie";
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`;
}

async function handleSocialUser(profile, done) {
    try {
        const email = profile.emails?.[0]?.value?.toLowerCase().trim() || "";
        const photo = profile.photos?.[0]?.value || "";
        const displayName = profile.displayName || profile.username || "foodie";

        if (!email) return done(new Error("OAuth provider did not return email."), null);

        const conditions = [{ email }];
        if (profile.provider === "google") conditions.push({ googleId: profile.id });
        if (profile.provider === "github") conditions.push({ githubId: profile.id });

        let user = await User.findOne({ $or: conditions });
        const isOwnerAccount = checkIsOwner(email, displayName);

        if (!user) {
            const userData = {
                username: createSafeUsername(displayName, email),
                email,
                avatar: photo,
                isOwner: isOwnerAccount,
            };
            if (profile.provider === "google") userData.googleId = profile.id;
            if (profile.provider === "github") userData.githubId = profile.id;

            user = new User(userData);
            await User.register(user, `OAuthPass#${crypto.randomBytes(12).toString("hex")}`);
        } else {
            if (isOwnerAccount && !user.isOwner) user.isOwner = true;
            if (!user.avatar && photo) user.avatar = photo;
            if (profile.provider === "google" && !user.googleId) user.googleId = profile.id;
            if (profile.provider === "github" && !user.githubId) user.githubId = profile.id;
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        console.error("Social authentication error:", err.message);
        return done(err, null);
    }
}

// OAuth Integrations
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/auth/google/callback`,
    }, (token, refreshToken, profile, done) => {
        profile.provider = "google";
        handleSocialUser(profile, done);
    }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/auth/github/callback`,
        scope: ["user:email"],
    }, (accessToken, refreshToken, profile, done) => {
        profile.provider = "github";
        handleSocialUser(profile, done);
    }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (user && checkIsOwner(user.email, user.username) && !user.isOwner) {
            user.isOwner = true;
            await user.save();
        }
        done(null, user || false);
    } catch (err) {
        done(err, null);
    }
});

app.use(async (req, res, next) => {
    try {
        if (req.user && checkIsOwner(req.user.email, req.user.username) && !req.user.isOwner) {
            req.user.isOwner = true;
            await User.findByIdAndUpdate(req.user._id, { isOwner: true });
        }
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        res.locals.currUser = req.user;
        next();
    } catch (error) {
        next(error);
    }
});

// Root & Static Redirects
app.get("/", (req, res) => res.redirect("/listings"));
app.get("/cart", (req, res) => res.render("listings/cart.ejs"));
app.get("/offers", (req, res) => res.render("listings/offers.ejs"));
app.get("/orders/track", (req, res) => res.render("listings/track.ejs"));
app.get("/orders/:orderId/feedback", (req, res) => {
    const { orderId } = req.params;
    res.render("listings/feedback.ejs", { orderId });
});

// Profile Updates
app.post("/user/update-name", async (req, res, next) => {
    try {
        if (!req.isAuthenticated()) return res.redirect("/login");
        const newName = String(req.body.newName || "").trim();
        if (newName) {
            const user = await User.findById(req.user._id);
            if (!user) return res.redirect("/login");
            user.username = newName;
            if (checkIsOwner(user.email, user.username)) user.isOwner = true;
            await user.save();
            req.flash("success", "Profile name updated!");
        }
        res.redirect("/listings");
    } catch (error) { next(error); }
});

app.post("/user/update-avatar", async (req, res, next) => {
    try {
        if (!req.isAuthenticated()) return res.redirect("/login");
        const avatarData = String(req.body.avatarData || "").trim();
        if (avatarData) {
            await User.findByIdAndUpdate(req.user._id, { avatar: avatarData });
            req.flash("success", "Profile photo updated!");
        }
        res.redirect("/listings");
    } catch (error) { next(error); }
});

// OAuth Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }));
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
    req.flash("success", `Welcome ${req.user.username}!`);
    res.redirect("/listings");
});
app.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
app.get("/auth/github/callback", passport.authenticate("github", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
    req.flash("success", `Welcome ${req.user.username}!`);
    res.redirect("/listings");
});

// Server IP for QR Code
app.get("/api/get-server-ip", (req, res) => {
    if (IS_PRODUCTION) {
        return res.json({ ip: new URL(BASE_URL).hostname, local: false, baseUrl: BASE_URL });
    }
    const interfaces = os.networkInterfaces();
    let localIp = "localhost";
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === "IPv4" && !iface.internal) {
                localIp = iface.address;
                break;
            }
        }
        if (localIp !== "localhost") break;
    }
    res.json({ ip: localIp, local: true, baseUrl: `http://${localIp}:3000` });
});

// Main Routers
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// 404 & Error Handler
app.use((req, res, next) => next(new ExpressError(404, "Page not found!")));
app.use((err, req, res, next) => {
    console.error("Application error:", err);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Something went wrong.";
    res.status(statusCode).render("error.ejs", { message });
});

// Run Server
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Hungrymate server running on http://localhost:${PORT}`);
    });
}

module.exports = app;