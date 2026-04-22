# Gorgone Portal – Site Map & Architecture

---

## 0. Overview

The Gorgone Portal is the central hub of the campaign. It combines:

* static knowledge (lore, rules)
* structured game data (from Foundry)
* curated community content (reports, theories)

The system is designed as a **static site (GitHub Pages)** powered by **external data exports from FoundryVTT**.

---

## 1. Global Navigation

* Home
* Lore
* Rules
* Characters
* Missions
* Sessions
* Bulletin Board
* Enclave
* Open VTT

---

## 2. Pages Structure

### 2.1 Home (Hub)

Purpose: central access point

Contains:

* Latest Enclave Communications
* Active Missions (summary)
* Latest Session Reports
* Recent Bulletin Board entries
* Quick links to key sections

---

### 2.2 Lore

Structure:

* World Overview
* The Weave & Fractures
* The Gorgon Mirrors
* Locations
* Factions

Type: static content (Markdown)

---

### 2.3 Rules

Structure:

* Core Rules
* Enclave Procedures
* Roles
* Mission Structure

Type: static content (Markdown)

---

### 2.4 Characters

#### List Page

* character cards
* filters (role, status)

#### Detail Page

Each character includes:

* Name
* Portrait
* Role
* Status
* Short Bio
* Public Notes
* Linked Missions
* Linked Sessions

Type: Foundry export (JSON)

---

### 2.5 Missions

#### List Page

* Active Missions
* Completed Missions

#### Detail Page

Each mission includes:

* Title
* Status
* Objective
* Participants
* Linked Sessions
* Outcome

Type: Foundry export (JSON)

---

### 2.6 Sessions

#### Archive Page

* chronological list
* filters (character, mission, location)

#### Detail Page

Each session includes:

* Title
* Date
* Summary
* Key Events
* Linked Characters
* Linked Mission

Type: Markdown or JSON

---

### 2.7 Bulletin Board

Purpose: player-generated signals and theories

Structure:

* List of entries
* Entry detail

Each entry includes:

* Title
* Author
* Content
* Tags (theory, report, clue)
* Related entities (optional)

Type: curated JSON / Markdown

---

### 2.8 Enclave

Structure:

* Communications (official announcements)
* Organizational Structure
* Internal Directives

Type: static content

---

### 2.9 Open VTT

* External link to FoundryVTT instance
* Possibly opens in new tab

---

## 3. Data Sources

### 3.1 Static Content

* /content/lore/
* /content/rules/
* /content/enclave/

Format: Markdown

---

### 3.2 Foundry Data (Exported)

* /data/scripts/characters.json
* /data/missions.json
* /data/sessions.json

Generated via Foundry module export

---

### 3.3 Community Content

* /data/bulletin.json
* /content/sessions/ (optional Markdown)

---

## 4. Relationships (Core Concept)

Entities must be cross-linked:

* Characters ↔ Missions
* Characters ↔ Sessions
* Missions ↔ Sessions
* Bulletin entries ↔ any entity

IDs must be consistent across JSON files.

---

## 5. MVP Scope

INCLUDED:

* All pages listed above
* Static + Foundry data rendering
* Basic filters
* Cross-link navigation

EXCLUDED:

* User login
* Live editing from site
* Real-time sync with Foundry
* Comments / forum system

---

## 6. Future Extensions (Not in MVP)

* Authentication system
* Player posting from UI
* Live sync with Foundry
* Notifications
* Advanced search

---

## 7. Key Design Principle

The portal is not a wiki.

It is a:

> **Narrative Operating System for the Enclave**

Everything must reinforce:

* clarity
* immersion
* cross-connected information

---

## 8. Homepage Wireframe (MVP Direction)

### 8.1 Core UX Direction

The homepage must feel like the **operational portal of the Enclave**, not like a generic wiki or documentation index.

Target feeling:

* modern
* structured
* immersive
* elegant
* readable

The visual design should be based on a **modern UI foundation** with a **fantasy identity layered on top** through subtle ornament, texture, typography, and iconography.

Avoid:

* heavy fantasy UI
* parchment overload
* decorative clutter
* old-fashioned “wiki” layout
* generic SaaS dashboard aesthetic

The homepage should communicate:

* this is a living campaign hub
* this is an archive of knowledge
* this is an operational center for missions and reports

---

### 8.2 Visual Identity

Core palette:

* teal / sea-green accents
* blue-gray surfaces
* cold desaturated neutrals
* pale text with strong contrast

Visual style:

* dark but readable
* modular panels
* subtle borders
* soft shadows
* restrained glow accents
* thin decorative dividers
* fantasy details used sparingly

Fantasy identity should come from:

* emblem / sigil usage
* title typography
* ornamental separators
* faint texture or arcane motifs
* controlled ceremonial framing

Not from:

* oversized fantasy frames
* noisy textures
* excessive gold
* medieval clutter everywhere

---

### 8.3 Homepage Structure Overview

Recommended page order:

1. Header
2. Hero Dashboard
3. Current Activity Row
4. Main Archive Grid
5. Signals & Theories Section
6. Featured Characters / Persons of Interest
7. Footer

The page should be desktop-first, but responsive.

---

### 8.4 Header

Purpose:

* establish identity
* provide persistent navigation
* offer immediate VTT access

Content:

* Gorgone symbol / emblem
* Portal title
* navigation links
* highlighted “Open VTT” action

Suggested behavior:

* sticky header
* slightly detached from screen edges
* subtle transparency or blur
* thin bottom border
* compact height

Tone:

* elegant and modern
* not too heavy
* not too minimal to the point of feeling generic

---

### 8.5 Section 1 — Hero Dashboard

Purpose:

* immediately explain what the portal is
* give the user strong first actions
* show the current state of the campaign

Layout:

* two-column layout on desktop
* left: title, subtitle, short intro, primary actions
* right: status overview panel

#### Left Column

Contains:

* portal title / Enclave title
* short atmospheric-operational subtitle
* one short descriptive paragraph
* primary quick actions

Suggested quick actions:

* View Active Missions
* Read Latest Report
* Open Character Archive
* Open VTT

#### Right Column

Contains a compact status panel with items such as:

* Active Missions
* Latest Session
* New Communications
* Open Signals

This panel should feel like an intelligence summary.

Notes:

* this must not look like a marketing hero
* it must look like a command/archive entry point
* above-the-fold clarity is essential

---

### 8.6 Section 2 — Current Activity Row

Purpose:

* make the portal feel alive
* highlight the most relevant current content

Structure:

* row of 3 large cards

Cards:

1. Active Missions
2. Latest Session Report
3. Enclave Communications

Each card should include:

* title
* short preview text
* metadata
* clear CTA
* status badge if relevant

Tone:

* these are not decorative cards
* they should feel like important active records

This section should be visible very early, ideally still near the top of the page.

---

### 8.7 Section 3 — Main Archive Grid

Purpose:

* provide the main navigation to the portal’s knowledge structure

Structure:

* grid of archive tiles / section cards

Entries:

* Lore
* Rules
* Characters
* Missions
* Sessions
* Bulletin Board
* Enclave

Each tile includes:

* icon
* section title
* one short description
* optional dynamic count or metadata

UX notes:

* this must feel richer than a simple button grid
* cards should have clear hierarchy and hover states
* this is the core structural navigation of the portal

---

### 8.8 Section 4 — Signals & Theories

Purpose:

* make the site feel socially alive
* represent player findings, unresolved clues, open questions, and speculation

This section is one of the most important for identity.

Possible content:

* recent bulletin entries
* unresolved anomalies
* player theories
* clues requiring interpretation

Visual tone:

* between a notice board and an intelligence feed
* more organic and slightly less rigid than the archive sections
* still visually consistent with the rest of the portal

Suggested layout:

* one larger featured signal
* several smaller recent entries
* optional tag system

This section should feel like:

* the active mind of the Enclave
* collaborative interpretation of reality fractures

---

### 8.9 Section 5 — Featured Characters / Persons of Interest

Purpose:

* humanize the portal
* surface important characters or recently active figures

Possible content:

* player characters
* important NPCs
* recently active operatives

Structure:

* compact card row or grid
* portrait + name + role + short label

This section should not dominate the homepage, but it should prevent the site from feeling too abstract or purely archival.

---

### 8.10 Footer

Purpose:

* close the page with utility and atmosphere

Contains:

* quick links
* data sync / last update info
* VTT access
* optional Enclave motto or line of flavor text

Tone:

* not a generic corporate footer
* still part of the portal atmosphere

---

### 8.11 UX Principles for the Homepage

The homepage should prioritize:

* strong information hierarchy
* fast orientation
* low friction access to key areas
* modern card/grid UX
* restrained motion and hover feedback
* clear distinction between static archive and active campaign content

The homepage should avoid:

* giant hero banners with little utility
* dense walls of text
* overcomplicated fantasy decoration
* generic documentation homepage structure
* overly “app-like” dashboard with no atmosphere

---

### 8.12 Technical Direction for the Prototype

Recommended direction:

* Astro
* modern semantic HTML
* custom CSS
* lightweight JS only where needed

Avoid for the prototype:

* Bootstrap-like UI kits
* generic dashboard libraries
* excessive framework overhead

The first prototype should focus on:

* layout quality
* visual identity
* hierarchy
* hover/interactivity polish

Not yet on:

* real data integration
* advanced logic
* full responsiveness edge cases

---

### 8.13 Design Intent Summary

The homepage should feel like:

* an occult archive
* an operational intelligence hub
* the headquarters portal of an ancient order
* a modern digital interface shaped by fantasy identity

It must balance:

* usability
* atmosphere
* modularity
* narrative presence
