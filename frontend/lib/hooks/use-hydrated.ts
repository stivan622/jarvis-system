import { useEffect, useState } from "react";

/**
 * Zustand の persist ミドルウェアが localStorage からの読み込みを完了するのを待つ。
 * SSR / ハイドレーション不一致を防ぐため、初回マウント後に true を返す。
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
