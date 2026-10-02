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
const User = require("./models/user.js");

// All 4 Real OAuth Strategies
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main().then(() => console.log("connected to DB")).catch(err => console.log(err));

async function main(){
    await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
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

// Owner Role Credentials
const OWNER_EMAIL = "piyushkumarg292007@gmail.com";
const OWNER_USERNAMES = ["piyush", "piyush kumar", "piyushkumar"];

function checkIsOwner(email, username) {
    if (email && email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()) return true;
    if (username && OWNER_USERNAMES.includes(username.toLowerCase().trim())) return true;
    return false;
}

// Universal Social Login Handler
async function handleSocialUser(profile, done) {
    try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : "";
        const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : "";
        const displayName = profile.displayName || profile.username || "foodie";

        let user = await User.findOne({
            $or: [{ googleId: profile.id }, { githubId: profile.id }, ...(email ? [{ email: email }] : [])]
        });

        const isOwnerAccount = checkIsOwner(email, displayName);

        if (!user) {
            user = new User({
                username: displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(10 + Math.random() * 90),
                email: email || `${displayName.replace(/\s+/g, '')}@social.auth`,
                avatar: photo,
                isOwner: isOwnerAccount
            });
            await User.register(user, `OAuthPass#${profile.id}`);
        } else {
            if (isOwnerAccount && !user.isOwner) user.isOwner = true;
            if (!user.avatar && photo) user.avatar = photo;
            await user.save();
        }
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}

// 1. Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback"
    }, (token, refresh, profile, done) => handleSocialUser(profile, done)));
}

// 2. GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && !process.env.GITHUB_CLIENT_ID.includes("your_")) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/github/callback",
        scope: ['user:email']
    }, (token, refresh, profile, done) => handleSocialUser(profile, done)));
}

// 3. LinkedIn OAuth
if (process.env.LINKEDIN_CLIENT_ID && !process.env.LINKEDIN_CLIENT_ID.includes("your_")) {
    passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/linkedin/callback",
        scope: ['r_emailaddress', 'r_liteprofile']
    }, (token, refresh, profile, done) => handleSocialUser(profile, done)));
}

// 4. Microsoft OAuth
if (process.env.MICROSOFT_CLIENT_ID && !process.env.MICROSOFT_CLIENT_ID.includes("your_")) {
    passport.use(new MicrosoftStrategy({
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/microsoft/callback",
        scope: ['user.read']
    }, (token, refresh, profile, done) => handleSocialUser(profile, done)));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (user && checkIsOwner(user.email, user.username)) user.isOwner = true;
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

app.use(async (req, res, next) => {
    if (req.user && checkIsOwner(req.user.email, req.user.username) && !req.user.isOwner) {
        req.user.isOwner = true;
        await User.findByIdAndUpdate(req.user._id, { isOwner: true });
    }
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// Profile Updates
app.post("/user/update-name", async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    const { newName } = req.body;
    if (newName && newName.trim()) {
        const user = await User.findById(req.user._id);
        user.username = newName.trim();
        if (checkIsOwner(user.email, user.username)) user.isOwner = true;
        await user.save();
        req.flash("success", "Profile name updated!");
    }
    res.redirect("/listings");
});

app.post("/user/update-avatar", async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    const { avatarData } = req.body;
    if (avatarData) {
        await User.findByIdAndUpdate(req.user._id, { avatar: avatarData });
        req.flash("success", "Profile photo updated!");
    }
    res.redirect("/listings");
});

// Real OAuth Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }));
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
    req.flash("success", `Welcome ${req.user.username}!`);
    res.redirect("/listings");
});

app.get("/auth/github", passport.authenticate("github", { scope: ['user:email'] }));
app.get("/auth/github/callback", passport.authenticate("github", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
    req.flash("success", `Welcome ${req.user.username}!`);
    res.redirect("/listings");
});

app.get("/auth/linkedin", passport.authenticate("linkedin"));
app.get("/auth/linkedin/callback", passport.authenticate("linkedin", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
    req.flash("success", `Welcome ${req.user.username}!`);
    res.redirect("/listings");
});

app.get("/auth/microsoft", passport.authenticate("microsoft"));
app.get("/auth/microsoft/callback", passport.authenticate("microsoft", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
    req.flash("success", `Welcome ${req.user.username}!`);
    res.redirect("/listings");
});

// Dedicated Food Cart, Offers & Live Tracking Pages
app.get("/cart", (req, res) => res.render("listings/cart.ejs"));
app.get("/offers", (req, res) => res.render("listings/offers.ejs"));
app.get("/orders/track", (req, res) => res.render("listings/track.ejs"));

// QR Phone Confirmation Route
app.get("/orders/qr-confirm", (req, res) => {
    res.send(`
        <div style="font-family:sans-serif; text-align:center; padding:3rem;">
            <h2 style="color:#16a34a;">Order Confirmed!</h2>
            <p>Your payment of <strong>&#8377;${req.query.amount || 0}</strong> was verified.</p>
            <p>You can return to your computer screen or refresh to live track your order.</p>
        </div>
    `);
});

// Main Route Bindings
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.use((req, res, next) => next(new ExpressError(404, "Page not found!")));
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(3000, () => console.log("server is listening to port 3000"));