// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
'use client';

import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function Map() {
  return (
    <div className="w-full h-full opacity-60 text-neutral-500 flex items-center justify-center -mt-6">
      <ComposableMap 
        projection="geoMercator" 
        projectionConfig={{ scale: 110, center: [0, 20] }}
        className="w-[110%] h-[110%]"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="currentColor"
                stroke="transparent"
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
