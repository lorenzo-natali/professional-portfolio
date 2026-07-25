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

1. Export a high-resolution PNG or JPG of the CV first page (or the chosen crop).
2. Open the MindAR Image Target Compiler:  
   https://hiukim.github.io/mind-ar-js-doc/tools/compile
3. Compile the image and download the `.mind` file.
4. Replace `public/ar/targets/cv-page-1.mind` with the new file (same filename).
5. Rebuild / redeploy. No application code changes are required.

If `cv-page-1.mind` is missing, the portfolio builds normally and the AR flow
automatically offers the 2D Governance Brief.
