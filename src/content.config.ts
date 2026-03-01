import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

// ブログ記事スキーマ（共通）
const blogSchema = z.object({
  id: z.string(),
  externalUrl: z.string().url(),
  publishedAt: z.string().optional(),
});

// AWSブログコレクション
const blogAws = defineCollection({
  loader: file('./src/data/blog/aws-articles.json'),
  schema: blogSchema,
});

// その他ブログコレクション
const blogOther = defineCollection({
  loader: file('./src/data/blog/other-articles.json'),
  schema: blogSchema,
});

// ギャラリーコレクション（JSON）
const gallery = defineCollection({
  loader: file('./src/data/gallery/img.json'),
  schema: z.object({
    id: z.string(),
    src: z.string(),
    alt: z.string(),
  }),});

// スキルコレクション（JSON）
const skills = defineCollection({
  loader: file('./src/data/skills/skills.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['cloud', 'language', 'framework', 'tool', 'other']),
    icon: z.string().optional(),
    url: z.string().url(),
  }),
});

// 経歴コレクション（JSON）
const career = defineCollection({
  loader: file('./src/data/career/career.json'),
  schema: z.object({
    id: z.string(),
    organization: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    description: z.string().nullable().optional(),
  }),
});

// OSS コントリビューションコレクション
const oss = defineCollection({
  loader: file('./src/data/oss/contributions.json'),
  schema: z.object({
    id: z.string(),
    repo: z.string(),
    url: z.string().url(),
    description: z.string(),
  }),
});

// 登壇履歴コレクション
const speaking = defineCollection({
  loader: file('./src/data/speaking/speaking.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    event: z.string(),
    date: z.string(),
    url: z.string().url().nullable(),
    description: z.string().nullable().optional(),
  }),
});

export const collections = { blogAws, blogOther, gallery, skills, career, oss, speaking };
