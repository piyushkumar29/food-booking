const User = require("../models/user");

const OWNER_EMAIL = "piyushkumarg292007@gmail.com";
const OWNER_USERNAMES = ["piyush", "piyush kumar", "piyushkumar"];

function checkIsOwner(email, username) {
    const normEmail = typeof email === "string" ? email.toLowerCase().trim() : "";
    const normUser = typeof username === "string" ? username.toLowerCase().trim() : "";
    return normEmail === OWNER_EMAIL || OWNER_USERNAMES.includes(normUser);
}

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;
        username = username ? username.trim() : "";
        email = email ? email.toLowerCase().trim() : "";

        // Check if user already exists with this username or email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            req.flash("error", "An account with this email already exists! Please try logging in or use another email.");
            return res.redirect("/signup");
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            req.flash("error", "This username is already taken! Please choose another unique username.");
            return res.redirect("/signup");
        }

        const isOwner = checkIsOwner(email, username);
        const newUser = new User({ email, username, isOwner });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", `Welcome to Hungrymate, ${registeredUser.username}!`);
            res.redirect("/listings");
        });
    } catch (e) {
        req.flash("error", e.message || "Failed to create account. Please try again.");
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", `Welcome back, ${req.user.username}!`);
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You have successfully logged out!");
        res.redirect("/listings");
    });
};