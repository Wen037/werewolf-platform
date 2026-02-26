import { AppLayout } from "../components/layout/AppLayout";
import GameMapPage from "./GameMapPage"; // We reuse the map component

export default function LobbyPage() {
  return (
    <AppLayout>
      <div className="w-full h-full relative rounded-br-3xl overflow-hidden">
        {/* Render the Map Component directly inside the layout slot */}
        <GameMapPage />
      </div>
    </AppLayout>
  );
}