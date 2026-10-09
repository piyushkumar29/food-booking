const Listing = require("./models/listing");
const Review = require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

// Owner Identifiers (Exclusive Access)
const OWNER_EMAIL = "piyushkumarg292007@gmail.com";
const OWNER_USERNAMES = ["piyush", "piyush kumar", "piyushkumar"];

function isUserOwner(user) {
    if (!user) return false;
    if (user.isOwner === true) return true;
    const email = user.email ? user.email.toLowerCase().trim() : "";
    const username = user.username ? user.username.toLowerCase().trim() : "";
    return email === OWNER_EMAIL || OWNER_USERNAMES.includes(username);
}

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in first!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

// Only Piyush Kumar can Add new items
module.exports.isOwnerOnly = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Only the website owner (Piyush Kumar) can perform this action!");
        return res.redirect("/login");
    }
    if (!isUserOwner(req.user)) {
        req.flash("error", "Access Denied: Only the website owner can add food items!");
        return res.redirect("/listings");
    }
    next();
};

// Only Piyush Kumar can Edit/Delete any item (predefined or new)
module.exports.isOwner = async (req, res, next) => {
    const { id } = req.params;
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to modify listings!");
        return res.redirect("/login");
    }

    // Direct owner pass
    if (isUserOwner(req.user)) {
        return next();
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Food listing does not exist!");
        return res.redirect("/listings");
    }

    if (listing.owner && listing.owner.equals(req.user._id)) {
        return next();
    }

    req.flash("error", "You are not authorized to edit or delete this food item!");
    return res.redirect(`/listings/${id}`);
};

module.exports.validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (isUserOwner(req.user)) {
        return next();
    }
    if (!review.author.equals(req.user._id)) {
        req.flash("error", "You are not the author of this review!");
        return res.redirect(`/listings/${id}`);
    }
    next();
};