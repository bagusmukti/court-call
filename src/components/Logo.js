import Image from "next/image";

export default function Logo({ size = 44 }) {
  return (
    <Image
      src="/pens-logo-circle.png"
      alt="PENS Badminton Club"
      width={size}
      height={size}
      priority
      className="block shrink-0 rounded-full shadow-[0_0_0_2px_rgba(244,245,247,.18)]"
    />
  );
}
