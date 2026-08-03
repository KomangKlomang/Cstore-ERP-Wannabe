"use client";

import { useSearchParams } from "next/navigation";
import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * State filter yang bisa dipakai sebagai deep link (`/aset?kondisi=RUSAK`).
 *
 * Sebelumnya tiap halaman menyalin query string ke state lewat useEffect. Itu
 * membuat render pertama memakai filter kosong lalu langsung render ulang —
 * daftar sempat berkedip menampilkan semua data sebelum tersaring, dan React 19
 * menandainya sebagai cascading render.
 *
 * Di sini nilainya diselaraskan saat render memakai pola resmi React
 * "adjusting state when a prop changes", jadi render pertama sudah benar.
 * Query string yang kosong tidak menimpa pilihan user (sama seperti perilaku lama).
 */
export function useSearchParamState(
  key: string,
  allowed?: readonly string[],
): [string, Dispatch<SetStateAction<string>>] {
  const params = useSearchParams();
  const raw = params.get(key) ?? "";
  const fromUrl = !raw || (allowed && !allowed.includes(raw)) ? "" : raw;

  const [value, setValue] = useState(fromUrl);
  const [seen, setSeen] = useState(fromUrl);

  if (fromUrl !== seen) {
    setSeen(fromUrl);
    if (fromUrl) setValue(fromUrl);
  }

  return [value, setValue];
}
