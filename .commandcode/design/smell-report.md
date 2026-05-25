# Design Smell Report — RoleVault Web

**Date**: 2026-05-24  
**Scored surface**: `web/src/` (landing + authenticated app)  
**Score**: 2/10 — IDENTITY FAILURE  
**Tells detected**: 8 of 10  

---

## Verdict

The RoleVault web interface carries a strong generated-design odor. Eight of ten tracked tells are present. The surface is well-built — tokens are coherent, components are consistent, motion is restrained — but nearly every visual decision reads as the median AI-character-platform answer. The palette, layout rhythm, depth system, section structure, and proof objects could be dropped into any AI chat product without becoming wrong. The design is safe, competent, and forgettable.

The root issue is a **domain reflex cascade**: dark theme with violet-to-cyan spectral gradients, frosted glass on every surface, centered sections with icon toppers, and oversized stat monuments. These are the defaults an LLM reaches for when asked to design a futuristic AI product in 2025.

---

## The Odors

### 1. Tech Gradient — DETECTED

**Pattern**: Violet (268°) to electric cyan (192°) gradients on hero headline text, CTA buttons, section badges, card edge lights, and the logo mark.

**Evidence**: 
- `--gradient-accent`: `linear-gradient(135deg, hsl(268 76% 60%), hsl(192 96% 54%))` used in `.gradient-text`
- `--gradient-spectral`: three-stop violet→cyan→green across cards
- Hero headline: "Meet the minds / you've imagined" — violet gradient on second line
- `.border-glow`, `.edge-light-top`, spectral card borders all follow this chromatic lane

**Why it weakens this brief**: RoleVault is about character roleplay — intimacy, identity, theatrical presence. A violet-to-cyan tech gradient signals "AI infrastructure" or "developer tool." The emotional register is wrong before a single character speaks.

**Recommended mode**: `recolor`

---

### 2. Generic Tech Hue — DETECTED

**Pattern**: Blue-violet (268°) as the sole primary identity color. Every accent — buttons, active states, focus rings, avatar rings, glow shadows — is violet.

**Evidence**:
- `--primary`: `268 76% 60%` — the exact hue range of every AI startup's brand color
- No secondary accent competes for attention; cyan is a supporting decoration, not a co-lead
- The spectral palette (violet, cyan, green, pink, orange) is used only as card trim, not as a true multi-role color strategy

**Why it weakens this brief**: Character roleplay requires emotional range. A single hue flattens every character into the same brand color. Rex Noir (noir detective), Seraphina (fantasy queen), and Coach Meridian (wellness) all sit under the same violet glow.

**Recommended mode**: `recolor`

---

### 3. Feature Tile Grid — DETECTED

**Pattern**: Six identical cards — icon box, heading, one sentence — in a uniform 2×3 grid. Every card equal weight, no hierarchy, no priority, no progression.

**Evidence**: `Features.tsx` renders 6 features in a `grid sm:grid-cols-2 lg:grid-cols-3 gap-4` with identical structure: `icon-box-primary/cyan` → `font-display text-base font-semibold` → `text-xs text-muted-foreground`. Card order is arbitrary; no feature matters more than any other.

**Why it weakens this brief**: A roleplay platform's features have natural hierarchy. "Character Creation Studio" is the product's reason to exist. "Contextual Memory" or "Instant Responses" are technical claims. Treating them as equals buries the lead.

**Recommended mode**: `relayout`

---

### 4. Accent Rail — DETECTED

**Pattern**: Colored spectral top-edge stripes on every CharacterCard, plus `.edge-light-top::before` utility. Decoration masquerading as information hierarchy.

**Evidence**: `CharacterCard.tsx` applies a spectral-gradient `h-px` line at the top of every card, color-keyed to the character's category. The FeaturedCharacters header uses `edge-light-top`. The drawer has a "spectral top edge." These stripes encode nothing functional — they simulate structure where none exists.

**Why it weakens this brief**: Category color-coding could be valuable if it carried meaning. As a 1px decorative stripe, it registers as AI-generated flair. The category badge already communicates the same information with a label.

**Recommended mode**: `refine`

---

### 5. Unearned Blur — DETECTED

**Pattern**: Frosted glass (`backdrop-filter: blur()`) applied to the drawer, bottom nav, hero CTA, testimonials, FAQ items, feature cards, footer CTA banner, and mobile nav. No depth system underneath.

**Evidence**: 
- Drawer: `backdropFilter: blur(28px)` with `hsl(var(--card) / 0.97)`
- Bottom composer: `backdropFilter: blur(24px)` with `hsl(var(--card) / 0.6)`
- Landing nav: `.glass` class on scroll
- Testimonials: `.glass` on every card
- FAQ: `.glass` on every item
- Footer CTA: `.glass` with `.inner-glow-violet`
- Features: `.panel` with `backdropFilter: blur(16px)` inside the gradient background

**Why it weakens this brief**: Glassmorphism requires depth — layers of content that genuinely overlap and reveal each other. The RoleVault surface applies blur to flat cards sitting on a solid dark background. There is nothing behind them to reveal. The blur is decorative, not functional.

**Recommended mode**: `surface` / `redesign`

---

### 6. Stat Monument — DETECTED

**Pattern**: Four oversized number clusters ("50M+ Conversations", "10K+ Characters", "2M+ Creators", "4.9★ App Rating") in equal-weight panels at the hero bottom.

**Evidence**: `Hero.tsx` renders a `grid grid-cols-2 sm:grid-cols-4` of `.panel` cards with gradient text numbers and uppercase labels. These numbers are invented marketing claims that push the actual product — character cards with faces and personalities — below the fold.

**Why it weakens this brief**: The hero should make the user want to talk to a character. A wall of fake stats ("50M+" when the data file has 6 characters) undermines trust. The evidence bar should be a character, not a number.

**Recommended mode**: `relayout`

---

### 7. Icon Topper — DETECTED

**Pattern**: A `Sparkles` icon inside a rounded pill badge placed above every major section heading.

**Evidence**:
- Hero: `<Sparkles />` in "Next-Generation AI Character Platform" badge
- Features: `<Sparkles />` in "Platform Capabilities" badge
- FeaturedCharacters: `<Sparkles />` in "Trending Now" badge

Three consecutive sections open with the same icon-badge pattern. The icon adds no information; it fills the template slot.

**Recommended mode**: `refine`

---

### 8. Center Stack — DETECTED

**Pattern**: Hero, features header, FAQ header, testimonials header, footer CTA — all center-aligned with no compositional variation. Centered grid of feature cards. Centered avatar in the authenticated home screen.

**Evidence**: Every major section uses `text-center` with `max-w-* mx-auto`. The authenticated Index page centers the character avatar, greeting, and action chips. Features uses a centered 3-column grid. There is no asymmetry, no editorial tension, no visual lane change between sections.

**Why it weakens this brief**: Centering everything reads as "I made no composition decision." The authenticated home screen — where a user arrives to talk to characters — should feel like an intimate space, not a marketing page. The landing page needs variation to hold interest across scroll depth.

**Recommended mode**: `relayout`

---

### 9. Bounce Everywhere — NOT DETECTED

Motion is restrained: `easeOut` fades, spring drawer with damping-30, `card-lift` with a tasteful 3px translateY. No elastic text, no bounce on scroll triggers, no excessive stagger. The motion system is one of the stronger parts of the design.

---

### 10. Default Type — NOT DETECTED

Sora for display is a deliberate geometric choice with character. Inter for body is common but not a smell when paired with a distinct display face. The type scale has a reason — Sora's wide apertures and geometric forms read as "expressive, constructed" which fits a character platform. It's not a smell; it's a defensible decision.

---

## Domain Default Assessment

An AI character roleplay platform would predictably be: dark theme, violet/indigo primary, glassmorphism, centered hero, gradient text, sparkle icons. RoleVault hits every one. The design has not found its own lane.

---

## Root Reflex

The design answers "what would an AI character platform look like?" with the training-data consensus rather than the product's specific truth. The product is about **theatrical intimacy** — stepping into another identity. The visual language should feel like a dressing room or a stage, not a SaaS dashboard. The dark glass aesthetic pulls toward "developer tool," not "performance space."

---

## Recommended Action

`redesign` — the smell is systemic across color, layout, depth, and section structure. Incremental repair (recolor one section, relayout another) would leave contradictions. A unified lane change is needed.

---

## Heuristics Table

| # | Odor | Status |
|---|------|--------|
| 1 | Tech gradient | DETECTED |
| 2 | Generic tech hue | DETECTED |
| 3 | Feature tile grid | DETECTED |
| 4 | Accent rail | DETECTED |
| 5 | Unearned blur | DETECTED |
| 6 | Stat monument | DETECTED |
| 7 | Icon topper | DETECTED |
| 8 | Center stack | DETECTED |
| 9 | Bounce everywhere | CLEAN |
| 10 | Default type | CLEAN |

**Score**: 2/10 (2 clean / 8 detected)
