/**
 * Pages module tests
 * 頁面模組測試
 */

import { describe, it, expect } from 'vitest';
import {
  getPage,
  getPageTitle,
  getAllPages,
  getNavItems,
  PRODUCT_FEATURES,
  getProductFeature,
} from '../src/pages/index.js';

describe('Pages', () => {
  it('should have 6 pages', () => {
    expect(getAllPages()).toHaveLength(6);
  });

  it('should have home page', () => {
    const home = getPage('home');
    expect(home).toBeDefined();
    expect(home!.path).toBe('/');
  });

  it('should have features page', () => {
    const features = getPage('features');
    expect(features).toBeDefined();
    expect(features!.path).toBe('/features');
  });

  it('should have pricing page', () => {
    const pricing = getPage('pricing');
    expect(pricing).toBeDefined();
    expect(pricing!.path).toBe('/pricing');
  });

  it('should have docs page', () => {
    const docs = getPage('docs');
    expect(docs).toBeDefined();
    expect(docs!.path).toBe('/docs');
  });

  it('should have guide page', () => {
    const guide = getPage('guide');
    expect(guide).toBeDefined();
    expect(guide!.path).toBe('/guide');
  });

  it('should have about page', () => {
    const about = getPage('about');
    expect(about).toBeDefined();
    expect(about!.path).toBe('/about');
  });

  it('should return undefined for unknown page', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getPage('unknown' as any)).toBeUndefined();
  });

  it('should get English title', () => {
    const title = getPageTitle('home', 'en');
    expect(title).toContain('Panguard AI');
  });

  it('should get Chinese title', () => {
    const title = getPageTitle('home', 'zh-TW');
    expect(title).toContain('Panguard AI');
  });

  it('should fallback to ID for unknown page title', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const title = getPageTitle('unknown' as any, 'en');
    expect(title).toBe('unknown');
  });

  it('should have bilingual titles and descriptions for all pages', () => {
    for (const page of getAllPages()) {
      expect(page.titleEn.length).toBeGreaterThan(0);
      expect(page.titleZh.length).toBeGreaterThan(0);
      expect(page.descriptionEn.length).toBeGreaterThan(0);
      expect(page.descriptionZh.length).toBeGreaterThan(0);
    }
  });

  it('should have unique paths', () => {
    const paths = getAllPages().map((p) => p.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });

  describe('Navigation', () => {
    it('should exclude guide from nav items', () => {
      const navItems = getNavItems();
      expect(navItems.find((p) => p.id === 'guide')).toBeUndefined();
    });

    it('should have 5 nav items', () => {
      expect(getNavItems()).toHaveLength(5);
    });
  });
});

describe('Product Features', () => {
  it('should have 5 product features', () => {
    expect(PRODUCT_FEATURES).toHaveLength(5);
  });

  it('should include all products', () => {
    const products = PRODUCT_FEATURES.map((f) => f.product);
    expect(products).toContain('Panguard Scan');
    expect(products).toContain('Panguard Guard');
    expect(products).toContain('Panguard Chat');
    expect(products).toContain('Panguard Trap');
    expect(products).toContain('Panguard Report');
  });

  it('should get feature by product name', () => {
    const scan = getProductFeature('Panguard Scan');
    expect(scan).toBeDefined();
    expect(scan!.product).toBe('Panguard Scan');
  });

  it('should return undefined for unknown product', () => {
    expect(getProductFeature('Unknown')).toBeUndefined();
  });

  it('should have bilingual content for all features', () => {
    for (const feature of PRODUCT_FEATURES) {
      expect(feature.tagEn.length).toBeGreaterThan(0);
      expect(feature.tagZh.length).toBeGreaterThan(0);
      expect(feature.headlineEn.length).toBeGreaterThan(0);
      expect(feature.headlineZh.length).toBeGreaterThan(0);
      expect(feature.descriptionEn.length).toBeGreaterThan(0);
      expect(feature.descriptionZh.length).toBeGreaterThan(0);
    }
  });

  it('should have highlights for all features', () => {
    for (const feature of PRODUCT_FEATURES) {
      expect(feature.highlightsEn.length).toBeGreaterThan(0);
      expect(feature.highlightsZh.length).toBeGreaterThan(0);
      expect(feature.highlightsEn.length).toBe(feature.highlightsZh.length);
    }
  });
});
