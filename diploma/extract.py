import zipfile, re

src = r"C:\Users\cacar\AppData\Roaming\Claude\local-agent-mode-sessions\2bc6c162-030b-4ebf-ad7d-33956d9bd268\685a9460-efa7-4a7d-837e-6b1588768eb5\local_aef14d2d-abe3-47f3-84ee-223c9855af38\uploads\full.docx"
out = r"D:\диплом\diploma\doc_out.txt"

with zipfile.ZipFile(src, 'r') as z:
    xml = z.read('word/document.xml').decode('utf-8')

text = re.sub(r'<[^>]+>', ' ', xml)
text = re.sub(r'  +', ' ', text)

keywords = ['worker','Worker','nginx','Nginx','materialized','mv_top','mv_season',
            'контейнер','marketplace','Marketplace','биржа','producer','cmd/worker']

with open(out, 'w', encoding='utf-8') as f:
    f.write("КЛЮЧЕВЫЕ СЛОВА:\n\n")
    for kw in keywords:
        hits = [m.start() for m in re.finditer(re.escape(kw), text, re.IGNORECASE)]
        if hits:
            f.write(f"\n=== '{kw}' ({len(hits)} вхождений) ===\n")
            for pos in hits[:3]:
                s, e = max(0,pos-300), min(len(text),pos+300)
                f.write(f"  ...{text[s:e]}...\n\n")
    f.write("\n\n--- ТЕКСТ (первые 100000 символов) ---\n\n")
    f.write(text[:100000])

print("OK -> D:\\doc_out.txt")
