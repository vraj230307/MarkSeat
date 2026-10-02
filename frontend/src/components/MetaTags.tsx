import React, { useEffect } from 'react';

interface MetaTagsProps {
  title: string;
  description: string;
  canonicalPath?: string;
}

export const MetaTags: React.FC<MetaTagsProps> = ({ title, description, canonicalPath = '' }) => {
  useEffect(() => {
    // Set document title
    document.title = `${title} | Verity`;

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Set canonical link
    const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    const canonicalUrl = `${cleanBase}${cleanPath === '/' ? '' : cleanPath}`;

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', canonicalUrl);
  }, [title, description, canonicalPath]);

  return null;
};
