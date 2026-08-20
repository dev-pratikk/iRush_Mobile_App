import { Stack } from 'expo-router';
import { useThemeColors } from '../../context/ThemeContext';

/**
 * (dashboard) Stack layout.
 *
 * The true Drawer navigator lives inside the (drawer) sub-group and
 * only contains the 4 top-level menu screens (index, orders, quotes, ar, settings).
 *
 * All "detail" / "child" screens (all-quotes, quote-details, all-orders,
 * order-details, pending-orders, partial-orders, etc.) are registered here
 * as Stack.Screen entries so that hardware/gesture back naturally pops them
 * off the stack — exactly like a normal mobile app.
 */
export default function DashboardStackLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      {/* ── Drawer group (menu-level screens) ── */}
      <Stack.Screen name="(drawer)" options={{ headerShown: false, animation: 'fade' }} />

      {/* ── Child / detail screens ── */}
      <Stack.Screen name="all-quotes"              options={{ headerShown: false }} />
      <Stack.Screen name="quote-details"           options={{ headerShown: false }} />
      <Stack.Screen name="all-orders"              options={{ headerShown: false }} />
      <Stack.Screen name="order-details"           options={{ headerShown: false }} />
      <Stack.Screen name="pending-orders"          options={{ headerShown: false }} />
      <Stack.Screen name="partial-orders"          options={{ headerShown: false }} />
      <Stack.Screen name="quotes-by-salesperson"   options={{ headerShown: false }} />
      <Stack.Screen name="quotes-by-service-type"  options={{ headerShown: false }} />
      <Stack.Screen name="quotes-to-orders"        options={{ headerShown: false }} />
      <Stack.Screen name="notifications"           options={{ headerShown: false }} />
      <Stack.Screen name="new-customers"           options={{ headerShown: false }} />
      <Stack.Screen name="invoices"                options={{ headerShown: false }} />
      <Stack.Screen name="reports"                 options={{ headerShown: false }} />
      <Stack.Screen name="all-ar"                  options={{ headerShown: false }} />
      <Stack.Screen name="ar-details"               options={{ headerShown: false }} />
    </Stack>
  );
}

