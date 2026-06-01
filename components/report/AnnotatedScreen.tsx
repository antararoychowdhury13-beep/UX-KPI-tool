"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Label, Tag, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { Annotation } from "@/types/report";

const W = 300;
const H = 168;

// Interactive Konva annotation canvas over the real before/after screenshot (falls back to a
// labelled placeholder when no image is available). Drag to draw rectangle annotations.
export default function AnnotatedScreen({
  label,
  tone,
  initial,
  imageUrl,
  onChange,
}: {
  label: string;
  tone: "before" | "after";
  initial: Annotation[];
  imageUrl?: string | null;
  onChange: (annotations: Annotation[]) => void;
}) {
  const [rects, setRects] = useState<Annotation[]>(initial);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const after = tone === "after";
  const bg = after ? "#bcd6f2" : "#d4d4d0";

  // Load the screenshot into an HTMLImageElement for the Konva <Image>.
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!imageUrl) {
      setImg(null);
      return;
    }
    const im = new window.Image();
    im.src = imageUrl;
    im.onload = () => setImg(im);
    im.onerror = () => setImg(null);
    return () => {
      im.onload = null;
      im.onerror = null;
    };
  }, [imageUrl]);

  // Cover-fit the image within the canvas (overflow is clipped by the canvas element).
  let imgProps: { x: number; y: number; width: number; height: number } | null = null;
  if (img) {
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    imgProps = { x: (W - dw) / 2, y: (H - dh) / 2, width: dw, height: dh };
  }

  function pos(e: Konva.KonvaEventObject<MouseEvent>) {
    const p = e.target.getStage()?.getPointerPosition();
    return p ?? { x: 0, y: 0 };
  }

  function onDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const p = pos(e);
    drawing.current = p;
    setRects((r) => [
      ...r,
      { id: `${Date.now()}`, type: "rect", x: p.x, y: p.y, width: 0, height: 0, color: "#e24b4a" },
    ]);
  }

  function onMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawing.current) return;
    const p = pos(e);
    setRects((r) => {
      const next = [...r];
      const last = next[next.length - 1];
      last.width = p.x - drawing.current!.x;
      last.height = p.y - drawing.current!.y;
      return next;
    });
  }

  function onUp() {
    if (!drawing.current) return;
    drawing.current = null;
    setRects((r) => {
      // Drop zero-size accidental clicks.
      const cleaned = r.filter((a) => Math.abs(a.width ?? 0) > 4 && Math.abs(a.height ?? 0) > 4);
      onChange(cleaned);
      return cleaned;
    });
  }

  function clear() {
    setRects([]);
    onChange([]);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--text3)" }}>{label}</span>
        {rects.length > 0 && (
          <button onClick={clear} style={{ fontSize: 9, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            clear
          </button>
        )}
      </div>
      <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", width: W }}>
        <Stage width={W} height={H} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} style={{ cursor: "crosshair" }}>
          <Layer>
            {imgProps ? (
              <KonvaImage image={img!} x={imgProps.x} y={imgProps.y} width={imgProps.width} height={imgProps.height} />
            ) : (
              <>
                <Rect x={0} y={0} width={W} height={H} fill={bg} />
                <Text
                  x={0}
                  y={H / 2 - 8}
                  width={W}
                  align="center"
                  text={after ? "Redesigned flow" : "Legacy flow"}
                  fontSize={11}
                  fill={after ? "#185fa5" : "#777"}
                  fontFamily="Instrument Sans"
                />
              </>
            )}
            {rects.map((a, i) => (
              <Rect
                key={a.id}
                x={a.x}
                y={a.y}
                width={a.width}
                height={a.height}
                stroke={a.color}
                strokeWidth={2}
                dash={[4, 3]}
              />
            ))}
            {rects.map((a, i) => (
              <Label key={`l-${a.id}`} x={a.x} y={a.y}>
                <Tag fill="#e24b4a" cornerRadius={3} />
                <Text text={String(i + 1)} fontSize={9} fill="#fff" padding={3} fontFamily="DM Mono" />
              </Label>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
