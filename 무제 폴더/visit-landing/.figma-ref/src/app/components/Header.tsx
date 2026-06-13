import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";

const navItems = [
  { label: "사업개요", href: "#사업개요" },
  { label: "프리미엄", href: "#프리미엄" },
  { label: "입지환경", href: "#입지환경" },
  { label: "단지배치도", href: "#단지배치도" },
  { label: "커뮤니티", href: "#커뮤니티" },
  { label: "방문예약", href: "#방문예약", highlight: true },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transition: "all 0.3s ease",
          backgroundColor: scrolled ? "white" : "transparent",
          boxShadow: scrolled ? "0 2px 20px rgba(15,29,58,0.12)" : "none",
        }}
      >
        {/* Row 1: Logo + PC Nav + Phone / Mobile Logo + Phone */}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 20px",
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.28em",
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              HANYANG LIPS · WONJU
            </span>
            <span
              style={{
                fontSize: 20,
                letterSpacing: "0.06em",
                color: scrolled ? "#0f1d3a" : "white",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 900,
                transition: "color 0.3s",
              }}
            >
              원주 한양립스
            </span>
          </div>

          {/* PC Nav */}
          <nav className="pc-nav" style={{ display: "none", alignItems: "center", gap: 28 }}>
            {navItems.map((item) =>
              item.highlight ? (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  style={{
                    fontSize: 17,
                    letterSpacing: "0.06em",
                    color: "#caa85c",
                    textDecoration: "none",
                    fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                    fontWeight: 800,
                    border: "1.5px solid rgba(202,168,92,0.7)",
                    padding: "8px 20px",
                    borderRadius: 2,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#caa85c";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#caa85c";
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  style={{
                    fontSize: 14,
                    letterSpacing: "0.05em",
                    color: scrolled ? "#0f1d3a" : "rgba(255,255,255,0.9)",
                    textDecoration: "none",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontWeight: 400,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#caa85c")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = scrolled ? "#0f1d3a" : "rgba(255,255,255,0.9)")
                  }
                >
                  {item.label}
                </a>
              )
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                paddingLeft: 16,
                borderLeft: "1px solid rgba(202,168,92,0.3)",
              }}
            >
              <Phone size={16} style={{ color: "#caa85c", flexShrink: 0 }} />
              <a
                href="tel:15440000"
                style={{
                  fontSize: 24,
                  color: scrolled ? "#0f1d3a" : "white",
                  fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                  fontWeight: 900,
                  letterSpacing: "0.05em",
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#caa85c")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = scrolled ? "#0f1d3a" : "white")
                }
              >
                1544-0000
              </a>
            </div>
          </nav>

          {/* Mobile: Phone icon only */}
          <a
            href="tel:15440000"
            className="mobile-phone-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(202,168,92,0.15)",
              border: "1px solid rgba(202,168,92,0.4)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Phone size={16} style={{ color: "#caa85c" }} />
          </a>
        </div>

        {/* Row 2 (Mobile only): Horizontal nav — 스크롤 시에만 표시 */}
        <div
          className="mobile-nav-row"
          style={{
            backgroundColor: "white",
            borderTop: "1px solid rgba(15,29,58,0.08)",
            boxShadow: "0 2px 8px rgba(15,29,58,0.06)",
            overflow: "hidden",
            maxHeight: scrolled ? 42 : 0,
            transition: "max-height 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              justifyContent: "center",
            }}
          >
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  padding: "10px 16px",
                  fontSize: 13,
                  color: item.highlight ? "#caa85c" : "#0f1d3a",
                  textDecoration: "none",
                  fontFamily: item.highlight
                    ? "'Gothic A1', 'Noto Sans KR', sans-serif"
                    : "'Noto Sans KR', sans-serif",
                  fontWeight: item.highlight ? 800 : 400,
                  letterSpacing: "0.04em",
                  borderRight: "1px solid rgba(15,29,58,0.07)",
                  whiteSpace: "nowrap",
                  position: "relative",
                }}
              >
                {item.label}
                {item.highlight && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      backgroundColor: "#caa85c",
                    }}
                  />
                )}
              </a>
            ))}
          </div>
        </div>
      </header>

      <style>{`
        .pc-nav { display: none !important; }
        .mobile-phone-btn { display: flex !important; }
        .mobile-nav-row { display: block; }
        @media (min-width: 768px) {
          .pc-nav { display: flex !important; }
          .mobile-phone-btn { display: none !important; }
          .mobile-nav-row { display: none !important; }
        }
        .mobile-nav-row div::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
