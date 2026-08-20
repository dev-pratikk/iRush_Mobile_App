import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, router } from 'expo-router';

export interface UseBackHandlerOptions {
  /**
   * Boolean flag indicating whether a modal, overlay, or search drawer is currently open.
   * When true, pressing back dismisses the modal instead of navigating away.
   */
  modalVisible?: boolean;
  /**
   * Callback to dismiss/close the open modal when native back is pressed.
   */
  onDismissModal?: () => void;
}

/**
 * `useBackHandler` — Focus-scoped native back handler for Expo Router + React Native.
 *
 * Uses a live-ref pattern so the BackHandler subscription is only created /
 * destroyed when the screen gains / loses focus, but always reads the LATEST
 * value of `modalVisible` via refs.  This prevents the classic stale-closure
 * bug where pressing back while a modal is open calls `router.back()` because
 * the handler was registered when `modalVisible` was still `false`.
 *
 * Focus-scoped via `useFocusEffect`: only the active (focused) screen handles
 * the back event — background screens in the stack are never affected.
 */
export function useBackHandler({
  modalVisible,
  onDismissModal,
}: UseBackHandlerOptions = {}) {
  // Live refs — updated every render so the BackHandler always sees fresh values
  // without needing to re-register the subscription.
  const modalVisibleRef = useRef<boolean>(false);
  const onDismissModalRef = useRef<(() => void) | undefined>(undefined);

  // Update refs synchronously during render (safe — we only read, never write
  // state from inside the BackHandler callback).
  modalVisibleRef.current = modalVisible ?? false;
  onDismissModalRef.current = onDismissModal;

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        // Priority 1: Dismiss active modal / overlay — do NOT navigate away.
        // Uses ref so the value is always fresh even if this callback is stale.
        if (modalVisibleRef.current && onDismissModalRef.current) {
          onDismissModalRef.current();
          return true; // consumed; suppress default back action
        }

        // Priority 2: Default navigation — let the Stack navigator handle it.
        // router.back() correctly pops detail screens off the Stack, returning
        // the user to their parent screen (e.g. all-quotes → quotes).
        router.back();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => subscription.remove();
    }, []) // Empty — subscription registered/removed only on focus change; values
            // are always fresh via refs above.
  );
}
