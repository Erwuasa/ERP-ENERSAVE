export function EnersaveLogo({
  className = "w-12 h-12",
  withText = false,
}: {
  className?: string
  withText?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 400 350"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="goldTrim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        <path
          d="M200,20 C310,20 340,60 340,160 C340,250 260,300 200,330 C140,300 60,250 60,160 C60,60 90,20 200,20 Z"
          fill="url(#shieldGrad)"
          stroke="url(#goldTrim)"
          strokeWidth="10"
        />

        <path
          d="M120,130 L170,130 L190,150"
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeOpacity="0.25"
          fill="none"
        />
        <circle cx="120" cy="130" r="4.5" fill="#fbbf24" fillOpacity="0.4" />
        <circle cx="190" cy="150" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path
          d="M280,130 L230,130 L210,150"
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeOpacity="0.25"
          fill="none"
        />
        <circle cx="280" cy="130" r="4.5" fill="#fbbf24" fillOpacity="0.4" />
        <circle cx="210" cy="150" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path
          d="M130,220 L170,220 L185,205"
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeOpacity="0.25"
          fill="none"
        />
        <circle cx="130" cy="220" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path
          d="M270,220 L230,220 L215,205"
          stroke="#fbbf24"
          strokeWidth="2.5"
          strokeOpacity="0.25"
          fill="none"
        />
        <circle cx="270" cy="220" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path
          d="M230,45 L130,195 L190,195 L155,305 L275,150 L205,150 Z"
          fill="url(#goldGrad)"
          stroke="#78350f"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </svg>
      {withText && (
        <span className="mt-3 text-2xl font-extrabold tracking-widest text-[#1e3a8a] dark:text-[#60a5fa] font-sans">
          ENERSAVE
        </span>
      )}
    </div>
  )
}
