# LaTeX Documentation

This directory contains the complete LaTeX documentation for the Uptimatum project.

## Building the Documentation

### Quick Start (Docker - No Installation Required)

If you don't have LaTeX installed, you can use Docker to compile the document:

```bash
cd docs && docker run --rm -v "$(pwd)/..":/project -w /project/docs texlive/texlive:latest sh -c "pdflatex -interaction=nonstopmode -jobname=UptimatumDocumentation main.tex && pdflatex -interaction=nonstopmode -jobname=UptimatumDocumentation main.tex"
```

This command:
- Uses the official TeX Live Docker image
- Mounts the project root directory (parent of `docs`) as `/project`
- Sets working directory to `/project/docs` (so relative paths like `../diagrams/` work correctly)
- Runs `pdflatex` twice for proper cross-references
- Automatically removes the container after compilation (`--rm`)
- Outputs `UptimatumDocumentation.pdf` in the `docs/` directory next to `main.tex`

**Note**: The first run will download the Docker image (~3GB), but subsequent builds will be fast.

### Prerequisites (Local Installation)

If you prefer to install LaTeX locally:

- **Linux**: `texlive-full` or `texlive-most`
- **macOS**: MacTeX
- **Windows**: MiKTeX or TeX Live

### Build Commands (Local Installation)

#### Using pdflatex (Recommended)

```bash
cd docs
pdflatex -jobname=UptimatumDocumentation main.tex
pdflatex -jobname=UptimatumDocumentation main.tex  # Run twice for proper cross-references
```

#### Using latexmk (Automated)

```bash
cd docs
latexmk -pdf -jobname=UptimatumDocumentation main.tex
```

This will automatically run pdflatex multiple times until all references are resolved.

#### Clean Build Artifacts

```bash
cd docs
latexmk -c  # Clean auxiliary files
# Or manually:
rm -f *.aux *.log *.out *.toc *.fdb_latexmk *.fls *.synctex.gz
```

## Document Structure

The LaTeX document includes:

1. **Introduction** - Overview and key features
2. **Architecture** - System architecture with TikZ diagrams
3. **Deployment** - Complete deployment guide
4. **Backend Documentation** - API and development guide
5. **Frontend Documentation** - Frontend development guide
6. **UI Showcase** - Screenshots and interface documentation
7. **Deployment Scripts** - Script documentation
8. **Configuration** - Environment variables and settings
9. **Troubleshooting** - Common issues and solutions
10. **Upcoming Features** - Planned enhancements
11. **License** - MIT License

## Images

The document references images from:

- `../diagrams/` - Architecture and database diagrams
- `../ui_showcase/` - UI screenshots

Make sure these directories exist relative to the `docs/` directory when building.

## Notes

- The document uses TikZ for flowcharts instead of Mermaid diagrams
- All emojis have been removed for LaTeX compatibility
- Images are centered using `\centering` and `[H]` float placement
- Code listings use the `listings` package with syntax highlighting

