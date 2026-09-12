function Icon({ children, className, size = 18, ...rest }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Printer = (p) => (
  <Icon {...p}>
    <path d="M6.5 12H4.5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H5" />
    <rect x="6" y="3" width="12" height="2" rx="1" />
    <path d="M19.5 6H21a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1.5" />
    <rect x="5" y="12" width="14" height="9" rx="2" />
    <path d="M8 15h1M8 18h1M15 15h.01M15 18h.01" />
  </Icon>
)

export const Clock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)

export const Spool = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 4v1.5M12 18.5v1.5M4 12h1.5M18.5 12H20" />
  </Icon>
)

export const Coin = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M8.6 12h6.8M12 8.6V12m0 0v3.4" />
    <path d="M9.8 12c-.2-1 .3-1.7 1.3-1.7h1.8c1 0 1.5.7 1.3 1.7-.2 1-1 1.4-2.2 1.4-1.2 0-2-.4-2.2-1.4z" />
  </Icon>
)

export const Scale = (p) => (
  <Icon {...p}>
    <path d="M12 20V8" />
    <path d="M4 9h16v2.2L16.4 15H7.6L4 11.2V9z" />
    <path d="M12 3v5" />
    <path d="M9.5 5h5" />
    <path d="M8 20h8" />
  </Icon>
)

export const Layers = (p) => (
  <Icon {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 12.5l9 5 9-5" />
    <path d="M3 16.5l9 5 9-5" />
  </Icon>
)

export const Ring = (p) => (
  <Icon {...p}>
    <path d="M17 12a5 5 0 1 0-1.5 3.55" />
    <path d="M17.5 12v1.4" />
  </Icon>
)

export const Bag = (p) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 12a1.6 1.6 0 0 1-1.6 1.5H7.6A1.6 1.6 0 0 1 6 20L5 8z" />
    <path d="M8.5 8a3.5 3.5 0 0 1 7 0" />
  </Icon>
)

export const Bolt = (p) => (
  <Icon {...p}>
    <path d="M13 2L4.5 13.5H11l-1 8.5L19 10.5h-6.5L13 2z" />
  </Icon>
)

export const Tag = (p) => (
  <Icon {...p}>
    <path d="M3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h7L21 12.5l-6.5 6.5L3 11.5z" />
    <circle cx="8.5" cy="8.5" r="1.4" />
  </Icon>
)

export const Receipt = (p) => (
  <Icon {...p}>
    <path d="M5 3h14v18l-2.4-1.2L14.4 21l-2.4-1.2L9.6 21l-2.4-1.2L5 21V3z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Icon>
)

export const Chart = (p) => (
  <Icon {...p}>
    <path d="M4 21h16" />
    <path d="M6.5 21v-7h2.5v7" />
    <path d="M12.5 21V5h2.5v16" />
  </Icon>
)

export const Calc = (p) => (
  <Icon {...p}>
    <rect x="4.5" y="3" width="15" height="18" rx="2" />
    <path d="M8.5 7h7" />
    <path d="M8.5 12h2M13.5 12h2M8.5 15.5h2M13.5 15.5h2" />
  </Icon>
)

export const Cube = (p) => (
  <Icon {...p}>
    <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" />
    <path d="M12 11V2M12 11l8-4.5M12 11L4 6.5M12 20v-9" />
  </Icon>
)

export const Gear = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
  </Icon>
)

export const Refresh = (p) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20.5 3.5V8H16" />
  </Icon>
)

export const Lock = (p) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <path d="M12 15v2" />
  </Icon>
)

export const Spark = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
  </Icon>
)

export const ArrowLeft = (p) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)

export const Check = (p) => (
  <Icon {...p}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </Icon>
)

export const Box = (p) => (
  <Icon {...p}>
    <path d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Icon>
)

export const Icons = {
  Printer,
  Clock,
  Spool,
  Coin,
  Scale,
  Layers,
  Ring,
  Bag,
  Bolt,
  Tag,
  Receipt,
  Chart,
  Calc,
  Cube,
  Gear,
  Refresh,
  Lock,
  Spark,
  ArrowLeft,
  Check,
  Box,
}