// scripts/build.js - Markdown -> static pages + posts.json + sitemap + rss
import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = process.env.SITE_URL || 'https://lydia-cmyk.github.io';

function slugify(s){
  return s.toLowerCase().trim()
    .replace(/^[0-9]{4}-[0-9]{2}-[0-9]{2}[-_]?/, '')
    .replace(/[^a-z0-9\-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
}

function parseFrontMatter(src){
  const fm = { title:'', date:'', slug:'', thumb:'' };
  if(src.startsWith('---')){
    const end = src.indexOf('\n---', 3);
    if(end !== -1){
      const head = src.slice(3, end).trim();
      src = src.slice(end+4).replace(/^\n/,''); // body without fm
      head.split('\n').forEach(line=>{
        const m = line.match(/^(\w+)\s*:\s*(.+)$/);
        if(m){ fm[m[1].toLowerCase()] = m[2].trim(); }
      });
      return { fm, body: src };
    }
  }
  return { fm, body: src };
}

function mdToHtml(md){
  if(!md) return '';
  let h = md.replace(/^###\s+(.+)$/gm,'<h3>$1</h3>')
            .replace(/^##\s+(.+)$/gm,'<h2>$1</h2>')
            .replace(/^#\s+(.+)$/gm,'<h1>$1</h1>');
  h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
       .replace(/\*(.+?)\*/g,'<em>$1</em>');
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1" loading="lazy">');
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(m,t,u)=> /^(https?:)?\/\//i.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : `<a href="${u}">${t}</a>`);
  h = h.replace(/(?:^|\n)-\s+(.+)(?=\n|$)/g,'\n<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>)/gs,'<ul>$1</ul>');
  h = h.split(/\n{2,}/).map(x=>/^<h\d|<ul>|<li>|<img|<a/.test(x)?x:`<p>${x.trim()}</p>`).join('\n');
  return h;
}

function firstImage(md){
  const m = /\!\[[^\]]*\]\(([^)]+)\)/.exec(md||'');
  return m ? m[1] : '';
}

function pageHTML({title, date, body, url, thumb}){
  const esc = s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const desc = String(body||'').replace(/<[^>]*>/g,' ').slice(0,140).trim();
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} — POMODORO+</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${desc}">
  ${thumb ? `<meta property="og:image" content="${thumb}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  ${thumb ? `<meta name="twitter:image" content="${thumb}">` : ''}
  <style>
    :root{ --bg:#0a0c12; --text:#edf2f7 }
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,-apple-system,system-ui,Segoe UI,Roboto,Noto Sans KR,Helvetica,Arial}
    .container{max-width:980px;margin:0 auto;padding:24px}
    a{color:#8ab4f8;text-decoration:none} a:hover{text-decoration:underline}
    header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .brand{display:flex;gap:10px;align-items:center}.logo{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background: radial-gradient(120% 120% at 30% 20%, #ff725e, #c92028 70%);color:#fff}
    .word{font-weight:900;letter-spacing:.5px}
    .article{background:rgba(16,20,28,.42);border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:18px;backdrop-filter:blur(16px) saturate(140%);-webkit-backdrop-filter:blur(16px) saturate(140%)}
    .meta{color:#9aa0a6;margin:6px 0 12px}
    .content{line-height:1.75;color:#cfd6e4}
    .content img{max-width:100%;height:auto;border-radius:12px;display:block;margin:12px auto}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand"><div class="logo">🍅</div><div class="word">POMODORO+</div></div>
      <nav><a href="/">홈</a> · <a href="/#blog">블로그</a></nav>
    </header>
    <article class="article">
      <h1>${esc(title)}</h1>
      <div class="meta">${date}</div>
      <div class="content">${body}</div>
    </article>
  </div>
</body>
</html>`;
}

async function main(){
  const dir = 'posts';
  let files = [];
  try{
    files = (await fs.readdir(dir)).filter(f => f.endsWith('.md')).sort().reverse();
  }catch(e){ files = []; }

  const posts = [];
  for(const file of files){
    const raw = await fs.readFile(path.join(dir,file),'utf-8');
    const { fm, body } = parseFrontMatter(raw);
    const base = path.basename(file, '.md');
    const slug = (fm.slug && slugify(fm.slug)) || slugify(base);
    const date = fm.date || (base.match(/^\d{4}-\d{2}-\d{2}/)?.[0]) || new Date().toISOString().slice(0,10);
    const title = fm.title || (body.match(/^#\s+(.+)$/m)?.[1]) || slug;
    const thumb = fm.thumb || firstImage(body);
    const html = mdToHtml(body);
    const url = `${SITE_URL}/p/${slug}/`;

    const outDir = path.join('p', slug);
    await fs.mkdir(outDir, { recursive:true });
    await fs.writeFile(path.join(outDir, 'index.html'), pageHTML({title, date, body:html, url, thumb}), 'utf-8');

    posts.push({ slug, title, date, thumb, md: body });
  }

  // posts.json
  await fs.writeFile('posts.json', JSON.stringify(posts, null, 2), 'utf-8');

  // sitemap.xml
  const urls = posts.map(p=>`  <url><loc>${SITE_URL}/p/${p.slug}/</loc><priority>0.7</priority></url>`).join('\n');
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>
${urls}
</urlset>`;
  await fs.writeFile('sitemap.xml', sm, 'utf-8');

  // rss.xml
  const items = posts.map(p=>`
  <item>
    <title>${p.title}</title>
    <link>${SITE_URL}/p/${p.slug}/</link>
    <guid>${SITE_URL}/p/${p.slug}/</guid>
    <pubDate>${new Date(p.date || Date.now()).toUTCString()}</pubDate>
  </item>`).join('\n');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>POMODORO+ Blog</title>
    <link>${SITE_URL}/</link>
    <description>Pomodoro tips and study notes</description>
${items}
  </channel>
</rss>`;
  await fs.writeFile('rss.xml', rss, 'utf-8');

  console.log(`Built ${posts.length} posts`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
