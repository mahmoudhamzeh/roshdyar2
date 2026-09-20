const magazineStore = require('./magazine-store');

function parseIdList(value) {
    if (Array.isArray(value)) return value.map(Number).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
        } catch (_) { /* csv */ }
        return value.split(',').map((item) => Number(item.trim())).filter(Boolean);
    }
    return undefined;
}

function parseQualities(value) {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : undefined;
        } catch (_) {
            return undefined;
        }
    }
    return undefined;
}

function boolish(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    return value === true || value === 'true' || value === '1' || value === 1;
}

function fileUrl(file) {
    return file ? `/uploads/${file.filename}` : undefined;
}

function postPayload(req) {
    const body = req.body || {};
    const files = req.files || {};
    const image = (files.image && files.image[0]) || req.file;
    const videoFile = files.videoFile && files.videoFile[0];
    const audioFile = files.audioFile && files.audioFile[0];
    const captions = files.captions && files.captions[0];
    return {
        type: body.type,
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        content: body.content,
        categoryId: body.categoryId,
        featuredImageUrl: fileUrl(image),
        videoUrl: body.videoUrl,
        videoEmbedUrl: body.videoEmbedUrl,
        videoFileUrl: fileUrl(videoFile),
        captionsUrl: fileUrl(captions),
        videoQualities: parseQualities(body.videoQualities),
        audioUrl: body.audioUrl,
        audioFileUrl: fileUrl(audioFile),
        transcript: body.transcript,
        duration: body.duration,
        durationSeconds: body.durationSeconds,
        published: body.published,
        featured: body.featured,
        featuredOrder: body.featuredOrder,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        tagIds: parseIdList(body.tagIds),
        authorIds: parseIdList(body.authorIds),
        relatedIds: parseIdList(body.relatedIds)
    };
}

function registerMagazineRoutes(app, { store, upload, isAdmin, resolveAuthUser }) {
    const magUpload = upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'videoFile', maxCount: 1 },
        { name: 'audioFile', maxCount: 1 },
        { name: 'captions', maxCount: 1 },
        { name: 'photo', maxCount: 1 }
    ]);

    app.get('/api/magazine/home', async (req, res) => {
        res.json(await store.magazine.home());
    });

    app.get('/api/magazine/categories', async (req, res) => {
        res.json(await store.magazine.listCategories());
    });

    app.get('/api/magazine/tags', async (req, res) => {
        res.json(await store.magazine.listTags());
    });

    app.get('/api/magazine/authors', async (req, res) => {
        res.json(await store.magazine.listAuthors());
    });

    app.get('/api/magazine/authors/:idOrSlug', async (req, res) => {
        const author = await store.magazine.getAuthor(req.params.idOrSlug);
        if (!author) return res.status(404).json({ message: 'نویسنده یافت نشد' });
        res.json(author);
    });

    app.get('/api/magazine/posts', async (req, res) => {
        const user = await resolveAuthUser(req);
        const filters = {
            type: req.query.type,
            categorySlug: req.query.category,
            tagSlug: req.query.tag,
            authorSlug: req.query.author,
            q: req.query.q,
            sort: req.query.sort,
            featured: boolish(req.query.featured, undefined),
            includeUnpublished: !!(user && user.isAdmin && boolish(req.query.all, false))
        };
        res.json(await store.magazine.listPosts(filters));
    });

    app.get('/api/magazine/posts/:idOrSlug', async (req, res) => {
        let idOrSlug = req.params.idOrSlug;
        try { idOrSlug = decodeURIComponent(idOrSlug); } catch (_) { /* keep */ }
        const post = await store.magazine.getPost(idOrSlug);
        if (!post || (!post.published && !(req.user && req.user.isAdmin))) {
            const user = await resolveAuthUser(req);
            if (!post || (!post.published && !(user && user.isAdmin))) {
                return res.status(404).json({ message: 'محتوا یافت نشد' });
            }
        }
        await store.magazine.bumpViews(post.id);
        const fresh = await store.magazine.getPost(post.id);
        res.json(fresh);
    });

    app.get('/api/magazine/posts/:id/comments', async (req, res) => {
        res.json(await store.magazine.listComments(req.params.id, { status: 'approved' }));
    });

    app.post('/api/magazine/posts/:id/comments', async (req, res) => {
        const post = await store.magazine.getPost(req.params.id);
        if (!post) return res.status(404).json({ message: 'محتوا یافت نشد' });
        const user = await resolveAuthUser(req);
        const body = String((req.body && req.body.body) || '').trim();
        if (body.length < 3) return res.status(400).json({ message: 'متن دیدگاه کوتاه است' });
        const authorName = (req.body && req.body.authorName) || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : '');
        const authorEmail = (req.body && req.body.authorEmail) || (user && user.email) || '';
        const authorPhone = (req.body && req.body.authorPhone) || (user && user.mobile) || '';
        if (!user && !authorName) {
            return res.status(400).json({ message: 'برای ارسال دیدگاه وارد شوید یا نام خود را وارد کنید' });
        }
        if (!user && !authorEmail && !authorPhone) {
            return res.status(400).json({ message: 'ایمیل یا شماره تماس لازم است' });
        }
        const parentId = req.body && req.body.parentId ? Number(req.body.parentId) : null;
        const isAdminUser = !!(user && user.isAdmin);
        const isAuthor = !!(user && (post.authors || []).some((author) => Number(author.userId) === Number(user.id)));
        const isStaff = isAdminUser || isAuthor;
        const comment = await store.magazine.createComment(post.id, {
            parentId,
            userId: user ? user.id : null,
            authorName: authorName || 'کاربر تات کیدز',
            authorEmail,
            authorPhone,
            body,
            status: isStaff ? 'approved' : 'pending',
            isStaff
        });
        res.status(201).json(comment);
    });

    app.get('/api/magazine/banners', async (req, res) => {
        res.json(await store.magazine.listBanners(req.query.placement));
    });

    app.post('/api/magazine/banners/:id/impression', async (req, res) => {
        const banner = await store.magazine.trackBanner(req.params.id, 'impressions');
        if (!banner) return res.status(404).json({ message: 'بنر یافت نشد' });
        res.json({ ok: true, impressions: banner.impressions });
    });

    app.post('/api/magazine/banners/:id/click', async (req, res) => {
        const banner = await store.magazine.trackBanner(req.params.id, 'clicks');
        if (!banner) return res.status(404).json({ message: 'بنر یافت نشد' });
        res.json({ ok: true, clicks: banner.clicks, link: banner.link });
    });

    app.post('/api/admin/magazine/upload', isAdmin, upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'فایل ارسال نشده است' });
        res.status(201).json({ url: `/uploads/${req.file.filename}` });
    });

    app.post('/api/admin/magazine/categories', isAdmin, async (req, res) => {
        res.status(201).json(await store.magazine.createCategory(req.body || {}));
    });
    app.put('/api/admin/magazine/categories/:id', isAdmin, async (req, res) => {
        const updated = await store.magazine.updateCategory(req.params.id, req.body || {});
        if (!updated) return res.status(404).json({ message: 'دسته‌بندی یافت نشد' });
        res.json(updated);
    });
    app.delete('/api/admin/magazine/categories/:id', isAdmin, async (req, res) => {
        if (await store.magazine.deleteCategory(req.params.id)) return res.json({ message: 'دسته‌بندی حذف شد' });
        res.status(404).json({ message: 'دسته‌بندی یافت نشد' });
    });

    app.post('/api/admin/magazine/tags', isAdmin, async (req, res) => {
        res.status(201).json(await store.magazine.createTag(req.body || {}));
    });
    app.delete('/api/admin/magazine/tags/:id', isAdmin, async (req, res) => {
        if (await store.magazine.deleteTag(req.params.id)) return res.json({ message: 'برچسب حذف شد' });
        res.status(404).json({ message: 'برچسب یافت نشد' });
    });

    app.post('/api/admin/magazine/authors', isAdmin, magUpload, async (req, res) => {
        const photo = req.files && req.files.photo && req.files.photo[0];
        res.status(201).json(await store.magazine.createAuthor({
            ...req.body,
            photoUrl: fileUrl(photo)
        }));
    });
    app.put('/api/admin/magazine/authors/:id', isAdmin, magUpload, async (req, res) => {
        const photo = req.files && req.files.photo && req.files.photo[0];
        const updated = await store.magazine.updateAuthor(req.params.id, {
            ...req.body,
            photoUrl: fileUrl(photo)
        });
        if (!updated) return res.status(404).json({ message: 'نویسنده یافت نشد' });
        res.json(updated);
    });
    app.delete('/api/admin/magazine/authors/:id', isAdmin, async (req, res) => {
        if (await store.magazine.deleteAuthor(req.params.id)) return res.json({ message: 'نویسنده حذف شد' });
        res.status(404).json({ message: 'نویسنده یافت نشد' });
    });

    app.post('/api/admin/magazine/posts', isAdmin, magUpload, async (req, res) => {
        const created = await store.magazine.createPost(postPayload(req));
        res.status(201).json(created);
    });
    app.put('/api/admin/magazine/posts/:id', isAdmin, magUpload, async (req, res) => {
        const updated = await store.magazine.updatePost(req.params.id, postPayload(req));
        if (!updated) return res.status(404).json({ message: 'محتوا یافت نشد' });
        res.json(updated);
    });
    app.delete('/api/admin/magazine/posts/:id', isAdmin, async (req, res) => {
        if (await store.magazine.deletePost(req.params.id)) return res.json({ message: 'محتوا حذف شد' });
        res.status(404).json({ message: 'محتوا یافت نشد' });
    });

    app.get('/api/admin/magazine/comments', isAdmin, async (req, res) => {
        res.json(await store.magazine.listAllComments(req.query.status || 'pending'));
    });
    app.patch('/api/admin/magazine/comments/:id', isAdmin, async (req, res) => {
        const status = req.body && req.body.status;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ message: 'وضعیت نامعتبر است' });
        }
        const updated = await store.magazine.moderateComment(req.params.id, status);
        if (!updated) return res.status(404).json({ message: 'دیدگاه یافت نشد' });
        res.json(updated);
    });
    app.post('/api/admin/magazine/comments/:id/reply', isAdmin, async (req, res) => {
        const parent = await store.magazine.getComment(req.params.id);
        if (!parent) return res.status(404).json({ message: 'دیدگاه یافت نشد' });
        const body = String((req.body && req.body.body) || '').trim();
        if (body.length < 2) return res.status(400).json({ message: 'متن پاسخ کوتاه است' });
        const user = req.user || {};
        const authorName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
            || user.username
            || 'تحریریه تات کیدز';
        if (parent.status === 'pending') {
            await store.magazine.moderateComment(parent.id, 'approved');
        }
        const reply = await store.magazine.createComment(parent.postId, {
            parentId: parent.id,
            userId: user.id || null,
            authorName,
            authorEmail: user.email || '',
            authorPhone: user.mobile || '',
            body,
            status: 'approved',
            isStaff: true
        });
        res.status(201).json(reply);
    });

    app.post('/api/admin/magazine/banners', isAdmin, upload.single('image'), async (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'تصویر بنر الزامی است' });
        res.status(201).json(await store.magazine.createBanner({
            ...req.body,
            imageUrl: `/uploads/${req.file.filename}`
        }));
    });
    app.put('/api/admin/magazine/banners/:id', isAdmin, upload.single('image'), async (req, res) => {
        const updated = await store.magazine.updateBanner(req.params.id, {
            ...req.body,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
        });
        if (!updated) return res.status(404).json({ message: 'بنر یافت نشد' });
        res.json(updated);
    });
    app.delete('/api/admin/magazine/banners/:id', isAdmin, async (req, res) => {
        if (await store.magazine.deleteBanner(req.params.id)) return res.json({ message: 'بنر حذف شد' });
        res.status(404).json({ message: 'بنر یافت نشد' });
    });
}

function overlayLegacyContent(store) {
    const origNewsList = store.news.list.bind(store.news);
    const origNewsGet = store.news.getById.bind(store.news);
    const origVideosList = store.videos.list.bind(store.videos);
    const origVideosGet = store.videos.getById.bind(store.videos);
    const origPodcastsList = store.podcasts.list.bind(store.podcasts);
    const origPodcastsGet = store.podcasts.getById.bind(store.podcasts);

    store.news.list = async () => {
        try {
            const posts = await store.magazine.listPosts({ type: 'article' });
            if (posts.length) return posts.map(magazineStore.toLegacyNews);
        } catch (err) {
            console.error('magazine overlay news.list failed:', err.message);
        }
        return origNewsList();
    };
    store.news.getById = async (id) => {
        try {
            const post = await store.magazine.getPost(id);
            if (post && post.type === 'article') return magazineStore.toLegacyNews(post);
        } catch (err) {
            console.error('magazine overlay news.getById failed:', err.message);
        }
        return origNewsGet(id);
    };
    store.videos.list = async () => {
        try {
            const posts = await store.magazine.listPosts({ type: 'video' });
            if (posts.length) return posts.map(magazineStore.toLegacyVideo);
        } catch (err) {
            console.error('magazine overlay videos.list failed:', err.message);
        }
        return origVideosList();
    };
    store.videos.getById = async (id) => {
        try {
            const post = await store.magazine.getPost(id);
            if (post && post.type === 'video') return magazineStore.toLegacyVideo(post);
        } catch (err) {
            console.error('magazine overlay videos.getById failed:', err.message);
        }
        return origVideosGet(id);
    };
    store.podcasts.list = async () => {
        try {
            const posts = await store.magazine.listPosts({ type: 'podcast' });
            if (posts.length) return posts.map(magazineStore.toLegacyPodcast);
        } catch (err) {
            console.error('magazine overlay podcasts.list failed:', err.message);
        }
        return origPodcastsList();
    };
    store.podcasts.getById = async (id) => {
        try {
            const post = await store.magazine.getPost(id);
            if (post && post.type === 'podcast') return magazineStore.toLegacyPodcast(post);
        } catch (err) {
            console.error('magazine overlay podcasts.getById failed:', err.message);
        }
        return origPodcastsGet(id);
    };
}

module.exports = { registerMagazineRoutes, overlayLegacyContent };
