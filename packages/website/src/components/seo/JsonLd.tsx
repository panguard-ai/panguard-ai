import { getNonce } from '@/lib/nonce';

/**
 * Generic server component that injects a JSON-LD script tag.
 *
 * Pulls the request nonce from headers() so CSP allows the inline script
 * without falling back to 'unsafe-inline'. JSON.stringify with no whitespace
 * is preferred — Google's parser is whitespace-tolerant, smaller bytes win.
 *
 * Usage:
 *   <JsonLd data={softwareAppSchema} />
 *   <JsonLd data={[orgSchema, productSchema]} />  // arrays auto-flatten to multiple <script> tags
 */
export default async function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const nonce = await getNonce();
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, i) => (
        <script
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
