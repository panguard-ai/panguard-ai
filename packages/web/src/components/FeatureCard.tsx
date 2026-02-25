import type { ProductFeature } from '@openclaw/panguard-web';
import { useLanguage } from '../context/LanguageContext';

interface FeatureCardProps {
  feature: ProductFeature;
}

export default function FeatureCard({ feature }: FeatureCardProps) {
  const { language } = useLanguage();
  const tag = language === 'en' ? feature.tagEn : feature.tagZh;
  const headline = language === 'en' ? feature.headlineEn : feature.headlineZh;
  const description = language === 'en' ? feature.descriptionEn : feature.descriptionZh;
  const highlights = language === 'en' ? feature.highlightsEn : feature.highlightsZh;

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-0.5 text-xs font-medium text-brand-cyan">
          {tag}
        </span>
        <span className="font-mono text-sm font-bold text-brand-text">{feature.product}</span>
      </div>
      <h3 className="mb-2 text-xl font-semibold">{headline}</h3>
      <p className="mb-4 text-sm text-brand-muted">{description}</p>
      <ul className="space-y-1.5">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-brand-muted">
            <span className="mt-0.5 text-brand-cyan">+</span>
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}
