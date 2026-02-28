import FadeInUp from '../FadeInUp';

export default function SectionTitle({
  overline,
  title,
  subtitle,
  center = true,
  serif = false,
}: {
  overline?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  serif?: boolean;
}) {
  const align = center ? 'text-center mx-auto' : '';
  return (
    <FadeInUp className={`max-w-2xl ${align}`}>
      {overline && (
        <div className={`mb-4 ${center ? 'flex flex-col items-center' : ''}`}>
          <div className="w-8 h-[2px] bg-brand-sage rounded-full mb-3" />
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand-sage font-semibold">
            {overline}
          </p>
        </div>
      )}
      <h2
        className={`text-[clamp(36px,4vw,48px)] text-text-primary leading-[1.1] ${
          serif ? 'font-display italic' : 'font-bold'
        }`}
      >
        {title}
      </h2>
      {subtitle && <p className="text-text-secondary mt-4 leading-relaxed">{subtitle}</p>}
    </FadeInUp>
  );
}
