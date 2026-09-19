if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main().then(() => {
    console.log("connected to DB");
}).catch(err => {
    console.log(err);
});

async function main(){
    await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Photo payload (base64) ke liye body limit 10MB rakhi gayi hai
app.use(express.urlencoded({extended: true, limit: '10mb'}));
app.use(express.json({limit: '10mb'}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const sessionOptions = {
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// ========================================================
// 👑 PERMANENT REAL OWNER CREDENTIALS CHECKER
// ========================================================
const OWNER_EMAIL = "piyushkumarg292007@gmail.com";
const OWNER_USERNAMES = ["piyush", "piyush kumar", "Piyush Kumar"];

function checkIsOwner(email, username) {
    if (email && email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()) return true;
    if (username && OWNER_USERNAMES.includes(username.toLowerCase().trim())) return true;
    return false;
}

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : "";
        const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : "";
        const displayName = profile.displayName || "piyush kumar";

        let user = await User.findOne({
            $or: [{ googleId: profile.id }, ...(email ? [{ email: email }] : [])]
        });

        const isOwnerAccount = checkIsOwner(email, displayName);

        if (!user) {
            user = new User({
                username: displayName,
                email: email || `${displayName.replace(/\s+/g, '')}@google.auth`,
                avatar: photo,
                googleId: profile.id,
                isOwner: isOwnerAccount
            });
            await User.register(user, `GoogleOAuth#${profile.id}`);
        } else {
            // Agar user ne pehle se custom avatar ya name edit kiya hai to wo preserve rahega
            if (isOwnerAccount && !user.isOwner) {
                user.isOwner = true;
            }
            if (!user.avatar && photo) user.avatar = photo;
            if (!user.googleId) user.googleId = profile.id;
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (user && checkIsOwner(user.email, user.username)) {
            user.isOwner = true;
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

app.use(async (req, res, next) => {
    if (req.user) {
        if (checkIsOwner(req.user.email, req.user.username) && !req.user.isOwner) {
            req.user.isOwner = true;
            await User.findByIdAndUpdate(req.user._id, { isOwner: true });
        }
    }
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ========================================================
// 💾 PERMANENT DATABASE PROFILE UPDATES (NAME & AVATAR)
// ========================================================
// 1. Permanent Name Edit Route
app.post("/user/update-name", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash("error", "Please login first!");
            return res.redirect("/login");
        }
        const { newName } = req.body;
        if (!newName || newName.trim().length === 0) {
            req.flash("error", "Name cannot be empty!");
            return res.redirect("/listings");
        }

        const trimmedName = newName.trim();
        const user = await User.findById(req.user._id);

        user.username = trimmedName;
        if (checkIsOwner(user.email, trimmedName)) {
            user.isOwner = true;
        }

        await user.save();
        req.flash("success", "Profile name updated permanently!");
        res.redirect("/listings");
    } catch (err) {
        req.flash("error", "Could not update name: " + err.message);
        res.redirect("/listings");
    }
});

// 2. Permanent Photo Edit Route (Stored in MongoDB)
app.post("/user/update-avatar", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            req.flash("error", "Please login first!");
            return res.redirect("/login");
        }
        const { avatarData } = req.body;
        if (!avatarData) {
            req.flash("error", "No image provided!");
            return res.redirect("/listings");
        }

        await User.findByIdAndUpdate(req.user._id, { avatar: avatarData });
        req.flash("success", "Profile photo updated permanently!");
        res.redirect("/listings");
    } catch (err) {
        req.flash("error", "Failed to upload photo: " + err.message);
        res.redirect("/listings");
    }
});

// Real Google OAuth Routes
app.get("/auth/google", passport.authenticate("google", { 
    scope: ["profile", "email"],
    prompt: "select_account"
}));

app.get("/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        if (req.user.isOwner) {
            req.flash("success", `Welcome Boss! Owner controls activated.`);
        } else {
            req.flash("success", `Welcome ${req.user.username}! Logged in successfully.`);
        }
        res.redirect("/listings");
    }
);

app.get("/auth/:provider", (req, res) => {
    const provider = req.params.provider.toUpperCase();
    req.flash("error", `${provider} keys not configured yet. Please use Google Login!`);
    res.redirect("/signup");
});

// Main App Routes
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// 404 Error Handler
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found!"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(3000, () => {
    console.log("server is listening to port 3000");
});