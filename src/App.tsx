import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlayerStatsModal from "@/components/PlayerStatsModal";
import Home from "@/pages/Home";
import PlayerProfile from "@/pages/PlayerProfile";
import MatchHistory from "@/pages/MatchHistory";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen mn-page-bg relative">
      <div className="pointer-events-none fixed inset-0 mn-grid-overlay z-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 mn-noise z-0 mix-blend-overlay" aria-hidden />
      <div className="relative z-10">
        <ScrollToTop />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/matches" element={<MatchHistory />} />
            <Route path="/player/:username" element={<PlayerProfile />} />
          </Routes>
        </main>
        <PlayerStatsModal />
        <Footer />
      </div>
    </div>
  );
}
