import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description: string;
}

export const SeoHead: React.FC<SeoHeadProps> = ({ title, description }) => {
  useEffect(() => {
    const fullTitle = `${title} | NIEM — National Institute of Engineering & Management`;
    document.title = fullTitle;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}${window.location.pathname}`);
  }, [title, description]);

  return null;
};
