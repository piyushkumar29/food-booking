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
app.use(express.urlencoded({extended: true}));
app.use(express.json());
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
// 🚀 REAL OFFICIAL GOOGLE OAUTH STRATEGY
// ========================================================
const OWNER_USERNAME = "piyush";
const OWNER_EMAIL = "piyushkumarg292007@gmail.com";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : "";
        const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : "";

        let user = await User.findOne({
            $or: [{ googleId: profile.id }, ...(email ? [{ email: email }] : [])]
        });

        if (!user) {
            const rawName = profile.displayName || "foodie";
            const cleanUser = rawName.replace(/\s+/g, '').toLowerCase() + Math.floor(10 + Math.random() * 90);
            const isOwner = (cleanUser === OWNER_USERNAME || email === OWNER_EMAIL.toLowerCase());

            user = new User({
                username: cleanUser,
                email: email || `${cleanUser}@google.auth`,
                avatar: photo,
                googleId: profile.id,
                isOwner: isOwner
            });

            await User.register(user, `GoogleOAuth#${profile.id}`);
        } else {
            if (!user.avatar && photo) {
                user.avatar = photo;
                await user.save();
            }
            if (!user.googleId) {
                user.googleId = profile.id;
                await user.save();
            }
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
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// ========================================================
// 🚀 REAL OAUTH ROUTES
// ========================================================
// 1. Google Real Consent Screen
app.get("/auth/google", passport.authenticate("google", { 
    scope: ["profile", "email"],
    prompt: "select_account"
}));

app.get("/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        req.flash("success", `Welcome ${req.user.username}! Logged in with Google.`);
        res.redirect("/listings");
    }
);

// Fallback for others
app.get("/auth/:provider", (req, res) => {
    const provider = req.params.provider.toUpperCase();
    req.flash("error", `${provider} keys pending. Please use Google Login!`);
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