import {
  createLucideIcon,
  CupSoda, Coffee, Wine, GlassWater, Droplets,
  Snowflake, Flame, Zap, Sun, Moon, Leaf,
  Trophy, Star, Heart, Crown, Gem, Award,
  FlaskConical, Candy, IceCream, Sparkles, Package, Archive,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type IconComponent = React.FC<LucideProps>;

// Lucide has no six-pack, so this is drawn to their conventions (24×24, stroke-only,
// width 2, round caps) via their own factory so it accepts the same props as the rest.
// Three columns over two rows reads as six cans; the squared loop on top is the carrier
// handle. Kept deliberately sparse — StashIcon renders at 12px in the sidebar.
const SixPack = createLucideIcon('six-pack', [
  ['rect', { x: '3', y: '8', width: '18', height: '12', rx: '1.5', key: 'carton' }],
  ['path', { d: 'M9.5 8V6.5a2.5 2.5 0 0 1 5 0V8', key: 'handle' }],
  ['path', { d: 'M9 8v12', key: 'split-left' }],
  ['path', { d: 'M15 8v12', key: 'split-right' }],
  ['path', { d: 'M3 14h18', key: 'split-row' }],
]);

export const STASH_ICON_DEFS: { name: string; Icon: IconComponent }[] = [
  { name: 'CupSoda',      Icon: CupSoda },
  { name: 'SixPack',      Icon: SixPack },
  { name: 'Coffee',       Icon: Coffee },
  { name: 'Wine',         Icon: Wine },
  { name: 'GlassWater',   Icon: GlassWater },
  { name: 'Droplets',     Icon: Droplets },
  { name: 'Snowflake',    Icon: Snowflake },
  { name: 'Flame',        Icon: Flame },
  { name: 'Zap',          Icon: Zap },
  { name: 'Sun',          Icon: Sun },
  { name: 'Moon',         Icon: Moon },
  { name: 'Leaf',         Icon: Leaf },
  { name: 'Trophy',       Icon: Trophy },
  { name: 'Star',         Icon: Star },
  { name: 'Heart',        Icon: Heart },
  { name: 'Crown',        Icon: Crown },
  { name: 'Gem',          Icon: Gem },
  { name: 'Award',        Icon: Award },
  { name: 'FlaskConical', Icon: FlaskConical },
  { name: 'Candy',        Icon: Candy },
  { name: 'IceCream',     Icon: IceCream },
  { name: 'Sparkles',     Icon: Sparkles },
  { name: 'Package',      Icon: Package },
  { name: 'Archive',      Icon: Archive },
];

const iconMap = new Map(STASH_ICON_DEFS.map((d) => [d.name, d.Icon]));

// stashes.icon stores the name as a string, so collections created before the soda
// rebrand still hold 'Beer'. Without this alias StashIcon would return null and those
// collections would silently lose their icon.
iconMap.set('Beer', SixPack);

interface Props {
  name: string;
  size?: number;
  className?: string;
}

export function StashIcon({ name, size = 18, className }: Props) {
  const Icon = iconMap.get(name);
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
