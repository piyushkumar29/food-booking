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
const MongoStore = require("connect-mongo");
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

// =========================================================
// ENVIRONMENT
// =========================================================

const IS_PRODUCTION =
    process.env.NODE_ENV === "production" || !!process.env.VERCEL;

const BASE_URL = (
    process.env.APP_URL || "http://localhost:3000"
).replace(/\/$/, "");

const MONGO_URL =
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    (!IS_PRODUCTION
        ? "mongodb://127.0.0.1:27017/wanderlust"
        : "");

const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    (!IS_PRODUCTION
        ? "hungrymate-local-development-secret"
        : "");

if (IS_PRODUCTION && !MONGO_URL) {
    console.error(
        "ERROR: MONGO_URL is missing. Add MongoDB Atlas connection string in Vercel."
    );
}

if (IS_PRODUCTION && !SESSION_SECRET) {
    console.error(
        "ERROR: SESSION_SECRET is missing. Add it in Vercel Environment Variables."
    );
}

// =========================================================
// EXPRESS CONFIG
// =========================================================

app.set("trust proxy", 1);

app.set("view engine", "ejs");

app.set(
    "views",
    path.join(__dirname, "views")
);

app.engine("ejs", ejsMate);

// =========================================================
// BODY / STATIC MIDDLEWARE
// =========================================================

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb",
    })
);

app.use(
    express.json({
        limit: "10mb",
    })
);

app.use(
    methodOverride("_method")
);

app.use(
    express.static(
        path.join(__dirname, "public"),
        {
            maxAge: IS_PRODUCTION ? "1d" : 0,
        }
    )
);

// =========================================================
// DATABASE FIRST
// =========================================================
//
// IMPORTANT:
// Every request connects to MongoDB before any route,
// Passport session, User.find(), Listing.find(), etc.
//
// This fixes:
// Operation `listings.find()` buffering timed out
//
// =========================================================

app.use(async (req, res, next) => {
    try {
        await connectDB();

        next();

    } catch (error) {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

        // API response
        if (
            req.path.startsWith("/api/") ||
            req.path.includes("/orders/api/")
        ) {
            return res.status(503).json({
                ok: false,
                error:
                    "Database temporarily unavailable. Please try again.",
            });
        }

        // Normal webpage response
        return res.status(503).render(
            "error.ejs",
            {
                message:
                    "Hungrymate database is temporarily unavailable. Please try again in a moment.",
            }
        );
    }
});

// =========================================================
// SESSION
// =========================================================
//
// MongoStore is used because Vercel is serverless.
// Express MemoryStore is NOT reliable for production OAuth
// sessions across multiple serverless invocations.
//
// =========================================================

const sessionOptions = {
    secret:
        SESSION_SECRET ||
        "invalid-production-secret",

    resave: false,

    saveUninitialized: false,

    rolling: false,

    store: MONGO_URL
        ? MongoStore.create({
              mongoUrl: MONGO_URL,

              collectionName: "sessions",

              ttl:
                  7 *
                  24 *
                  60 *
                  60,

              autoRemove: "native",

              touchAfter:
                  24 * 60 * 60,
          })
        : undefined,

    cookie: {
        maxAge:
            7 *
            24 *
            60 *
            60 *
            1000,

        httpOnly: true,

        secure: IS_PRODUCTION,

        sameSite: "lax",
    },
};

app.use(
    session(sessionOptions)
);

app.use(flash());

// =========================================================
// PASSPORT
// =========================================================

app.use(
    passport.initialize()
);

app.use(
    passport.session()
);

passport.use(
    new LocalStrategy(
        User.authenticate()
    )
);

// =========================================================
// OWNER AUTHORIZATION
// =========================================================

const OWNER_EMAIL = (
    process.env.OWNER_EMAIL ||
    "piyushkumarg292007@gmail.com"
)
    .toLowerCase()
    .trim();

const OWNER_USERNAMES = (
    process.env.OWNER_USERNAMES ||
    "piyush,piyush kumar,piyushkumar"
)
    .split(",")
    .map((value) =>
        value.toLowerCase().trim()
    )
    .filter(Boolean);

function checkIsOwner(
    email,
    username
) {
    const normalizedEmail =
        typeof email === "string"
            ? email.toLowerCase().trim()
            : "";

    const normalizedUsername =
        typeof username === "string"
            ? username.toLowerCase().trim()
            : "";

    return (
        normalizedEmail === OWNER_EMAIL ||
        OWNER_USERNAMES.includes(
            normalizedUsername
        )
    );
}

// =========================================================
// SAFE USERNAME CREATOR
// =========================================================

function createSafeUsername(
    displayName,
    email
) {
    const base =
        String(
            displayName ||
                email ||
                "foodie"
        )
            .replace(
                /[^a-zA-Z0-9]/g,
                ""
            )
            .toLowerCase()
            .slice(0, 25) ||
        "foodie";

    const suffix =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `${base}${suffix}`;
}

// =========================================================
// SOCIAL LOGIN USER HANDLER
// =========================================================

async function handleSocialUser(
    profile,
    done
) {
    try {

        const email =
            profile.emails?.[0]?.value
                ?.toLowerCase()
                .trim() || "";

        const photo =
            profile.photos?.[0]
                ?.value || "";

        const displayName =
            profile.displayName ||
            profile.username ||
            "foodie";

        if (!email) {
            return done(
                new Error(
                    "OAuth provider did not return an email address."
                ),
                null
            );
        }

        const conditions = [
            { email },
        ];

        if (
            profile.provider ===
            "google"
        ) {
            conditions.push({
                googleId:
                    profile.id,
            });
        }

        if (
            profile.provider ===
            "github"
        ) {
            conditions.push({
                githubId:
                    profile.id,
            });
        }

        let user =
            await User.findOne({
                $or: conditions,
            });

        const isOwnerAccount =
            checkIsOwner(
                email,
                displayName
            );

        // -----------------------------------------------------
        // NEW SOCIAL USER
        // -----------------------------------------------------

        if (!user) {

            const userData = {
                username:
                    createSafeUsername(
                        displayName,
                        email
                    ),

                email,

                avatar: photo,

                isOwner:
                    isOwnerAccount,
            };

            if (
                profile.provider ===
                "google"
            ) {
                userData.googleId =
                    profile.id;
            }

            if (
                profile.provider ===
                "github"
            ) {
                userData.githubId =
                    profile.id;
            }

            user =
                new User(
                    userData
                );

            await User.register(
                user,
                `OAuthPass#${crypto.randomBytes(
                    12
                ).toString("hex")}`
            );

        } else {

            // -------------------------------------------------
            // EXISTING USER
            // -------------------------------------------------

            if (
                isOwnerAccount &&
                !user.isOwner
            ) {
                user.isOwner = true;
            }

            if (
                !user.avatar &&
                photo
            ) {
                user.avatar = photo;
            }

            if (
                profile.provider ===
                    "google" &&
                !user.googleId
            ) {
                user.googleId =
                    profile.id;
            }

            if (
                profile.provider ===
                    "github" &&
                !user.githubId
            ) {
                user.githubId =
                    profile.id;
            }

            await user.save();
        }

        return done(
            null,
            user
        );

    } catch (err) {

        console.error(
            "Social authentication error:",
            err.message
        );

        return done(
            err,
            null
        );
    }
}

// =========================================================
// GOOGLE
// =========================================================

if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
) {

    passport.use(
        new GoogleStrategy(
            {
                clientID:
                    process.env
                        .GOOGLE_CLIENT_ID,

                clientSecret:
                    process.env
                        .GOOGLE_CLIENT_SECRET,

                callbackURL:
                    `${BASE_URL}/auth/google/callback`,
            },

            (
                token,
                refreshToken,
                profile,
                done
            ) => {

                profile.provider =
                    "google";

                handleSocialUser(
                    profile,
                    done
                );
            }
        )
    );
}

// =========================================================
// GITHUB
// =========================================================

if (
    process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET
) {

    passport.use(
        new GitHubStrategy(
            {
                clientID:
                    process.env
                        .GITHUB_CLIENT_ID,

                clientSecret:
                    process.env
                        .GITHUB_CLIENT_SECRET,

                callbackURL:
                    `${BASE_URL}/auth/github/callback`,

                scope: [
                    "user:email",
                ],
            },

            (
                accessToken,
                refreshToken,
                profile,
                done
            ) => {

                profile.provider =
                    "github";

                handleSocialUser(
                    profile,
                    done
                );
            }
        )
    );
}

// =========================================================
// LINKEDIN
// =========================================================

if (
    process.env.LINKEDIN_CLIENT_ID &&
    process.env.LINKEDIN_CLIENT_SECRET
) {

    passport.use(
        new LinkedInStrategy(
            {
                clientID:
                    process.env
                        .LINKEDIN_CLIENT_ID,

                clientSecret:
                    process.env
                        .LINKEDIN_CLIENT_SECRET,

                callbackURL:
                    `${BASE_URL}/auth/linkedin/callback`,

                scope: [
                    "r_emailaddress",
                    "r_liteprofile",
                ],
            },

            (
                accessToken,
                refreshToken,
                profile,
                done
            ) => {

                profile.provider =
                    "linkedin";

                handleSocialUser(
                    profile,
                    done
                );
            }
        )
    );
}

// =========================================================
// MICROSOFT
// =========================================================

if (
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET
) {

    passport.use(
        new MicrosoftStrategy(
            {
                clientID:
                    process.env
                        .MICROSOFT_CLIENT_ID,

                clientSecret:
                    process.env
                        .MICROSOFT_CLIENT_SECRET,

                callbackURL:
                    `${BASE_URL}/auth/microsoft/callback`,

                scope: [
                    "user.read",
                ],
            },

            (
                accessToken,
                refreshToken,
                profile,
                done
            ) => {

                profile.provider =
                    "microsoft";

                handleSocialUser(
                    profile,
                    done
                );
            }
        )
    );
}

// =========================================================
// PASSPORT SESSION SERIALIZATION
// =========================================================

passport.serializeUser(
    (user, done) => {
        done(
            null,
            user.id
        );
    }
);

passport.deserializeUser(
    async (id, done) => {

        try {

            const user =
                await User.findById(
                    id
                );

            if (
                user &&
                checkIsOwner(
                    user.email,
                    user.username
                ) &&
                !user.isOwner
            ) {

                user.isOwner =
                    true;

                await user.save();
            }

            done(
                null,
                user || false
            );

        } catch (err) {

            done(
                err,
                null
            );
        }
    }
);

// =========================================================
// GLOBAL USER / FLASH LOCALS
// =========================================================

app.use(
    async (
        req,
        res,
        next
    ) => {

        try {

            if (
                req.user &&
                checkIsOwner(
                    req.user.email,
                    req.user.username
                ) &&
                !req.user.isOwner
            ) {

                req.user.isOwner =
                    true;

                await User.findByIdAndUpdate(
                    req.user._id,
                    {
                        isOwner:
                            true,
                    }
                );
            }

            res.locals.success =
                req.flash(
                    "success"
                );

            res.locals.error =
                req.flash(
                    "error"
                );

            res.locals.currUser =
                req.user;

            next();

        } catch (error) {

            next(error);
        }
    }
);

// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
    "/health",
    async (req, res) => {

        res.status(200).json({
            ok: true,

            service:
                "Hungrymate",

            database:
                mongoose
                    .connection
                    .readyState ===
                1
                    ? "connected"
                    : "disconnected",

            environment:
                IS_PRODUCTION
                    ? "production"
                    : "development",

            timestamp:
                new Date().toISOString(),
        });
    }
);

// =========================================================
// ROOT
// =========================================================

app.get(
    "/",
    (req, res) => {
        res.redirect(
            "/listings"
        );
    }
);

// =========================================================
// PROFILE - UPDATE NAME
// =========================================================

app.post(
    "/user/update-name",
    async (
        req,
        res,
        next
    ) => {

        try {

            if (
                !req.isAuthenticated()
            ) {
                return res.redirect(
                    "/login"
                );
            }

            const newName =
                String(
                    req.body
                        .newName ||
                        ""
                ).trim();

            if (newName) {

                const user =
                    await User.findById(
                        req.user._id
                    );

                if (!user) {
                    return res.redirect(
                        "/login"
                    );
                }

                user.username =
                    newName;

                if (
                    checkIsOwner(
                        user.email,
                        user.username
                    )
                ) {
                    user.isOwner =
                        true;
                }

                await user.save();

                req.flash(
                    "success",
                    "Profile name updated!"
                );
            }

            res.redirect(
                "/listings"
            );

        } catch (error) {
            next(error);
        }
    }
);

// =========================================================
// PROFILE - UPDATE AVATAR
// =========================================================

app.post(
    "/user/update-avatar",
    async (
        req,
        res,
        next
    ) => {

        try {

            if (
                !req.isAuthenticated()
            ) {
                return res.redirect(
                    "/login"
                );
            }

            const avatarData =
                String(
                    req.body
                        .avatarData ||
                        ""
                ).trim();

            if (avatarData) {

                await User.findByIdAndUpdate(
                    req.user._id,
                    {
                        avatar:
                            avatarData,
                    }
                );

                req.flash(
                    "success",
                    "Profile photo updated!"
                );
            }

            res.redirect(
                "/listings"
            );

        } catch (error) {
            next(error);
        }
    }
);

// =========================================================
// GOOGLE AUTH ROUTES
// =========================================================

app.get(
    "/auth/google",
    passport.authenticate(
        "google",
        {
            scope: [
                "profile",
                "email",
            ],
            prompt:
                "select_account",
        }
    )
);

app.get(
    "/auth/google/callback",
    passport.authenticate(
        "google",
        {
            failureRedirect:
                "/login",
            failureFlash:
                true,
        }
    ),

    (req, res) => {

        req.flash(
            "success",
            `Welcome ${req.user.username}!`
        );

        res.redirect(
            "/listings"
        );
    }
);

// =========================================================
// GITHUB AUTH ROUTES
// =========================================================

app.get(
    "/auth/github",
    passport.authenticate(
        "github",
        {
            scope: [
                "user:email",
            ],
        }
    )
);

app.get(
    "/auth/github/callback",
    passport.authenticate(
        "github",
        {
            failureRedirect:
                "/login",
            failureFlash:
                true,
        }
    ),

    (req, res) => {

        req.flash(
            "success",
            `Welcome ${req.user.username}!`
        );

        res.redirect(
            "/listings"
        );
    }
);

// =========================================================
// LINKEDIN AUTH ROUTES
// =========================================================

app.get(
    "/auth/linkedin",
    passport.authenticate(
        "linkedin"
    )
);

app.get(
    "/auth/linkedin/callback",
    passport.authenticate(
        "linkedin",
        {
            failureRedirect:
                "/login",
            failureFlash:
                true,
        }
    ),

    (req, res) => {

        req.flash(
            "success",
            `Welcome ${req.user.username}!`
        );

        res.redirect(
            "/listings"
        );
    }
);

// =========================================================
// MICROSOFT AUTH ROUTES
// =========================================================

app.get(
    "/auth/microsoft",
    passport.authenticate(
        "microsoft"
    )
);

app.get(
    "/auth/microsoft/callback",
    passport.authenticate(
        "microsoft",
        {
            failureRedirect:
                "/login",
            failureFlash:
                true,
        }
    ),

    (req, res) => {

        req.flash(
            "success",
            `Welcome ${req.user.username}!`
        );

        res.redirect(
            "/listings"
        );
    }
);

// =========================================================
// OTHER PAGES
// =========================================================

app.get(
    "/cart",
    (req, res) =>
        res.render(
            "listings/cart.ejs"
        )
);

app.get(
    "/offers",
    (req, res) =>
        res.render(
            "listings/offers.ejs"
        )
);

app.get(
    "/orders/track",
    (req, res) =>
        res.render(
            "listings/track.ejs"
        )
);

// =========================================================
// LOCAL NETWORK IP
// =========================================================

app.get(
    "/api/get-server-ip",
    (req, res) => {

        // Vercel does not provide the user's
        // local Wi-Fi address.
        if (IS_PRODUCTION) {

            return res.json({
                ip:
                    new URL(
                        BASE_URL
                    ).hostname,

                local: false,

                baseUrl:
                    BASE_URL,
            });
        }

        const interfaces =
            os.networkInterfaces();

        let localIp =
            "localhost";

        for (
            const name of
            Object.keys(
                interfaces
            )
        ) {

            for (
                const iface of
                interfaces[name] ||
                []
            ) {

                if (
                    iface.family ===
                        "IPv4" &&
                    !iface.internal
                ) {

                    localIp =
                        iface.address;

                    break;
                }
            }

            if (
                localIp !==
                "localhost"
            ) {
                break;
            }
        }

        res.json({
            ip: localIp,
            local: true,
            baseUrl:
                `http://${localIp}:3000`,
        });
    }
);

// =========================================================
// QR TOKEN MODEL
// =========================================================

const qrTokenSchema =
    new mongoose.Schema(
        {
            token: {
                type: String,
                required: true,
                unique: true,
                index: true,
            },

            amount: {
                type: Number,
                default: 0,
            },

            confirmed: {
                type: Boolean,
                default: false,
            },

            confirmedAt: {
                type: Date,
            },

            expiresAt: {
                type: Date,

                default:
                    () =>
                        new Date(
                            Date.now() +
                                15 *
                                    60 *
                                    1000
                        ),

                index: true,
            },
        },

        {
            timestamps: true,
        }
    );

qrTokenSchema.index(
    {
        expiresAt: 1,
    },
    {
        expireAfterSeconds: 0,
    }
);

const QrToken =
    mongoose.models
        .HungryMateQrToken ||
    mongoose.model(
        "HungryMateQrToken",
        qrTokenSchema
    );

// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

// =========================================================
// MOBILE QR CONFIRM PAGE
// =========================================================

app.get(
    "/orders/qr-mobile-confirm",
    async (
        req,
        res,
        next
    ) => {

        try {

            const token =
                String(
                    req.query
                        .token ||
                        ""
                ).trim();

            const amount =
                Number(
                    req.query
                        .amount ||
                        0
                );

            if (!token) {

                return res
                    .status(400)
                    .send(
                        "Invalid QR token."
                    );
            }

            await QrToken.findOneAndUpdate(
                {
                    token,
                },

                {
                    $setOnInsert: {
                        token,

                        amount:
                            Number.isFinite(
                                amount
                            )
                                ? amount
                                : 0,

                        expiresAt:
                            new Date(
                                Date.now() +
                                    15 *
                                        60 *
                                        1000
                            ),
                    },
                },

                {
                    upsert: true,
                    new: true,
                }
            );

            const safeToken =
                escapeHtml(
                    token
                );

            const safeAmount =
                Number.isFinite(
                    amount
                )
                    ? amount.toFixed(
                          2
                      )
                    : "0.00";

            res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Hungrymate Order</title>

    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >

    <style>
        body {
            background-color: #f8fafc;
            font-family: sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 1rem;
        }

        .pay-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 2rem;
            box-shadow:
                0 15px 35px rgba(0,0,0,0.1);
            max-width: 380px;
            width: 100%;
            text-align: center;
        }
    </style>
</head>

<body>

    <div class="pay-card">

        <img
            src="/mypic.png"
            style="
                height:55px;
                margin-bottom:1rem
            "
            alt="Hungrymate"
        >

        <h4 class="fw-bold text-dark mb-1">
            Hungrymate Pay
        </h4>

        <p class="text-muted small">
            One-Tap Mobile Payment Authorization
        </p>

        <div class="display-5 fw-bold my-3 text-danger">
            &#8377;${escapeHtml(
                safeAmount
            )}
        </div>

        <form
            method="POST"
            action="/orders/api/confirm-qr-token"
        >

            <input
                type="hidden"
                name="token"
                value="${safeToken}"
            >

            <button
                class="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow py-3"
            >
                ✓ Authorize &amp; Confirm Order
            </button>

        </form>

    </div>

</body>
</html>
`);

        } catch (error) {

            next(error);
        }
    }
);

// =========================================================
// CONFIRM QR
// =========================================================

app.post(
    "/orders/api/confirm-qr-token",
    async (
        req,
        res,
        next
    ) => {

        try {

            const token =
                String(
                    req.body
                        .token ||
                        ""
                ).trim();

            if (!token) {

                return res
                    .status(400)
                    .send(
                        "Invalid QR token."
                    );
            }

            const result =
                await QrToken.findOneAndUpdate(
                    {
                        token,

                        expiresAt: {
                            $gt:
                                new Date(),
                        },
                    },

                    {
                        $set: {
                            confirmed:
                                true,

                            confirmedAt:
                                new Date(),
                        },
                    },

                    {
                        new: true,
                    }
                );

            if (!result) {

                return res
                    .status(410)
                    .send(
                        "This payment QR has expired. Please generate a new QR code."
                    );
            }

            res.send(`
<!DOCTYPE html>
<html>

<head>
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >
</head>

<body
    style="
        font-family:sans-serif;
        text-align:center;
        padding:3rem;
        background:#f0fdf4;
    "
>

    <h2 style="color:#16a34a;">
        Payment Confirmed!
    </h2>

    <p>
        Your desktop browser can now continue
        to the live delivery tracking route.
    </p>

</body>

</html>
`);

        } catch (error) {

            next(error);
        }
    }
);

// =========================================================
// CHECK QR STATUS
// =========================================================

app.get(
    "/orders/api/check-qr-status",
    async (
        req,
        res,
        next
    ) => {

        try {

            const token =
                String(
                    req.query
                        .token ||
                        ""
                ).trim();

            if (!token) {

                return res.json({
                    confirmed:
                        false,
                });
            }

            const record =
                await QrToken.findOne({
                    token,

                    expiresAt: {
                        $gt:
                            new Date(),
                    },
                }).lean();

            res.json({
                confirmed:
                    !!record?.confirmed,

                expired:
                    !record,
            });

        } catch (error) {

            next(error);
        }
    }
);

// =========================================================
// ROUTERS
// =========================================================

app.use(
    "/listings",
    listingRouter
);

app.use(
    "/listings/:id/reviews",
    reviewRouter
);

app.use(
    "/",
    userRouter
);

// =========================================================
// 404
// =========================================================

app.use(
    (req, res, next) => {

        next(
            new ExpressError(
                404,
                "Page not found!"
            )
        );
    }
);

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use(
    (
        err,
        req,
        res,
        next
    ) => {

        console.error(
            "Application error:",
            err
        );

        const statusCode =
            err.statusCode ||
            500;

        const message =
            err.message ||
            "Something went wrong.";

        if (
            req.path.startsWith(
                "/api/"
            ) ||
            req.path.includes(
                "/orders/api/"
            )
        ) {

            return res
                .status(
                    statusCode
                )
                .json({
                    ok: false,
                    error:
                        message,
                });
        }

        res.status(
            statusCode
        ).render(
            "error.ejs",
            {
                message,
            }
        );
    }
);

// =========================================================
// LOCAL SERVER ONLY
// =========================================================
//
// Vercel will import this Express app.
// It should NOT execute app.listen().
//
// =========================================================

if (
    require.main ===
    module
) {

    const PORT =
        process.env.PORT ||
        3000;

    app.listen(
        PORT,
        "0.0.0.0",
        () => {
            console.log(
                `Hungrymate server running on http://localhost:${PORT}`
            );
        }
    );
}

// =========================================================
// VERCEL EXPORT
// =========================================================

module.exports = app;
