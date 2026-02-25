import type { PersonaProfile } from '@openclaw/panguard-web';
import { useLanguage } from '../context/LanguageContext';

interface PersonaCardProps {
  persona: PersonaProfile;
}

export default function PersonaCard({ persona }: PersonaCardProps) {
  const { language } = useLanguage();
  const name = language === 'en' ? persona.nameEn : persona.nameZh;
  const description = language === 'en' ? persona.descriptionEn : persona.descriptionZh;
  const painPoints = language === 'en' ? persona.painPointsEn : persona.painPointsZh;

  return (
    <div className="card group">
      <h3 className="mb-2 text-lg font-semibold text-brand-text group-hover:text-brand-cyan">
        {name}
      </h3>
      <p className="mb-4 text-sm text-brand-muted">{description}</p>
      <ul className="space-y-2">
        {painPoints.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-brand-muted">
            <span className="mt-1 text-brand-cyan/60">-</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
