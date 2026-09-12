"use client";

import styles from "@/app/page.module.css";

interface Loader3DProps {
  message?: string;
  modelLoading?: boolean;
  modelProgress?: number;
}

const loaderBox = (
  <div className={styles.loader3DWrapper}>
    <div className={styles.loader3DBox}>
      <div className={styles.loader3DFace}></div>
      <div className={styles.loader3DFace}></div>
      <div className={styles.loader3DFace}></div>
      <div className={styles.loader3DFace}></div>
      <div className={styles.loader3DFace}></div>
      <div className={styles.loader3DFace}></div>
    </div>
  </div>
);

export function Loader3D({ message, modelLoading = false, modelProgress = 0 }: Loader3DProps) {
  const showMessage = message != null && message !== "";
  const showProgress = modelLoading && modelProgress > 0;

  if (!showMessage && !showProgress) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "70vh",
        }}
      >
        {loaderBox}
      </div>
    );
  }

  return (
    <div className={styles.loader3DRow}>
      <div className={styles.loader3DLeft}>
        {showProgress && (
          <div className={styles.modelProgressContainer}>
            <div className={styles.modelProgressBar}>
              <div
                className={styles.modelProgressFill}
                style={{ width: `${modelProgress}%` }}
              />
            </div>
            <span className={styles.modelProgressText}>
              Downloading model: {modelProgress}%
            </span>
          </div>
        )}
        {loaderBox}
      </div>
      {showMessage && (
        <div className={styles.loader3DRight}>
          <p className={styles.loader3DText}>{message}</p>
        </div>
      )}
    </div>
  );
}
