# ProofPilot design

The complete primary screen was concepted with the built-in Image Gen tool before UI implementation. The subject is a source-based opportunity workbench for early-career applicants. The signature is an evidence spine: each eligibility decision has a visible reason beside it, and conditional funding retains its condition.

Palette: cool blue page #EFF4FA, white surfaces #FFFFFF, ink #142C44, electric blue #265DF2, teal #147D71, slate #647A90. Display: Manrope; body/control: Source Sans 3; evidence dates: system monospace. Fonts are self-hosted with their OFL licenses.

Layout: quiet header; a large task heading; searchable/filterable opportunity rail; a single selected programme pane with evidence, funding, source and draft action. The mobile layout stacks the list above the selected detail. Focus rings and reduced motion are explicit.

The Image Gen brief requested a complete desktop application screen with the exact headings, navigation, three sample programmes, funding conditions, controls and empty/draft states. No marketing metrics, fictional traction or screenshots pretending to be interactive UI. The implementation uses reusable React components and real state.

Intentional functional additions to the primary concept: availability check, self-report labeling, provider state, privacy checks, accessible profile and review screens, live date/age uncertainty and explicit template mode. These prevent a polished layout from implying eligibility, AI availability or a submission that has not occurred.
