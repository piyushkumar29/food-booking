const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
    initDB();
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

// Exact Geo-Coordinates Mapping for each Restaurant & Area [longitude, latitude]
const locationGeoMap = {
  // Kalyani & JIS Area
  "super star haji briyani": [88.4326, 22.9772],
  "kalyani, near jis college of engineering": [88.4326, 22.9772],
  "jis university campus": [88.4310, 22.9750],
  "jis college gate": [88.4326, 22.9772],
  "dada boudi biryani": [88.4410, 22.9810],
  "kalyani central park": [88.4345, 22.9780],
  "kalyani b-block": [88.4380, 22.9795],
  "kalyani a-block": [88.4290, 22.9740],
  "kalyani a9 market": [88.4285, 22.9735],
  "kalyani shilpanchal": [88.4450, 22.9860],
  "kalyani ghoshpara": [88.4480, 22.9890],
  "kalyani main road": [88.4350, 22.9770],
  "kalyani market": [88.4360, 22.9785],
  "kalyani central": [88.4355, 22.9782],

  // Salt Lake & Sector V Area
  "aminia restaurant": [88.4330, 22.5800],
  "sector v, salt lake, kolkata": [88.4330, 22.5800],
  "sector 1, salt lake": [88.4060, 22.5870],
  "sector 3, salt lake": [88.4120, 22.5710],
  "city center 1, salt lake": [88.4075, 22.5892],
  "wow! momo": [88.4335, 22.5805],

  // Park Street & Central Kolkata
  "oudh 1590": [88.3530, 22.5510],
  "park street, kolkata": [88.3530, 22.5510],
  "flurys kolkata": [88.3525, 22.5515],
  "kusum rolls": [88.3538, 22.5512],
  "college street, kolkata": [88.3630, 22.5740],
  "burrabazar, kolkata": [88.3550, 22.5850],
  "shyambazar, kolkata": [88.3710, 22.6020],

  // New Town & Rajarhat
  "kashmir valley kitchen": [88.4650, 22.5860],
  "new town, kolkata": [88.4650, 22.5860],
  "new town hub": [88.4680, 22.5880],
  "city center 2, new town": [88.4630, 22.6240],

  // South Kolkata
  "golbari kitchen": [88.3650, 22.5150],
  "golpark, kolkata": [88.3650, 22.5150],
  "southern avenue, kolkata": [88.3580, 22.5120],
  "vivekananda park, kolkata": [88.3570, 22.5180],
  "chinar park, kolkata": [88.4410, 22.6245],
  "park circus, kolkata": [88.3680, 22.5430]
};

function getExactCoordinates(restaurant, location) {
  const restKey = (restaurant || "").trim().toLowerCase();
  const locKey = (location || "").trim().toLowerCase();

  // 1. Restaurant-specific coordinates
  if (locationGeoMap[restKey]) {
    return locationGeoMap[restKey];
  }

  // 2. Exact locality coordinates
  if (locationGeoMap[locKey]) {
    return locationGeoMap[locKey];
  }

  // 3. Partial area match
  for (let key in locationGeoMap) {
    if (locKey.includes(key) || restKey.includes(key)) {
      return locationGeoMap[key];
    }
  }

  // Default Fallback: Super Star Haji Biryani / JIS College Gate, Kalyani
  return [88.4326, 22.9772];
}

const initDB = async () => {
  try {
    await Listing.deleteMany({});

    let defaultOwner = await User.findOne({ username: "piyush kumar" });
    if (!defaultOwner) {
      defaultOwner = await User.findOne({});
    }

    const cleanData = initData.data.map((obj) => {
      const coords = getExactCoordinates(obj.restaurant, obj.location);
      return {
        ...obj,
        owner: defaultOwner ? defaultOwner._id : new mongoose.Types.ObjectId(),
        geometry: {
          type: "Point",
          coordinates: coords // GeoJSON format: [longitude, latitude]
        }
      };
    });

    await Listing.insertMany(cleanData);
    console.log("Database initialized successfully! All dishes are mapped to their exact restaurant coordinates.");
    process.exit(0);
  } catch (err) {
    console.log("Error initializing database:", err);
    process.exit(1);
  }
};