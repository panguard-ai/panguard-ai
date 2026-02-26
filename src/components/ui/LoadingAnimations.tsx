"use client";

const logoPaths = {
  body: "M12 22 L36 22 L36 38 L24 48 L12 38 Z",
  leftPillar: "M12 22 L12 12",
  rightPillar: "M36 22 L36 12",
  topBridge: "M12 12 L24 4 L36 12",
  innerFace: "M12 22 L24 14 L36 22",
};

export function ShieldSpinner({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Rotating ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className="animate-[shield-spin_3s_linear_infinite] absolute"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="#8B9A8E"
          strokeWidth="1.5"
          strokeDasharray="20 80"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
      {/* Shield mark */}
      <svg
        width={size * 0.6}
        height={size * 0.65}
        viewBox="0 0 48 52"
        fill="none"
        className="animate-[breathe_3s_ease-in-out_infinite]"
      >
        {Object.values(logoPaths).map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="#8B9A8E"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </svg>
    </div>
  );
}

export function PulseLoader({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Pulse rings */}
      <div
        className="absolute rounded-full bg-brand-sage/10 animate-[pulse-ring_2s_ease-out_infinite]"
        style={{ width: size, height: size }}
      />
      <div
        className="absolute rounded-full bg-brand-sage/10 animate-[pulse-ring_2s_ease-out_infinite_0.5s]"
        style={{ width: size * 0.7, height: size * 0.7 }}
      />
      {/* Center shield */}
      <svg
        width={size * 0.4}
        height={size * 0.43}
        viewBox="0 0 48 52"
        fill="none"
      >
        {Object.values(logoPaths).map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="#8B9A8E"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </svg>
    </div>
  );
}

export function ScanLoader({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Shield */}
      <svg
        width={size * 0.6}
        height={size * 0.65}
        viewBox="0 0 48 52"
        fill="none"
      >
        {Object.values(logoPaths).map((d, i) => (
          <path
            key={i}
            d={d}
            stroke="#8B9A8E"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </svg>
      {/* Scan line overlay */}
      <div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-sage to-transparent animate-[scan-line_2s_ease-in-out_infinite]"
        style={{ top: 0 }}
      />
    </div>
  );
}
