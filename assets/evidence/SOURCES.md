# Evidence illustrations

Provided by the repository owner for inclusion in NoirBoard from their local
NoirBoard-assets collection. Original photographers, source URLs and redistribution
licenses were not supplied. No claim of public-domain status or MIT licensing is
made for these photographs; the code license does not relicense third-party images.
Before redistributing these assets separately, obtain the applicable permissions.

Processing: exterior background removal, manual outlines for low-contrast objects
and plastic bags, edge transparency, cropping. Packaging interiors are intentionally
preserved to avoid erasing white labels and highlights. Fingerprints are ink-alpha
crops of two distinct samples from a repeating sheet, not unique forensic prints.
Source labels and markings are decorative, not generated story facts.

| Output | Original filename |
|---|---|
| keys.png | - you.jpg |
| fingerprint-1.png, fingerprint-2.png | Fingerprint T-Shirt.jpg |
| pocket-contents.png | found in pockets ❤ liked on Polyvore featuring fillers, backgrounds, stuff, random and extras.jpg |
| pistol-dark.png | IMBEL MD5.jpg |
| banknotes.png | дольчетт.jpg |
| pistol-silver.png | загружено (76).jpg |
| evidence-bag.png | загружено (77).jpg |
| knife-tactical.png | загружено (78).jpg |
| cartridges.png | загружено (79).jpg |
| plant-sample.png | загружено (80).jpg |
| phone.png | загружено (81).jpg |
| medicine.png | загружено (82).jpg |
| knife-folding.png | загружено (83).jpg |

Reproduce on Windows with System.Drawing:
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-evidence.ps1 -SourceDirectory <original-collection>`
This only bypasses execution policy for the processing process; it does not change
the machine's persistent policy. The script expects the exact 13-file source set.

## Second owner-provided collection (1.5.0)

The same unknown-source/license notice above applies to these images. Exterior
background removed; palm print converted to an ink-alpha image. Originals remain
outside this repository. Run `scripts/prepare-mystic.ps1 -SourceDirectory <collection>`
on the corresponding ten-file collection, using the same process-local execution
policy option if needed.

| Output | Original filename |
|---|---|
| grimoire.png | Corvina Clemm ✩ Gothikana.jpg |
| tarot.png | Display of a Tarot Deck Featuring _THE WORLD_ Card on a Clean Background.jpg |
| palm-print.png | Inkt afdruk.jpg |
| potion.png | purple potion bottle.jpg |
| blood-bag.png | загружено (54).jpg |
| skull.png | загружено (55).jpg |
| spirit-board.png | загружено (56).jpg |
| crystal-ball.png | загружено (57).jpg |
| amulet.png | загружено (58).jpg |
| crystal.png | загружено (59).jpg |