import { useState, useEffect, useRef, type KeyboardEventHandler } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Search, Menu, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";
import DiscordIcon from "@/components/DiscordIcon";
import BrandMark from "@/components/BrandMark";

type SearchPlayer = {
  id: string;
  username: string;
  avatarUrl: string | null;
  rankKey: string;
  level: number;
};

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const searchRootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 140);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearching } = trpc.player.search.useQuery(
    { query: debouncedQuery, limit: 8 },
    { enabled: debouncedQuery.length >= 1 }
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
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestionList = searchResults ?? [];
  const hasQuery = debouncedQuery.length >= 1;
  const suggestionsVisible = hasQuery && (searchFocused || showSearch);

  const handleSearchPick = (player: SearchPlayer) => {
    setSearchQuery("");
    setDebouncedQuery("");
    setShowSearch(false);
    setSearchFocused(false);
    setActiveSuggestionIndex(-1);
    navigate(`/player/${encodeURIComponent(player.username)}`);
  };

  const handleSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (!suggestionsVisible || suggestionList.length === 0) {
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
      return;
    }
    if (event.key === "Enter" && suggestionList.length > 0) {
      event.preventDefault();
      handleSearchPick(suggestionList[0] as SearchPlayer);
    }
  };

  const navLinks = [
    { label: "Leaderboards", href: "/" },
    { label: "Match History", href: "/matches" },
  ];
  const discordUrl = "https://discord.gg/MDD34Zwk88";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(5, 8, 6, 0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(196, 255, 77, 0.08)" : "1px solid transparent",
        transform: visible ? "translateY(0)" : "translateY(-64px)",
      }}
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 group rounded-lg pr-1 -ml-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mn-lime/80"
        >
          <span className="text-mn-lime transition-transform duration-300 group-hover:scale-[1.04]">
            <BrandMark variant="icon" />
          </span>
          <span className="font-display text-[17px] font-bold tracking-[-0.04em] text-mn-mist">
            Monkey<span className="text-mn-lime">Network</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-[14px] font-medium transition-colors duration-200 relative py-1"
              style={{
                color: location.pathname === link.href ? "#E8EDE5" : "#9BA39A",
              }}
            >
              {link.label}
              {location.pathname === link.href && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-mn-lime rounded-full shadow-[0_0_12px_rgba(196,255,77,0.45)]" />
              )}
            </Link>
          ))}
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-mn-fog transition-colors hover:text-mn-mist hover:bg-[rgba(88,101,242,0.2)] hover:border-[rgba(88,101,242,0.5)]"
            aria-label="Join Discord"
            title="Join Discord"
          >
            <DiscordIcon className="h-4 w-4" />
          </a>
        </div>

        <div className="flex items-center gap-3" ref={searchRootRef}>
          <div className="relative hidden sm:block w-[280px] lg:w-[320px]">
            <div className="flex items-center bg-mn-leaf/90 border border-white/[0.08] rounded-lg px-3 py-2 w-full focus-within:border-mn-lime/50 focus-within:shadow-[0_0_0_1px_rgba(196,255,77,0.12)] transition-all">
              <Search className="w-4 h-4 text-mn-dim shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveSuggestionIndex(-1);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent text-[13px] text-mn-mist placeholder-mn-dim outline-none w-full"
              />
            </div>
            {suggestionsVisible && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-mn-leaf border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 transition-all duration-150">
                {isSearching ? (
                  <div className="px-4 py-3 text-[12px] text-mn-fog">Searching players...</div>
                ) : suggestionList.length === 0 ? (
                  <div className="px-4 py-3 text-[12px] text-mn-fog">No players found for "{debouncedQuery}".</div>
                ) : (
                  suggestionList.map((player, index) => (
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
                          className="text-[13px] font-semibold flex flex-wrap items-center gap-1.5 whitespace-normal break-all"
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
                          <span className="whitespace-normal break-all">{player.username}</span>
                        </p>
                        <p className="text-[11px] text-mn-fog">Press Enter or click to open profile</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="sm:hidden p-2 text-mn-fog hover:text-mn-mist transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-mn-fog hover:text-mn-mist transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="absolute top-16 left-0 right-0 bg-mn-leaf/95 backdrop-blur-xl border-b border-white/[0.07] p-4 sm:hidden">
          <div className="flex items-center bg-mn-moss border border-white/[0.08] rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-mn-dim shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => setSearchFocused(true)}
              className="bg-transparent text-[13px] text-mn-mist placeholder-mn-dim outline-none w-full"
              autoFocus
            />
          </div>
          {suggestionsVisible && (
            <div className="mt-2 max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="px-3 py-2.5 text-[12px] text-mn-fog">Searching players...</div>
              ) : suggestionList.length === 0 ? (
                <div className="px-3 py-2.5 text-[12px] text-mn-fog">No players found for "{debouncedQuery}".</div>
              ) : (
                suggestionList.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSearchPick(player as SearchPlayer)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-mn-leaf transition-colors text-left rounded-lg"
                  >
                    <img
                      src={player.avatarUrl || `https://mc-heads.net/avatar/${player.username}`}
                      alt={player.username}
                      className="w-7 h-7 rounded"
                    />
                    <span className="text-[13px] font-medium flex flex-wrap items-center gap-1.5 whitespace-normal break-all" style={{ color: getNameColor(player.rankKey) }}>
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
                      <span className="whitespace-normal break-all">{player.username}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {showMobileMenu && (
        <div className="absolute top-16 left-0 right-0 bg-mn-void/95 backdrop-blur-xl border-b border-white/[0.07] p-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setShowMobileMenu(false)}
              className="block py-3 text-[14px] font-medium text-mn-fog hover:text-mn-mist transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setShowMobileMenu(false)}
            className="mt-1 flex items-center gap-2 py-3 text-[14px] font-medium text-mn-fog hover:text-mn-mist transition-colors"
          >
            <DiscordIcon className="h-4 w-4" />
            Discord
          </a>
        </div>
      )}
    </nav>
  );
}
