type OfficialDocHeaderProps = {
  title: string;
  subtitle?: string;
  logoSize?: number;
};

export function OfficialDocHeader({ title, subtitle, logoSize = 96 }: OfficialDocHeaderProps) {
  return (
    <header className="official-doc-header">
      <div className="official-doc-republic">Republic of the Philippines</div>
      <div className="official-doc-province">Province of Palawan</div>
      <img
        src="/logo.png"
        alt="Official Seal of the Municipality of Dr. Jose P. Rizal"
        width={logoSize}
        height={logoSize}
        className="official-doc-logo"
      />
      <div className="official-doc-lgu">Municipality of Dr. Jose P. Rizal</div>
      <div className="official-doc-office">Municipal Fisherfolk & Boat Permit System (MFARPS)</div>
      <h1 className="official-doc-title">{title}</h1>
      {subtitle ? <p className="official-doc-subtitle">{subtitle}</p> : null}
    </header>
  );
}
