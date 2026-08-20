import { useRef, useCallback } from 'react';
import { FlatList, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';

const scrollOffsetCache = new Map<string, number>();

/**
 * `useScrollRestoration` — Preserves and restores scroll position during reverse navigation.
 *
 * Usage:
 * const { listRef, handleScroll } = useScrollRestoration<FlatList>('all-quotes');
 * <FlatList ref={listRef} onScroll={handleScroll} ... />
 */
export function useScrollRestoration<T extends FlatList | ScrollView>(screenKey: string) {
  const listRef = useRef<T | null>(null);
  const currentOffsetRef = useRef<number>(scrollOffsetCache.get(screenKey) ?? 0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      currentOffsetRef.current = y;
      scrollOffsetCache.set(screenKey, y);
    },
    [screenKey]
  );

  useFocusEffect(
    useCallback(() => {
      const cachedY = scrollOffsetCache.get(screenKey);
      if (cachedY != null && cachedY > 0 && listRef.current) {
        // Delay slightly for layout rendering before scrolling
        const timer = setTimeout(() => {
          if (listRef.current) {
            if ('scrollToOffset' in listRef.current && typeof listRef.current.scrollToOffset === 'function') {
              (listRef.current as FlatList).scrollToOffset({ offset: cachedY, animated: false });
            } else if ('scrollTo' in listRef.current && typeof listRef.current.scrollTo === 'function') {
              (listRef.current as ScrollView).scrollTo({ y: cachedY, animated: false });
            }
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [screenKey])
  );

  return {
    listRef,
    handleScroll,
    getSavedOffset: () => scrollOffsetCache.get(screenKey) ?? 0,
  };
}
