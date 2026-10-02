# KEEP: Your Story, Forever

Build a polished mobile-first clickable web app prototype called KEEP.

PRODUCT THESIS
KEEP helps people say what matters and gives those words a place to live forever. It is an intentional-message creation product: AI helps a sender discover and craft a meaningful message, the sender records it in their real voice, then KEEP turns their voice + photos/videos + music into a beautiful memory-film experience, and finally links that experience to a premium NFC keepsake card. Think of the simplicity, motion, full-screen imagery, and emotional polish of Apple Photos Memories as inspiration for interaction philosophy, but DO NOT clone Apple's UI, branding, icons, exact layouts, or trade dress. KEEP must have its own distinctive premium identity.

CORE BRAND
Name: KEEP
Primary line: "Say what matters. Keep it forever."
Secondary concepts: "Keep this version of them." "KEEP THIS." "Tap to remember."
Aesthetic: premium, intimate, minimal, cinematic. Near-black #0B0B0B, warm ivory #F4F0E8, muted warm gray, restrained gold/sand accent. Generous spacing. Elegant typography pairing (clean sans + tasteful serif only for emotional/display moments). No gradients unless extremely subtle. No cheesy hearts, scrapbooking, gift-shop aesthetic, or bright SaaS blue. Use lucide icons.

BUILD GOAL
Create a fully clickable FRONTEND prototype optimized for iPhone-sized screens but responsive on desktop. No auth/database needed for this first prototype. Use realistic seeded state/local state. Buttons must work and navigation should feel coherent. Use React/TypeScript/Tailwind/shadcn conventions already available in Lovable. Add tasteful motion/transitions.

NAVIGATION
Bottom nav on primary app surfaces only: Keeps | Create | You.
Recipient viewing experience should have no app navigation.

SEED DATA
Create a seeded existing Keep:
Recipient: HANNA
From: Alex
Occasion: Anniversary
Year: 2026
Duration: 3:57
Status: Ready
Theme: Warm + Nostalgic
Caption style: Reel
Visual style: Natural
Use tasteful placeholder photography from public image sources already supported by Lovable; prioritize couple, wedding, candid, travel, family-life imagery. Do not imply these are actually Alex/Hanna; they are prototype placeholders.

SCREENS / FLOW

1) HOME / KEEPS
Header KEEP.
Hero line "Say what matters. Keep it forever."
Primary button "+ Create a Keep".
Existing Keep as large cinematic image card: HANNA / Anniversary · 2026 / 3:57 / Ready. Tapping opens Keep detail/player.
A small second card can say "Our Family · Christmas 2026" with Draft status to demonstrate library.

2) CREATE: RECIPIENT
Progress indicator subtle, not enterprise wizard.
Question: "Who are you making this for?"
Large tactile choices: Spouse, Mom, Dad, Child, Grandparent, Friend, Someone else.
After selecting, ask their name in a beautiful simple input. Seed Hanna if demo path.

3) CREATE: OCCASION
"What's this Keep for?"
Birthday, Anniversary, Wedding, New Baby, Mother's Day, Father's Day, Graduation, Thank You, Just Because, Other.
Use elegant pill/card selection.

4) MESSAGE PATH
"What do you want to say?"
Two large cards:
A) sparkle icon "Help me find the words" / "KEEP will talk with you and help uncover what you really want to say."
B) "I know what I want to say" / "Write it yourself or bring in something you've already written."
Both must be clickable.
For B show a writing surface and Continue.
For A go to interview.

5) AI INTERVIEW
Make this one of the strongest screens. Near-black full-screen, minimal chrome, subtle animated waveform/orb, microphone control.
Question demo:
"Tell me about Hanna. Who is she to you beyond just being your wife?"
Include demo response transcript after user taps record:
"She's my best friend. She's my sounding board, my encourager, and the person who believes in me when I don't believe in myself."
Then show an intelligent follow-up:
"You said she makes people feel at home. Can you remember a specific moment when you really noticed that?"
Let user click a "Demo answer" / mic interaction to advance through 3-4 questions. Progress copy should say "Getting to know your story…" not Question X of Y.
Interview topics should demonstrate specificity: how she makes people feel, small ordinary things, motherhood/family, shared life changes, hopes for 20 years from now.
At end: "I think we have it." with a concise AI summary and "Create My Message".

6) GENERATED MESSAGE
Title "Your message is ready."
Show polished editable message in readable sections, using realistic excerpts:
"Hanna, I wanted to make this because there are so many things that I think about you and appreciate about you that I probably don't say enough.
You're my best friend. You're my sounding board. You're my encourager...
One of the things I notice most is the way you make people feel. You have this ability to make people feel seen and known and heard and loved. You make people feel at home..."
Continue enough to feel real, not an enormous wall.
Each paragraph can be selected/edited. Add "Ask KEEP" bottom action opening a sheet with quick prompts:
"Make this sound more like me"
"Shorten this section"
"Make the ending stronger"
"Add a memory"
Demo applying one change with a toast/state.
Primary CTA "Record Your Keep".

7) RECORD / TELEPROMPTER
Full-screen teleprompter-like recording experience. Large centered script, subtle fade above/below, mic waveform, timer.
Before recording: "Now say it in your own voice." / "These are your words. They should sound like you."
Start Recording button.
On tap, simulate recording, auto-scroll or animate script slightly, timer, Pause and Finish.
Finish can immediately show "Your voice is ready" with fake waveform, duration 3:57, Play, Record Again, Use Recording.
Mention discreetly: "KEEP will clean background noise and balance levels. Your voice stays your voice."

8) ADD MEMORIES
"Bring your words to life."
"Add photos & videos that belong to this story."
Large "Choose Photos & Videos" button. Since browser prototype cannot access real iOS library robustly, clicking should simulate adding 48 memories using placeholder thumbnails and show a beautiful grid.
Then CTA "Create My Keep".
Show a short cinematic generating state:
"Listening to your story…"
"Finding the moments that fit…"
"Building your Keep…"
Then enter editor.

9) MEMORY EDITOR — MOST IMPORTANT SCREEN
This must feel exceptional.
Large/full-bleed portrait media preview occupying most of screen, with subtle slow Ken Burns-style animation using CSS on the current image. Overlay minimal play/pause and progress.
Top: HANNA, small "Anniversary · 2026".
Bottom editing rail with exactly four main modes:
Memories | Music | Captions | Style
No complicated NLE timeline.

MEMORIES MODE:
Horizontal filmstrip of ~10 visible representative thumbnails; support drag-like reordering if easy, otherwise clickable reorder controls plus clear visual affordance. Selecting a thumbnail changes preview. Actions: Replace, Remove, Duration; "+ Add Memory". Include an "Auto-arrange" sparkle action labeled "Match to my story".
Show subtle AI insight: "Matched to: 'Then I got to watch you become a mom…'" on an appropriate demo frame.

MUSIC MODE:
Heading "Choose a feeling."
First group "For You" with:
Warm + Nostalgic (recommended)
Joyful
Cinematic
Then moods: Romantic, Hopeful, Playful, Reflective, Acoustic, Piano.
Each has small play icon and descriptive subtitle. Selecting changes current state and preview indicator. Include a compact "Voice / Music" balance concept only as Simple: Soft / Balanced / Full, default Balanced — NOT a mixer. Explain "KEEP automatically lowers music while you speak and lets it rise between moments."
Create fake music-playing animation/wave bars.

CAPTIONS MODE:
"How should your words appear?"
Interactive preview styles:
Clean — simple 2-line subtitle
Reel — bold phrase-by-phrase with active-word emphasis
Film — elegant serif
Story — larger emotional phrases
Minimal — key lines only
None
Selecting updates an overlay caption on the main preview immediately. For Reel demo show "YOU MAKE PEOPLE FEEL AT HOME" with one word highlighted in sand/gold.
Copy: "Captions are timed directly to your recording."

STYLE MODE:
"Choose the feel."
Natural, Warm, Film, Modern.
Each changes CSS visual treatment and transition/motion description.
Natural = clean, subtle movement.
Warm = gentle warmth, soft dissolves.
Film = cinematic grain, slower movement.
Modern = crisp movement, contemporary type.
No gaudy filters.

10) PREVIEW
CTA in editor "Preview Keep".
Hide all editor UI and play a simulated full-screen sequence with music icon state, captions, progress. It can cycle through several placeholder photos automatically. Start with a 2-3 sec title:
KEEP
HANNA
from Alex · 2026
Then memory experience.
Provide exit/back after interaction.
End card "KEEP THIS." / "Whenever you want to hear it again."
Buttons: Make Changes / Finish Keep.

11) PHYSICAL CARD
"Give it somewhere to live."
Render a premium matte-black credit-card-like NFC object with realistic depth/shadow. Front: KEEP. Back/customization fields:
HANNA
FROM ALEX
2026
Allow editing those three engraving lines.
Explain simply: "Your card opens this Keep with a tap. No app or login required."
CTA "Create My Keep".
Then success screen:
"Your Keep is ready."
Card #000001
HANNA · from Alex · 2026
"Preview recipient experience"
"Back to Keeps"

12) RECIPIENT EXPERIENCE
Critical. Separate clean route/view with no app nav.
Near-black.
KEEP
HANNA
from Alex · 2026
"Open Your Keep"
On click transition to immersive memory player. No signup, sales copy, editing UI, or account request.
At end show KEEP THIS. and Replay.

13) YOU
Minimal settings/profile prototype: Alex, My cards, Downloads & backups, Privacy, Help. Include privacy copy: Keeps are private by default.

INTERACTION REQUIREMENTS
- Make every major CTA work.
- Persist current creation choices in React state/context through flow.
- Back navigation works.
- Smooth page transitions.
- Buttons should have pressed/hover states.
- iPhone safe-area awareness.
- Desktop centers a phone-like/max-width experience where appropriate; editor/player can expand elegantly.
- No dead-end screen.
- Use tasteful toast/sheets where helpful.
- Avoid excessive rounded cards; use borderless/full-bleed surfaces and restrained radius.
- Accessibility: readable contrast, buttons large enough, labels.
- Do NOT require login.
- Do NOT actually upload/order an NFC card; simulate completion.
- Do NOT build backend yet.
- Do NOT claim real AI/audio/video processing is occurring; label prototype simulations subtly where necessary, but maintain immersive demo.

IMPORTANT PRODUCT DISTINCTION
This is NOT CapCut. The user should never feel asked to edit a video professionally. KEEP makes strong defaults automatically and gives emotionally understandable choices. The AI interview and real human voice are the heart. The editor is for taste and control, not complexity.

Please implement the entire clickable prototype now, not just a landing page. After implementation, verify the main happy path works from Home → Create → interview → message → record → memories → editor → preview → card → recipient preview, and fix obvious broken navigation or layout issues.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://keep-v1.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/30b5ed86-3309-4e5e-b8e4-e8ebf3b00b84).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
