# RoleVault Web — Design Constitution

## Register

**Product with a brand landing page.** The authenticated app is the instrument — chat, character discovery, profile management, settings. The landing page is the brand — one scroll-depth pitch that converts to sign-up.

## User

Someone who wants to have immersive, character-driven AI conversations. They arrive at the landing page curious, possibly skeptical. Once authenticated, they browse characters, start chats, create their own, and manage their profile and preferences.

## Product Purpose

RoleVault connects people with AI characters that feel alive — each with a distinct personality, voice, scenario, and memory. Users can discover community-built characters or create their own and publish them for others.

## Artifact

The **character** is the atomic unit. Everything orbits around it: discovery, profile detail, chat conversation, creation studio, favourites. The user's job is to find or build a character, then talk to it.

## Evidence

A user should see a face and a name immediately. The landing page hero shows real characters from the data file, not invented stats. The authenticated home screen puts a character front and center. Trust comes from seeing real personalities, not marketing claims.

## Voice

Theatrical intimacy. The tone feels like stepping into a dressing room or a stage wing — warm, slightly dramatic, personal. Not corporate, not clinical, not performatively casual. Characters speak in their own voices; the platform speaks with restraint so they can be heard.

## Anti-References

- Standard SaaS homepage with centered hero, icon grid, and gradient CTAs
- Cold, clinical AI product aesthetic (white + blue, terminal mono)
- Over-engineered glassmorphism without a depth system underneath
- Fake social proof numbers divorced from actual data
- Purple-to-cyan gradients that signal "generic AI startup"

## Design Principles

1. **Characters first, platform second.** The interface gets out of the way so the character occupies the conversation.
2. **Warmth over sterility.** Dark surfaces are warm charcoal, not cold indigo. Amber light, not blue-violet.
3. **Earn every effect.** Glass, glow, and shadow must have a depth reason. Flat cards on flat backgrounds don't earn blur.
4. **Real data, real proof.** Show actual character faces and names. Stats must be honest.
5. **Theatrical, not theatrical.** Stage-like warmth without costume. Restrained drama.

## Visual Foundation

| Dimension | Current State |
|-----------|---------------|
| **Color** | Dark warm charcoal (30°/12%/4%) background. Primary: theatrical amber/gold (38°/92%/54%). Secondary: deep crimson (0°/55%/48%). Spectral category accents: gold, amber, rose, emerald, violet. |
| **Type** | Display: Sora (geometric sans). Body: Inter. Scale: headings text-wrap balanced, microcopy floor at 10px, body measure controlled at 68ch for paragraphs, tabular nums on stats. Light-on-dark compensated with 0.005em letter-spacing. |
| **Motion** | Spring drawer (damping 30/stiffness 280 entrance, damping 38/stiffness 380 exit). Staggered card reveals with micro-delays. Chat bubble heartbeat entrance (scale+opacity+overshoot). Hero CTA scale reveal. Reduced motion: all durations collapse to 0.01ms. |
| **Depth** | `.panel` for content surfaces (no blur). `.glass` reserved for genuinely overlapping layers (sidebar, bottom nav, sticky headers). Focus rings: 2px solid primary outline with 2px offset. |
| **Spacing** | Mix of Tailwind defaults + safe-area-inset on all fixed bars. Touch targets minimum 44px. |
| **Components** | shadcn/ui (Radix primitives), Framer Motion for state changes, Tailwind CSS for styling. All components use CSS custom properties via `hsl(var(--token))`. |

## Accessibility

- Global `:focus-visible` outline on all interactive elements
- All interactive controls minimum 44×44px hit area
- Touch-visible message actions (60% opacity on mobile, hidden-until-hover only on desktop)
- `prefers-reduced-motion` respected across all CSS animations
- Semantic `aria-label` on icon-only buttons
- `role="presentation"` on decorative images
- `alt` text on content images

## Component Rules

- **Buttons**: Sentence case. One verb. Gradient primary for primary actions, `.glass`-style for secondary. Disabled state shows `opacity-50` with `cursor-not-allowed`.
- **Cards**: Only when content is genuinely card-shaped (characters, testimonials, features). Not for wrapping everything. `active:scale-[0.98]` on press.
- **Forms**: Icon prefix + visible label via placeholder + glow-focus ring. Errors appear inline near the field and preserve input.
- **Empty states**: Always show what belongs there and a path to fill it.
- **Loading**: Named spinners (not generic "Loading...") appear quickly and resolve cleanly.
- **Overlays**: Drawers escape-closable. Modals reserved for destructive/irreversible actions.
