"use client";

import CoreScene from "@/components/mindly/sections/CoreScene";
import Tape from "@/components/mindly/sections/Tape";
import FeatureRows from "@/components/mindly/sections/FeatureRows";

// Вкладка «Возможности»: закреплённая сцена сценария → горизонтальная лента деталей → список фич
export default function FeaturesView() {
  return (
    <>
      <CoreScene />
      <Tape />
      <FeatureRows />
    </>
  );
}
