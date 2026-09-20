export function extractHeadings(html) {
    const matches = String(html || '').matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi);
    const items = [];
    Array.from(matches).forEach((match, index) => {
        const text = String(match[2]).replace(/<[^>]+>/g, '').trim();
        if (!text) return;
        items.push({
            id: `section-${index + 1}`,
            level: Number(match[1]),
            text
        });
    });
    return items;
}

export function injectHeadingIds(html) {
    let index = 0;
    return String(html || '').replace(/<h([23])([^>]*)>/gi, (full, level, attrs) => {
        if (/\sid=/i.test(attrs)) return full;
        index += 1;
        return `<h${level}${attrs} id="section-${index}">`;
    });
}

export function shareTargets(url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title || '');
    return [
        { id: 'telegram', label: 'تلگرام', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
        { id: 'whatsapp', label: 'واتساپ', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
        { id: 'linkedin', label: 'لینکدین', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
        { id: 'eitaa', label: 'ایتا', href: `https://eitaa.com/share?url=${encodedUrl}&text=${encodedTitle}` }
    ];
}

export function absoluteUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function postHref(post) {
    if (!post) return '/news';
    return `/news/${post.id}`;
}

export function typeLabel(type) {
    if (type === 'news') return 'خبر';
    if (type === 'video') return 'ویدیو';
    if (type === 'podcast') return 'پادکست';
    return 'مقاله';
}

export function sidebarAdsFromHome(home, { allowHeroFallback = false } = {}) {
    const sidebar = [...(home && home.sidebarBanners ? home.sidebarBanners : [])];
    if (sidebar.length || !allowHeroFallback) return sidebar;
    return (home && home.hero ? home.hero : []).map((item) => ({
        ...item,
        placement: item.placement || 'sidebar-300x250'
    }));
}

export function flattenCategories(tree, acc = []) {
    (tree || []).forEach((node) => {
        acc.push(node);
        if (node.children && node.children.length) flattenCategories(node.children, acc);
    });
    return acc;
}

export function findCategoryPathById(tree, id, acc = []) {
    if (id == null || id === '') return [];
    for (const node of tree || []) {
        const next = [...acc, node];
        if (String(node.id) === String(id)) return next;
        const found = findCategoryPathById(node.children || [], id, next);
        if (found.length) return found;
    }
    return [];
}

export function categoryPathLabel(tree, id) {
    const names = findCategoryPathById(tree, id).map((node) => node.name).filter(Boolean);
    return names.join(' ‹ ');
}

export function pictureSources(src) {
    if (!src) return [];
    const lower = src.toLowerCase();
    if (lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.avif')) return [];
    const withoutExt = src.replace(/\.(jpe?g|png|gif)$/i, '');
    return [
        { type: 'image/avif', srcSet: `${withoutExt}.avif` },
        { type: 'image/webp', srcSet: `${withoutExt}.webp` }
    ];
}

export function schemaGraph(post, pageUrl) {
    if (!post) return null;
    const authors = (post.authors || []).map((author) => ({
        '@type': 'Person',
        name: author.fullName,
        jobTitle: author.specialty,
        url: absoluteUrl(`/news/author/${author.slug}`)
    }));
    const image = post.featuredImageUrl ? absoluteUrl(post.featuredImageUrl) : undefined;
    const article = {
        '@type': post.type === 'video' ? 'NewsArticle' : 'Article',
        headline: post.title,
        description: post.seoDescription || post.summary,
        image,
        datePublished: post.publishedAt || post.createdAt,
        dateModified: post.updatedAt || post.createdAt,
        author: authors.length ? authors : undefined,
        publisher: {
            '@type': 'Organization',
            name: 'تات کیدز',
            url: absoluteUrl('/')
        },
        mainEntityOfPage: pageUrl
    };
    const extra = [];
    if (post.type === 'video' && (post.videoEmbedUrl || post.videoFileUrl || post.videoUrl)) {
        extra.push({
            '@type': 'VideoObject',
            name: post.title,
            description: post.summary,
            thumbnailUrl: image,
            contentUrl: absoluteUrl(post.videoFileUrl || post.videoUrl),
            embedUrl: post.videoEmbedUrl || undefined,
            uploadDate: post.publishedAt || post.createdAt
        });
    }
    if (post.type === 'podcast' && (post.audioFileUrl || post.audioUrl)) {
        extra.push({
            '@type': 'AudioObject',
            name: post.title,
            description: post.summary,
            contentUrl: absoluteUrl(post.audioFileUrl || post.audioUrl),
            duration: post.durationSeconds ? `PT${post.durationSeconds}S` : undefined
        });
    }
    const breadcrumbs = {
        '@type': 'BreadcrumbList',
        itemListElement: (post.breadcrumbs || []).map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: absoluteUrl(crumb.href || '/news')
        }))
    };
    return {
        '@context': 'https://schema.org',
        '@graph': [article, breadcrumbs, ...authors, ...extra]
    };
}
