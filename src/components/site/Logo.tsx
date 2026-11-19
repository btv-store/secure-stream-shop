import { Link } from "@tanstack/react-router";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className={`font-display font-extrabold tracking-tight ${small ? "text-base" : "text-xl"}`} aria-label="BTV Stick — início">
      BTV<span className="text-primary">STICK</span>
    </Link>
  );
}
