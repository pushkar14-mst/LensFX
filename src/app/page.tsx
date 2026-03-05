"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createProgram, FILTERS, FRAGMENT_SHADERS } from "../lib/webgl";

export default function VideoFilter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programsRef = useRef<Record<string, WebGLProgram | null>>({});
  const textureRef = useRef<WebGLTexture | null>(null);
  const rafRef = useRef<number>(0);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeFilterRef = useRef("normal");

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) {
      setError("WebGL not supported");
      return;
    }
    glRef.current = gl;

    // Compile all filter programs upfront
    for (const [id, src] of Object.entries(FRAGMENT_SHADERS)) {
      programsRef.current[id] = createProgram(gl, src);
    }

    // Setup geometry (fullscreen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Store buffers on gl context for render loop
    (gl as any)._posBuf = posBuf;
    (gl as any)._texBuf = texBuf;

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;
  }, []);

  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!gl || !video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const program = programsRef.current[activeFilterRef.current];
    if (!program) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    gl.useProgram(program);

    // Upload video frame as texture
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Bind position
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, (gl as any)._posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind texcoord
    const texLoc = gl.getAttribLocation(program, "a_texCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, (gl as any)._texBuf);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Set texture uniform
    const uTex = gl.getUniformLocation(program, "u_texture");
    gl.uniform1i(uTex, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStreaming(true);
      initWebGL();
      rafRef.current = requestAnimationFrame(renderFrame);
    } catch (e) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, [initWebGL, renderFrame]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setStreaming(false);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      stopCamera();
    },
    [stopCamera],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Mono', 'Fira Code', monospace",
        padding: "2rem",
        gap: "2rem",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
            fontWeight: 300,
            color: "#f0f0f0",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          LENS<span style={{ color: "#e63946", fontWeight: 700 }}>FX</span>
        </h1>
        <p
          style={{
            color: "#555",
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            marginTop: "0.4rem",
          }}
        >
          WEBGL VIDEO FILTERS
        </p>
      </div>

      {/* Canvas / Placeholder */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "720px",
          aspectRatio: "16/9",
          background: "#0f0f0f",
          borderRadius: "4px",
          overflow: "hidden",
          border: "1px solid #1a1a1a",
          boxShadow: "0 0 60px rgba(0,0,0,0.8)",
        }}
      >
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          style={{
            width: "100%",
            height: "100%",
            display: streaming ? "block" : "none",
          }}
        />

        {!streaming && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            {/* Camera icon */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#333"
              strokeWidth="1"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p
              style={{
                color: "#333",
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
              }}
            >
              {error ?? "CAMERA INACTIVE"}
            </p>
          </div>
        )}

        {/* Active filter badge */}
        {streaming && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              border: "1px solid #222",
              borderRadius: "2px",
              padding: "0.25rem 0.75rem",
              color: "#e63946",
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {activeFilter}
          </div>
        )}

        {/* Live indicator */}
        {streaming && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              border: "1px solid #222",
              borderRadius: "2px",
              padding: "0.25rem 0.75rem",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#e63946",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <span
              style={{
                color: "#f0f0f0",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
              }}
            >
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Filter selector */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              background: activeFilter === f.id ? "#e63946" : "transparent",
              border: `1px solid ${activeFilter === f.id ? "#e63946" : "#222"}`,
              color: activeFilter === f.id ? "#fff" : "#555",
              padding: "0.4rem 1rem",
              borderRadius: "2px",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontFamily: "inherit",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <button
        onClick={streaming ? stopCamera : startCamera}
        style={{
          background: streaming ? "transparent" : "#e63946",
          border: `1px solid ${streaming ? "#333" : "#e63946"}`,
          color: streaming ? "#555" : "#fff",
          padding: "0.65rem 2.5rem",
          borderRadius: "2px",
          fontSize: "0.75rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "all 0.2s ease",
          fontFamily: "inherit",
        }}
      >
        {streaming ? "STOP CAMERA" : "START CAMERA"}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
