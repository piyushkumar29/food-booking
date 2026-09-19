const User = require("../models/user");

// ========================================================
// PREDEFINED OWNER USERNAME:
// ========================================================
const OWNER_USERNAME = "piyush kumar"; 
// ========================================================

// Real Email Validation Helper (Disallows dummy/fake domains)
function isValidRealEmail(email) {
    // Standard RFC-compliant email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;

    // Reject common dummy/disposable/fake domains
    const blockedDomains = [
        "test.com", "example.com", "fake.com", "dummy.com", "tempmail.com", 
        "mailinator.com", "10minutemail.com", "guerrillamail.com", "trashmail.com"
    ];
    const domain = email.split("@")[1].toLowerCase();
    if (blockedDomains.includes(domain)) return false;

    // Minimum domain structure check
    if (!domain.includes(".")) return false;
    return true;
}

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        let { username, email, password, confirmPassword } = req.body;

        // 1. Password Match Validation
        if (password !== confirmPassword) {
            req.flash("error", "Passwords do not match!");
            return res.redirect("/signup");
        }

        // 2. Real Email Verification Check
        if (!isValidRealEmail(email)) {
            req.flash("error", "Please provide a valid, real email address! Disposable or dummy emails are not allowed.");
            return res.redirect("/signup");
        }

        // 3. Existing Email Check
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            req.flash("error", "An account with this email already exists! Please login.");
            return res.redirect("/signup");
        }

        // 4. Predefined Owner Logic
        const isOwner = (username.trim().toLowerCase() === OWNER_USERNAME.trim().toLowerCase());

        const newUser = new User({ 
            email: email.toLowerCase(), 
            username: username.trim(), 
            isOwner 
        });

        const registeredUser = await User.register(newUser, password);
        
        req.login(registeredUser, (err) => {
            if (err) return next(err);
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

module.exports.login = async (req, res) => {
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
        if (err) return next(err);
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    });
};