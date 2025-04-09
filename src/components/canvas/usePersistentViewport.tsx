"use client";

import { useEffect } from "react";
import { useViewport, useReactFlow } from "reactflow";

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export function usePersistentViewport(
  roomId: string,
  prefix = "react-flow-viewport"
) {
  // Create a unique storage key for each room
  const storageKey = `${prefix}-${roomId}`;
  const viewport = useViewport();
  const { setViewport } = useReactFlow();

  // Save viewport state when it changes
  useEffect(() => {
    if (!viewport) return;

    // Debounce the save to avoid excessive writes
    const timeoutId = setTimeout(() => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        })
      );
      console.log(`Saved viewport for room ${roomId}:`, viewport);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [viewport, storageKey, roomId]);

  // Restore viewport state on component mount
  useEffect(() => {
    const savedViewport = localStorage.getItem(storageKey);

    if (savedViewport) {
      try {
        const parsedViewport = JSON.parse(savedViewport) as ViewportState;

        // Validate the viewport data before applying
        if (
          typeof parsedViewport.x === "number" &&
          typeof parsedViewport.y === "number" &&
          typeof parsedViewport.zoom === "number" &&
          parsedViewport.zoom > 0
        ) {
          // Use a slight delay to ensure React Flow is fully initialized
          setTimeout(() => {
            setViewport({
              x: parsedViewport.x,
              y: parsedViewport.y,
              zoom: parsedViewport.zoom,
            });
            console.log(
              `Restored viewport for room ${roomId}:`,
              parsedViewport
            );
          }, 100);
        }
      } catch (error) {
        console.error(
          `Failed to parse saved viewport for room ${roomId}:`,
          error
        );
        localStorage.removeItem(storageKey);
      }
    }
  }, [setViewport, storageKey, roomId]);
}

export const PersistentViewport = ({ roomId }: { roomId: string }) => {
  usePersistentViewport(roomId);
  return null;
};
