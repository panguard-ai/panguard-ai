import { NextResponse } from 'next/server';
import { savePost, deletePost, isStaticPost } from '@/lib/blog-store';
import type { BlogPost } from '@/data/blog-posts';

const AUTH_API = process.env.BLOG_AUTH_API || '';

const ALLOWED_AUTH_HOSTS = new Set([
  'app.panguard.ai',
  'localhost',
  '127.0.0.1',
]);

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  if (!AUTH_API) return false;

  let parsedBase: URL;
  try {
    parsedBase = new URL(AUTH_API);
  } catch {
    return false;
  }
  if (!ALLOWED_AUTH_HOSTS.has(parsedBase.hostname)) return false;

  try {
    const res = await fetch(`${AUTH_API}/api/auth/me`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok: boolean; data?: { user: { role: string } } };
    return data.ok && data.data?.user?.role === 'admin';
  } catch {
    return false;
  }
}

export async function PUT(req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = params;

  if (isStaticPost(slug)) {
    return NextResponse.json({ error: 'Cannot edit static posts' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, excerpt, category, date, author, readingTime, content } = body;

    if (!title || !excerpt || !category || !date || !author || !readingTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const post: BlogPost = {
      slug,
      title,
      excerpt,
      category,
      date,
      author,
      readingTime,
    };

    if (content && typeof content === 'string' && content.trim()) {
      post.content = content.split('\n\n').filter((block: string) => block.trim());
    }

    await savePost(post);
    return NextResponse.json({ ok: true, data: post });
  } catch {
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = params;

  if (isStaticPost(slug)) {
    return NextResponse.json({ error: 'Cannot delete static posts' }, { status: 403 });
  }

  try {
    const deleted = await deletePost(slug);
    if (!deleted) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
