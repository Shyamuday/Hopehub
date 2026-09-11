"""Extract the iCALL spreadsheet-style PDF without dropping empty-email entries.

Requires pypdf. Writes JSON to stdout; keep the output outside the repository.
Fails closed if the source layout changes. Original cells and PDF bytes are retained.
"""
import base64
import hashlib
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader


def extract(path):
    content = Path(path).read_bytes()
    reader = PdfReader(path)
    tokens = []
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text(visitor_text=lambda text, *_: tokens.append(text.strip()) if text.strip() else None))
    starts = [i for i, token in enumerate(tokens) if re.fullmatch(r"\d{10}-\d+", token)]
    if not starts:
        raise ValueError("No directory records found; unsupported PDF layout")
    records = []
    for start, end in zip(starts, starts[1:] + [len(tokens)]):
        cells = tokens[start:end]
        if len(cells) not in (54, 55) or cells[31] != "Age Range:" or cells[4] != "–":
            raise ValueError(f"Unexpected layout for {cells[0]}; review manually")
        fields = dict(zip([
            "name", "location", "email", "qualifications", "openingDays", "city",
            "address", "phone", "sessionDuration", "languages", "officeHours",
            "clientGroups", "consultationFee", "professionalTitle", "ageRange",
            "professionalTitleRepeated", "specialties", "recommendationSource",
            "services", "affiliation", "paymentMethods", "concessionDetails",
            "confidentialityFeedback", "crisisFeedback", "experienceFeedback"
        ], cells[6:31]))
        fields["gender"] = cells[36]
        fields["serviceMedium"] = cells[45]
        role = fields["professionalTitle"].lower()
        category = "PSYCHIATRIST" if "psychiatrist" in role else "PSYCHOLOGIST" if "psychologist" in role else "THERAPIST"
        # Only use the email column, never addresses found in patient testimonials.
        emails = sorted(set(re.findall(r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+", fields["email"])))
        records.append({"sourceRecordId": cells[0], "category": category,
                        "name": fields["name"], "city": fields["city"],
                        "professionalTitle": fields["professionalTitle"],
                        "emails": emails, "fields": fields, "rawCells": cells})
    if len({r["sourceRecordId"] for r in records}) != len(records):
        raise ValueError("Duplicate source record IDs")
    return {"version": 1, "filename": Path(path).name,
            "sha256": hashlib.sha256(content).hexdigest(),
            "pdfBase64": base64.b64encode(content).decode("ascii"),
            "pageTexts": pages, "records": records}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(extract(sys.argv[1]), sys.stdout, ensure_ascii=False)
