const User = require("../models/user");

// ========================================================
// YAHAN APNA EXACT OWNER USERNAME SET KAREIN:
// (Jis username se aap login karte hain)
// ========================================================
const OWNER_USERNAME = "piyush kumar"; 
// ========================================================

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            req.flash("error", "Passwords do not match!");
            return res.redirect("/signup");
        }

        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            req.flash("error", "An account with this email already exists! Please login.");
            return res.redirect("/signup");
        }

        // Check if signing up user is Owner
        const isOwner = (username.trim().toLowerCase() === OWNER_USERNAME.trim().toLowerCase());

        const newUser = new User({ 
            email: email.toLowerCase(), 
            username, 
            isOwner 
        });

        const registeredUser = await User.register(newUser, password);
        
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            if (registeredUser.isOwner) {
                req.flash("success", "Welcome Boss! Logged in as Restaurant Owner.");
            } else {
                req.flash("success", "Welcome to Hungrymate!");
            }
            res.redirect("/listings");
        });
    } catch (e) {
        if (e.name === "UserExistsError" || e.code === 11000) {
            req.flash("error", "This username is already taken! Please choose another.");
        } else {
            req.flash("error", e.message);
        }
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

// LOGIN LOGIC: Automatic Owner Detection
module.exports.login = async (req, res) => {
    // Agar username OWNER_USERNAME se match karta hai, database me isOwner = true ensure karo
    if (req.user && req.user.username.trim().toLowerCase() === OWNER_USERNAME.trim().toLowerCase()) {
        if (!req.user.isOwner) {
            req.user.isOwner = true;
            await User.findByIdAndUpdate(req.user._id, { isOwner: true });
        }
        req.flash("success", "Welcome back, Boss! Owner controls activated.");
    } else {
        req.flash("success", "Welcome back to Hungrymate!");
    }
    
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
};