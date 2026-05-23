# Task: Generate Southern Utah Image for Tower Inspections Service

## Objective
Replace the current Tower Inspections service image (`/uploads/drone_cell_tower_ins_d409ba2d.jpg`) with a new image that matches the Southern Utah / Zion region aesthetic used across the rest of the site.

## Current State
- Service ID: 61
- Service name: Tower Inspections
- Current image: `/uploads/drone_cell_tower_ins_d409ba2d.jpg` (generic cell tower, no Southern Utah context)

## Steps

### 1. Generate the new image
Use the `generateImage` callback in code_execution. Save to `public/uploads/tower_inspections_southern_utah.png`.

Prompt:
"Aerial drone photography of a tall cell tower or communication tower standing against dramatic red rock canyon walls in the Southern Utah desert near Zion National Park. The red sandstone cliffs glow in warm golden sunlight. A small professional drone hovers nearby conducting an inspection. Clear blue desert sky, sparse desert vegetation, wide cinematic view. Photorealistic, high resolution."

Negative prompt: "snow, trees, green forests, generic background, cartoon, illustration"

Aspect ratio: 16:9

### 2. Update the database
Run SQL to update the service image_url:
```sql
UPDATE services SET image_url = '/uploads/tower_inspections_southern_utah.png' WHERE id = 61;
```

### 3. Verify
Confirm the image appears correctly on the services page for Tower Inspections.
