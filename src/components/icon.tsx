import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { Love } from '@/components/auth-screens';

type Glyph = { ios: SFSymbol; android: AndroidSymbol };

const glyphs = {
  home: { ios: 'house', android: 'home' },
  homeFill: { ios: 'house.fill', android: 'home' },
  discover: { ios: 'safari', android: 'explore' },
  discoverFill: { ios: 'safari.fill', android: 'explore' },
  heart: { ios: 'heart', android: 'favorite_border' },
  heartFill: { ios: 'heart.fill', android: 'favorite' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'forum' },
  chatFill: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum' },
  person: { ios: 'person.crop.circle', android: 'person' },
  personFill: { ios: 'person.crop.circle.fill', android: 'person' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  tune: { ios: 'slider.horizontal.3', android: 'tune' },
  shield: { ios: 'checkmark.shield', android: 'verified_user' },
  camera: { ios: 'camera', android: 'add_a_photo' },
  edit: { ios: 'pencil', android: 'edit' },
  eye: { ios: 'eye', android: 'visibility' },
  lock: { ios: 'lock', android: 'lock' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  clock: { ios: 'clock', android: 'schedule' },
  pin: { ios: 'mappin.and.ellipse', android: 'location_on' },
  work: { ios: 'briefcase', android: 'work' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  admin: { ios: 'person.badge.shield.checkmark', android: 'admin_panel_settings' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof glyphs;

export function Icon({ name, size = 22, color = Love.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  const glyph = glyphs[name];
  return <SymbolView name={{ ios: glyph.ios, android: glyph.android, web: glyph.android }} size={size} tintColor={color} />;
}
