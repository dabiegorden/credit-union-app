import * as React from "react";

interface OtpEmailTemplateProps {
  name: string;
  otp: string;
  portalType: "client" | "staff" | "admin";
}

export default function OtpEmailTemplate({
  name,
  otp,
  portalType,
}: OtpEmailTemplateProps) {
  const portalLabel =
    portalType === "admin"
      ? "Admin Portal"
      : portalType === "staff"
        ? "Staff Portal"
        : "Client Portal";

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        backgroundColor: "#f4f0e8",
        padding: "40px 20px",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
          backgroundColor: "#0B1D3A",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #C8963E, #E4B86A)",
            padding: "28px 36px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              backgroundColor: "#0B1D3A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "900",
              fontSize: "16px",
              color: "#E4B86A",
              letterSpacing: "-0.5px",
            }}
          >
            FC
          </div>
          <div>
            <div
              style={{
                color: "#0B1D3A",
                fontWeight: "800",
                fontSize: "17px",
                letterSpacing: "0.02em",
              }}
            >
              First Choice Credit Union
            </div>
            <div
              style={{
                color: "rgba(11,29,58,0.65)",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              {portalLabel}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "36px 36px 32px" }}>
          <h1
            style={{
              color: "#ffffff",
              fontSize: "22px",
              fontWeight: "700",
              margin: "0 0 8px",
              letterSpacing: "-0.3px",
            }}
          >
            Your Sign-In Code
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "14px",
              margin: "0 0 28px",
              lineHeight: "1.6",
            }}
          >
            Hi {name}, use the one-time code below to complete your login. It
            expires in{" "}
            <strong style={{ color: "rgba(255,255,255,0.75)" }}>
              10 minutes
            </strong>
            .
          </p>

          {/* OTP Box */}
          <div
            style={{
              backgroundColor: "rgba(200,150,62,0.08)",
              border: "1.5px solid rgba(200,150,62,0.35)",
              borderRadius: "14px",
              padding: "24px 20px",
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "rgba(228,184,106,0.6)",
                marginBottom: "12px",
              }}
            >
              One-Time Password
            </div>
            <div
              style={{
                fontSize: "42px",
                fontWeight: "900",
                letterSpacing: "14px",
                color: "#E4B86A",
                fontFamily: "'Courier New', monospace",
                textIndent: "14px", // offset for letter-spacing
              }}
            >
              {otp}
            </div>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "12px",
              lineHeight: "1.7",
              margin: 0,
            }}
          >
            If you did not attempt to sign in, please ignore this email or
            contact support immediately. Never share this code with anyone.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "18px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
            © {new Date().getFullYear()} First Choice Credit Union
          </span>
          <span style={{ color: "rgba(200,150,62,0.4)", fontSize: "11px" }}>
            Secure Login
          </span>
        </div>
      </div>
    </div>
  );
}
