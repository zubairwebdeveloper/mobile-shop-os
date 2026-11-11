import { cn } from "@/lib/utils";

// Stylised vector device art used as the image fallback until real product photos are
// uploaded to Firebase Storage (Phase 04). Pure SVG: zero network cost, crisp at any size.
function Phone({ color, view }) {
  if (view === "side") {
    return (
      <>
        <rect x="93" y="20" width="14" height="200" rx="7" fill={color} />
        <rect x="93" y="20" width="14" height="200" rx="7" fill="#fff" opacity="0.12" />
        <rect x="106" y="70" width="2.5" height="26" rx="1" fill="#000" opacity="0.35" />
      </>
    );
  }
  if (view === "back") {
    return (
      <>
        <rect x="58" y="18" width="84" height="204" rx="16" fill={color} />
        <rect x="58" y="18" width="84" height="204" rx="16" fill="#fff" opacity="0.1" />
        <rect x="66" y="26" width="38" height="44" rx="10" fill="#0b1220" opacity="0.85" />
        <circle cx="77" cy="38" r="6.5" fill="#1d2740" stroke="#394a70" strokeWidth="1.5" />
        <circle cx="94" cy="38" r="6.5" fill="#1d2740" stroke="#394a70" strokeWidth="1.5" />
        <circle cx="85.5" cy="57" r="6.5" fill="#1d2740" stroke="#394a70" strokeWidth="1.5" />
        <circle cx="100" cy="56" r="2.2" fill="#fff" opacity="0.8" />
      </>
    );
  }
  return (
    <>
      <rect x="58" y="18" width="84" height="204" rx="16" fill={color} />
      <rect x="63" y="23" width="74" height="194" rx="12" fill="#0b1220" />
      <rect x="63" y="23" width="74" height="194" rx="12" fill={color} opacity="0.35" />
      <rect x="63" y="140" width="74" height="77" rx="12" fill="#2563eb" opacity="0.25" />
      <rect x="86" y="30" width="28" height="7" rx="3.5" fill="#000" />
      <rect x="72" y="60" width="40" height="5" rx="2.5" fill="#fff" opacity="0.5" />
      <rect x="72" y="72" width="28" height="4" rx="2" fill="#fff" opacity="0.3" />
      <rect x="72" y="92" width="56" height="30" rx="8" fill="#fff" opacity="0.12" />
    </>
  );
}

function Tablet({ color, view }) {
  const w = view === "side" ? 12 : 150;
  const x = 100 - w / 2;
  return (
    <>
      <rect x={x} y="35" width={w} height="170" rx={view === "side" ? 6 : 14} fill={color} />
      {view === "front" && (
        <>
          <rect x="30" y="42" width="140" height="156" rx="9" fill="#0b1220" />
          <rect x="30" y="42" width="140" height="156" rx="9" fill={color} opacity="0.3" />
          <rect x="44" y="60" width="60" height="6" rx="3" fill="#fff" opacity="0.5" />
          <rect x="44" y="76" width="90" height="40" rx="8" fill="#fff" opacity="0.12" />
        </>
      )}
      {view === "back" && <circle cx="52" cy="58" r="8" fill="#0b1220" opacity="0.8" />}
    </>
  );
}

function Watch({ color, view }) {
  return (
    <>
      <rect x="78" y="14" width="44" height="212" rx="14" fill="#25262b" />
      <rect x="64" y="72" width="72" height="96" rx="24" fill={color} />
      {view !== "back" ? (
        <>
          <rect x="70" y="78" width="60" height="84" rx="19" fill="#0b1220" />
          <text x="100" y="128" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff" fontFamily="sans-serif">
            10:09
          </text>
          <rect x="137" y="100" width="4" height="18" rx="2" fill={color} />
        </>
      ) : (
        <circle cx="100" cy="120" r="22" fill="#0b1220" opacity="0.8" />
      )}
    </>
  );
}

function Earbuds({ color }) {
  return (
    <>
      <rect x="50" y="95" width="100" height="95" rx="30" fill={color} />
      <rect x="50" y="95" width="100" height="95" rx="30" fill="#000" opacity="0.06" />
      <rect x="50" y="130" width="100" height="3" fill="#000" opacity="0.15" />
      <circle cx="100" cy="165" r="5" fill="#2563eb" opacity="0.8" />
      <rect x="62" y="40" width="26" height="62" rx="13" fill={color} stroke="#000" strokeOpacity="0.1" />
      <rect x="112" y="40" width="26" height="62" rx="13" fill={color} stroke="#000" strokeOpacity="0.1" />
    </>
  );
}

function Charger({ color }) {
  return (
    <>
      <rect x="86" y="30" width="6" height="26" rx="2" fill="#9aa4b5" />
      <rect x="108" y="30" width="6" height="26" rx="2" fill="#9aa4b5" />
      <rect x="62" y="56" width="76" height="110" rx="16" fill={color} />
      <rect x="62" y="56" width="76" height="110" rx="16" fill="#fff" opacity="0.08" />
      <rect x="78" y="112" width="44" height="12" rx="6" fill="#000" opacity="0.5" />
      <rect x="78" y="132" width="44" height="12" rx="6" fill="#000" opacity="0.5" />
    </>
  );
}

function PowerBank({ color }) {
  return (
    <>
      <rect x="55" y="30" width="90" height="180" rx="18" fill={color} />
      <rect x="55" y="30" width="90" height="180" rx="18" fill="#fff" opacity="0.08" />
      <rect x="72" y="52" width="56" height="26" rx="6" fill="#0b1220" />
      <text x="100" y="70" textAnchor="middle" fontSize="13" fontWeight="700" fill="#16a085" fontFamily="sans-serif">
        86%
      </text>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={78 + i * 15} cy="102" r="3" fill="#16a085" />
      ))}
      <rect x="82" y="196" width="36" height="8" rx="3" fill="#000" opacity="0.4" />
    </>
  );
}

export function ProductImage({ shape = "phone", color = "#64748b", view = "front", className, label }) {
  const Art =
    { phone: Phone, tablet: Tablet, watch: Watch, earbuds: Earbuds, charger: Charger, powerbank: PowerBank }[
      shape
    ] ?? Phone;

  return (
    <div
      className={cn(
        "relative grid aspect-square place-items-center overflow-hidden bg-[radial-gradient(70%_70%_at_50%_40%,rgb(37_99_235/0.10),transparent)] bg-muted/50",
        className,
      )}
    >
      <svg
        viewBox="0 0 200 240"
        role="img"
        aria-label={label || "Product illustration"}
        className="h-[86%] w-auto drop-shadow-[0_18px_24px_rgb(16_24_39/0.25)]"
      >
        <Art color={color} view={view} />
      </svg>
    </div>
  );
}
