import "../global.css"; // Impor CSS Tailwind di sini agar berlaku global
import { Slot } from "expo-router";

export default function RootLayout() {
  // Slot akan otomatis merender index.web.tsx / index.android.tsx / index.ios.tsx
  return <Slot />;
}