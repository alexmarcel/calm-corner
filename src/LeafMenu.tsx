import { useEffect, useRef, useState, type RefObject } from "react";
import type { Tool } from "./Tools";
import {
  Heart,
  Feather,
  Headphones,
  Wind,
  Hand,
  History,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

export type Shortcut = "checkin" | "journal" | Tool | "history" | "sos";
const shortcuts: { id: Shortcut; label: string; Icon: LucideIcon }[] = [
  { id: "checkin", label: "Mari check-in", Icon: Heart },
  { id: "journal", label: "Tulis catatan", Icon: Feather },
  { id: "sound", label: "Bunyi menenangkan", Icon: Headphones },
  { id: "breathe", label: "Latihan pernafasan", Icon: Wind },
  { id: "ground", label: "Grounding", Icon: Hand },
  { id: "history", label: "Catatan & sejarah", Icon: History },
  { id: "sos", label: "SOS / Bantuan", Icon: HeartHandshake },
];
const isEditing = () => {
  const element = document.activeElement;
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable ||
      element.matches(
        'textarea, select, input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"])',
      ))
  );
};

export default function LeafMenu({
  blocked,
  triggerRef,
  onSelect,
}: {
  blocked: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onSelect: (action: Shortcut) => void;
}) {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(true);
  const [editing, setEditing] = useState(isEditing);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setGreeting(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = isEditing();
        setEditing(active);
        if (active) setOpen(false);
      });
    };
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  useEffect(() => {
    if (blocked) setOpen(false);
  }, [blocked]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, triggerRef]);
  return (
    <>
      <div className="leaf-scroll-space" aria-hidden="true" />
      <div className="leaf-menu" ref={root} hidden={blocked || editing}>
        <span
          className={`leaf-greeting ${greeting && !open ? "" : "faded"}`}
          aria-hidden={!greeting || open}
        >
          Apa khabar hari ini?
        </span>
        <button
          ref={triggerRef}
          className="leaf-trigger"
          aria-label="Buka menu Calm Corner"
          aria-expanded={open && !blocked && !editing}
          aria-controls="leaf-shortcuts"
          onClick={(event) => {
            event.currentTarget.focus();
            setOpen(!open);
          }}
        >
          <svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">
            <path
              d="M13 42C-1 18 23 7 46 7c5 24-5 43-25 39"
              fill="#c9dfac"
              stroke="#244f45"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M10 50c5-9 9-14 17-19"
              fill="none"
              stroke="#244f45"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="24" cy="24" r="2" fill="#244f45" />
            <circle cx="37" cy="24" r="2" fill="#244f45" />
            <path
              d="M26 31q5 5 9-1"
              fill="none"
              stroke="#244f45"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <ellipse cx="20" cy="30" rx="3" ry="2" fill="#e5b8a4" />
            <ellipse cx="40" cy="29" rx="3" ry="2" fill="#e5b8a4" />
          </svg>
        </button>
        <div
          id="leaf-shortcuts"
          className="leaf-panel"
          role="region"
          aria-label="Pintasan Calm Corner"
          hidden={!open || blocked || editing}
        >
          <p>Pilih ruang anda</p>
          {shortcuts.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
                onSelect(id);
              }}
            >
              <Icon
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                focusable="false"
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
