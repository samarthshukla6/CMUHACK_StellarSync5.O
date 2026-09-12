import type { Avatar } from "@/types";

export const AVATARS: Avatar[] = [
  { src: "/male_child.svg", gender: "male", age: "child", label: "Male · Child" },
  { src: "/male_teenager.svg", gender: "male", age: "teenager", label: "Male · Teen" },
  { src: "/male_old.svg", gender: "male", age: "old", label: "Male · Senior" },
  { src: "/female_child.svg", gender: "female", age: "child", label: "Female · Child" },
  { src: "/female_teenager.svg", gender: "female", age: "teenager", label: "Female · Teen" },
  { src: "/female_old.svg", gender: "female", age: "old", label: "Female · Senior" },
];

export function findAvatar(gender: Avatar["gender"], age: Avatar["age"]): Avatar {
  return AVATARS.find((a) => a.gender === gender && a.age === age) ?? AVATARS[1];
}
