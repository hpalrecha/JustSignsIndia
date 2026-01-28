export function ScrollingTicker() {
  const partnerUrl = "https://erp.justsigns.co.in/become-3m-select-partner/new";
  const message = "Become 3M Select Partner - Application Now Open";

  return (
    <div className="bg-black text-white py-2 overflow-hidden">
      <a 
        href={partnerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        data-testid="link-ticker-partner"
      >
        <div className="flex animate-scroll-left whitespace-nowrap">
          {[...Array(10)].map((_, index) => (
            <span key={index} className="mx-8 text-sm font-medium">
              {message}
            </span>
          ))}
        </div>
      </a>
    </div>
  );
}
