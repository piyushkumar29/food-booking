const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default || require("passport-local-mongoose");

const userSchema = new Schema({
    email: {

        type: String,
        required: true,
        unique: true
    },
    isOwner: {
        type: Boolean,
        default: false // By default har naya user customer/normal user hoga
    }
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);