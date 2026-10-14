import { Archivo, Big_Shoulders } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

// The design's "Big Shoulders Display" now ships as the high optical size of
// "Big Shoulders"; globals.css pins opsz to the display cut.
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  adjustFontFallback: false,
});

export const metadata = {
  title: {
    default: "Court Call",
    template: "%s · Court Call",
  },
  description: "Court Call — sessions, courts and queues for PENS Badminton Club.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
