import "./WalletLoader.css";

interface WalletLoaderProps {
  /** Scales the 110x80 wallet down (or up); 1 = original size. */
  scale?: number;
}

export default function WalletLoader({ scale = 0.7 }: WalletLoaderProps) {
  return (
    <div style={{ width: 110 * scale, height: 80 * scale }}>
      <div
        className="wallet-loader"
        style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        role="img"
        aria-label="Loading"
      >
        <div className="wallet-back" />
        <div className="bill bill-1" />
        <div className="bill bill-2" />
        <div className="bill bill-3" />
        <div className="wallet-front">
          <span className="text">
            Loading
            <span className="dot">.</span>
            <span className="dot">.</span>
            <span className="dot">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
