import React from "react";
import { Link } from "react-router-dom";
import { Vortex } from "../components/ui/vortex";

export default function HomePage() {
  return (
    <div className="w-[calc(100%-4rem)] mx-auto rounded-md h-screen overflow-hidden">
      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={500}
        baseHue={220} // Blue/Cold
        
        // FIX: SLOW DOWN THE VORTEX
        baseSpeed={0.02} 
        rangeSpeed={0.5} 
        
        className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-full"
      >
        <h2 className="text-white text-2xl md:text-6xl font-bold text-center tracking-tighter">
          WEREWOLF SG
        </h2>
        
        <p className="text-white text-sm md:text-2xl max-w-xl mt-6 text-center">
          Trust no one. Hunt the night. <br/>
          <span className="text-red-500 font-bold">Survive the vote.</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
          <Link to="/register">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition duration-200 rounded-lg text-white shadow-[0px_2px_0px_0px_#FFFFFF40_inset]">
              Join the village!
            </button>
          </Link>

          <button className="px-4 py-2 text-white hover:text-neutral-300 transition duration-200">
            Find a Game
          </button>
        </div>
      </Vortex>
    </div>
  );
}