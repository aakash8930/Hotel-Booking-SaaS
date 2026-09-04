export function StarRating({
  rating,
  size = 'md',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = { sm: 'text-xs', md: 'text-base', lg: 'text-xl' };
  const rounded = Math.round(rating);

  return (
    <span className={`inline-flex ${sizeClasses[size]} tracking-tight`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? 'text-brand-400' : 'text-surface-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

interface InteractiveStarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

export function InteractiveStarRating({ value, onChange }: InteractiveStarRatingProps) {
  return (
    <div className="flex gap-1 text-3xl">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`transition-colors ${i <= value ? 'text-brand-400' : 'text-surface-300 hover:text-brand-300'}`}
          aria-label={`Rate ${i} out of 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
