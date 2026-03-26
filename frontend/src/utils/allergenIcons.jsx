import {
  GiWheat,
  GiCrab,
  GiFishbone,
  GiPeanut,
  GiMilkCarton,
  GiAlmond,
  GiMussel,
} from "react-icons/gi";
import {
  TbEgg,
  TbPlant,
  TbDroplet,
  TbSeeding,
} from "react-icons/tb";
import { LuBean } from "react-icons/lu";
import { PiFlowerTulipBold } from "react-icons/pi";
import { MdWarningAmber } from "react-icons/md";

/**
 * Maps allergen names to an icon and label.
 */
const ALLERGEN_MAP = {
  gluten:      { icon: GiWheat,          label: "Gluten" },
  crustaceans: { icon: GiCrab,           label: "Crustaceans" },
  eggs:        { icon: TbEgg,            label: "Eggs" },
  fish:        { icon: GiFishbone,       label: "Fish" },
  peanuts:     { icon: GiPeanut,         label: "Peanuts" },
  soybeans:    { icon: LuBean,           label: "Soybeans" },
  dairy:       { icon: GiMilkCarton,     label: "Dairy" },
  "tree nuts": { icon: GiAlmond,         label: "Tree Nuts" },
  celery:      { icon: TbPlant,          label: "Celery" },
  mustard:     { icon: TbSeeding,        label: "Mustard" },
  sesame:      { icon: TbDroplet,        label: "Sesame" },
  sulphites:   { icon: MdWarningAmber,   label: "Sulphites" },
  lupin:       { icon: PiFlowerTulipBold,label: "Lupin" },
  molluscs:    { icon: GiMussel,         label: "Molluscs" },
};

export function getAllergenInfo(name) {
  const key = (name ?? "").toLowerCase().trim();
  const entry = ALLERGEN_MAP[key];
  if (entry) return { Icon: entry.icon, label: entry.label };
  return { Icon: MdWarningAmber, label: name };
}

/**
 * Turns allergen array into string for frontend display
 */
export function formatAllergenList(allergens) {
  if (!allergens || allergens.length === 0) return null;
  const names = allergens.map((a) => {
    const info = getAllergenInfo(a.name);
    return info.label;
  });
  return `Contains: ${names.join(", ")}`;
}
