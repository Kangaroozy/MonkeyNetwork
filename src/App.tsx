import { Routes, Route } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlayerStatsModal from "@/components/PlayerStatsModal";
import Home from "@/pages/Home";
import PlayerProfile from "@/pages/PlayerProfile";
import MatchHistory from "@/pages/MatchHistory";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
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
  );
}
