'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { Product } from '@/lib/products';

export type ProductCardData = Product;

interface ProductGridProps {
  products: ProductCardData[];
  sectionTitle?: string;
}

function ProductCard({ product, index }: { product: ProductCardData; index: number }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} border border-white/10 p-8 hover:border-white/25 transition-all duration-300`}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <h3
        className="text-xl font-normal text-white mb-3"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {product.title}
      </h3>
      <p
        className="text-accent text-sm mb-3 font-light"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {product.tagline}
      </p>
      <p
        className="text-white/70 text-sm mb-4 font-light leading-relaxed"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {product.description}
      </p>
      <p
        className="text-white/50 text-xs font-light"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {product.features.join(' • ')}
      </p>
    </div>
  );
}

export function ProductGrid({ products, sectionTitle = 'And much more' }: ProductGridProps) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className={`animate-on-scroll ${isVisible ? 'is-visible' : ''} py-24 px-6 md:px-16 lg:px-24`}
      style={{ background: '#050505' }}
    >
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-5xl md:text-6xl font-normal text-white text-center mb-6"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {sectionTitle}
        </h2>
        <p
          className="text-white/60 text-center max-w-2xl mx-auto mb-16 text-lg font-light"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Explore the full suite of tools designed to accelerate your AI adoption journey.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
