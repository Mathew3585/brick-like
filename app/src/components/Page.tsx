import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '@/lib/tone';
import { TAB_BAR_SPACE } from '@/theme';

/** Safe-area page with the house gutter; scrolls unless told otherwise. */
export function Page({
  children,
  scroll = true,
  tabBar = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  tabBar?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingTop: insets.top + 18,
    paddingHorizontal: 22,
    paddingBottom: tabBar ? insets.bottom + TAB_BAR_SPACE : insets.bottom + 20,
  };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: p.bg }, pad, style]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={[pad, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
