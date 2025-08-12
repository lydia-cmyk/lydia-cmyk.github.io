글 쓰는 법 (마크다운 CMS)
1) 이 레포의 `posts/` 폴더에 `.md` 파일을 하나 추가하고 Commit.
2) GitHub Actions가 자동으로
   - `/p/<slug>/index.html` (정적 글 페이지, SEO용)
   - `posts.json` (홈에서 쓰는 목록 데이터)
   - `sitemap.xml` / `rss.xml`
   을 생성/갱신합니다.

Front matter 예시:
---
title: "제목"
date: 2025-08-13
thumb: assets/desk-setup-thumb.jpg
slug: my-post
---
그리고 아래는 마크다운 본문입니다.
