import Image from "next/image";
import React, { useEffect, useState } from "react";

import movingImage from "@/app/services/avatar/moving.jpg";
import stillImage from "@/app/services/avatar/still.jpg";

interface RobotAvatarProps {
  isSpeaking?: boolean;
  state?: "idle" | "listening" | "thinking" | "speaking";
  toggleSpeed?: number;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  isSpeaking = false,
  state = "idle",
  toggleSpeed = 200,
}) => {
  const [currentImage, setCurrentImage] = useState<"moving" | "still">("moving");

  // Toggle between images when speaking
  useEffect(() => {
    if (state === "speaking") {
      const interval = setInterval(() => {
        setCurrentImage((prev) => (prev === "still" ? "moving" : "still"));
      }, toggleSpeed);

      return () => clearInterval(interval);
    }

    // When not speaking, always show moving image
    setCurrentImage("moving");
  }, [state, toggleSpeed, isSpeaking]);

  const getImageSrc = () => (currentImage === "still" ? stillImage : movingImage);

  return (
    <div
      style={{
        width: "200px",
        height: "200px",
        borderRadius: "50%",
        background:
          state === "speaking"
            ? "#10b981"
            : state === "listening"
              ? "#3b82f6"
              : state === "thinking"
                ? "#f59e0b"
                : "#6b7280",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        transition: `all ${toggleSpeed}ms ease-in-out`,
        animation: state === "speaking" ? "pulse 1s infinite" : "none",
        boxShadow:
          state === "speaking" ? "0 0 20px rgba(16, 185, 129, 0.5)" : "none",
        overflow: "hidden",
      }}
    >
      <Image
        src={getImageSrc()}
        alt="Robot Avatar"
        width={200}
        height={200}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "50%",
          transition: `opacity ${toggleSpeed}ms ease-in-out`,
        }}
      />
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

