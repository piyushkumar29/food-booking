const sampleListings = [
  // 1. BIRYANI & RICE
  {
    title: "Special Kolkata Chicken Biryani",
    description: "Aromatic long-grain basmati rice cooked with tender chicken, soft potato, and boiled egg infused with royal spices.",
    image: { url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80", filename: "food1" },
    price: 320, location: "Kalyani, near JIS college of engineering", restaurant: "super star haji briyani",
    category: "Biryani/Rice", isVeg: false, preparationTime: 25, spiciness: "Medium"
  },
  {
    title: "Hyderabadi Dum Mutton Biryani",
    description: "Slow-cooked tender goat meat marinated in curd and whole garam masala, layered with fragrant saffron rice.",
    image: { url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80", filename: "food2" },
    price: 450, location: "Sector V, Salt Lake, Kolkata", restaurant: "Aminia Restaurant",
    category: "Biryani/Rice", isVeg: false, preparationTime: 30, spiciness: "Spicy"
  },
  {
    title: "Paneer Tikka Biryani",
    description: "Charcoal-grilled paneer tikka cubes cooked in spiced basmati rice and fresh mint leaves.",
    image: { url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80", filename: "food3" },
    price: 260, location: "Park Street, Kolkata", restaurant: "Oudh 1590",
    category: "Biryani/Rice", isVeg: true, preparationTime: 20, spiciness: "Medium"
  },
  {
    title: "Jeera Rice & Dal Tadka Combo",
    description: "Basmati rice tempered with roasted cumin seeds served with double tadka yellow arhar dal.",
    image: { url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80", filename: "food4" },
    price: 190, location: "Kalyani Central", restaurant: "Dhaba Express",
    category: "Biryani/Rice", isVeg: true, preparationTime: 15, spiciness: "Mild"
  },

  // 2. PIZZA & FAST FOOD
  {
    title: "Margherita Fresh Basil Pizza",
    description: "Classic Italian hand-tossed crust with san marzano tomato sauce, fresh mozzarella, and sweet basil.",
    image: { url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", filename: "food5" },
    price: 299, location: "Kalyani B-Block", restaurant: "Domino's Pizza",
    category: "Pizza/Fast Food", isVeg: true, preparationTime: 20, spiciness: "Mild"
  },
  {
    title: "Spicy Chicken Peri Peri Pizza",
    description: "Loaded with grilled spicy chicken chunks, red paprika, jalapenos, and melted mozzarella cheese.",
    image: { url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80", filename: "food6" },
    price: 449, location: "Sector 1, Salt Lake", restaurant: "Pizza Hut",
    category: "Pizza/Fast Food", isVeg: false, preparationTime: 25, spiciness: "Spicy"
  },
  {
    title: "Stuffed Garlic Bread Sticks",
    description: "Freshly baked herb bread stuffed with sweet corn, jalapenos, and molten cheddar cheese.",
    image: { url: "https://images.unsplash.com/photo-1619895092538-128341789043?auto=format&fit=crop&w=800&q=80", filename: "food7" },
    price: 159, location: "JIS University Campus", restaurant: "Crust & Crave",
    category: "Pizza/Fast Food", isVeg: true, preparationTime: 15, spiciness: "Mild"
  },
  {
    title: "Creamy Alfredo Penne White Sauce Pasta",
    description: "Penne tossed in silky parmesan cream sauce with broccoli, mushrooms, and herb seasoning.",
    image: { url: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=800&q=80", filename: "food8" },
    price: 269, location: "Kalyani Shilpanchal", restaurant: "Little Italy",
    category: "Pizza/Fast Food", isVeg: true, preparationTime: 18, spiciness: "Mild"
  },

  // 3. BURGERS & ROLLS
  {
    title: "Crispy Veg Maharaja Burger",
    description: "Double crispy corn and potato patty, iceberg lettuce, spiced mayo, and melted cheese slice.",
    image: { url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", filename: "food9" },
    price: 189, location: "Kalyani Ghoshpara", restaurant: "Burger King",
    category: "Burger", isVeg: true, preparationTime: 15, spiciness: "Medium"
  },
  {
    title: "Smoky Grilled Chicken Burger",
    description: "Juicy flame-grilled chicken patty topped with BBQ caramelized onions and crunchy pickles.",
    image: { url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80", filename: "food10" },
    price: 249, location: "New Town Hub", restaurant: "Rodeo Grills",
    category: "Burger", isVeg: false, preparationTime: 18, spiciness: "Medium"
  },
  {
    title: "Kolkata Double Egg Chicken Roll",
    description: "Flaky paratha coated with dual beaten eggs, stuffed with spicy roasted chicken, green chilies, and lemon juice.",
    image: { url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80", filename: "food11" },
    price: 130, location: "Park Street, Kolkata", restaurant: "Kusum Rolls",
    category: "Trending", isVeg: false, preparationTime: 12, spiciness: "Spicy"
  },
  {
    title: "Paneer Tikka Kathi Roll",
    description: "Smoky tandoori paneer slices rolled in roomali roti with pickled sliced onions and green mint chutney.",
    image: { url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", filename: "food12" },
    price: 120, location: "Kalyani Central", restaurant: "Hot Roll Corner",
    category: "Pure Veg", isVeg: true, preparationTime: 12, spiciness: "Medium"
  },

  // 4. MOMOS & SNACKS
  {
    title: "Steamed Chicken Darjeeling Momos (8 Pcs)",
    description: "Authentic thin-wrapper momos filled with seasoned minced chicken, served with spicy red chutney.",
    image: { url: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80", filename: "food13" },
    price: 140, location: "Sector V, Salt Lake", restaurant: "Wow! Momo",
    category: "Trending", isVeg: false, preparationTime: 12, spiciness: "Spicy"
  },
  {
    title: "Crispy Fried Veg Momos (8 Pcs)",
    description: "Crunchy deep-fried dumplings stuffed with cabbage, carrots, paneer, and garlic dip.",
    image: { url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80", filename: "food14" },
    price: 120, location: "Kalyani A-Block", restaurant: "Momo Hub",
    category: "Pure Veg", isVeg: true, preparationTime: 12, spiciness: "Medium"
  },
  {
    title: "Peri Peri Crispy French Fries",
    description: "Golden fried potato batons tossed in hot and zesty peri peri spice mix.",
    image: { url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80", filename: "food15" },
    price: 119, location: "Kalyani Central", restaurant: "Fries Factory",
    category: "Burger", isVeg: true, preparationTime: 10, spiciness: "Spicy"
  },

  // 5. PURE VEG CURRIES & ROTI
  {
    title: "Paneer Butter Masala",
    description: "Soft malai paneer cubes simmered in a silky tomato, cashew nut, and butter gravy with kasuri methi.",
    image: { url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80", filename: "food16" },
    price: 280, location: "Kalyani Main Road", restaurant: "Haldiram's",
    category: "Pure Veg", isVeg: true, preparationTime: 20, spiciness: "Mild"
  },
  {
    title: "Dal Makhani (Slow Simmered)",
    description: "Black lentils and rajma slow-cooked overnight with white butter and fresh cream.",
    image: { url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80", filename: "food17" },
    price: 220, location: "Sector V, Salt Lake", restaurant: "Dhaba Kolkata",
    category: "Pure Veg", isVeg: true, preparationTime: 20, spiciness: "Medium"
  },
  {
    title: "Kadhai Paneer Special",
    description: "Cottage cheese and bell peppers stir-fried with coarsely pounded coriander and red chilies.",
    image: { url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80", filename: "food18" },
    price: 270, location: "Kalyani B-Block", restaurant: "Bikanervala",
    category: "Pure Veg", isVeg: true, preparationTime: 20, spiciness: "Spicy"
  },
  {
    title: "Butter Garlic Naan (2 Pcs)",
    description: "Tandoor baked soft leavened bread coated with chopped garlic and generous melted butter.",
    image: { url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", filename: "food19" },
    price: 80, location: "Kalyani Shilpanchal", restaurant: "Tandoori Nights",
    category: "Pure Veg", isVeg: true, preparationTime: 10, spiciness: "None"
  },

  // 6. NON-VEG CURRIES & TANDOOR
  {
    title: "Delhi Style Butter Chicken",
    description: "Charcoal roasted chicken pieces simmered in rich velvety tomato, cream, and butter sauce.",
    image: { url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80", filename: "food20" },
    price: 360, location: "Kalyani near JIS College", restaurant: "super star haji briyani",
    category: "Non Veg", isVeg: false, preparationTime: 25, spiciness: "Medium"
  },
  {
    title: "Bengali Mutton Kosha",
    description: "Dark thick spicy caramelized mutton curry slow-cooked with whole spices and mustard oil.",
    image: { url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", filename: "food21" },
    price: 440, location: "Golpark, Kolkata", restaurant: "Golbari Kitchen",
    category: "Non Veg", isVeg: false, preparationTime: 35, spiciness: "Spicy"
  },
  {
    title: "Tandoori Chicken Full (4 Pcs)",
    description: "Whole spring chicken marinated in yogurt and tandoori spices, char-grilled to perfection.",
    image: { url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80", filename: "food22" },
    price: 420, location: "Kalyani A9 Market", restaurant: "Pind Balluchi",
    category: "Non Veg", isVeg: false, preparationTime: 25, spiciness: "Spicy"
  },
  {
    title: "Chicken Tikka Kebab (6 Pcs)",
    description: "Juicy boneless chicken marinated in kashmiri chili and mustard oil, roasted with lemon.",
    image: { url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80", filename: "food23" },
    price: 290, location: "Chinar Park, Kolkata", restaurant: "Arsalan",
    category: "Non Veg", isVeg: false, preparationTime: 20, spiciness: "Medium"
  },

  // 7. INDIAN THALI
  {
    title: "Special Maharaja Non-Veg Thali",
    description: "Royal platter: Mutton Kosha, Chicken Butter Masala, Pulao, Dal, 2 Butter Rotis, Gulab Jamun, and Salad.",
    image: { url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80", filename: "food24" },
    price: 490, location: "Kalyani Central", restaurant: "Bhojohori Manna",
    category: "Indian Thali", isVeg: false, preparationTime: 30, spiciness: "Medium"
  },
  {
    title: "Shree Pure Veg Deluxe Thali",
    description: "Paneer Butter Masala, Dal Makhani, Mixed Vegetable, Pulao, 2 Naans, Raita, and Sweet.",
    image: { url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80", filename: "food25" },
    price: 330, location: "Burrabazar, Kolkata", restaurant: "Thali King",
    category: "Indian Thali", isVeg: true, preparationTime: 22, spiciness: "Medium"
  },

  // 8. SOUTH INDIAN
  {
    title: "Crispy Masala Dosa",
    description: "Golden crispy crepe folded with spiced potato masala, served with coconut chutney and hot sambar.",
    image: { url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80", filename: "food26" },
    price: 150, location: "Kalyani Main Road", restaurant: "Sagar Ratna",
    category: "Trending", isVeg: true, preparationTime: 15, spiciness: "Medium"
  },
  {
    title: "Steamed Idli Sambar (4 Pcs)",
    description: "Fluffy steamed rice-lentil cakes served with piping hot drumstick sambar and coconut dip.",
    image: { url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80", filename: "food27" },
    price: 110, location: "Kalyani Central", restaurant: "South Express",
    category: "Pure Veg", isVeg: true, preparationTime: 12, spiciness: "Mild"
  },

  // 9. ICE-CREAM & DESSERT
  {
    title: "Hot Gulab Jamun (3 Pcs)",
    description: "Soft khoya dumplings deep fried and soaked in aromatic rose and saffron cardamom sugar syrup.",
    image: { url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80", filename: "food28" },
    price: 90, location: "Kalyani Market", restaurant: "Mithai Mahal",
    category: "Dessert", isVeg: true, preparationTime: 5, spiciness: "None"
  },
  {
    title: "Belgian Chocolate Sundae",
    description: "Rich dark chocolate ice cream loaded with chocolate fudge, walnuts, and brownie pieces.",
    image: { url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80", filename: "food29" },
    price: 199, location: "City Center 2, New Town", restaurant: "Baskin Robbins",
    category: "Ice-cream", isVeg: true, preparationTime: 8, spiciness: "None"
  },
  {
    title: "Bengali Sponge Rasgulla (4 Pcs)",
    description: "Soft and spongy chhena balls cooked in clarified sweet sugar syrup.",
    image: { url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80", filename: "food30" },
    price: 90, location: "Shyambazar, Kolkata", restaurant: "K.C. Das Sweets",
    category: "Dessert", isVeg: true, preparationTime: 5, spiciness: "None"
  },
  {
    title: "Dutch Truffle Chocolate Cake (500g)",
    description: "Layers of moist chocolate sponge smothered with velvety chocolate truffle ganache.",
    image: { url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80", filename: "food31" },
    price: 499, location: "Kalyani Shilpanchal", restaurant: "Mio Amore",
    category: "Cake/Bakery", isVeg: false, preparationTime: 15, spiciness: "None"
  },
  {
    title: "Red Velvet Cream Cheese Pastry",
    description: "Velvety scarlet sponge slice layered with pure imported Philadelphia cream cheese.",
    image: { url: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=800&q=80", filename: "food32" },
    price: 140, location: "Salt Lake Sector 1", restaurant: "Flurys Kolkata",
    category: "Cake/Bakery", isVeg: true, preparationTime: 10, spiciness: "None"
  },

  // 10. BEVERAGES
  {
    title: "Thick Belgian Chocolate Shake",
    description: "Super thick blended chocolate milkshake loaded with chocolate chips and whipped cream.",
    image: { url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80", filename: "food33" },
    price: 169, location: "Kalyani Central Park", restaurant: "The Thick Shake Factory",
    category: "Trending", isVeg: true, preparationTime: 8, spiciness: "None"
  },
  {
    title: "Chilled Cold Coffee with Ice Cream",
    description: "Freshly brewed espresso shaken with creamy milk and topped with rich vanilla ice cream.",
    image: { url: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80", filename: "food34" },
    price: 139, location: "JIS College Gate", restaurant: "Cafe Coffee Day",
    category: "Trending", isVeg: true, preparationTime: 8, spiciness: "None"
  }
];

module.exports = { data: sampleListings };