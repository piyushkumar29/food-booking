const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title:{
        type: String,
        default:"https://www.google.com/search?sca_esv=fd80582d8fba4559&rlz=1C1CHBF_enIN820IN820&sxsrf=APpeQnu_mVV6sZVCnSgVWxZ891QLF2kxrg:1786101320047&q=sorry+something+oops+sorry+try+again+image&uds=AJ5uw1_a2D0D09lxm8gpKKOTUn4rUa0D3GoYUcxe7VXlYKBH8_EeSkAsx5Vbm0HH8WqMPweOrPWYE_lEjFA1DJTwL4xPr9-FEljbHg9RnrgPbKHvAiavqX9W9R2VoEtShaHKuGsYTfeFLGNDPrHMe4HLG15fMChKT8UC883MBAvrb0LqtP3fyxc&udm=2&sa=X&ved=2ahUKEwiQgdv1sY6WAxUHWHADHRxWIY8QxKsJKAd6BQj1BRAB&ictx=0&biw=1366&bih=641&dpr=1#sv=CAMSURoyKhBlLVdxMGZTTXdaaGRjTktNMg5XcTBmU013WmhkY05LTToOX1VNQWN3VDZyREZVLU0gBCoXCgFzEhBlLVdxMGZTTXdaaGRjTktNGAEwARgHIObpq5wGSggQARgBIAEoAQ",
        required: true,
    },
    description: String,
    image:{
        type: String,
        set: (v) => v === "" ? "https://www.google.com/search?sca_esv=fd80582d8fba4559&rlz=1C1CHBF_enIN820IN820&sxsrf=APpeQnu_mVV6sZVCnSgVWxZ891QLF2kxrg:1786101320047&q=sorry+something+oops+sorry+try+again+image&uds=AJ5uw1_a2D0D09lxm8gpKKOTUn4rUa0D3GoYUcxe7VXlYKBH8_EeSkAsx5Vbm0HH8WqMPweOrPWYE_lEjFA1DJTwL4xPr9-FEljbHg9RnrgPbKHvAiavqX9W9R2VoEtShaHKuGsYTfeFLGNDPrHMe4HLG15fMChKT8UC883MBAvrb0LqtP3fyxc&udm=2&sa=X&ved=2ahUKEwiQgdv1sY6WAxUHWHADHRxWIY8QxKsJKAd6BQj1BRAB&ictx=0&biw=1366&bih=641&dpr=1#sv=CAMSURoyKhBlLVdxMGZTTXdaaGRjTktNMg5XcTBmU013WmhkY05LTToOX1VNQWN3VDZyREZVLU0gBCoXCgFzEhBlLVdxMGZTTXdaaGRjTktNGAEwARgHIObpq5wGSggQARgBIAEoAQ" : v,
    },
    price: Number,
    category: {
        type: String,
        
    },
    isVeg:{
        type: Boolean,
        default: true,
    },
    restaurantName: String,
    city: String,
    preparationTime: Number,
    spiciness: String,
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
});

listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({_id : {$in: listing.reviews} });
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;