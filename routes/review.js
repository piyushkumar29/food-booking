const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const reviewController = require("../controllers/reviews.js");
const { isLoggedIn, isReviewAuthor } = require("../middlewares.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

// Render Feedback Form page
router.get("/feedback-form", isLoggedIn, wrapAsync(reviewController.renderFeedbackForm));

// Submit Feedback with image
router.post(
    "/",
    isLoggedIn,
    upload.single("reviewImage"),
    wrapAsync(reviewController.createReview)
);

// Edit review route
router.get("/:reviewId/edit", isLoggedIn, isReviewAuthor, wrapAsync(reviewController.renderEditReviewForm));

// Update review route
router.put(
    "/:reviewId",
    isLoggedIn,
    isReviewAuthor,
    upload.single("reviewImage"),
    wrapAsync(reviewController.updateReview)
);

// Delete review
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(reviewController.destroyReview));

module.exports = router;