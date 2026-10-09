const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const listingController = require("../controllers/listings.js");
const { isLoggedIn, isOwner, isOwnerOnly, validateListing } = require("../middlewares.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isOwnerOnly,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// New Form: Exclusively for Website Owner
router.get("/new", isOwnerOnly, listingController.renderNewForm);

router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isOwner, wrapAsync(listingController.destroyListing));

// Edit Form: Exclusively for Website Owner
router.get("/:id/edit", isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;