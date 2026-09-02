# Possible City

Possible City is a civic-imagination instrument for exploring grounded alternative futures for ordinary urban spaces. Each vision is paired with a reversible first move, a stewardship question, and something worth measuring.

This repository contains portfolio build 001 for [skailiner](https://github.com/skailiner).

## The field study and public beta

The site uses a composite viaduct-edge setting in Singapore and lets visitors apply the same three lenses to one public-space photo:

- **Ecological:** make stormwater and tropical shade part of the public realm.
- **Communal:** test a robust shared table and a lightweight neighbourhood care structure.
- **Contemplative:** treat stillness and small pauses as civic infrastructure.

The study is speculative. It does not depict an approved project or a surveyed parcel.

## Product principles

1. Start with what the place already does.
2. Test relationships with reversible interventions before fixing permanent objects.
3. Make stewardship, maintenance, consent, and exclusion visible.
4. Pair every image with a credible first action.

## Photo processing, privacy, and limits

Photos are decoded, resized, converted to JPEG, and stripped of metadata in the visitor's browser. The prepared image is sent through the server-side OpenAI API to GPT Image 2 and the result is returned directly to the browser. Possible City does not store either image. The server retains a short-lived one-way network hash for a three-attempt daily limit and an aggregate monthly total capped at 120 successful transformations. The text field note remains device-local.

Visitors should upload only public-space photos they have the right to share and should avoid close-up faces, licence plates, private interiors, and sensitive locations. Generated views are speculative conversation images, not plans or approvals.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and provide `OPENAI_API_KEY` for local image transformations. Never expose this value to the browser.

Create a production build with `npm run build`.

## Visual provenance

The three vision images and the social preview were produced with OpenAI's built-in image-generation workflow for this project. They are conceptual composites and should not be interpreted as documentary photographs or official plans.
