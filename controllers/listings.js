const Listing = require("../models/listing");

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({}).populate("reviews");
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
    if (!listing) {
        req.flash("error", "The requested food item does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;

    // Check if uploaded via file
    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
    } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
        // Fallback: direct internet image link
        newListing.image = {
            url: req.body.imageUrl.trim(),
            filename: "direct-url-image",
        };
    } else {
        // Default delicious food placeholder
        newListing.image = {
            url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
            filename: "default-food",
        };
    }

    await newListing.save();
    req.flash("success", "New Food Item Added Successfully to Hungrymate Menu!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Food listing does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

    if (req.file) {
        listing.image = {
            url: req.file.path,
            filename: req.file.filename,
        };
        await listing.save();
    } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
        listing.image = {
            url: req.body.imageUrl.trim(),
            filename: "direct-url-image",
        };
        await listing.save();
    }

    req.flash("success", "Food Listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Food Listing Deleted Successfully from Cloud Database!");
    res.redirect("/listings");
};