# LensFX — WebGL Video Filters

A Next.js component that captures live webcam video and applies real-time filters using WebGL fragment shaders.

## How it works

Each video frame is uploaded to the GPU as a WebGL texture via `texImage2D`. A GLSL fragment shader runs per-pixel on every frame, applying the selected filter entirely on the GPU. All 7 shader programs are compiled once on mount and cached — switching filters is just a program swap with no recompile.

## Filters

| Filter    | Effect                          |
| --------- | ------------------------------- |
| Normal    | Passthrough                     |
| Grayscale | Luminance-weighted desaturation |
| Sepia     | Classic warm brown tone         |
| Invert    | Inverts all RGB channels        |
| Vignette  | Darkens edges toward center     |
| Cold      | Boosts blue, reduces red        |
| Warm      | Boosts red, reduces blue        |

## Setup

Drop `VideoFilter.tsx` into your Next.js app:

```tsx
// app/page.tsx
import VideoFilter from "@/components/VideoFilter";

export default function Page() {
  return <VideoFilter />;
}
```

Optionally add `DM Mono` to your `layout.tsx` for the full look:

```tsx
import { DM_Mono } from "next/font/google";
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["300", "400"] });
```

## Requirements

- Next.js 13+ (App Router)
- Browser with WebGL and `getUserMedia` support
- Camera permission

## Stack

- Next.js + React + TypeScript
- WebGL
- GLSL fragment shaders
