import { Gamepad2, CircleDot, Car, Joystick, Swords, Trophy, type LucideIcon } from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  "gamepad-2": Gamepad2,
  "circle-dot": CircleDot,
  car: Car,
  joystick: Joystick,
  swords: Swords,
  trophy: Trophy,
};

export function GameIcon({
  icon,
  className,
  style,
}: {
  icon?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = (icon && ICON_MAP[icon]) || Gamepad2;
  return <Icon className={className} style={style} />;
}
