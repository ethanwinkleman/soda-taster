import {
  CupSoda, Coffee, Wine, Beer, GlassWater, Droplets,
  Snowflake, Flame, Zap, Sun, Moon, Leaf,
  Trophy, Star, Heart, Crown, Gem, Award,
  FlaskConical, Candy, IceCream, Sparkles, Package, Archive,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type IconComponent = React.FC<LucideProps>;

export const STASH_ICON_DEFS: { name: string; Icon: IconComponent }[] = [
  { name: 'CupSoda',      Icon: CupSoda },
  { name: 'Coffee',       Icon: Coffee },
  { name: 'Wine',         Icon: Wine },
  { name: 'Beer',         Icon: Beer },
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
