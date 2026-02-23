import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

// ブログ記事コレクション（JSON）
// title・description・ogpImageはビルド時OGP fetchで自動取得するためスキーマに含めない
const blog = defineCollection({
  loader: file('./src/data/blog/articles.json'),
  schema: z.object({
    id: z.string(),
    externalUrl: z.string().url(),
    type: z.enum(['translation', 'original']),
    source: z.enum(['aws', 'other']),
  }),
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
  }),
});

export const collections = { blog, gallery, skills, career };
