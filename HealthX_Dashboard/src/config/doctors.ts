import type { Guide, TripStyle } from "@/types";

export const TRIP_STYLES: TripStyle[] = [
  { id: "city", label: "City break" },
  { id: "adventure", label: "Adventure" },
  { id: "food", label: "Food & culture" },
  { id: "family", label: "Family" },
  { id: "budget", label: "Budget" },
  { id: "luxury", label: "Luxury" },
];

export const GUIDES: Guide[] = [
  {
    id: 1,
    name: "Elena Voss",
    styleId: "city",
    style: "City break",
    avatarUrl: "/doctor1.jpeg",
    email: "work.sanskarjain@gmail.com",
  },
  {
    id: 2,
    name: "Marcus Chen",
    styleId: "adventure",
    style: "Adventure",
    avatarUrl: "/doctor2.jpeg",
    email: "samarthshukla150604@gmail.com",
  },
  {
    id: 3,
    name: "Anya Sharma",
    styleId: "family",
    style: "Family",
    avatarUrl: "/doctor3.jpeg",
    email: "anya.sharma@example.com",
  },
  {
    id: 4,
    name: "James Ortiz",
    styleId: "food",
    style: "Food & culture",
    avatarUrl: "/doctor1.jpeg",
    email: "james.ortiz@example.com",
  },
  {
    id: 5,
    name: "Sara Kim",
    styleId: "luxury",
    style: "Luxury",
    avatarUrl: "/doctor2.jpeg",
    email: "sarah.kim@example.com",
  },
  {
    id: 6,
    name: "Ravi Hayes",
    styleId: "budget",
    style: "Budget",
    avatarUrl: "/doctor3.jpeg",
    email: "robert.hayes@example.com",
  },
];

export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  let hour = 11;
  let minute = 0;
  while (hour < 19 || (hour === 19 && minute === 0)) {
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }
  return slots;
})();
