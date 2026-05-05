"""
Шаг 1: Извлекает текст из full.docx в читаемый формат.
Результат сохраняется в diploma/doc_content.txt
"""
import zipfile, os, re

docx_path = r"D:\диплом\diploma\full.docx"
out_path   = r"D:\диплом\diploma\doc_content.txt"

with zipfile.ZipFile(docx_path, 'r') as z:
    with z.open('word/document.xml') as f:
        xml = f.read().decode('utf-8')

# Убираем XML-теги, оставляем текст
text = re.sub(r'<[^>]+>', ' ', xml)
# Схлопываем пробелы
text = re.sub(r'  +', ' ', text)

# Также ищем ключевые слова и выводим контекст
keywords = ['worker', 'Worker', 'nginx', 'Nginx', 'materialized', 'mv_top',
            'mv_season', 'контейнер', '6 контейнер', 'marketplace', 'Marketplace',
            'биржа', 'Биржа', 'producer', 'pool', 'cmd/worker']

with open(out_path, 'w', encoding='utf-8') as out:
    out.write("=" * 60 + "\n")
    out.write("ПОЛНЫЙ ТЕКСТ (первые 50000 символов)\n")
    out.write("=" * 60 + "\n\n")
    out.write(text[:50000])
    out.write("\n\n")
    out.write("=" * 60 + "\n")
    out.write("КЛЮЧЕВЫЕ СЛОВА С КОНТЕКСТОМ (±200 символов)\n")
    out.write("=" * 60 + "\n\n")
    for kw in keywords:
        positions = [m.start() for m in re.finditer(re.escape(kw), text, re.IGNORECASE)]
        if positions:
            out.write(f"\n--- '{kw}' найдено {len(positions)} раз ---\n")
            for pos in positions[:5]:
                start = max(0, pos - 200)
                end = min(len(text), pos + 200)
                out.write(f"  ...{text[start:end]}...\n")
                out.write("  ---\n")

print(f"Готово! Результат: {out_path}")
