/** @typedef {{ name: string, price: number, info?: string }} MenuItem */
/** @typedef {{ name: string, items: MenuItem[] }} MenuCategory */

/** @type {MenuCategory[]} */
export const catalogPart1 = [
  {
    name: "Appetizers",
    items: [
      { name: "Miso Soup", price: 1.5 },
      { name: "Rice", price: 2.75 },
      { name: "Edamame", price: 5.5, info: "Japanese soy bean" },
      { name: "House Green Salad", price: 5.5 },
      { name: "Seaweed Salad", price: 5.5 },
      {
        name: "Spicy Tuna Salad",
        price: 12.95,
        info: "Tuna, avocado, cucumber with mixed green salad"
      },
      {
        name: "Salmon Salad",
        price: 14.95,
        info: "Wild salmon with avocado, mixed green salad"
      },
      {
        name: "Wakame Salad",
        price: 9.5,
        info: "Fresh seaweed marinated with crab meat, cucumber"
      },
      { name: "Goma ae", price: 5.5, info: "Spinach in sesame sauce" },
      { name: "Takoyaki", price: 6.95, info: "Deep fried octopus ball (6 pcs)" },
      { name: "Gyoza", price: 6.95, info: "Fried dumpling (6 pcs)" },
      { name: "Veggie Gyoza", price: 6.95, info: "6 pcs" },
      { name: "Prawn Tempura", price: 13.95 }
    ]
  },
  {
    name: "Sunomono",
    items: [
      {
        name: "Cucumber Sunomono",
        price: 4.95,
        info: "Sweet vinegar sauce with vermicelli"
      },
      {
        name: "Ebi Sunomono",
        price: 5.95,
        info: "Sweet vinegar sauce with vermicelli"
      },
      {
        name: "Tako Sunomono",
        price: 5.95,
        info: "Sweet vinegar sauce with vermicelli"
      }
    ]
  },
  {
    name: "Sashimi",
    items: [
      { name: "Spicy Tuna Sashimi", price: 9.95 },
      { name: "Spicy Salmon Sashimi", price: 10.95 },
      { name: "Appetizer Sashimi", price: 12.95, info: "7 pcs" },
      { name: "Salmon Sashimi", price: 13.95, info: "Sockeye (5 pcs)" },
      { name: "Tuna Sashimi", price: 12.95, info: "6 pcs" },
      { name: "Toro Sashimi", price: 12.95, info: "5 pcs" },
      { name: "Tako Sashimi", price: 12.95, info: "5 pcs" },
      { name: "Tuna & Salmon Sashimi", price: 13.95, info: "6 pcs" },
      { name: "Tuna Tataki", price: 14.95, info: "8 pcs" },
      {
        name: "Rose Sashimi",
        price: 18.95,
        info: "Salmon & tobiko, scallop sauce"
      },
      {
        name: "Assorted Sashimi",
        price: 25.95,
        info: "Chef’s creation (14 pcs)"
      },
      {
        name: "Toro & Avocado Sashimi",
        price: 14.95,
        info: "With ponzu sauce"
      },
      {
        name: "Sashimi Dinner",
        price: 35.0,
        info: "16 pcs assorted sashimi, served with miso and rice"
      },
      {
        name: "Sashimi Dinner (Deluxe)",
        price: 55.0,
        info: "16 pcs assorted sashimi, served with miso and rice"
      }
    ]
  },
  {
    name: "Udon",
    items: [
      { name: "Vegetable Udon", price: 11.95 },
      { name: "Beef Udon", price: 12.95 },
      { name: "Chicken Udon", price: 12.95 },
      { name: "Seafood Udon", price: 13.95 }
    ]
  },
  {
    name: "Donburi",
    items: [
      { name: "Beef Donburi", price: 12.95 },
      { name: "Chicken Donburi", price: 11.95 },
      { name: "Unagi Donburi", price: 17.95, info: "B.B.Q. eel" },
      {
        name: "Oyako Donburi",
        price: 12.95,
        info: "Chicken, egg, onion over rice"
      }
    ]
  },
  {
    name: "Sushi Rice Bowl",
    items: [
      { name: "Tuna Donburi", price: 13.95 },
      { name: "Salmon Donburi", price: 15.45 },
      { name: "Tuna & Salmon Donburi", price: 15.45 },
      { name: "Chirashi Donburi", price: 15.95, info: "Assorted raw fish" },
      { name: "Salmon & Toro Donburi", price: 16.95 }
    ]
  },
  {
    name: "Nigiri Sushi",
    items: [
      { name: "Inari", price: 2.75, info: "Bean curd" },
      { name: "Tamago", price: 2.75, info: "Egg" },
      { name: "Tuna", price: 3.2 },
      { name: "Ebi", price: 3.2, info: "Cooked prawn" },
      { name: "Ika", price: 2.75, info: "Squid" },
      { name: "Masago", price: 2.75, info: "Smelt roe" },
      { name: "Saba", price: 2.75 },
      { name: "Seaweed Salad", price: 2.75 },
      { name: "Ama ebi", price: 3.2 },
      { name: "Chopped Scallop", price: 3.2, info: "Scallop with tobiko" },
      { name: "Salmon", price: 3.2, info: "Sockeye" },
      { name: "Tako", price: 3.2, info: "Octopus" },
      { name: "Tobiko", price: 3.2, info: "Flying fish roe" },
      { name: "Toro", price: 3.2, info: "Tuna belly" },
      { name: "Unagi", price: 3.5, info: "B.B.Q. eel" },
      { name: "Aji", price: 2.95 }
    ]
  }
];
