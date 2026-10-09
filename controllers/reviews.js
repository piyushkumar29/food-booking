const Listing = require("../models/listing");
const Review = require("../models/review");

module.exports.createReview = async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;

    if (req.file) {
        newReview.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
    }

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    req.flash("success", "Thank you for your valuable feedback!");
    res.redirect(`/listings/${listing._id}`);
};

module.exports.renderFeedbackForm = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Food item not found!");
        return res.redirect("/listings");
    }
    res.render("listings/item-feedback.ejs", { listing });
};

module.exports.renderEditReviewForm = async (req, res) => {
    let { id, reviewId } = req.params;
    let listing = await Listing.findById(id);
    let review = await Review.findById(reviewId);
    if (!listing || !review) {
        req.flash("error", "Review does not exist!");
        return res.redirect(`/listings/${id}`);
    }
    res.render("listings/edit-feedback.ejs", { listing, review });
};

module.exports.updateReview = async (req, res) => {
    let { id, reviewId } = req.params;
    let review = await Review.findById(reviewId);

    review.rating = req.body.review.rating;
    review.comment = req.body.review.comment;

    if (req.file) {
        review.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
    }

    await review.save();
    req.flash("success", "Your feedback was updated successfully!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyReview = async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted Successfully!");
    res.redirect(`/listings/${id}`);
};