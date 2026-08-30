const AGE_BANDS = [
    { id: '0-1', label: '۰ تا ۱ سال', minMonths: 0, maxMonths: 12 },
    { id: '1-3', label: '۱ تا ۳ سال', minMonths: 12, maxMonths: 36 },
    { id: '3-6', label: '۳ تا ۶ سال', minMonths: 36, maxMonths: 72 },
    { id: '6-9', label: '۶ تا ۹ سال', minMonths: 72, maxMonths: 108 },
    { id: '9-12', label: '۹ تا ۱۲ سال', minMonths: 108, maxMonths: 144 }
];

const SKILLS = [
    { slug: 'fine-motor', title: 'مهارت حرکتی ظریف', description: 'هماهنگی دست و انگشتان، ساختنی و ریزه‌کاری' },
    { slug: 'speech', title: 'گفتاری و زبانی', description: 'واژگان، بیان و ارتباط کلامی' },
    { slug: 'cognitive', title: 'شناختی', description: 'حل مسئله، تمرکز و یادگیری' },
    { slug: 'creativity', title: 'خلاقیت', description: 'خیال‌پردازی، هنر و بازی آزاد' },
    { slug: 'socio-emotional', title: 'هیجانی-اجتماعی', description: 'همدلی، همکاری و تنظیم هیجان' }
];

const INTERNAL_VENDOR = {
    slug: 'tatkids',
    displayName: 'مجموعه تات کیدز',
    kind: 'internal',
    status: 'active',
    commissionPct: 0,
    settlementCycle: 'weekly'
};

const CATEGORY_DEFAULTS = {
    'تغذیه': { ageBand: '0-1', skills: ['cognitive'] },
    'اسباب‌بازی': { ageBand: '1-3', skills: ['fine-motor', 'creativity'] },
    'پوشاک': { ageBand: '3-6', skills: ['socio-emotional'] },
    'کتاب': { ageBand: '3-6', skills: ['speech', 'cognitive'] },
    'بهداشت': { ageBand: '0-1', skills: ['socio-emotional'] }
};

function monthsFromBirthDate(birthDate) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function ageBandFromMonths(months) {
    if (months == null || !Number.isFinite(months) || months < 0) return null;
    return AGE_BANDS.find((band) => months >= band.minMonths && months < band.maxMonths) || AGE_BANDS[AGE_BANDS.length - 1];
}

function ageBandFromBirthDate(birthDate) {
    return ageBandFromMonths(monthsFromBirthDate(birthDate));
}

function buildCategoryTree(all) {
    const byParent = new Map();
    (all || []).forEach((node) => {
        const key = node.parentId == null ? 'root' : String(node.parentId);
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(node);
    });
    const walk = (parentId) => {
        const key = parentId == null ? 'root' : String(parentId);
        return (byParent.get(key) || []).map((node) => ({
            ...node,
            children: walk(node.id)
        }));
    };
    return walk(null);
}

function flattenCategories(tree, depth = 0) {
    const out = [];
    (tree || []).forEach((node) => {
        out.push({ ...node, depth });
        out.push(...flattenCategories(node.children || [], depth + 1));
    });
    return out;
}

function toPgPlaceholders(sql) {
    let index = 0;
    return String(sql).replace(/\?/g, () => `$${++index}`);
}

function catalogFilters(raw = {}) {
    const category = raw.category && raw.category !== 'همه' ? String(raw.category).trim() : '';
    const categoryId = raw.categoryId ? Number(raw.categoryId) : null;
    const q = raw.q ? String(raw.q).trim().toLowerCase() : '';
    const ageBand = raw.age || raw.ageBand ? String(raw.age || raw.ageBand).trim() : '';
    const skill = raw.skill ? String(raw.skill).trim() : '';
    const sort = String(raw.sort || 'newest');
    return { category, categoryId: Number.isFinite(categoryId) ? categoryId : null, q, ageBand, skill, sort };
}

function catalogOrderBy(sort) {
    switch (sort) {
        case 'price-asc':
            return 'catalog_price ASC, p.id DESC';
        case 'price-desc':
            return 'catalog_price DESC, p.id DESC';
        case 'popular':
        case 'bestsellers':
            return 'sold_count DESC, p.id DESC';
        case 'rating':
            return 'rating_avg DESC, rating_count DESC, p.id DESC';
        default:
            return 'p.id DESC';
    }
}

function buildCatalogSql(filters = {}, { activeOnly = true } = {}) {
    const f = catalogFilters(filters);
    const params = [];
    let sql = `
        SELECT
            p.*,
            o.id AS offer_id,
            COALESCE(o.price, p.price) AS catalog_price,
            o.compare_at_price,
            COALESCE(o.stock, p.stock) AS catalog_stock,
            o.vendor_id,
            v.display_name AS vendor_name,
            v.kind AS vendor_kind,
            m.age_band,
            m.brand,
            m.safety_warning,
            (
                SELECT AVG(c.rating * 1.0)
                FROM product_comments c
                WHERE c.product_id = p.id AND c.rating IS NOT NULL
            ) AS rating_avg,
            (
                SELECT COUNT(*)
                FROM product_comments c
                WHERE c.product_id = p.id AND c.rating IS NOT NULL
            ) AS rating_count,
            (
                SELECT COALESCE(SUM(oi.quantity), 0)
                FROM order_items oi
                WHERE oi.product_id = p.id
            ) AS sold_count
        FROM products p
        LEFT JOIN shop_offers o
            ON o.product_id = p.id
            AND o.status = 'active'
            AND o.id = (
                SELECT o2.id FROM shop_offers o2
                WHERE o2.product_id = p.id AND o2.status = 'active'
                ORDER BY o2.price ASC, o2.id ASC
                LIMIT 1
            )
        LEFT JOIN shop_vendors v ON v.id = o.vendor_id
        LEFT JOIN shop_product_meta m ON m.product_id = p.id
        WHERE 1 = 1
    `;
    if (activeOnly) sql += ' AND p.active = 1';
    if (f.category) {
        sql += ' AND p.category = ?';
        params.push(f.category);
    }
    if (f.q) {
        sql += ' AND (lower(p.name) LIKE ? OR lower(p.description) LIKE ?)';
        const term = `%${f.q}%`;
        params.push(term, term);
    }
    if (f.ageBand) {
        sql += ' AND m.age_band = ?';
        params.push(f.ageBand);
    }
    if (f.skill) {
        sql += ` AND EXISTS (
            SELECT 1 FROM shop_product_skills ps
            JOIN shop_skills s ON s.id = ps.skill_id
            WHERE ps.product_id = p.id AND s.slug = ?
        )`;
        params.push(f.skill);
    }
    sql += ` ORDER BY ${catalogOrderBy(f.sort)}`;
    return { sql, params };
}

function mapCatalogRow(row, asBool) {
    const price = row.catalog_price != null ? Number(row.catalog_price) : Number(row.price || 0);
    const stock = row.catalog_stock != null ? Number(row.catalog_stock) : Number(row.stock || 0);
    const compareAt = row.compare_at_price != null ? Number(row.compare_at_price) : null;
    return {
        id: Number(row.id),
        name: row.name,
        description: row.description || '',
        category: row.category,
        price,
        stock,
        compareAtPrice: compareAt && compareAt > price ? compareAt : null,
        imageUrl: row.image_url,
        active: asBool(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        offerId: row.offer_id != null ? Number(row.offer_id) : null,
        vendorId: row.vendor_id != null ? Number(row.vendor_id) : null,
        vendorName: row.vendor_name || INTERNAL_VENDOR.displayName,
        vendorKind: row.vendor_kind || INTERNAL_VENDOR.kind,
        ageBand: row.age_band || null,
        brand: row.brand || null,
        safetyWarning: row.safety_warning || null,
        ratingAvg: row.rating_avg != null ? Number(row.rating_avg) : 0,
        ratingCount: Number(row.rating_count || 0),
        soldCount: Number(row.sold_count || 0)
    };
}

module.exports = {
    AGE_BANDS,
    SKILLS,
    INTERNAL_VENDOR,
    CATEGORY_DEFAULTS,
    monthsFromBirthDate,
    ageBandFromMonths,
    ageBandFromBirthDate,
    buildCategoryTree,
    flattenCategories,
    toPgPlaceholders,
    catalogFilters,
    buildCatalogSql,
    mapCatalogRow
};
