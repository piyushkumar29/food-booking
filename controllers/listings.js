const Listing = require("../models/listing");

// Landmark aur exact building pakadne ke liye improved geocoder
async function getCoordinates(restaurant, location) {
    let cleanLoc = (location || "").trim();
    let cleanRest = (restaurant || "").trim();

    // "near", "beside", "opp" jaise words hata kar search ko sharp banaya
    let landmarkOnly = cleanLoc.replace(/near|opp|opposite|beside|behind/gi, "").replace(/\s+/g, ' ').trim();

    let searchQueries = [
        `${cleanRest}, ${cleanLoc}`,
        `${cleanRest}, ${landmarkOnly}`,
        landmarkOnly,
        cleanLoc,
        cleanLoc.split(',')[0].trim()
    ];

    for (let query of searchQueries) {
        if (!query || query.length < 3) continue;
        try {
            let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'HungryMateFoodApp/2.0' }
            });
            let data = await res.json();
            if (data && data.length > 0) {
                return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
            }
        } catch (e) {
            console.log("Search error:", e);
        }
    }
    return [77.2090, 28.6139];
}

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({ path: "reviews", populate: { path: "author" } }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    try {
        let url = req.file.path;
        let filename = req.file.filename;

        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;
        newListing.image = { url, filename };

        let coords = await getCoordinates(req.body.listing.restaurant, req.body.listing.location);
        newListing.geometry = {
            type: "Point",
            coordinates: coords
        };

        await newListing.save();
        req.flash("success", "New Food Listing Created!");
        res.redirect("/listings");
    } catch (e) {
        next(e);
    }
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res, next) => {
    try {
        let { id } = req.params;
        let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

        let coords = await getCoordinates(req.body.listing.restaurant, req.body.listing.location);
        listing.geometry = {
            type: "Point",
            coordinates: coords
        };

        if (typeof req.file !== "undefined") {
            let url = req.file.path;
            let filename = req.file.filename;
            listing.image = { url, filename };
        }

        await listing.save();
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    } catch (e) {
        next(e);
    }
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};