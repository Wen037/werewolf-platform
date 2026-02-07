import { AppLayout } from "../components/layout/AppLayout";

export default function LobbyPage() {
  return (
    <AppLayout>
      <div className="flex flex-col h-full text-white">
        
        {/* REMOVED: <h1 className="text-3xl font-bold mb-4">Game Map</h1> */}
        
        {/* The Map Container fills the remaining space */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex-1 flex items-center justify-center">
          <p className="text-neutral-500">Google Maps / Game Events will appear here...</p>
        </div>
      </div>
    </AppLayout>
  );
}