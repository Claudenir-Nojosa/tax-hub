"use client";

import { forwardRef } from "react";
import styles from "./Bizus.module.css";
import { bizuAvatarSrc, type Bizu } from "./types";
import { htmlToPlainText, type WhiteboardNode } from "./whiteboard-model";

interface BizuPosterProps {
  bizu: Bizu;
  className?: string;
  decorative?: boolean;
}

function center(node: WhiteboardNode) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

const BizuPoster = forwardRef<HTMLElement, BizuPosterProps>(function BizuPoster(
  { bizu, className = "", decorative = false },
  ref
) {
  const documento = bizu.documento;
  return (
    <article
      ref={ref}
      className={styles.miniWhiteboard + " " + className}
      style={{ backgroundColor: documento.background }}
      aria-label={decorative ? undefined : "Miniatura do mapa mental " + bizu.titulo}
      aria-hidden={decorative || undefined}
    >
      <div className={styles.miniWhiteboardGrid} data-grid={documento.grid} aria-hidden="true" />
      <svg
        className={styles.miniConnections}
        viewBox={"0 0 " + documento.width + " " + documento.height}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {documento.connections.map((connection) => {
          const from = documento.nodes.find((node) => node.id === connection.from);
          const to = documento.nodes.find((node) => node.id === connection.to);
          if (!from || !to) return null;
          const start = center(from);
          const end = center(to);
          return (
            <path
              key={connection.id}
              d={
                "M " +
                start.x +
                " " +
                start.y +
                " C " +
                start.x +
                " " +
                end.y +
                ", " +
                end.x +
                " " +
                start.y +
                ", " +
                end.x +
                " " +
                end.y
              }
              fill="none"
              stroke={connection.color}
              strokeWidth={Math.max(6, connection.width * 2)}
              opacity="0.72"
            />
          );
        })}
      </svg>

      {documento.nodes.map((node) => (
        <div
          className={styles.miniNode}
          data-kind={node.kind}
          data-role={node.role}
          key={node.id}
          style={{
            left: (node.x / documento.width) * 100 + "%",
            top: (node.y / documento.height) * 100 + "%",
            width: (node.width / documento.width) * 100 + "%",
            height: (node.height / documento.height) * 100 + "%",
            color: node.style.color,
            backgroundColor: node.style.background,
            borderColor: node.style.borderColor,
          }}
        >
          {node.kind === "image" && node.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.imageUrl}
              alt=""
              style={{ objectFit: node.imageFit || "cover" }}
            />
          ) : (
            <span>{htmlToPlainText(node.html)}</span>
          )}
        </div>
      ))}

      <div
        className={styles.miniAvatar}
        data-side={documento.avatar.side}
        style={{ width: (documento.avatar.width / documento.width) * 100 + "%" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bizuAvatarSrc(documento.avatar.pose)} alt="" />
      </div>
    </article>
  );
});

export default BizuPoster;
