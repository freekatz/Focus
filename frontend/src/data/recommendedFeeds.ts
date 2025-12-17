// Recommended RSS feeds from RSSHub
// Base URL: http://rss.1uvu.com

export const RSSHUB_BASE_URL = 'http://rss.1uvu.com';

export interface RecommendedFeed {
  id: string;
  name: string;
  nameZh: string;
  route: string;
  description: string;
  descriptionZh: string;
  category: RecommendedCategory;
}

export type RecommendedCategory =
  | 'social'
  | 'tech'
  | 'news'
  | 'video'
  | 'blog'
  | 'academic'
  | 'finance'
  | 'entertainment';

export const RECOMMENDED_CATEGORY_LABELS: Record<RecommendedCategory, { en: string; zh: string }> = {
  social: { en: 'Social Media', zh: '社交媒体' },
  tech: { en: 'Tech News', zh: '科技资讯' },
  news: { en: 'News', zh: '新闻' },
  video: { en: 'Video', zh: '视频平台' },
  blog: { en: 'Blogs', zh: '博客' },
  academic: { en: 'Academic', zh: '学术' },
  finance: { en: 'Finance', zh: '财经' },
  entertainment: { en: 'Entertainment', zh: '娱乐' },
};

export const RECOMMENDED_FEEDS: RecommendedFeed[] = [
  // Social Media
  {
    id: 'zhihu-hot',
    name: 'Zhihu Hot Topics',
    nameZh: '知乎热榜',
    route: '/zhihu/hot',
    description: 'Trending topics on Zhihu',
    descriptionZh: '知乎热门话题',
    category: 'social',
  },
  {
    id: 'zhihu-daily',
    name: 'Zhihu Daily',
    nameZh: '知乎日报',
    route: '/zhihu/daily',
    description: 'Zhihu Daily articles',
    descriptionZh: '知乎日报精选',
    category: 'social',
  },
  {
    id: 'weibo-hot',
    name: 'Weibo Hot Search',
    nameZh: '微博热搜',
    route: '/weibo/search/hot',
    description: 'Trending topics on Weibo',
    descriptionZh: '微博热搜榜',
    category: 'social',
  },
  {
    id: 'douban-movie',
    name: 'Douban Movies',
    nameZh: '豆瓣电影',
    route: '/douban/movie/playing',
    description: 'Now playing movies on Douban',
    descriptionZh: '豆瓣正在热映',
    category: 'social',
  },
  {
    id: 'douban-book',
    name: 'Douban Books',
    nameZh: '豆瓣新书',
    route: '/douban/book/latest',
    description: 'Latest books on Douban',
    descriptionZh: '豆瓣最新书籍',
    category: 'social',
  },

  // Tech News
  {
    id: '36kr-hot',
    name: '36Kr Hot',
    nameZh: '36氪热榜',
    route: '/36kr/hot',
    description: 'Hot articles on 36Kr',
    descriptionZh: '36氪热门文章',
    category: 'tech',
  },
  {
    id: '36kr-news',
    name: '36Kr News',
    nameZh: '36氪快讯',
    route: '/36kr/newsflashes',
    description: 'Latest news from 36Kr',
    descriptionZh: '36氪最新快讯',
    category: 'tech',
  },
  {
    id: 'sspai',
    name: 'SSPAI',
    nameZh: '少数派',
    route: '/sspai/matrix',
    description: 'Matrix articles from SSPAI',
    descriptionZh: '少数派 Matrix 精选',
    category: 'tech',
  },
  {
    id: 'v2ex-hot',
    name: 'V2EX Hot',
    nameZh: 'V2EX 热门',
    route: '/v2ex/topics/hot',
    description: 'Hot topics on V2EX',
    descriptionZh: 'V2EX 热门主题',
    category: 'tech',
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    nameZh: 'Hacker News',
    route: '/hackernews',
    description: 'Top stories from Hacker News',
    descriptionZh: 'Hacker News 热门',
    category: 'tech',
  },
  {
    id: 'github-trending',
    name: 'GitHub Trending',
    nameZh: 'GitHub 趋势',
    route: '/github/trending/daily/any',
    description: 'Daily trending repositories',
    descriptionZh: 'GitHub 每日热门仓库',
    category: 'tech',
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    nameZh: 'Product Hunt',
    route: '/producthunt/today',
    description: "Today's top products",
    descriptionZh: '今日热门产品',
    category: 'tech',
  },

  // News
  {
    id: 'bbc-world',
    name: 'BBC World News',
    nameZh: 'BBC 世界新闻',
    route: '/bbc/world-asia',
    description: 'BBC World News - Asia',
    descriptionZh: 'BBC 世界新闻亚洲版',
    category: 'news',
  },
  {
    id: 'reuters',
    name: 'Reuters',
    nameZh: '路透社',
    route: '/reuters/world',
    description: 'Reuters World News',
    descriptionZh: '路透社世界新闻',
    category: 'news',
  },
  {
    id: 'thepaper',
    name: 'The Paper',
    nameZh: '澎湃新闻',
    route: '/thepaper/featured',
    description: 'Featured news from The Paper',
    descriptionZh: '澎湃新闻精选',
    category: 'news',
  },
  {
    id: 'infzm',
    name: 'Southern Weekly',
    nameZh: '南方周末',
    route: '/infzm/recommend',
    description: 'Recommended articles',
    descriptionZh: '南方周末推荐',
    category: 'news',
  },

  // Video
  {
    id: 'bilibili-ranking',
    name: 'Bilibili Ranking',
    nameZh: 'B站排行榜',
    route: '/bilibili/ranking/0/3/1',
    description: 'Bilibili hot videos ranking',
    descriptionZh: 'B站全站热门排行',
    category: 'video',
  },
  {
    id: 'bilibili-popular',
    name: 'Bilibili Popular',
    nameZh: 'B站热门',
    route: '/bilibili/popular/all',
    description: 'Popular videos on Bilibili',
    descriptionZh: 'B站综合热门视频',
    category: 'video',
  },
  {
    id: 'youtube-trending',
    name: 'YouTube Trending',
    nameZh: 'YouTube 热门',
    route: '/youtube/trending/US',
    description: 'Trending videos on YouTube',
    descriptionZh: 'YouTube 热门视频',
    category: 'video',
  },

  // Blogs
  {
    id: 'ruanyifeng-blog',
    name: "Ruan Yifeng's Blog",
    nameZh: '阮一峰的网络日志',
    route: '/ruanyifeng/blog',
    description: "Ruan Yifeng's tech blog",
    descriptionZh: '阮一峰的技术博客',
    category: 'blog',
  },
  {
    id: 'ruanyifeng-weekly',
    name: 'Tech Weekly',
    nameZh: '科技爱好者周刊',
    route: '/ruanyifeng/weekly',
    description: "Ruan Yifeng's weekly digest",
    descriptionZh: '阮一峰科技爱好者周刊',
    category: 'blog',
  },
  {
    id: 'coolshell',
    name: 'CoolShell',
    nameZh: '酷壳',
    route: '/coolshell',
    description: 'CoolShell tech blog',
    descriptionZh: '酷壳技术博客',
    category: 'blog',
  },

  // Academic
  {
    id: 'arxiv-cs-ai',
    name: 'arXiv CS.AI',
    nameZh: 'arXiv 人工智能',
    route: '/arxiv/cs.AI',
    description: 'Latest AI papers from arXiv',
    descriptionZh: 'arXiv 最新人工智能论文',
    category: 'academic',
  },
  {
    id: 'arxiv-cs-cl',
    name: 'arXiv CS.CL',
    nameZh: 'arXiv 计算语言学',
    route: '/arxiv/cs.CL',
    description: 'Computational Linguistics papers',
    descriptionZh: 'arXiv 计算语言学论文',
    category: 'academic',
  },
  {
    id: 'arxiv-cs-lg',
    name: 'arXiv CS.LG',
    nameZh: 'arXiv 机器学习',
    route: '/arxiv/cs.LG',
    description: 'Machine Learning papers',
    descriptionZh: 'arXiv 机器学习论文',
    category: 'academic',
  },

  // Finance
  {
    id: 'cls-hot',
    name: 'CLS Finance',
    nameZh: '财联社电报',
    route: '/cls/telegraph',
    description: 'Real-time finance news',
    descriptionZh: '财联社实时电报',
    category: 'finance',
  },
  {
    id: 'eastmoney',
    name: 'East Money',
    nameZh: '东方财富',
    route: '/eastmoney/report/strategyreport',
    description: 'Strategy reports',
    descriptionZh: '东方财富策略报告',
    category: 'finance',
  },
  {
    id: 'xueqiu-hot',
    name: 'Xueqiu Hot',
    nameZh: '雪球热帖',
    route: '/xueqiu/hots',
    description: 'Hot posts on Xueqiu',
    descriptionZh: '雪球热门帖子',
    category: 'finance',
  },

  // Entertainment
  {
    id: 'douyin-hot',
    name: 'Douyin Hot',
    nameZh: '抖音热榜',
    route: '/douyin/trending',
    description: 'Trending on Douyin',
    descriptionZh: '抖音热门榜单',
    category: 'entertainment',
  },
  {
    id: 'weread-hot',
    name: 'WeRead Hot',
    nameZh: '微信读书热搜',
    route: '/weread/hot',
    description: 'Hot books on WeRead',
    descriptionZh: '微信读书热搜榜',
    category: 'entertainment',
  },
];

// Get feeds by category
export function getFeedsByCategory(category: RecommendedCategory): RecommendedFeed[] {
  return RECOMMENDED_FEEDS.filter(feed => feed.category === category);
}

// Get all categories
export function getAllCategories(): RecommendedCategory[] {
  return Object.keys(RECOMMENDED_CATEGORY_LABELS) as RecommendedCategory[];
}

// Build full RSS URL
export function buildRssUrl(route: string): string {
  return `${RSSHUB_BASE_URL}${route}`;
}
