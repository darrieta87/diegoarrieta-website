# diegoarrieta.com

Personal website for Diego Arrieta — creator, educator, and coach.

## About

This is the source code for [diegoarrieta.com](https://diegoarrieta.com), a personal website and living portfolio. The site serves as a home for my writing, projects, coaching practice, and everything else I'm building.

## Structure

```
/
├── index.html                 # Main website (single-page, static)
├── README.md                  # This file
├── CLAUDE.md                  # AI assistant context for working on this project
├── CNAME                      # Custom domain config for GitHub Pages
├── assets/                    # Images and static files (e.g. diego-portrait.jpg)
├── clientes/                  # Client/consulting deliverables
│   └── tres-marias/           #   Club de Golf Tres Marías (3M)
│       ├── diagnostico-mayo-2026.html
│       ├── diagnostico-mayo-2026-vertical.html
│       ├── accesos-abril-2026.html
│       ├── bot-discovery.html
│       └── master-app/        #   Interactive member-app demo
│           ├── index.html
│           └── demo.html
├── personal/                  # Personal & family projects
│   └── mateo/
│       └── mundial-2026.html  #   Mateo's World Cup 2026 sticker album
└── (root *.html stubs)        # Redirects from old URLs → new paths (keep shared links alive)
```

> Note: the `*.html` files still sitting in the root (e.g. `3m-diagnostico-2026-mayo.html`,
> `mateo-mundial-2026.html`) are tiny redirect stubs that forward already-shared links to their
> new home. They can be deleted once those links are no longer in circulation.

## Tech Stack

- Static HTML/CSS/JS — no build step, no framework
- Hosted on GitHub Pages
- Domain via Namecheap, DNS pointed to GitHub
- Google Workspace for email (diego@diegoarrieta.com)

## Local Development

Just open `index.html` in a browser. No server needed.

## Roadmap

- [ ] Add real photography and headshot
- [ ] Connect newsletter signup to email provider
- [ ] Add blog/writing section with individual essay pages
- [ ] Build /learn section for courses and educational content
- [ ] Add /coach application form
- [ ] Analytics integration
- [ ] SEO optimization and meta tags
- [ ] Open Graph images for social sharing

## Contact

- Website: [diegoarrieta.com](https://diegoarrieta.com)
- Email: diego@diegoarrieta.com
- LinkedIn: [Diego Arrieta](https://linkedin.com/in/diegoarrieta)

## License

All content © 2026 Diego Arrieta. All rights reserved.
