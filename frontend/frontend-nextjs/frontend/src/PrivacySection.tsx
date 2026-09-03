"use client";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SpotlightButton } from "@/components/ui/SpotlightButton";

/* ─── Custom Icons ─── */
function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <path
          d="M50 10 C50 10 15 20 15 20 C15 55 15 75 50 95 C85 75 85 55 85 20 C85 20 50 10 50 10 Z"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M35 50 L45 62 L65 38"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function CpuIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <rect
          x="20"
          y="20"
          width="60"
          height="60"
          rx="12"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="3"
        />
        <rect
          x="35"
          y="35"
          width="30"
          height="30"
          rx="6"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <path
          d="M30 10 V20 M50 10 V20 M70 10 V20 M30 80 V90 M50 80 V90 M70 80 V90 M10 30 H20 M10 50 H20 M10 70 H20 M80 30 H90 M80 50 H90 M80 70 H90"
          stroke="url(#glassBase)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function GdprIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="3"
        />
        <text
          x="50"
          y="58"
          fill="#FFFFFF"
          fontFamily="-apple-system, sans-serif"
          fontWeight="800"
          fontSize="26"
          textAnchor="middle"
          style={{ filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.3))" }}
        >
          GDPR
        </text>
      </g>
    </svg>
  );
}

function ServerOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <rect
          x="25"
          y="15"
          width="50"
          height="20"
          rx="4"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <circle cx="35" cy="25" r="3" fill="#FFFFFF" />
        <circle cx="45" cy="25" r="3" fill="#FFFFFF" />

        <rect
          x="25"
          y="40"
          width="50"
          height="20"
          rx="4"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <circle cx="35" cy="50" r="3" fill="#FFFFFF" />
        <circle cx="45" cy="50" r="3" fill="#FFFFFF" />

        <rect
          x="25"
          y="65"
          width="50"
          height="20"
          rx="4"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <circle cx="35" cy="75" r="3" fill="#FFFFFF" />
        <circle cx="45" cy="75" r="3" fill="#FFFFFF" />

        <path
          d="M20 80 L80 20"
          stroke="url(#glassBase)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M20 80 L80 20"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <path
          d="M30 45 V30 C30 18 70 18 70 30 V45"
          stroke="url(#glassBase)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M30 45 V30 C30 18 70 18 70 30 V45"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="20"
          y="45"
          width="60"
          height="45"
          rx="8"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="3"
        />
        <circle cx="50" cy="62" r="6" fill="#FFFFFF" />
        <path d="M48 62 L46 75 H54 L52 62 Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

function ShieldLockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <path
          d="M50 10 C50 10 15 20 15 20 C15 55 15 75 50 95 C85 75 85 55 85 20 C85 20 50 10 50 10 Z"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M40 45 V35 C40 28 60 28 60 35 V45"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <rect
          x="34"
          y="45"
          width="32"
          height="26"
          rx="4"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <circle cx="50" cy="55" r="4" fill="#FFFFFF" />
        <path d="M49 55 L48 62 H52 L51 55 Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

function ShareOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <path
          d="M30 50 L70 25 M30 50 L70 75"
          stroke="url(#glassBase)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle
          cx="30"
          cy="50"
          r="12"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <circle
          cx="70"
          cy="25"
          r="12"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <circle
          cx="70"
          cy="75"
          r="12"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="2"
        />
        <path
          d="M20 80 L80 20"
          stroke="url(#glassBase)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M20 80 L80 20"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function BriefcaseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="glassBase"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="45.1%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id="glassEdge"
          x1="0"
          y1="0"
          x2="0"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="3"
            floodColor="#000000"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g filter="url(#glassShadow)">
        <path
          d="M38 30 V18 C38 12 62 12 62 18 V30"
          stroke="url(#glassBase)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M38 30 V18 C38 12 62 12 62 18 V30"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="15"
          y="30"
          width="70"
          height="55"
          rx="8"
          fill="url(#glassBase)"
          stroke="url(#glassEdge)"
          strokeWidth="3"
        />
        <path
          d="M15 45 Q 50 60 85 45"
          fill="none"
          stroke="url(#glassEdge)"
          strokeWidth="3"
        />
        <rect
          x="42"
          y="42"
          width="16"
          height="12"
          rx="3"
          fill="url(#glassBase)"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

const privacyPoints = [
  {
    text: "We don't train on your data.",
    icon: <ShieldIcon className="w-6 h-6 shrink-0 text-[#D4AF37]" />,
  },
  {
    text: "Processed & Stored Locally",
    icon: <CpuIcon className="w-6 h-6 shrink-0 text-[#D4AF37]" />,
  },
  {
    text: "GDPR compliant by design.",
    icon: <GdprIcon className="w-6 h-6 shrink-0" />,
  },
];

const badges = [
  {
    text: "Zero server logging",
    icon: <ServerOffIcon className="w-6 h-6 shrink-0" />,
  },
  {
    text: "End to end private",
    icon: <LockIcon className="w-6 h-6 shrink-0" />,
  },
  {
    text: "Encrypted at rest",
    icon: <ShieldLockIcon className="w-6 h-6 shrink-0" />,
  },
  {
    text: "No third-party sharing",
    icon: <ShareOffIcon className="w-6 h-6 shrink-0" />,
  },
  {
    text: "Enterprise grade",
    icon: <BriefcaseIcon className="w-6 h-6 shrink-0" />,
  },
];

const trustBadges = ["Enterprise Grade", "GDPR Compliant", "SOC 2 Ready"];

export default function PrivacySection() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className={`animate-on-scroll ${isVisible ? "is-visible" : ""} w-full text-white pt-24 pb-12 font-sans`}
    >
      <div style={{ zoom: 0.78 }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
              <SpotlightButton
                className="pointer-events-auto hover:-translate-y-0 w-fit"
                style={{
                  borderWidth: "0.5px",
                  borderStyle: "solid",
                  borderColor: "rgba(255,255,255,0.1)",
                  width: "fit-content",
                  cursor: "default",
                }}
                icon={false}
                roundedClass="rounded-[10px]"
              >
                Privacy &amp; Security
              </SpotlightButton>
            </div>
            <h2 className="no-word-split text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.2] mb-10" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              Data sovereignty is
              <br />
              non-negotiable.
            </h2>

            <div className="border-t border-white/20 pt-8 mt-12">
              <p className="text-lg md:text-xl font-light mb-12">
                Zero model training. Zero third-party logging. Your operational data remains entirely within your control.
              </p>

              {/* Privacy & Badges Grid (3 columns: 3-3-2) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 w-full max-w-5xl items-start mt-12 mb-16">
                {[...privacyPoints, ...badges].map((item) => (
                  <SpotlightButton
                    key={item.text}
                    icon={item.icon}
                    roundedClass="rounded-[10px]"
                    className="!items-center h-full w-full normal-case"
                    style={{
                      textTransform: "none",
                      backgroundColor: "rgba(20, 20, 26, 0.3)",
                      borderWidth: "0.5px",
                      borderStyle: "solid",
                      borderColor: "rgba(255,255,255,0.035)",
                      padding: "0.75rem 1.25rem",
                      boxShadow: "none",
                    }}
                  >
                    <p className="text-sm md:text-[15px] font-medium leading-snug whitespace-pre-line text-[#dadada] group-hover:text-white transition-colors">
                      {item.text}
                    </p>
                  </SpotlightButton>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
