import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MetaTags } from '../MetaTags';

describe('MetaTags Component', () => {
  it('updates document.title and canonical link dynamically with Verity brand suffix', () => {
    render(
      <MetaTags
        title="Sample Page"
        description="A plain meta description."
        canonicalPath="/sample"
      />
    );

    expect(document.title).toBe('Sample Page | Verity');
    
    const metaDesc = document.querySelector('meta[name="description"]');
    expect(metaDesc).toHaveAttribute('content', 'A plain meta description.');

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute('href', expect.stringContaining('/sample'));
  });
});
