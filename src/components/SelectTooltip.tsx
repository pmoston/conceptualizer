"use client";
import { useState } from "react";
import { HelpCircle } from "lucide-react";

export interface TooltipItem {
  value: string;
  label: string;
  color?: string;   // optional Tailwind badge classes
  description: string;
}

interface Props {
  title: string;
  items: TooltipItem[];
  align?: "left" | "right";
}

export default function SelectTooltip({ title, items, align = "left" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="p-0.5 text-gray-300 hover:text-gray-500 transition"
        aria-label={`${title} help`}
      >
        <HelpCircle size={14} />
      </button>

      {open && (
        <div className={`absolute top-full mt-1.5 w-max max-w-[33vw] min-w-48 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-30 text-sm ${
          align === "right" ? "right-0" : "left-0"
        }`}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 whitespace-nowrap">{title}</p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.value} className="flex items-start gap-2">
                {item.color ? (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 mt-px ${item.color}`}>
                    {item.label}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[#1c1e3b] shrink-0 mt-px">{item.label}</span>
                )}
                <span className="text-gray-500 text-xs">{item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
