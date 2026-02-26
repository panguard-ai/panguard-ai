"use client";
import { motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import { BlockIcon, NetworkIcon, CheckIcon } from "./BrandIcons";

const logoPaths = {
  body: "M12 22 L36 22 L36 38 L24 48 L12 38 Z",
  leftPillar: "M12 22 L12 12",
  rightPillar: "M36 22 L36 12",
  topBridge: "M12 12 L24 4 L36 12",
  innerFace: "M12 22 L24 14 L36 22",
};

const events = [
  { label: "Port scan detected and blocked", badge: "Safe", color: "text-status-safe", bg: "bg-status-safe/10", time: "2m" },
  { label: "Unusual login attempt", badge: "Caution", color: "text-status-caution", bg: "bg-status-caution/10", time: "15m" },
  { label: "Malware signature updated", badge: "Safe", color: "text-status-safe", bg: "bg-status-safe/10", time: "1h" },
  { label: "Brute force attack blocked", badge: "Critical", color: "text-status-danger", bg: "bg-status-danger/10", time: "2h" },
];

/* SVG area chart path for threat timeline */
const chartPath = "M0,80 C30,75 50,60 80,65 C110,70 130,40 160,45 C190,50 210,30 240,35 C270,40 290,55 320,50 C350,45 370,60 400,55";
const chartFill = "M0,80 C30,75 50,60 80,65 C110,70 130,40 160,45 C190,50 210,30 240,35 C270,40 290,55 320,50 C350,45 370,60 400,55 L400,100 L0,100 Z";

function MiniShield({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 52" fill="none" className={className}>
      {Object.values(logoPaths).map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      ))}
    </svg>
  );
}

export default function DashboardMockup() {
  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Browser chrome */}
      <div className="bg-surface-2 rounded-t-xl border border-border border-b-0 px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-text-muted/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-text-muted/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-text-muted/40" />
        </div>
        <div className="flex-1 bg-surface-1 rounded-md px-3 py-1 text-[10px] text-text-muted font-mono text-center">
          app.panguard.ai/dashboard
        </div>
      </div>

      {/* Dashboard content */}
      <div className="bg-surface-0 rounded-b-xl border border-border p-4 sm:p-6">
        {/* Dashboard nav */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BrandLogo size={16} className="text-brand-sage" />
            <span className="text-xs font-semibold tracking-wider text-text-primary">PANGUARD-AI</span>
          </div>
          <div className="flex gap-4 text-[11px] text-text-tertiary">
            <span className="text-text-primary font-medium">Dashboard</span>
            <span>Endpoints</span>
            <span>Threats</span>
            <span>Reports</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left column - Status */}
          <div className="col-span-12 sm:col-span-4 space-y-3">
            {/* Status card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-surface-1 rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <MiniShield className="w-10 h-10 text-brand-sage" />
                <div>
                  <p className="text-sm font-bold text-text-primary">All Systems Normal</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-safe" />
                    <span className="text-[10px] text-text-tertiary">Last scan: 2 minutes ago</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            {[
              { icon: BlockIcon, value: "2,847", label: "Attacks Blocked", change: "+12%", changeColor: "text-status-safe" },
              { icon: NetworkIcon, value: "24", label: "Endpoints Protected", extra: "All Active" },
              { icon: CheckIcon, value: "99.9%", label: "Uptime", extra: "30 days" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="bg-surface-1 rounded-xl border border-border p-3 flex items-center gap-3"
              >
                <stat.icon size={16} className="text-brand-sage shrink-0" />
                <div className="flex-1">
                  <p className="text-lg font-extrabold text-text-primary leading-tight">{stat.value}</p>
                  <p className="text-[10px] text-text-tertiary">{stat.label}</p>
                </div>
                {stat.change && (
                  <span className={`text-[10px] font-semibold ${stat.changeColor}`}>{stat.change}</span>
                )}
                {stat.extra && (
                  <span className="text-[10px] text-text-muted">{stat.extra}</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Right column - Charts and events */}
          <div className="col-span-12 sm:col-span-8 space-y-3">
            {/* Threat Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-surface-1 rounded-xl border border-border p-4"
            >
              <div className="mb-3">
                <p className="text-xs font-semibold text-text-primary">Threat Timeline</p>
                <p className="text-[10px] text-text-muted">Threat Activity - Last 7 Days</p>
              </div>
              <svg viewBox="0 0 400 100" className="w-full h-20">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B9A8E" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#8B9A8E" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <motion.path
                  d={chartFill}
                  fill="url(#chartGrad)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                <motion.path
                  d={chartPath}
                  fill="none"
                  stroke="#8B9A8E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />
              </svg>
            </motion.div>

            {/* Events + Network map row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Recent Events */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-surface-1 rounded-xl border border-border p-4"
              >
                <p className="text-xs font-semibold text-text-primary mb-3">Recent Security Events</p>
                <div className="space-y-2">
                  {events.map((e, i) => (
                    <motion.div
                      key={e.label}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                      className="flex items-center gap-2 text-[10px]"
                    >
                      <span className={`${e.bg} ${e.color} px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0`}>
                        {e.badge}
                      </span>
                      <span className="text-text-secondary truncate flex-1">{e.label}</span>
                      <span className="text-text-muted shrink-0">{e.time}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Network Map */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="bg-surface-1 rounded-xl border border-border p-4"
              >
                <p className="text-xs font-semibold text-text-primary mb-3">Network Map</p>
                <svg viewBox="0 0 160 100" className="w-full h-20">
                  {/* Connection lines */}
                  {[
                    [80, 50, 30, 20], [80, 50, 130, 25], [80, 50, 40, 80],
                    [80, 50, 120, 75], [80, 50, 20, 50], [80, 50, 140, 50],
                  ].map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8B9A8E" strokeWidth="0.5" opacity="0.3" />
                  ))}
                  {/* Center node */}
                  <circle cx="80" cy="50" r="8" fill="#8B9A8E" fillOpacity="0.15" stroke="#8B9A8E" strokeWidth="1" />
                  <circle cx="80" cy="50" r="3" fill="#8B9A8E" />
                  {/* Outer nodes */}
                  {[
                    [30, 20, "#2ED573"], [130, 25, "#2ED573"], [40, 80, "#2ED573"],
                    [120, 75, "#EF4444"], [20, 50, "#2ED573"], [140, 50, "#2ED573"],
                  ].map(([cx, cy, color], i) => (
                    <circle key={i} cx={Number(cx)} cy={Number(cy)} r="4" fill={String(color)} fillOpacity="0.6" stroke={String(color)} strokeWidth="0.5" />
                  ))}
                </svg>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Ambient glow behind dashboard */}
      <div className="absolute -inset-8 bg-brand-sage/3 rounded-3xl blur-[60px] -z-10" />
    </div>
  );
}
