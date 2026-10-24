import type { ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormButton, Love, serif } from '@/components/auth-screens';
import { Icon, type IconName } from '@/components/icon';

export function LoadingScreen() {
  return <View style={s.loading}><ActivityIndicator color={Love.wine} accessibilityLabel="Loading" /></View>;
}

/** Root of a tab screen. The tab bar owns the bottom inset, so only top/sides are padded here. */
export function TabScreen({ children, refreshing, onRefresh }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={s.tabContent}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Love.wine} colors={[Love.wine]} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/** Root of a screen pushed over the tabs (settings, editors). Includes a back header. */
export function StackScreen({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.stackHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={goBack}
          style={({ pressed }) => [s.headerButton, pressed && s.pressed]}>
          <Icon name="back" size={22} color={Love.ink} />
        </Pressable>
        <Text style={s.stackTitle} numberOfLines={1} accessibilityRole="header">{title}</Text>
        <View style={s.headerButton}>{right}</View>
      </View>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.stackContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PageTitle({ eyebrow, title, subtitle, action }: {
  eyebrow?: string; title: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <View style={s.titleBlock}>
      <View style={s.titleRow}>
        <View style={s.flex}>
          {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
          <Text style={s.title} accessibilityRole="header">{title}</Text>
        </View>
        {action}
      </View>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function IconButton({ icon, label, onPress, tone = 'light', size = 44, disabled }: {
  icon: IconName; label: string; onPress: () => void; tone?: 'light' | 'wine' | 'outline'; size?: number; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [s.iconButton, { width: size, height: size, borderRadius: size / 2 },
        tone === 'wine' && s.iconButtonWine, tone === 'outline' && s.iconButtonOutline,
        disabled && s.disabled, pressed && s.pressed]}>
      <Icon name={icon} size={Math.round(size * 0.46)} color={tone === 'wine' ? Love.white : Love.wine} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={s.sectionLabel}>{children.toUpperCase()}</Text>;
}

export function Notice({ tone, message, actionLabel, onAction }: {
  tone: 'success' | 'error' | 'info'; message: string | null | undefined; actionLabel?: string; onAction?: () => void;
}) {
  if (!message) return null;
  const palette = tone === 'success' ? [Love.successBg, Love.success] : tone === 'error' ? [Love.errorBg, Love.error] : [Love.infoBg, Love.wine];
  return (
    <View style={[s.notice, { backgroundColor: palette[0] }]} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <Text style={[s.noticeText, { color: palette[1] }]}>{message}</Text>
      {actionLabel && onAction ? <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
        <Text style={[s.noticeAction, { color: palette[1] }]}>{actionLabel}</Text>
      </Pressable> : null}
    </View>
  );
}

export function EmptyState({ icon, title, body, actionLabel, onAction, secondaryLabel, onSecondary }: {
  icon: IconName; title: string; body: string; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void;
}) {
  return (
    <Card style={s.empty}>
      <View style={s.emptyIcon}><Icon name={icon} size={30} color={Love.wine} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {actionLabel && onAction ? <View style={s.emptyAction}><FormButton text={actionLabel} onPress={onAction} /></View> : null}
      {secondaryLabel && onSecondary ? <Pressable onPress={onSecondary} hitSlop={8} accessibilityRole="button">
        <Text style={s.link}>{secondaryLabel}</Text>
      </Pressable> : null}
    </Card>
  );
}

/** Shown on Discover/Likes/Matches until the account has passed every safety check. */
export function LockedState({ feature }: { feature: string }) {
  return <EmptyState icon="lock" title="Almost there."
    body={feature + ' unlocks once your profile, photo and identity checks are approved. This keeps LoveBind a verified, safer space for everyone.'}
    actionLabel="See what's left" onAction={() => router.navigate('/home')} />;
}

export function Avatar({ name, uri, size = 56 }: { name: string; uri?: string | null; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '♡';
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[s.avatar, shape]} accessibilityIgnoresInvertColors />;
  return <View style={[s.avatar, shape]}><Text style={[s.initials, { fontSize: size * 0.36 }]}>{initials}</Text></View>;
}

export function Tag({ label }: { label: string }) {
  return <Text style={s.tag}>{label}</Text>;
}

export function StatusPill({ tone, label }: { tone: 'success' | 'pending' | 'muted'; label: string }) {
  const style = tone === 'success' ? s.pillSuccess : tone === 'pending' ? s.pillPending : s.pillMuted;
  const color = tone === 'success' ? Love.success : tone === 'pending' ? Love.wine : Love.muted;
  return <View style={[s.pill, style]}><Text style={[s.pillText, { color }]}>{label}</Text></View>;
}

export function ListRow({ icon, label, detail, href, onPress, right, danger, last }: {
  icon: IconName; label: string; detail?: string; href?: Href; onPress?: () => void; right?: ReactNode; danger?: boolean; last?: boolean;
}) {
  const action = onPress ?? (href ? () => router.push(href) : undefined);
  return (
    <Pressable accessibilityRole={action ? 'button' : undefined} disabled={!action} onPress={action}
      style={({ pressed }) => [s.row, !last && s.rowDivider, pressed && s.rowPressed]}>
      <View style={[s.rowIcon, danger && { backgroundColor: Love.errorBg }]}>
        <Icon name={icon} size={19} color={danger ? Love.error : Love.wine} />
      </View>
      <View style={s.flex}>
        <Text style={[s.rowLabel, danger && { color: Love.error }]}>{label}</Text>
        {detail ? <Text style={s.rowDetail}>{detail}</Text> : null}
      </View>
      {right ?? (action && !danger ? <Icon name="chevron" size={16} color={Love.mutedSoft} /> : null)}
    </Pressable>
  );
}

export const memberStyles = StyleSheet.create({
  link: { color: Love.wine, fontWeight: '700', fontSize: 14 },
  body: { color: Love.muted, fontSize: 14, lineHeight: 22 },
  serifHeading: { fontFamily: serif, fontSize: 26, lineHeight: 32, color: Love.ink },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Love.paper },
  loading: { flex: 1, backgroundColor: Love.paper, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  tabContent: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32, gap: 16 },
  stackHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Love.line },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stackTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Love.ink },
  stackContent: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 22, paddingBottom: 40, gap: 18 },
  titleBlock: { gap: 8, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  eyebrow: { fontSize: 11, color: Love.wine, letterSpacing: 1.6, fontWeight: '800', marginBottom: 6 },
  title: { fontFamily: serif, fontSize: 36, lineHeight: 42, color: Love.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 22, color: Love.muted },
  iconButton: { backgroundColor: Love.wineSoft, alignItems: 'center', justifyContent: 'center' },
  iconButtonWine: { backgroundColor: Love.wine },
  iconButtonOutline: { backgroundColor: Love.white, borderWidth: 1, borderColor: Love.line },
  card: { backgroundColor: Love.white, borderWidth: 1, borderColor: Love.line, borderRadius: 18, padding: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: Love.muted, marginTop: 10 },
  notice: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  noticeText: { fontSize: 13, lineHeight: 20 },
  noticeAction: { fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 22, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Love.wineSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: serif, fontSize: 26, lineHeight: 32, color: Love.ink, textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 22, color: Love.muted, textAlign: 'center' },
  emptyAction: { alignSelf: 'stretch', marginTop: 6 },
  link: { color: Love.wine, fontWeight: '700', fontSize: 14, paddingVertical: 6 },
  avatar: { backgroundColor: Love.wineSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: serif, color: Love.wine },
  tag: { paddingVertical: 7, paddingHorizontal: 12, backgroundColor: Love.wineSoft, color: Love.wine, borderRadius: 16, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pillSuccess: { backgroundColor: Love.successBg },
  pillPending: { backgroundColor: Love.wineSoft },
  pillMuted: { backgroundColor: Love.sand },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 60 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Love.line },
  rowPressed: { backgroundColor: Love.paper },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Love.wineSoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Love.ink },
  rowDetail: { fontSize: 12, lineHeight: 17, color: Love.muted, marginTop: 2 },
});
