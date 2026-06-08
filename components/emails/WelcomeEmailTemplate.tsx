import * as React from "react";

interface WelcomeEmailTemplateProps {
  name: string;
  email: string;
  password: string;
  portalType: "client" | "staff" | "admin";
  pendingApproval: boolean;
}

export default function WelcomeEmailTemplate({
  name,
  email,
  password,
  portalType,
  pendingApproval,
}: WelcomeEmailTemplateProps) {
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
            Welcome, {name}
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "14px",
              margin: "0 0 28px",
              lineHeight: "1.6",
            }}
          >
            An account has been created for you on the {portalLabel}. Below
            are your login credentials.
          </p>

          {/* Credentials Box */}
          <div
            style={{
              backgroundColor: "rgba(200,150,62,0.08)",
              border: "1.5px solid rgba(200,150,62,0.35)",
              borderRadius: "14px",
              padding: "24px 20px",
              marginBottom: "24px",
            }}
          >
            <div style={{ marginBottom: "14px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(228,184,106,0.6)",
                  marginBottom: "6px",
                }}
              >
                Email
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#ffffff",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {email}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(228,184,106,0.6)",
                  marginBottom: "6px",
                }}
              >
                Temporary Password
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "900",
                  letterSpacing: "2px",
                  color: "#E4B86A",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {password}
              </div>
            </div>
          </div>

          {pendingApproval && (
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                padding: "16px 18px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                Your account is currently <strong>pending approval</strong>.
                An administrator must authorize your account before you can
                sign in. You will be able to log in as soon as your account is
                approved.
              </p>
            </div>
          )}

          <p
            style={{
              color: "rgba(255,255,255,0.3)",
              fontSize: "12px",
              lineHeight: "1.7",
              margin: 0,
            }}
          >
            For your security, please change your password after your first
            sign-in. Never share your login credentials with anyone.
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
            Account Created
          </span>
        </div>
      </div>
    </div>
  );
}
