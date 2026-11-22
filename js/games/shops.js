// ROBLOC shop catalog: 10,000 shops. The first 18 are hand-made; the rest are generated from shop types.
// Prices are in cents.

export const TAX_RATE = 0.08;
const $c = d => Math.round(d * 100);
export const CURATED = [
  { id: 'toys', name: 'Toy Galaxy', icon: '🧸', color: '#f43f5e', items: [
    ['teddy', 'Teddy Bear', '🧸', 24.99], ['racecar', 'Race Car Set', '🏎️', 39.99], ['robot', 'Robot Kit', '🤖', 79.99], ['dollhouse', 'Doll House', '🏠', 129.99],
    ['yoyo', 'Yo-Yo', '🪀', 6.99], ['kite', 'Rainbow Kite', '🪁', 19.99], ['puzzle', '1000-Piece Puzzle', '🧩', 17.99], ['boardgame', 'Board Game', '🎲', 29.99]] },
  { id: 'shoes', name: 'Sole Society', icon: '👟', color: '#0ea5e9', items: [
    ['sneakers', 'Running Sneakers', '👟', 89.99], ['boots', 'Hiking Boots', '🥾', 129.99], ['flipflops', 'Flip-Flops', '🩴', 14.99], ['flats', 'Ballet Flats', '🩰', 49.99],
    ['dressshoes', 'Dress Shoes', '👞', 119.99], ['heels', 'Party Heels', '👠', 79.99], ['socks', 'Socks 6-Pack', '🧦', 16.99]] },
  { id: 'bakery', name: 'Sweet Crumbs Bakery', icon: '🥐', color: '#d97706', items: [
    ['croissant', 'Croissant', '🥐', 3.49], ['cake', 'Birthday Cake', '🎂', 34.99], ['cupcake', 'Cupcake', '🧁', 3.99], ['donuts', 'Box of Donuts', '🍩', 12.99],
    ['bread', 'Bread Loaf', '🍞', 5.49], ['cookie', 'Giant Cookie', '🍪', 1.99], ['pie', 'Apple Pie', '🥧', 18.99]] },
  { id: 'electronics', name: 'Volt Electronics', icon: '📱', color: '#6366f1', items: [
    ['phone', 'Smartphone', '📱', 799], ['laptop', 'Laptop', '💻', 1199], ['headphones', 'Headphones', '🎧', 249.99], ['smartwatch', 'Smart Watch', '⌚', 399],
    ['tv', '65" 4K TV', '📺', 649.99], ['camera', 'Camera', '📷', 899], ['desktop', 'Gaming PC', '🖥️', 1499], ['speaker', 'Speaker', '🔊', 129.99]] },
  { id: 'pets', name: 'Paws & Claws Pets', icon: '🐶', color: '#16a34a', items: [
    ['puppy', 'Puppy', '🐶', 850], ['kitten', 'Kitten', '🐱', 350], ['goldfish', 'Goldfish', '🐠', 4.99], ['hamster', 'Hamster', '🐹', 19.99],
    ['parrot', 'Parrot', '🦜', 1200], ['bunny', 'Bunny', '🐰', 85], ['turtle', 'Turtle', '🐢', 39.99], ['petfood', 'Pet Food Bag', '🦴', 34.99]] },
  { id: 'icecream', name: 'Scoop Dreams', icon: '🍦', color: '#ec4899', items: [
    ['cone', 'Ice Cream Cone', '🍦', 4.5], ['sundae', 'Sundae', '🍨', 7.95], ['shake', 'Milkshake', '🥤', 6.49], ['shavedice', 'Shaved Ice', '🍧', 4.25], ['waffle', 'Waffle Bowl', '🧇', 5.75]] },
  { id: 'sports', name: 'Pro Sports Locker', icon: '⚽', color: '#22c55e', items: [
    ['soccerball', 'Soccer Ball', '⚽', 29.99], ['basketball', 'Basketball', '🏀', 34.99], ['glove', 'Baseball Glove', '🧤', 59.99], ['racket', 'Tennis Racket', '🎾', 89.99],
    ['skateboard', 'Skateboard', '🛹', 79.99], ['bike', 'Mountain Bike', '🚲', 349.99], ['football', 'Football', '🏈', 24.99], ['paddle', 'Pickleball Paddle', '🏓', 49.99]] },
  { id: 'books', name: 'Bookworm Books', icon: '📚', color: '#92400e', items: [
    ['comic', 'Comic Book', '📕', 4.99], ['novel', 'Adventure Novel', '📘', 14.99], ['encyclopedia', 'Encyclopedia Set', '📚', 89.99], ['coloring', 'Coloring Book', '🖍️', 7.99], ['atlas', 'World Atlas', '🗺️', 24.99]] },
  { id: 'fashion', name: 'Glow Up Fashion', icon: '👕', color: '#a855f7', items: [
    ['tshirt', 'T-Shirt', '👕', 19.99], ['jeans', 'Jeans', '👖', 49.99], ['coat', 'Winter Coat', '🧥', 129.99], ['dress', 'Dress', '👗', 59.99],
    ['cap', 'Baseball Cap', '🧢', 24.99], ['sunglasses', 'Sunglasses', '🕶️', 39.99], ['backpack', 'Backpack', '🎒', 54.99], ['scarf', 'Scarf', '🧣', 22.99]] },
  { id: 'games', name: 'Game Zone', icon: '🎮', color: '#0891b2', items: [
    ['videogame', 'Video Game', '💿', 69.99], ['console', 'Game Console', '🎮', 499.99], ['vr', 'VR Headset', '🥽', 499], ['giftcard', 'Gift Card', '🎁', 25], ['joystick', 'Arcade Stick', '🕹️', 149.99]] },
  { id: 'home', name: 'Home Nest', icon: '🛋️', color: '#78716c', items: [
    ['sofa', 'Sofa', '🛋️', 899], ['bed', 'Bed', '🛏️', 699], ['lamp', 'Lamp', '💡', 39.99], ['plant', 'House Plant', '🪴', 24.99],
    ['chair', 'Chair', '🪑', 89.99], ['clock', 'Wall Clock', '🕰️', 45], ['mirror', 'Mirror', '🪞', 79.99], ['bathtub', 'Bathtub', '🛁', 1299]] },
  { id: 'jewelry', name: 'Sparkle Jewelry', icon: '💍', color: '#eab308', items: [
    ['ring', 'Diamond Ring', '💍', 1299], ['necklace', 'Pearl Necklace', '📿', 349], ['diamond', 'Big Diamond', '💎', 9999], ['crown', 'Gold Crown', '👑', 25000], ['goldwatch', 'Gold Watch', '⌚', 2499]] },
  { id: 'market', name: 'Fresh Market', icon: '🍎', color: '#65a30d', items: [
    ['apple', 'Apple', '🍎', 0.99], ['bananas', 'Bananas', '🍌', 1.29], ['milk', 'Milk', '🥛', 3.79], ['eggs', 'Dozen Eggs', '🥚', 4.29],
    ['pizza', 'Frozen Pizza', '🍕', 8.99], ['cheese', 'Cheese', '🧀', 6.49], ['watermelon', 'Watermelon', '🍉', 5.99], ['carrots', 'Carrots', '🥕', 1.99]] },
  { id: 'music', name: 'Music Box', icon: '🎸', color: '#dc2626', items: [
    ['guitar', 'Guitar', '🎸', 299], ['keyboard', 'Keyboard', '🎹', 449], ['drums', 'Drum Kit', '🥁', 799], ['violin', 'Violin', '🎻', 399], ['trumpet', 'Trumpet', '🎺', 529], ['mic', 'Microphone', '🎤', 99.99]] },
  { id: 'cars', name: 'Turbo Motors', icon: '🚗', color: '#1d4ed8', items: [
    ['familycar', 'Family Car', '🚗', 27500], ['sportscar', 'Sports Car', '🏎️', 189000], ['pickup', 'Pickup Truck', '🛻', 42900], ['motorcycle', 'Motorcycle', '🏍️', 12499],
    ['escooter', 'Electric Scooter', '🛴', 599], ['camper', 'Camper Van', '🚐', 89000]] },
  { id: 'homes', name: 'Dream Homes Realty', icon: '🏡', color: '#0d9488', items: [
    ['house', 'Cozy House', '🏠', 385000], ['familyhome', 'Family Home', '🏡', 649000], ['apartment', 'City Apartment', '🏢', 725000], ['villa', 'Beach Villa', '🏖️', 4200000], ['castle', 'Castle', '🏰', 12500000]] },
  { id: 'aviation', name: 'SkyHigh Aviation', icon: '✈️', color: '#0284c7', items: [
    ['balloon', 'Hot Air Balloon', '🎈', 45000], ['smallplane', 'Small Plane', '🛩️', 350000], ['helicopter', 'Helicopter', '🚁', 2900000], ['jet', 'Private Jet', '✈️', 65000000], ['rocket', 'Rocket', '🚀', 90000000]] },
  { id: 'boats', name: 'Harbor Boats', icon: '⛵', color: '#0369a1', items: [
    ['kayak', 'Kayak', '🛶', 799], ['sailboat', 'Sailboat', '⛵', 85000], ['speedboat', 'Speedboat', '🚤', 129000], ['yacht', 'Yacht', '🛥️', 8500000], ['cruise', 'Cruise Ship', '🚢', 950000000]] },
].map(s => ({ ...s, items: s.items.map(([id, name, icon, d]) => ({ id: s.id + '.' + id, name, icon, cents: $c(d) })) }));
export const withTax = cents => Math.round(cents * (1 + TAX_RATE));

export function fmtCents(c) {
  const n = BigInt(c), neg = n < 0n, a = neg ? -n : n;
  const d = (a / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), r = (a % 100n).toString().padStart(2, '0');
  return (neg ? '-$' : '$') + d + '.' + r;
}


// ---------- generated shops ----------
// Shops 19 to 10,000 are generated from shop types below. The same shop number always gives the same
// name, items and prices, so nothing needs storing. Each shop sells 7 to 1,000 items.
export const SHOP_COUNT = 10000;

// [item, emoji, lowest price, highest price] in dollars
const KINDS = [
  { key: 'toys', words: ['Toys', 'Toy Box', 'Playhouse', 'Toy Shop'], icon: '🧸', color: '#f43f5e', t: [
    ['Teddy Bear', '🧸', 9, 60], ['Race Car', '🏎️', 12, 70], ['Robot', '🤖', 25, 150], ['Doll', '🪆', 10, 80], ['Yo-Yo', '🪀', 3, 15], ['Kite', '🪁', 10, 45],
    ['Puzzle', '🧩', 8, 40], ['Board Game', '🎲', 15, 60], ['Toy Train', '🚂', 25, 180], ['Building Blocks', '🧱', 15, 120]] },
  { key: 'shoes', words: ['Shoes', 'Footwear', 'Shoe Shop', 'Kicks'], icon: '👟', color: '#0ea5e9', t: [
    ['Sneakers', '👟', 40, 220], ['Boots', '🥾', 60, 260], ['Flip-Flops', '🩴', 8, 35], ['Ballet Flats', '🩰', 25, 90], ['Dress Shoes', '👞', 60, 280], ['Heels', '👠', 40, 250], ['Socks', '🧦', 5, 25], ['Sandals', '🩴', 15, 80]] },
  { key: 'bakery', words: ['Bakery', 'Bake Shop', 'Pastries', 'Bread Co.'], icon: '🥐', color: '#d97706', t: [
    ['Croissant', '🥐', 2, 6], ['Cake', '🎂', 20, 80], ['Cupcake', '🧁', 2, 6], ['Donuts', '🍩', 1.5, 18], ['Bread', '🍞', 3, 9], ['Cookies', '🍪', 1.5, 12], ['Pie', '🥧', 12, 30], ['Bagels', '🥯', 1.5, 12]] },
  { key: 'electronics', words: ['Electronics', 'Tech', 'Gadgets', 'Digital'], icon: '📱', color: '#6366f1', t: [
    ['Smartphone', '📱', 199, 1399], ['Laptop', '💻', 399, 2999], ['Headphones', '🎧', 29, 499], ['Smart Watch', '⌚', 149, 799], ['TV', '📺', 249, 3499], ['Camera', '📷', 299, 2499],
    ['Gaming PC', '🖥️', 799, 3999], ['Speaker', '🔊', 39, 399], ['Tablet', '📲', 199, 1299], ['Charger', '🔌', 15, 69]] },
  { key: 'pets', words: ['Pets', 'Pet Shop', 'Pet Palace', 'Animal Friends'], icon: '🐶', color: '#16a34a', t: [
    ['Puppy', '🐶', 400, 2500], ['Kitten', '🐱', 150, 900], ['Goldfish', '🐠', 3, 25], ['Hamster', '🐹', 15, 40], ['Parrot', '🦜', 300, 2500], ['Bunny', '🐰', 40, 150],
    ['Turtle', '🐢', 20, 120], ['Pet Bed', '🛏️', 25, 120], ['Pet Food', '🦴', 15, 80], ['Pet Toy', '🎾', 4, 20]] },
  { key: 'icecream', words: ['Ice Cream', 'Scoops', 'Creamery', 'Frozen Treats'], icon: '🍦', color: '#ec4899', t: [
    ['Ice Cream Cone', '🍦', 3, 7], ['Sundae', '🍨', 5, 12], ['Milkshake', '🥤', 4.5, 9], ['Shaved Ice', '🍧', 3, 7], ['Waffle Bowl', '🧇', 4, 9], ['Ice Pop', '🍡', 1.5, 4]] },
  { key: 'sports', words: ['Sports', 'Sporting Goods', 'Athletics', 'Sports Zone'], icon: '⚽', color: '#22c55e', t: [
    ['Soccer Ball', '⚽', 15, 60], ['Basketball', '🏀', 20, 70], ['Baseball Glove', '🧤', 30, 180], ['Tennis Racket', '🎾', 40, 250], ['Skateboard', '🛹', 40, 180],
    ['Bike', '🚲', 200, 2500], ['Football', '🏈', 15, 60], ['Pickleball Paddle', '🏓', 25, 180], ['Volleyball', '🏐', 15, 60], ['Hockey Stick', '🏒', 30, 250]] },
  { key: 'books', words: ['Books', 'Bookstore', 'Reads', 'Library Shop'], icon: '📚', color: '#92400e', t: [
    ['Comic Book', '📕', 3, 12], ['Novel', '📘', 9, 30], ['Encyclopedia', '📚', 40, 200], ['Coloring Book', '🖍️', 4, 12], ['Atlas', '🗺️', 15, 45], ['Cookbook', '📗', 15, 40], ['Notebook', '📓', 3, 15]] },
  { key: 'fashion', words: ['Fashion', 'Boutique', 'Style', 'Outfitters'], icon: '👕', color: '#a855f7', t: [
    ['T-Shirt', '👕', 10, 45], ['Jeans', '👖', 30, 150], ['Coat', '🧥', 70, 400], ['Dress', '👗', 30, 250], ['Cap', '🧢', 15, 45], ['Sunglasses', '🕶️', 15, 250],
    ['Backpack', '🎒', 25, 150], ['Scarf', '🧣', 12, 80], ['Gloves', '🧤', 10, 60], ['Hoodie', '🧥', 30, 120]] },
  { key: 'games', words: ['Games', 'Game Zone', 'Arcade', 'Gamer Hub'], icon: '🎮', color: '#0891b2', t: [
    ['Video Game', '💿', 20, 70], ['Game Console', '🎮', 299, 699], ['VR Headset', '🥽', 299, 999], ['Gift Card', '🎁', 10, 100], ['Arcade Stick', '🕹️', 60, 250], ['Controller', '🎮', 40, 200]] },
  { key: 'home', words: ['Home', 'Furniture', 'Home Goods', 'Living'], icon: '🛋️', color: '#78716c', t: [
    ['Sofa', '🛋️', 400, 3500], ['Bed', '🛏️', 300, 2500], ['Lamp', '💡', 20, 200], ['House Plant', '🪴', 10, 120], ['Chair', '🪑', 40, 600], ['Clock', '🕰️', 20, 300],
    ['Mirror', '🪞', 30, 400], ['Bathtub', '🛁', 600, 4000], ['Curtains', '🪟', 25, 200], ['Rug', '🟫', 40, 900]] },
  { key: 'jewelry', words: ['Jewelry', 'Jewelers', 'Gems', 'Diamonds'], icon: '💍', color: '#eab308', t: [
    ['Ring', '💍', 150, 15000], ['Necklace', '📿', 80, 9000], ['Diamond', '💎', 2000, 250000], ['Crown', '👑', 5000, 500000], ['Watch', '⌚', 200, 60000], ['Earrings', '💎', 50, 8000]] },
  { key: 'market', words: ['Market', 'Grocery', 'Foods', 'Supermarket'], icon: '🍎', color: '#65a30d', t: [
    ['Apples', '🍎', 0.5, 6], ['Bananas', '🍌', 0.3, 3], ['Milk', '🥛', 2, 6], ['Eggs', '🥚', 2.5, 8], ['Pizza', '🍕', 5, 15], ['Cheese', '🧀', 3, 15],
    ['Watermelon', '🍉', 4, 9], ['Carrots', '🥕', 1, 4], ['Rice', '🍚', 3, 25], ['Juice', '🧃', 2, 7]] },
  { key: 'music', words: ['Music', 'Music Shop', 'Instruments', 'Sound'], icon: '🎸', color: '#dc2626', t: [
    ['Guitar', '🎸', 120, 3000], ['Keyboard', '🎹', 150, 2500], ['Drum Kit', '🥁', 300, 4000], ['Violin', '🎻', 150, 5000], ['Trumpet', '🎺', 200, 3000], ['Microphone', '🎤', 30, 600], ['Saxophone', '🎷', 500, 5000]] },
  { key: 'cars', words: ['Motors', 'Auto', 'Cars', 'Car Lot'], icon: '🚗', color: '#1d4ed8', t: [
    ['Car', '🚗', 18000, 90000], ['Sports Car', '🏎️', 60000, 450000], ['Pickup Truck', '🛻', 30000, 90000], ['Motorcycle', '🏍️', 6000, 40000], ['Scooter', '🛴', 300, 2000],
    ['Camper Van', '🚐', 50000, 250000], ['SUV', '🚙', 30000, 120000], ['Bus', '🚌', 90000, 600000]] },
  { key: 'homes', words: ['Realty', 'Homes', 'Real Estate', 'Properties'], icon: '🏡', color: '#0d9488', t: [
    ['House', '🏠', 180000, 900000], ['Family Home', '🏡', 300000, 1500000], ['Apartment', '🏢', 150000, 2500000], ['Beach Villa', '🏖️', 900000, 15000000],
    ['Castle', '🏰', 3000000, 60000000], ['Cabin', '🛖', 90000, 600000], ['Skyscraper', '🏙️', 50000000, 900000000]] },
  { key: 'aviation', words: ['Aviation', 'Aircraft', 'Air', 'Jets'], icon: '✈️', color: '#0284c7', t: [
    ['Hot Air Balloon', '🎈', 20000, 90000], ['Small Plane', '🛩️', 100000, 900000], ['Helicopter', '🚁', 500000, 9000000], ['Private Jet', '✈️', 3000000, 90000000], ['Rocket', '🚀', 20000000, 900000000]] },
  { key: 'boats', words: ['Boats', 'Marine', 'Harbor', 'Boat Shop'], icon: '⛵', color: '#0369a1', t: [
    ['Kayak', '🛶', 300, 2500], ['Sailboat', '⛵', 20000, 400000], ['Speedboat', '🚤', 40000, 500000], ['Yacht', '🛥️', 1000000, 90000000], ['Cruise Ship', '🚢', 300000000, 1500000000]] },
  { key: 'candy', words: ['Candy', 'Sweets', 'Candy Shop', 'Sugar Rush'], icon: '🍭', color: '#e879f9', t: [
    ['Lollipop', '🍭', 0.5, 4], ['Chocolate Bar', '🍫', 1, 6], ['Gummy Bears', '🐻', 1.5, 8], ['Candy Box', '🍬', 4, 30], ['Cotton Candy', '☁️', 2, 7], ['Candy Apple', '🍎', 2, 6]] },
  { key: 'flowers', words: ['Flowers', 'Florist', 'Blooms', 'Garden'], icon: '🌷', color: '#fb7185', t: [
    ['Roses', '🌹', 15, 90], ['Tulips', '🌷', 10, 50], ['Sunflowers', '🌻', 10, 45], ['Bouquet', '💐', 20, 150], ['Cactus', '🌵', 6, 60], ['Bonsai Tree', '🌳', 30, 400]] },
  { key: 'coffee', words: ['Coffee', 'Café', 'Beans', 'Coffee House'], icon: '☕', color: '#7c2d12', t: [
    ['Hot Chocolate', '☕', 2.5, 6], ['Latte', '☕', 3.5, 7], ['Tea', '🍵', 2, 6], ['Smoothie', '🥤', 4, 9], ['Muffin', '🧁', 2.5, 5], ['Sandwich', '🥪', 5, 12]] },
  { key: 'pizza', words: ['Pizza', 'Pizzeria', 'Slice', 'Pizza Place'], icon: '🍕', color: '#ea580c', t: [
    ['Pizza Slice', '🍕', 2.5, 6], ['Whole Pizza', '🍕', 10, 30], ['Garlic Bread', '🥖', 4, 9], ['Salad', '🥗', 6, 14], ['Pasta', '🍝', 9, 22], ['Soda', '🥤', 1.5, 4]] },
  { key: 'art', words: ['Art Supply', 'Crafts', 'Art Studio', 'Makers'], icon: '🎨', color: '#f97316', t: [
    ['Paint Set', '🎨', 8, 120], ['Crayons', '🖍️', 2, 20], ['Paint Brush', '🖌️', 2, 40], ['Canvas', '🖼️', 6, 150], ['Scissors', '✂️', 3, 25], ['Clay', '🏺', 5, 40], ['Pencils', '✏️', 2, 30]] },
  { key: 'hardware', words: ['Hardware', 'Tools', 'Builders', 'Fix-It'], icon: '🔨', color: '#64748b', t: [
    ['Hammer', '🔨', 10, 60], ['Wrench', '🔧', 8, 60], ['Screwdriver', '🪛', 5, 40], ['Saw', '🪚', 15, 300], ['Ladder', '🪜', 40, 400], ['Toolbox', '🧰', 25, 400], ['Flashlight', '🔦', 8, 90]] },
  { key: 'pharmacy', words: ['Pharmacy', 'Drugstore', 'Health', 'Wellness'], icon: '💊', color: '#14b8a6', t: [
    ['Bandages', '🩹', 3, 12], ['Vitamins', '💊', 8, 40], ['Toothbrush', '🪥', 2, 120], ['Soap', '🧼', 2, 15], ['Sunscreen', '🧴', 6, 30], ['Thermometer', '🌡️', 8, 60]] },
  { key: 'camping', words: ['Outdoors', 'Camping', 'Adventure', 'Trail'], icon: '⛺', color: '#4d7c0f', t: [
    ['Tent', '⛺', 60, 900], ['Sleeping Bag', '🛌', 30, 400], ['Backpack', '🎒', 40, 350], ['Compass', '🧭', 8, 80], ['Lantern', '🏮', 15, 120], ['Fishing Rod', '🎣', 25, 500]] },
  { key: 'party', words: ['Party', 'Party Supply', 'Celebrations', 'Fun Factory'], icon: '🎉', color: '#c026d3', t: [
    ['Balloons', '🎈', 3, 30], ['Party Hat', '🥳', 1, 10], ['Confetti', '🎊', 2, 15], ['Piñata', '🪅', 15, 60], ['Gift Wrap', '🎁', 3, 20], ['Fireworks', '🎆', 10, 300]] },
  { key: 'beauty', words: ['Beauty', 'Cosmetics', 'Glow', 'Spa'], icon: '💄', color: '#db2777', t: [
    ['Lipstick', '💄', 6, 60], ['Perfume', '🌸', 25, 400], ['Nail Polish', '💅', 4, 25], ['Hair Brush', '🪮', 5, 60], ['Face Cream', '🧴', 10, 200], ['Hair Clip', '🎀', 2, 20]] },
  { key: 'baby', words: ['Baby', 'Little Ones', 'Kids Corner', 'Nursery'], icon: '🍼', color: '#38bdf8', t: [
    ['Baby Bottle', '🍼', 6, 30], ['Pacifier', '🍼', 3, 15], ['Stroller', '🛒', 120, 1200], ['Crib', '🛏️', 150, 1500], ['Rattle', '🪇', 4, 25], ['Baby Blanket', '🧸', 12, 80]] },
  { key: 'kitchen', words: ['Kitchen', 'Cookware', 'Chef', 'Kitchen Co.'], icon: '🍳', color: '#b91c1c', t: [
    ['Frying Pan', '🍳', 15, 200], ['Knife Set', '🔪', 25, 600], ['Blender', '🥤', 30, 500], ['Teapot', '🫖', 15, 150], ['Plates', '🍽️', 10, 300], ['Spoons', '🥄', 4, 60]] },
];
const KIND_BY_KEY = Object.fromEntries(KINDS.map(k => [k.key, k]));
const PREFIXES = ['Sunny', 'Happy', 'Golden', 'Urban', 'Super', 'Royal', 'Lucky', 'Bright', 'Blue Sky', 'Corner', 'Main Street', 'Star', 'Rainbow',
  'Little', 'Big', 'Planet', 'Magic', 'Fresh', 'Cozy', 'Mega', 'Silver', 'Maple', 'Ocean', 'Mountain', 'City', 'Galaxy', 'Rocket', 'Cloud Nine',
  'Sunrise', 'Moonlight', 'Velvet', 'Crystal', 'Diamond', 'Turbo', 'Happy Days', 'Wonder', 'Peak', 'Harbor', 'Evergreen', 'Lighthouse'];
const COLORS = ['', 'Red', 'Blue', 'Green', 'Black', 'White', 'Pink', 'Purple', 'Gold', 'Silver', 'Orange', 'Yellow'];
const MODS = [['', 1], ['Mini', 0.55], ['Classic', 1], ['Deluxe', 1.6], ['Pro', 2.1], ['Kids', 0.7], ['XL', 1.4], ['Limited Edition', 2.8],
  ['2-Pack', 1.85], ['Travel', 0.8], ['Collector\'s', 3.5], ['Family Size', 1.5], ['Ultra', 2.4], ['Vintage', 1.9]];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Real-looking prices: $x.99 under $100, $x9.99 under $1,000, whole tens or hundreds above.
function realPrice(d) {
  if (d < 1) return Math.max(29, Math.round(d * 100 / 10) * 10 - 1);
  if (d < 100) return Math.round(Math.max(1, Math.floor(d)) * 100 + 99);
  if (d < 1000) return (Math.floor(d / 10) * 10 + 9) * 100 + 99;
  if (d < 100000) return Math.round(d / 10) * 10 * 100;
  return Math.round(d / 1000) * 1000 * 100;
}

const infoCache = new Map(), itemCache = new Map();
function remember(cache, key, val) { if (cache.size > 200) cache.delete(cache.keys().next().value); cache.set(key, val); return val; }

// Shop i (0-based): { index, number, name, icon, color, kind, count }
export function shopInfo(i) {
  if (infoCache.has(i)) return infoCache.get(i);
  const r = mulberry(i * 2654435761 + 17);
  const count = 7 + Math.floor(r() * 994);
  if (i < CURATED.length) {
    const c = CURATED[i];
    return remember(infoCache, i, { index: i, number: i + 1, name: c.name, icon: c.icon, color: c.color, kind: KIND_BY_KEY[c.id], count: Math.max(count, c.items.length) });
  }
  const kind = KINDS[Math.floor(r() * KINDS.length)];
  const name = PREFIXES[Math.floor(r() * PREFIXES.length)] + ' ' + kind.words[Math.floor(r() * kind.words.length)];
  return remember(infoCache, i, { index: i, number: i + 1, name, icon: kind.icon, color: kind.color, kind, count });
}

// Every item in shop i: { id, name, icon, cents }
export function shopItems(i) {
  if (itemCache.has(i)) return itemCache.get(i);
  const info = shopInfo(i), kind = info.kind, T = kind.t.length;
  const out = i < CURATED.length ? CURATED[i].items.slice() : [];
  const seen = new Set(out.map(it => it.name));
  const combos = T * COLORS.length * MODS.length;
  for (let j = 0; out.length < info.count && j < 5000; j++) {
    const [noun, icon, lo, hi] = kind.t[j % T];
    const color = COLORS[Math.floor(j / T) % COLORS.length], [mod, mult] = MODS[Math.floor(j / (T * COLORS.length)) % MODS.length];
    const series = Math.floor(j / combos);
    const name = [mod, color, noun].filter(Boolean).join(' ') + (series ? ` Series ${series + 1}` : '');
    if (seen.has(name)) continue;
    seen.add(name);
    const r = mulberry(i * 7919 + j * 104729 + 3);
    const base = lo * Math.pow(hi / lo, r());
    out.push({ id: `g${i}.${j}`, name, icon, cents: realPrice(base * mult) });
  }
  return remember(itemCache, i, out);
}

// Looks up any item by id, for showing what a player owns.
export function itemById(id) {
  const m = /^g(\d+)\.(\d+)$/.exec(id);
  if (m) return shopItems(+m[1]).find(it => it.id === id) || null;
  for (let i = 0; i < CURATED.length; i++) { const it = CURATED[i].items.find(x => x.id === id); if (it) return it; }
  return null;
}
