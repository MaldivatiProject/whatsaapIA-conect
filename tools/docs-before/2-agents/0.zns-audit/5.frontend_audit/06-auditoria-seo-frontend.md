# Prompt: Auditoría de SEO Frontend

---

## 🎯 Objetivo

Optimizar el SEO técnico del frontend para mejorar visibilidad en motores de búsqueda, asegurando meta tags, structured data, sitemap, robots.txt y Core Web Vitals.

---

## 📋 Checklist SEO

### 1. Meta Tags Esenciales
- [ ] `<title>` único por página (<60 chars)
- [ ] `<meta name="description">` (<160 chars)
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Twitter Cards
- [ ] Canonical URLs
- [ ] hreflang (multi-idioma)

### 2. Structured Data (Schema.org)
- [ ] JSON-LD implementado
- [ ] Product schema (e-commerce)
- [ ] Article schema (blog)
- [ ] Organization schema
- [ ] BreadcrumbList schema

### 3. Technical SEO
- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] SSL/HTTPS
- [ ] Mobile-friendly
- [ ] Core Web Vitals

---

## 🔍 Herramientas

```bash
# Lighthouse SEO
lighthouse https://[URL] --only-categories=seo

# Google Rich Results Test
https://search.google.com/test/rich-results

# Screaming Frog (crawling)
# Descargar: https://www.screamingfrogseoseo.com/

# Ahrefs/SEMrush (análisis competencia)
```

---

## 📊 Hallazgos Comunes

### 🔴 H-FE-SEO-C-001: Sin Meta Description

```jsx
// ❌ CRÍTICO - No hay meta description
<Head>
  <title>Home Page</title>
</Head>

// ✅ CORRECTO - Next.js
<Head>
  <title>Buy Premium Shoes Online - Free Shipping | ShoeStore</title>
  <meta 
    name="description" 
    content="Shop 1000+ premium shoes with free shipping. Nike, Adidas, Puma. 30-day returns guaranteed." 
  />
  <meta property="og:title" content="ShoeStore - Premium Shoes" />
  <meta property="og:description" content="Shop 1000+ shoes..." />
  <meta property="og:image" content="https://example.com/og-image.jpg" />
  <link rel="canonical" href="https://example.com/shoes" />
</Head>
```

**Esfuerzo**: 4h  
**Prioridad**: 🔴 1

---

### 🟠 H-FE-SEO-H-001: Sin Structured Data

```jsx
// ❌ Sin structured data

// ✅ CORRECTO - Product schema
<Head>
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "Blue Sneakers",
      "image": "https://example.com/photo.jpg",
      "description": "Comfortable blue sneakers...",
      "sku": "BLUE-SNKR-42",
      "brand": {
        "@type": "Brand",
        "name": "Nike"
      },
      "offers": {
        "@type": "Offer",
        "url": "https://example.com/product/blue-sneakers",
        "priceCurrency": "USD",
        "price": "89.99",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.5",
        "reviewCount": "127"
      }
    })}
  </script>
</Head>
```

**Esfuerzo**: 8h  
**Prioridad**: 🟠 2

---

### 🟡 H-FE-SEO-M-001: Sin Sitemap

```xml
<!-- ✅ sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-11-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/products</loc>
    <lastmod>2025-11-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

**Esfuerzo**: 2h  
**Prioridad**: 🟡 3

---

## 📋 Template de Informe

```markdown
# Auditoría de SEO - [PROYECTO]

## 📊 Resumen

**Lighthouse SEO**: XX/100  
**Score**: XX/10 puntos  
**Estado**: [OPTIMIZADO|NECESITA MEJORAS|CRÍTICO]

## 🎯 Checklist SEO

| Categoría | Completitud | Estado |
|-----------|-------------|--------|
| Meta Tags | XX/8 | 🟢/🟡/🔴 |
| Structured Data | XX/5 | 🟢/🟡/🔴 |
| Technical SEO | XX/6 | 🟢/🟡/🔴 |
| Core Web Vitals | PASS/FAIL | 🟢/🔴 |

## 🔴 Top 5 Problemas

1. **15 páginas sin meta description**
2. **Sin structured data** (Product, Article)
3. **Sitemap.xml ausente**
4. **Images sin alt** (impacta image SEO)
5. **LCP >4s** (Core Web Vitals FAIL)

## 🛠️ Roadmap

### Sprint 1 (1 semana)
- [ ] Meta tags en todas las páginas (4h)
- [ ] Sitemap.xml (2h)
- [ ] Robots.txt (1h)
- [ ] Canonical URLs (2h)

### Sprint 2 (1 semana)
- [ ] Structured data (Product, Article) (8h)
- [ ] Open Graph images (2h)
- [ ] Fix Core Web Vitals (4h)

---
*Meta: 8/10 puntos (>90 Lighthouse SEO)*
```

---

**Versión**: 1.0
