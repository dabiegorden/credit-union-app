"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  Loader2,
  Calendar,
  Hash,
  Shield,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Download,
  CreditCard,
  Wifi,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface CardData {
  holderName: string;
  cardNumber: string;
  expiry: string;
  clientId: string;
  cardType: "debit" | "credit" | "atm";
  network: string;
  issueDate: string;
  theme: string;
}

interface ClientInfo {
  _id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  savingsBalance: number;
}

type CardType = "debit" | "credit" | "atm";

/* ─── EMV CHIP SVG ────────────────────────────────────────────────────────── */
function EMVChip({ gold = false }: { gold?: boolean }) {
  const base = gold ? "#b8860b" : "#a0845c";
  const highlight = gold ? "#ffd700" : "#c8a96e";
  const shadow = gold ? "#8b6914" : "#7a5c3a";

  return (
    <svg
      width="48"
      height="38"
      viewBox="0 0 48 38"
      fill="none"
      style={{ filter: `drop-shadow(0 1px 2px ${shadow}88)` }}
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="36"
        rx="5"
        fill={`url(#chip-main-${gold ? "g" : "s"})`}
        stroke={shadow}
        strokeWidth="0.5"
      />
      <rect
        x="3"
        y="3"
        width="42"
        height="32"
        rx="4"
        fill="none"
        stroke={highlight}
        strokeWidth="0.3"
        strokeOpacity="0.5"
      />
      {/* horizontal lines */}
      <line
        x1="1"
        y1="13"
        x2="47"
        y2="13"
        stroke={shadow}
        strokeWidth="0.6"
        strokeOpacity="0.5"
      />
      <line
        x1="1"
        y1="25"
        x2="47"
        y2="25"
        stroke={shadow}
        strokeWidth="0.6"
        strokeOpacity="0.5"
      />
      {/* vertical lines */}
      <line
        x1="16"
        y1="1"
        x2="16"
        y2="37"
        stroke={shadow}
        strokeWidth="0.6"
        strokeOpacity="0.5"
      />
      <line
        x1="32"
        y1="1"
        x2="32"
        y2="37"
        stroke={shadow}
        strokeWidth="0.6"
        strokeOpacity="0.5"
      />
      {/* center contact pad */}
      <rect
        x="16"
        y="13"
        width="16"
        height="12"
        rx="1.5"
        fill={`url(#chip-pad-${gold ? "g" : "s"})`}
        stroke={shadow}
        strokeWidth="0.5"
      />
      {/* center highlight */}
      <rect
        x="19"
        y="16"
        width="10"
        height="6"
        rx="1"
        fill={highlight}
        fillOpacity="0.3"
      />
      <defs>
        <linearGradient
          id={`chip-main-${gold ? "g" : "s"}`}
          x1="0"
          y1="0"
          x2="48"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={highlight} />
          <stop offset="40%" stopColor={base} />
          <stop offset="70%" stopColor={shadow} />
          <stop offset="100%" stopColor={base} />
        </linearGradient>
        <linearGradient
          id={`chip-pad-${gold ? "g" : "s"}`}
          x1="16"
          y1="13"
          x2="32"
          y2="25"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={highlight} />
          <stop offset="50%" stopColor={base} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Contactless icon ────────────────────────────────────────────────────── */
function ContactlessIcon({
  color = "rgba(255,255,255,0.7)",
}: {
  color?: string;
}) {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      <path
        d="M11 13 C11 13 5 8.5 5 13 C5 17.5 11 13 11 13Z"
        fill={color}
        fillOpacity="0"
      />
      <path
        d="M7 20 C7 20 3 16.5 3 13 C3 9.5 7 6 7 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11 22 C11 22 5 17.5 5 13 C5 8.5 11 4 11 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.7"
      />
      <path
        d="M15 20 C15 20 19 16.5 19 13 C19 9.5 15 6 15 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.5"
      />
      <circle cx="11" cy="13" r="1.5" fill={color} />
    </svg>
  );
}

/* ─── VISA LOGO ───────────────────────────────────────────────────────────── */
function VisaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 28" className={className} style={{ display: "block" }}>
      <defs>
        <linearGradient id="visa-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8e8e8" />
        </linearGradient>
      </defs>
      <text
        x="2"
        y="24"
        fontFamily="'Times New Roman', Georgia, serif"
        fontWeight="700"
        fontSize="28"
        fontStyle="italic"
        fill="url(#visa-grad)"
        letterSpacing="-1"
      >
        VISA
      </text>
    </svg>
  );
}

/* ─── MASTERCARD LOGO ─────────────────────────────────────────────────────── */
function MastercardLogo({ size = 52 }: { size?: number }) {
  const h = size * 0.63;
  return (
    <svg
      viewBox="0 0 52 33"
      width={size}
      height={h}
      style={{ display: "block" }}
    >
      <circle cx="19" cy="16.5" r="14" fill="#EB001B" />
      <circle cx="33" cy="16.5" r="14" fill="#F79E1B" />
      <path
        d="M26 5.5 A14 14 0 0 1 33 16.5 A14 14 0 0 1 26 27.5 A14 14 0 0 1 19 16.5 A14 14 0 0 1 26 5.5Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

/* ─── ATM NETWORK BADGE ───────────────────────────────────────────────────── */
function ATMBadge() {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: 6,
        border: "1.5px solid rgba(200,160,80,0.6)",
        background: "rgba(200,160,80,0.08)",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 4,
          color: "#d4a843",
          fontFamily: "Arial Black, sans-serif",
        }}
      >
        ATM
      </span>
    </div>
  );
}

/* ─── VISA DEBIT CARD (Front) ─────────────────────────────────────────────── */
function VisaDebitFront({ data }: { data: CardData }) {
  const parts = data.cardNumber.split(" ");
  return (
    <div
      style={{
        width: 386,
        height: 244,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #0d2550 0%, #1a3a7a 30%, #0f2d60 60%, #071a42 100%)",
        boxShadow:
          "0 30px 70px -10px rgba(0,0,80,0.7), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.1)",
        fontFamily: "'Courier New', Courier, monospace",
        userSelect: "none",
      }}
    >
      {/* Holographic shimmer layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.06,
          background:
            "linear-gradient(105deg, transparent 25%, rgba(120,180,255,1) 45%, transparent 65%)",
        }}
      />
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          right: -80,
          bottom: -80,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(40,100,220,0.25) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -40,
          bottom: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      />
      {/* Vertical light stripe */}
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: 0,
          bottom: 0,
          width: 1,
          background:
            "linear-gradient(180deg, transparent, rgba(255,255,255,0.05), transparent)",
        }}
      />

      {/* Bank wordmark */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 22,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            flexShrink: 0,
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#0B1D3A",
              fontFamily: "Georgia, serif",
            }}
          >
            FC
          </span>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "Arial, sans-serif",
              letterSpacing: 1.5,
            }}
          >
            FIRST CHOICE
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "Arial, sans-serif",
              letterSpacing: 2,
              marginTop: 1,
            }}
          >
            CREDIT UNION
          </div>
        </div>
      </div>

      {/* DEBIT label */}
      <div style={{ position: "absolute", top: 22, right: 22 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.45)",
            fontFamily: "Arial, sans-serif",
          }}
        >
          DEBIT
        </span>
      </div>

      {/* Chip + Contactless */}
      <div
        style={{
          position: "absolute",
          top: 68,
          left: 22,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <EMVChip gold={false} />
        <ContactlessIcon color="rgba(255,255,255,0.6)" />
      </div>

      {/* Card number */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 22,
          display: "flex",
          gap: 14,
        }}
      >
        {parts.map((g, i) => (
          <span
            key={i}
            style={{
              fontSize: 19,
              letterSpacing: 2.5,
              fontWeight: 500,
              color:
                i === 1 || i === 2
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.92)",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {i === 1 || i === 2 ? "••••" : g}
          </span>
        ))}
      </div>

      {/* Cardholder name */}
      <div
        style={{ position: "absolute", bottom: 20, left: 22, maxWidth: 220 }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "Arial, sans-serif",
            marginBottom: 3,
          }}
        >
          CARD HOLDER
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.5,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "Arial, sans-serif",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.holderName}
        </div>
      </div>

      {/* Expiry */}
      <div style={{ position: "absolute", bottom: 20, left: 250 }}>
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "Arial, sans-serif",
            marginBottom: 3,
          }}
        >
          EXPIRES
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Courier New', monospace",
            fontWeight: 600,
          }}
        >
          {data.expiry}
        </div>
      </div>

      {/* VISA logo */}
      <div style={{ position: "absolute", bottom: 14, right: 18 }}>
        <VisaLogo className="h-8 w-20" />
      </div>
    </div>
  );
}

/* ─── VISA DEBIT CARD (Back) ─────────────────────────────────────────────── */
function VisaDebitBack({ data }: { data: CardData }) {
  return (
    <div
      style={{
        width: 386,
        height: 244,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #071a42 0%, #0d2550 50%, #071a42 100%)",
        boxShadow:
          "0 30px 70px -10px rgba(0,0,80,0.7), 0 0 0 1px rgba(255,255,255,0.07)",
        fontFamily: "Arial, sans-serif",
        userSelect: "none",
      }}
    >
      {/* Magnetic stripe */}
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 0,
          right: 0,
          height: 46,
          background: "linear-gradient(180deg, #0d0d0d, #1a1a1a, #0d0d0d)",
        }}
      />

      {/* White signature strip */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 22,
          right: 80,
          height: 38,
          borderRadius: 4,
          background:
            "repeating-linear-gradient(90deg, #f5f0e8 0, #f5f0e8 4px, #ede8d8 4px, #ede8d8 8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 10,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontStyle: "italic",
            color: "#aaa",
            fontFamily: "Georgia, serif",
            letterSpacing: 1,
          }}
        >
          {data.holderName.split(" ")[0].charAt(0)}.
          {data.holderName.split(" ").slice(-1)[0]}
        </span>
      </div>

      {/* CVV box */}
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 22,
          width: 56,
          height: 38,
          background: "#fff",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 8, color: "#888", letterSpacing: 1 }}>
          CVV
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111",
            fontFamily: "'Courier New', monospace",
          }}
        >
          •••
        </span>
      </div>

      {/* Customer service */}
      <div style={{ position: "absolute", bottom: 46, left: 22, right: 22 }}>
        <p
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,0.3)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          This card is the property of First Choice Credit Union. Misuse is
          subject to prosecution. If found, please return to the issuing branch
          or call +233 (0) 30 000 0000.
        </p>
      </div>

      {/* Hologram circle */}
      <div style={{ position: "absolute", bottom: 16, left: 22 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "conic-gradient(from 0deg, #ff0080,#ff8c00,#40e0d0,#0066ff,#8000ff,#ff0080)",
          }}
        />
      </div>

      {/* Visa back */}
      <div style={{ position: "absolute", bottom: 14, right: 18 }}>
        <VisaLogo className="h-7 w-16" />
      </div>
    </div>
  );
}

/* ─── MASTERCARD CREDIT CARD (Front) ─────────────────────────────────────── */
function MastercardCreditFront({ data }: { data: CardData }) {
  const parts = data.cardNumber.split(" ");
  return (
    <div
      style={{
        width: 386,
        height: 244,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(150deg, #0a0a0a 0%, #1a1a1a 30%, #111 60%, #0d0d0d 100%)",
        boxShadow:
          "0 30px 70px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.07)",
        fontFamily: "'Courier New', Courier, monospace",
        userSelect: "none",
      }}
    >
      {/* Mastercard circle glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.14,
          background:
            "radial-gradient(ellipse at 80% 120%, #f79e1b 0%, transparent 40%), radial-gradient(ellipse at 60% 120%, #eb001b 0%, transparent 35%)",
        }}
      />
      {/* Grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      {/* Gold accent line at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 5%, #C8963E 30%, #E4B86A 50%, #C8963E 70%, transparent 95%)",
        }}
      />

      {/* Bank wordmark */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 22,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            flexShrink: 0,
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#0B1D3A",
              fontFamily: "Georgia, serif",
            }}
          >
            FC
          </span>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "Arial, sans-serif",
              letterSpacing: 1.5,
            }}
          >
            FIRST CHOICE
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "Arial, sans-serif",
              letterSpacing: 2,
              marginTop: 1,
            }}
          >
            CREDIT UNION
          </div>
        </div>
      </div>

      {/* CREDIT label */}
      <div style={{ position: "absolute", top: 22, right: 22 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "Arial, sans-serif",
          }}
        >
          CREDIT
        </span>
      </div>

      {/* Chip + Contactless */}
      <div
        style={{
          position: "absolute",
          top: 68,
          left: 22,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <EMVChip gold={true} />
        <ContactlessIcon color="rgba(255,200,80,0.7)" />
      </div>

      {/* Card number */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 22,
          display: "flex",
          gap: 14,
        }}
      >
        {parts.map((g, i) => (
          <span
            key={i}
            style={{
              fontSize: 19,
              letterSpacing: 2.5,
              fontWeight: 500,
              color:
                i === 1 || i === 2
                  ? "rgba(255,255,255,0.25)"
                  : "rgba(255,255,255,0.9)",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            {i === 1 || i === 2 ? "••••" : g}
          </span>
        ))}
      </div>

      {/* Cardholder name */}
      <div
        style={{ position: "absolute", bottom: 20, left: 22, maxWidth: 210 }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(255,200,80,0.5)",
            fontFamily: "Arial, sans-serif",
            marginBottom: 3,
          }}
        >
          CARD HOLDER
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.5,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "Arial, sans-serif",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.holderName}
        </div>
      </div>

      {/* Expiry */}
      <div style={{ position: "absolute", bottom: 20, left: 248 }}>
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(255,200,80,0.5)",
            fontFamily: "Arial, sans-serif",
            marginBottom: 3,
          }}
        >
          VALID THRU
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Courier New', monospace",
            fontWeight: 600,
          }}
        >
          {data.expiry}
        </div>
      </div>

      {/* Mastercard logo */}
      <div style={{ position: "absolute", bottom: 12, right: 18 }}>
        <MastercardLogo size={56} />
      </div>
    </div>
  );
}

/* ─── MASTERCARD CREDIT CARD (Back) ──────────────────────────────────────── */
function MastercardCreditBack({ data }: { data: CardData }) {
  return (
    <div
      style={{
        width: 386,
        height: 244,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)",
        boxShadow:
          "0 30px 70px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
        fontFamily: "Arial, sans-serif",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background:
            "linear-gradient(90deg, transparent, #eb001b, #ff5f00, #f79e1b, transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 0,
          right: 0,
          height: 46,
          background: "#000",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 22,
          right: 82,
          height: 38,
          borderRadius: 4,
          background:
            "repeating-linear-gradient(90deg,#f5f0e8 0,#f5f0e8 4px,#ede8d8 4px,#ede8d8 8px)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
        }}
      >
        <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>
          AUTHORIZED SIGNATURE
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 22,
          width: 58,
          height: 38,
          background: "#fff",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <span style={{ fontSize: 7, color: "#999", letterSpacing: 1 }}>
          CVV2
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111",
            fontFamily: "'Courier New', monospace",
          }}
        >
          •••
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 48, left: 22, right: 22 }}>
        <p
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,0.25)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          This card is the property of First Choice Credit Union. Use is subject
          to cardholder agreement. Report lost/stolen immediately to +233 (0) 30
          000 0000.
        </p>
      </div>
      <div style={{ position: "absolute", bottom: 14, left: 22 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "conic-gradient(from 0deg,#ff0080,#f79e1b,#40e0d0,#0066ff,#8000ff,#ff0080)",
          }}
        />
      </div>
      <div style={{ position: "absolute", bottom: 16, right: 18 }}>
        <MastercardLogo size={50} />
      </div>
    </div>
  );
}

/* ─── ATM CARD (Front) ────────────────────────────────────────────────────── */
function ATMCardFront({ data }: { data: CardData }) {
  const parts = data.cardNumber.split(" ");
  return (
    <div
      style={{
        width: 386,
        height: 244,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #181818 0%, #222 30%, #1a1a1a 60%, #111 100%)",
        boxShadow:
          "0 30px 70px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
        fontFamily: "'Courier New', Courier, monospace",
        userSelect: "none",
      }}
    >
      {/* Gold shimmer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.07,
          background:
            "radial-gradient(ellipse at 15% 40%, #C8963E 0%, transparent 50%)",
        }}
      />
      {/* Dot texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      {/* Gold top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            "linear-gradient(90deg, transparent 5%, #916000 20%, #C8963E 40%, #E4B86A 50%, #C8963E 60%, #916000 80%, transparent 95%)",
        }}
      />
      {/* Gold bottom accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 10%, rgba(200,150,62,0.4) 50%, transparent 90%)",
        }}
      />

      {/* Bank wordmark */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 22,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            flexShrink: 0,
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#0B1D3A",
              fontFamily: "Georgia, serif",
            }}
          >
            FC
          </span>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              fontFamily: "Arial, sans-serif",
              letterSpacing: 1.5,
            }}
          >
            FIRST CHOICE
          </div>
          <div
            style={{
              fontSize: 8,
              color: "rgba(200,150,62,0.6)",
              fontFamily: "Arial, sans-serif",
              letterSpacing: 2,
              marginTop: 1,
            }}
          >
            CREDIT UNION
          </div>
        </div>
      </div>

      {/* Chip + Contactless */}
      <div
        style={{
          position: "absolute",
          top: 68,
          left: 22,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <EMVChip gold={true} />
        <ContactlessIcon color="rgba(200,150,62,0.8)" />
      </div>

      {/* Card number */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 22,
          display: "flex",
          gap: 14,
        }}
      >
        {parts.map((g, i) => (
          <span
            key={i}
            style={{
              fontSize: 19,
              letterSpacing: 2.5,
              fontWeight: 500,
              color:
                i === 1 || i === 2
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.85)",
            }}
          >
            {i === 1 || i === 2 ? "••••" : g}
          </span>
        ))}
      </div>

      {/* Cardholder name */}
      <div
        style={{ position: "absolute", bottom: 20, left: 22, maxWidth: 210 }}
      >
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(200,150,62,0.55)",
            fontFamily: "Arial, sans-serif",
            marginBottom: 3,
          }}
        >
          ACCOUNT HOLDER
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.5,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "Arial, sans-serif",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {data.holderName}
        </div>
      </div>

      {/* Expiry */}
      <div style={{ position: "absolute", bottom: 20, left: 248 }}>
        <div
          style={{
            fontSize: 8,
            letterSpacing: 2,
            color: "rgba(200,150,62,0.55)",
            fontFamily: "Arial, sans-serif",
            marginBottom: 3,
          }}
        >
          VALID THRU
        </div>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 1,
            color: "rgba(255,255,255,0.85)",
            fontFamily: "'Courier New', monospace",
            fontWeight: 600,
          }}
        >
          {data.expiry}
        </div>
      </div>

      {/* ATM Badge */}
      <div style={{ position: "absolute", bottom: 18, right: 18 }}>
        <ATMBadge />
      </div>
    </div>
  );
}

/* ─── ATM CARD (Back) ─────────────────────────────────────────────────────── */
function ATMCardBack({ data }: { data: CardData }) {
  return (
    <div
      style={{
        width: 386,
        height: 244,
        borderRadius: 18,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #111 0%, #1c1c1c 50%, #111 100%)",
        boxShadow:
          "0 30px 70px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
        fontFamily: "Arial, sans-serif",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            "linear-gradient(90deg,transparent 5%,#916000 20%,#C8963E 50%,#916000 80%,transparent 95%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 34,
          left: 0,
          right: 0,
          height: 46,
          background: "linear-gradient(180deg, #000, #111, #000)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 22,
          right: 82,
          height: 38,
          borderRadius: 4,
          background:
            "repeating-linear-gradient(90deg,#f5f0e8 0,#f5f0e8 4px,#ede8d8 4px,#ede8d8 8px)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
        }}
      >
        <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>
          AUTHORIZED SIGNATURE
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 100,
          right: 22,
          width: 58,
          height: 38,
          background: "#fff",
          borderRadius: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <span style={{ fontSize: 8, color: "#888", letterSpacing: 1 }}>
          PIN
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#111",
            fontFamily: "'Courier New', monospace",
          }}
        >
          ••••
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 50, left: 22, right: 22 }}>
        <p
          style={{
            fontSize: 8,
            color: "rgba(200,150,62,0.3)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          FOR CASH WITHDRAWALS AND BALANCE ENQUIRIES ONLY · KEEP YOUR PIN
          CONFIDENTIAL · REPORT LOSS/THEFT IMMEDIATELY
        </p>
      </div>
      <div style={{ position: "absolute", bottom: 14, left: 22 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            overflow: "hidden",
            background:
              "conic-gradient(from 0deg,#C8963E,#fff,#E4B86A,#C8963E,#fff,#C8963E)",
          }}
        />
      </div>
      <div style={{ position: "absolute", bottom: 18, right: 18 }}>
        <ATMBadge />
      </div>
    </div>
  );
}

/* ─── Flippable 3D Card ───────────────────────────────────────────────────── */
function FlippableCard({ data }: { data: CardData }) {
  const [flipped, setFlipped] = useState(false);

  const Front =
    data.cardType === "credit"
      ? MastercardCreditFront
      : data.cardType === "atm"
        ? ATMCardFront
        : VisaDebitFront;
  const Back =
    data.cardType === "credit"
      ? MastercardCreditBack
      : data.cardType === "atm"
        ? ATMCardBack
        : VisaDebitBack;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{
          perspective: 1200,
          width: 386,
          height: 244,
          cursor: "pointer",
        }}
        onClick={() => setFlipped((f) => !f)}
        title="Click to flip card"
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <Front data={data} />
          </div>
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <Back data={data} />
          </div>
        </motion.div>
      </div>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
        {flipped
          ? "Showing back — click to flip"
          : "Showing front — click to flip"}
      </p>
    </div>
  );
}

/* ─── Card Type Selector Button ───────────────────────────────────────────── */
interface CardOption {
  type: CardType;
  label: string;
  sublabel: string;
  accent: string;
}

const CARD_OPTIONS: CardOption[] = [
  {
    type: "debit",
    label: "Visa Debit",
    sublabel: "Standard savings card · Visa network",
    accent: "#3b82f6",
  },
  {
    type: "credit",
    label: "Mastercard Credit",
    sublabel: "Credit line card · Mastercard network",
    accent: "#f79e1b",
  },
  {
    type: "atm",
    label: "ATM Card",
    sublabel: "Cash & enquiry only · Local network",
    accent: "#C8963E",
  },
];

function CardOptionBtn({
  option,
  selected,
  onClick,
}: {
  option: CardOption;
  selected: boolean;
  onClick: () => void;
}) {
  const NetworkIcon =
    option.type === "credit"
      ? () => <MastercardLogo size={38} />
      : option.type === "atm"
        ? () => (
            <div
              style={{
                width: 38,
                height: 24,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ATMBadge />
            </div>
          )
        : () => <VisaLogo className="h-6 w-16" />;

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200"
      style={{
        background: selected
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.025)",
        border: selected
          ? `1.5px solid ${option.accent}55`
          : "1.5px solid rgba(255,255,255,0.07)",
        boxShadow: selected ? `0 0 24px ${option.accent}22` : "none",
        transform: selected ? "translateY(-2px)" : "none",
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${option.accent}, transparent)`,
          }}
        />
      )}

      {/* Mini card thumbnail */}
      <div
        className="mb-3"
        style={{
          height: 52,
          borderRadius: 8,
          overflow: "hidden",
          background:
            option.type === "debit"
              ? "linear-gradient(135deg,#0d2550,#1a3a7a)"
              : option.type === "credit"
                ? "linear-gradient(135deg,#0a0a0a,#1a1a1a)"
                : "linear-gradient(135deg,#181818,#222)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "6px 10px",
        }}
      >
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
          <div
            style={{
              width: 22,
              height: 17,
              borderRadius: 2,
              background: "linear-gradient(135deg,#b8860b,#ffd700,#8b6914)",
              opacity: 0.85,
            }}
          />
        </div>
        <NetworkIcon />
      </div>

      <div className="font-bold text-sm text-white mb-0.5">{option.label}</div>
      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        {option.sublabel}
      </div>

      {selected && (
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: option.accent }} />
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function CardIssuancePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState<ClientInfo | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState(false);
  const [selectedType, setSelectedType] = useState<CardType>("debit");

  /* ── Fetch client ── */
  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setClient(data.client);
      else toast.error("Client not found");
    } catch {
      toast.error("Failed to load client");
    } finally {
      setClientLoading(false);
    }
  }, [clientId]);

  /* ── Fetch card data ── */
  const fetchCard = useCallback(
    async (type: CardType) => {
      if (!clientId) return;
      setCardLoading(true);
      setIssued(false);
      setCardData(null);
      try {
        const res = await fetch(`/api/clients/${clientId}/card?type=${type}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setCardData(data.cardData);
        else toast.error(data.error || "Failed to generate card");
      } catch {
        toast.error("Network error");
      } finally {
        setCardLoading(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  useEffect(() => {
    fetchCard(selectedType);
  }, [selectedType, fetchCard]);

  /* ── Issue card ── */
  const handleIssue = async () => {
    if (!cardData || !client) return;
    setIssuing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIssuing(false);
    setIssued(true);
    const label =
      CARD_OPTIONS.find((o) => o.type === selectedType)?.label ?? "Card";
    toast.success(`${label} issued to ${client.firstName} ${client.lastName}`);
  };

  /* ── Print ── */
  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank", "width=700,height=500");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Card Print</title>
      <style>
        body{margin:0;padding:40px;background:#0B1D3A;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:20px;}
        @media print{body{padding:20px;}}
        @page{size:A4;margin:1cm;}
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>setTimeout(()=>{window.print();window.close();},400);</script>
      </body></html>`);
    w.document.close();
  };

  /* ─── Loading ── */
  if (clientLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1D3A" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "#C8963E" }}
          />
          <p
            className="text-sm font-semibold"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Loading client…
          </p>
        </div>
      </div>
    );

  if (!client)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1D3A" }}
      >
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-red-400" />
          <p className="text-white font-bold">Client not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "rgba(200,150,62,0.1)",
              color: "#E4B86A",
              border: "1px solid rgba(200,150,62,0.2)",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );

  const selectedOption = CARD_OPTIONS.find((o) => o.type === selectedType)!;

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 shrink-0"
            style={{
              background: "rgba(200,150,62,0.1)",
              border: "1px solid rgba(200,150,62,0.2)",
            }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#C8963E" }} />
          </button>
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-1"
              style={{
                background: "rgba(200,150,62,0.12)",
                border: "1px solid rgba(200,150,62,0.25)",
                color: "#E4B86A",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E] animate-pulse" />
              Card Issuance
            </div>
            <h1 className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight">
              Issue <span style={{ color: "#E4B86A" }}>Bank Card</span>
            </h1>
          </div>
        </div>

        {/* Client pill */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shrink-0"
          style={{
            background: "rgba(200,150,62,0.07)",
            border: "1px solid rgba(200,150,62,0.15)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
            style={{
              background: "linear-gradient(135deg,#C8963E,#E4B86A)",
              color: "#0B1D3A",
            }}
          >
            {client.firstName[0]}
            {client.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              {client.firstName} {client.lastName}
            </p>
            <p className="text-[11px]" style={{ color: "#E4B86A" }}>
              {client.clientId}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* ── Left column ── */}
        <div className="space-y-5">
          {/* Card type selector */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{
                  background: "linear-gradient(180deg,#C8963E,#E4B86A)",
                }}
              />
              <p className="font-serif font-black text-white text-base">
                Select Card Type
              </p>
              <p
                className="text-xs ml-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Choose based on client's request
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {CARD_OPTIONS.map((option) => (
                <CardOptionBtn
                  key={option.type}
                  option={option}
                  selected={selectedType === option.type}
                  onClick={() => setSelectedType(option.type)}
                />
              ))}
            </div>
          </div>

          {/* Card preview */}
          <div
            className="rounded-2xl border p-6"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-5 rounded-full"
                  style={{
                    background: "linear-gradient(180deg,#C8963E,#E4B86A)",
                  }}
                />
                <p className="font-serif font-black text-white text-base">
                  Card Preview
                </p>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: `${selectedOption.accent}18`,
                    color: selectedOption.accent,
                    border: `1px solid ${selectedOption.accent}30`,
                  }}
                >
                  {selectedOption.label}
                </span>
              </div>
              <button
                onClick={() => fetchCard(selectedType)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            </div>

            <AnimatePresence mode="wait">
              {cardLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-4"
                  style={{ height: 280 }}
                >
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-2xl animate-pulse"
                      style={{
                        background: "rgba(200,150,62,0.15)",
                        border: "1px solid rgba(200,150,62,0.2)",
                      }}
                    />
                    <Loader2
                      className="w-6 h-6 animate-spin absolute inset-0 m-auto"
                      style={{ color: "#C8963E" }}
                    />
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Generating {selectedOption.label}…
                  </p>
                </motion.div>
              ) : cardData ? (
                <motion.div
                  key={`${cardData.cardType}-preview`}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 280, damping: 26 }}
                  className="flex flex-col items-center gap-6"
                >
                  {/* Printable card area */}
                  <div ref={printRef}>
                    <FlippableCard data={cardData} />
                  </div>

                  {/* Card details strip */}
                  <div className="w-full grid grid-cols-3 gap-3 max-w-lg">
                    {[
                      {
                        icon: Hash,
                        label: "Card Number",
                        value: cardData.cardNumber,
                      },
                      {
                        icon: Calendar,
                        label: "Expires",
                        value: cardData.expiry,
                      },
                      {
                        icon: Shield,
                        label: "Network",
                        value: cardData.network,
                      },
                    ].map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="p-3 rounded-xl text-center"
                        style={{
                          background: "rgba(200,150,62,0.05)",
                          border: "1px solid rgba(200,150,62,0.1)",
                        }}
                      >
                        <Icon
                          className="w-4 h-4 mx-auto mb-1.5"
                          style={{ color: "#C8963E" }}
                        />
                        <p
                          className="text-[9px] uppercase tracking-wider mb-1"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {label}
                        </p>
                        <p className="text-xs font-bold text-white font-mono truncate">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Success badge */}
                  <AnimatePresence>
                    {issued && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-6 py-3 rounded-2xl"
                        style={{
                          background: "rgba(74,222,128,0.1)",
                          border: "1px solid rgba(74,222,128,0.25)",
                        }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-emerald-300">
                            Card Issued Successfully
                          </p>
                          <p
                            className="text-[11px]"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            {selectedOption.label} · {client.firstName}{" "}
                            {client.lastName} · {cardData.issueDate}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div
                  className="flex items-center justify-center"
                  style={{ height: 240 }}
                >
                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No card data available
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Client information */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{
                  background: "linear-gradient(180deg,#C8963E,#E4B86A)",
                }}
              />
              <p className="font-serif font-black text-white text-base">
                Client Profile
              </p>
            </div>

            {/* Avatar hero */}
            <div
              className="flex items-center gap-4 p-4 rounded-xl mb-4"
              style={{
                background: "rgba(200,150,62,0.07)",
                border: "1px solid rgba(200,150,62,0.15)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0"
                style={{
                  background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                  color: "#0B1D3A",
                }}
              >
                {client.firstName[0]}
                {client.lastName[0]}
              </div>
              <div className="min-w-0">
                <p className="font-serif font-black text-white text-lg leading-tight truncate">
                  {client.firstName} {client.lastName}
                </p>
                <p
                  className="text-xs font-bold mt-0.5"
                  style={{ color: "#E4B86A" }}
                >
                  {client.clientId}
                </p>
                <span
                  className="inline-block mt-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{
                    background:
                      client.status === "active"
                        ? "rgba(74,222,128,0.12)"
                        : "rgba(239,68,68,0.12)",
                    border: `1px solid ${client.status === "active" ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: client.status === "active" ? "#4ade80" : "#f87171",
                  }}
                >
                  {client.status}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { icon: Mail, label: "Email", value: client.email },
                { icon: Phone, label: "Phone", value: client.phone },
                {
                  icon: CreditCard,
                  label: "Balance",
                  value: `GH₵${(client.savingsBalance || 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: "#C8963E" }}
                  />
                  <span
                    className="text-[11px] uppercase tracking-wider font-semibold shrink-0"
                    style={{ color: "rgba(255,255,255,0.35)", minWidth: 46 }}
                  >
                    {label}
                  </span>
                  <span className="text-xs font-semibold text-white truncate ml-auto">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card summary */}
          {cardData && (
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "#122549",
                borderColor: "rgba(200,150,62,0.14)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-1.5 h-5 rounded-full"
                  style={{
                    background: "linear-gradient(180deg,#C8963E,#E4B86A)",
                  }}
                />
                <p className="font-serif font-black text-white text-base">
                  Card Summary
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Type", value: selectedOption.label },
                  { label: "Network", value: cardData.network },
                  { label: "Holder", value: cardData.holderName },
                  { label: "Number", value: cardData.cardNumber },
                  { label: "Expiry", value: cardData.expiry },
                  { label: "Issued", value: cardData.issueDate },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {label}
                    </span>
                    <span className="text-[12px] font-semibold text-white font-mono">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(251,146,60,0.07)",
                  border: "1px solid rgba(251,146,60,0.15)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Card numbers are for internal tracking only and are not
                  connected to any payment network.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            className="rounded-2xl border p-5 space-y-3"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{
                  background: "linear-gradient(180deg,#C8963E,#E4B86A)",
                }}
              />
              <p className="font-serif font-black text-white text-base">
                Actions
              </p>
            </div>

            {/* Main issue button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleIssue}
              disabled={
                issuing || issued || !cardData || client.status !== "active"
              }
              className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all"
              style={
                issued
                  ? {
                      background: "rgba(74,222,128,0.12)",
                      color: "#4ade80",
                      border: "1px solid rgba(74,222,128,0.3)",
                    }
                  : {
                      background:
                        issuing || !cardData
                          ? "rgba(200,150,62,0.3)"
                          : "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                      boxShadow:
                        !issuing && !issued && cardData
                          ? "0 8px 28px rgba(200,150,62,0.4)"
                          : "none",
                    }
              }
            >
              {issuing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing
                  issuance…
                </>
              ) : issued ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Card Issued Successfully
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Issue {selectedOption.label}
                </>
              )}
            </motion.button>

            {/* Client inactive warning */}
            {client.status !== "active" && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.18)",
                }}
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">
                  Client account is not active. Activate before issuing a card.
                </p>
              </div>
            )}

            {/* Print */}
            <button
              onClick={handlePrint}
              disabled={!cardData}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{
                background: "rgba(200,150,62,0.1)",
                color: "#E4B86A",
                border: "1px solid rgba(200,150,62,0.2)",
              }}
            >
              <Printer className="w-4 h-4" /> Print Card
            </button>

            {/* Download (placeholder) */}
            <button
              disabled={!cardData}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-30"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Download className="w-4 h-4" /> Save as PDF
            </button>

            {/* Issue another */}
            {issued && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setIssued(false);
                }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: "rgba(96,165,250,0.08)",
                  color: "#60a5fa",
                  border: "1px solid rgba(96,165,250,0.2)",
                }}
              >
                <RefreshCw className="w-4 h-4" /> Issue a Different Card Type
              </motion.button>
            )}
          </div>

          {/* Issuance history placeholder */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-1.5 h-5 rounded-full"
                style={{
                  background: "linear-gradient(180deg,#C8963E,#E4B86A)",
                }}
              />
              <p className="font-serif font-black text-white text-base">
                Issuance Guide
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  step: "1",
                  text: "Select the card type the client requested",
                },
                {
                  step: "2",
                  text: "Review card details and client information",
                },
                {
                  step: "3",
                  text: "Click Issue to confirm and record issuance",
                },
                {
                  step: "4",
                  text: "Print or save the card for delivery to client",
                },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                    style={{
                      background: "rgba(200,150,62,0.15)",
                      color: "#E4B86A",
                      border: "1px solid rgba(200,150,62,0.25)",
                    }}
                  >
                    {step}
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
