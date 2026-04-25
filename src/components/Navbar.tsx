import { useState, useEffect, useRef, type KeyboardEventHandler } from "react";
import { Link, useLocation } from "react-router";
import { Search, Menu, X, Crown } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { openPlayerModal } from "@/lib/playerModal";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";

type SearchPlayer = {
  id: string;
  username: string;
  avatarUrl: string | null;
  rankKey: string;
  level: number;
};

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const { data: searchResults } = trpc.player.search.useQuery(
    { query: searchQuery, limit: 8 },
    { enabled: searchQuery.trim().length >= 1 }
  );
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 100);
      setVisible(currentY < lastScrollY || currentY < 100);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRootRef.current && !searchRootRef.current.contains(event.target as Node)) {
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestionList = searchResults ?? [];
  const suggestionsVisible = searchQuery.trim().length >= 1 && suggestionList.length > 0;

  const handleSearchPick = (player: SearchPlayer) => {
    setSearchQuery("");
    setShowSearch(false);
    setActiveSuggestionIndex(-1);
    openPlayerModal(player.username);
  };

  const handleSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (!suggestionsVisible) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev + 1) % suggestionList.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => (prev <= 0 ? suggestionList.length - 1 : prev - 1));
      return;
    }
    if (event.key === "Enter" && activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestionList.length) {
      event.preventDefault();
      handleSearchPick(suggestionList[activeSuggestionIndex] as SearchPlayer);
    }
  };

  const navLinks = [
    { label: "Leaderboards", href: "/" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(10, 10, 11, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid transparent",
        transform: visible ? "translateY(0)" : "translateY(-64px)",
      }}
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Crown className="w-5 h-5 text-[#D4A843]" />
          <span className="text-[18px] font-extrabold tracking-[0.08em] text-[#F0F0F2]">
            MonkeyNetwork
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-[14px] font-medium transition-colors duration-200 relative py-1"
              style={{
                color: location.pathname === link.href ? "#F0F0F2" : "#8A8A95",
              }}
            >
              {link.label}
              {location.pathname === link.href && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4A843] rounded-full" />
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3" ref={searchRootRef}>
          <div className="relative hidden sm:block w-[320px]">
            <div className="flex items-center bg-[#1A1A1F] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 w-full focus-within:border-[#D4A843] transition-colors">
              <Search className="w-4 h-4 text-[#5A5A65] shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveSuggestionIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent text-[13px] text-[#F0F0F2] placeholder-[#5A5A65] outline-none w-full"
              />
            </div>
            {suggestionsVisible && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-[#1A1A1F] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden shadow-2xl transition-all duration-150">
                {suggestionList.map((player, index) => (
                  <button
                    key={player.id}
                    onClick={() => handleSearchPick(player as SearchPlayer)}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                    style={{
                      backgroundColor: activeSuggestionIndex === index ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                  >
                    <img
                      src={player.avatarUrl || `https://mc-heads.net/avatar/${player.username}`}
                      alt={player.username}
                      className="w-8 h-8 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-semibold truncate flex items-center gap-1.5"
                        style={{ color: getNameColor(player.rankKey) }}
                      >
                        <span style={{ color: getLevelColor(player.level) }}>{player.level}</span>
                        <img src={getStarIconPath(player.level)} alt="" className="w-3.5 h-3.5 object-contain" />
                        {getRankIconPath(player.rankKey) && (
                          <img
                            src={getRankIconPath(player.rankKey)}
                            alt=""
                            className="h-5 w-auto object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                        )}
                        <span className="truncate">{player.username}</span>
                      </p>
                      <p className="text-[11px] text-[#8A8A95]">Press Enter or click to preview</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="sm:hidden p-2 text-[#8A8A95] hover:text-[#F0F0F2] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-[#8A8A95] hover:text-[#F0F0F2] transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="absolute top-16 left-0 right-0 bg-[#1A1A1F] border-b border-[rgba(255,255,255,0.06)] p-4 sm:hidden">
          <div className="flex items-center bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-[#5A5A65] shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSuggestionIndex(-1);
              }}
              className="bg-transparent text-[13px] text-[#F0F0F2] placeholder-[#5A5A65] outline-none w-full"
              autoFocus
            />
          </div>
          {suggestionsVisible && (
            <div className="mt-2 max-h-[300px] overflow-y-auto">
              {suggestionList.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSearchPick(player as SearchPlayer)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#222228] transition-colors text-left rounded-lg"
                >
                  <img
                    src={player.avatarUrl || `https://mc-heads.net/avatar/${player.username}`}
                    alt={player.username}
                    className="w-7 h-7 rounded"
                  />
                  <span className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: getNameColor(player.rankKey) }}>
                    <span style={{ color: getLevelColor(player.level) }}>{player.level}</span>
                    <img src={getStarIconPath(player.level)} alt="" className="w-3.5 h-3.5 object-contain" />
                    {getRankIconPath(player.rankKey) && (
                      <img
                        src={getRankIconPath(player.rankKey)}
                        alt=""
                        className="h-5 w-auto object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    )}
                    <span>{player.username}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showMobileMenu && (
        <div className="absolute top-16 left-0 right-0 bg-[rgba(10,10,11,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)] p-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setShowMobileMenu(false)}
              className="block py-3 text-[14px] font-medium text-[#8A8A95] hover:text-[#F0F0F2] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
