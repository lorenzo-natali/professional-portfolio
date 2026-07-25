# AR image targets

Place the compiled MindAR target here:

```
cv-page-1.mind
```

## Preferred target order

1. **Full first page** of the CV (recommended)
2. **Header crop** of the CV (if full-page tracking is unstable)
3. **Dedicated AR symbol** (only if necessary)

## How to generate / replace the target

Preferred offline path (same MindAR OfflineCompiler encoding as the browser tool):

1. Export a high-resolution PNG of the CV first page.
2. From the repo root:
   `node scripts/compile-ar-target.mjs /path/to/cv-page-1.png public/ar/targets/cv-page-1.mind`
3. Rebuild / redeploy. Runtime path stays `./ar/targets/cv-page-1.mind`.

Browser alternative:

1. Open the MindAR Image Target Compiler:  
   https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Compile the image and download the `.mind` file.
3. Replace `public/ar/targets/cv-page-1.mind` with the new file (same filename).

If `cv-page-1.mind` is missing or invalid, the portfolio builds normally and the AR
flow offers the 2D Governance Brief without opening the camera.
