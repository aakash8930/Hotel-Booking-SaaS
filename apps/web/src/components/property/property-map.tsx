/** Static OpenStreetMap embed — no API key required. Renders nothing if the property has no coordinates. */
export function PropertyMap({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  if (latitude == null || longitude == null) return null;

  const delta = 0.01;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}&layer=mapnik`;

  return (
    <div className="card overflow-hidden p-0">
      <iframe
        title="Property location"
        src={src}
        className="w-full h-56 grayscale-[15%] contrast-[1.05]"
        loading="lazy"
      />
      <a
        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-surface-500 hover:text-brand-300 py-2 border-t border-surface-200 transition-colors"
      >
        View larger map
      </a>
    </div>
  );
}
