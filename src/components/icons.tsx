import { type SVGProps } from "react";

/**
 * Lightweight, dependency-free line-icon set (Feather/Lucide style).
 * Stroke-based, inherits `currentColor`, sized via `width/height` (default 20).
 * Used everywhere instead of emoji to keep the UI premium and consistent.
 */

export type IconName =
  | "home"
  | "users"
  | "user"
  | "package"
  | "receipt"
  | "wallet"
  | "gift"
  | "chart"
  | "check"
  | "checkCircle"
  | "clock"
  | "trash"
  | "edit"
  | "eye"
  | "search"
  | "printer"
  | "plus"
  | "logout"
  | "menu"
  | "close"
  | "alert"
  | "trendingUp"
  | "coins"
  | "target"
  | "arrowLeft"
  | "arrowRight"
  | "info"
  | "lock"
  | "shield"
  | "sparkles"
  | "inbox"
  | "chevronRight"
  | "download";

const PATHS: Record<IconName, JSX.Element> = {
  home: (
    <path d="M3 10.5 12 4l9 6.5M5.5 9.5V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5" />
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.6a3.2 3.2 0 0 1 0 5.3M17.5 19.5a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1H6.5A2.5 2.5 0 0 1 4 7.5Z" />
      <path d="M4 7.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2H16a2 2 0 0 1 0-4h4V8" />
      <circle cx="16.5" cy="13" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  gift: (
    <>
      <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z" />
      <path d="M3 8h18v3H3zM12 8v13M12 8S10.5 4 8.3 4.6C6.8 5 7 7.5 9 8h3Zm0 0s1.5-4 3.7-3.4C17.2 5 17 7.5 15 8h-3Z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <rect x="7.5" y="11" width="3" height="6" rx="0.5" />
      <rect x="13.5" y="7" width="3" height="10" rx="0.5" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 11 15.5 16 9.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="M14 6l4 4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4h10v5" />
      <path d="M7 18H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v6H7zM16 12.5h0.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: (
    <>
      <path d="M14 7V5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (
    <>
      <path d="M12 3.5 21 19H3l9-15.5Z" />
      <path d="M12 9.5v4M12 16.5h0.01" />
    </>
  ),
  trendingUp: <path d="M3 16.5 9 10l3.5 3.5L21 5m0 0h-5m5 0v5" />,
  coins: (
    <>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.6" />
      <path d="M3.5 7v4c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6V7" />
      <path d="M9 13.5v3.4c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-6" />
      <ellipse cx="14.5" cy="10.4" rx="5.5" ry="2.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  arrowLeft: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  arrowRight: <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h0.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  shield: <path d="M12 3 5 6v5c0 4.5 3 7.5 7 10 4-2.5 7-5.5 7-10V6l-7-3Z" />,
  sparkles: (
    <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM18.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z" />
  ),
  inbox: (
    <>
      <path d="M3.5 13 6 5.5a1 1 0 0 1 1-.7h10a1 1 0 0 1 1 .7L20.5 13v5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5Z" />
      <path d="M3.5 13H8a1 1 0 0 1 1 1 1 1 0 0 0 1 1h4a1 1 0 0 0 1-1 1 1 0 0 1 1-1h4.5" />
    </>
  ),
  chevronRight: <path d="m9 6 6 6-6 6" />,
  download: <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />,
};

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
  ...rest
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
