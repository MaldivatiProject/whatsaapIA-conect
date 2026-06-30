import os
import sys

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber no está instalado. Instalando...")
    os.system("pip install pdfplumber")
    import pdfplumber

pdf_dir = r"d:\Documents\1.zns_workspace\1.projects\21.txplus\00-raw-inputs\pdfs"
output_dir = r"d:\Documents\1.zns_workspace\1.projects\21.txplus\00-raw-inputs\pdfs"

pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith('.pdf')]

for pdf_file in pdf_files:
    pdf_path = os.path.join(pdf_dir, pdf_file)
    output_path = os.path.join(output_dir, pdf_file.replace('.pdf', '_extracted.txt'))
    
    print(f"\nExtrayendo texto de: {pdf_file}")
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    full_text += f"\n\n=== PÁGINA {i+1} ===\n\n{text}"
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(full_text)
            
            print(f"✓ Texto extraído y guardado en: {output_path}")
            print(f"  Total de páginas: {len(pdf.pages)}")
            print(f"  Total de caracteres: {len(full_text)}")
    
    except Exception as e:
        print(f"✗ Error al procesar {pdf_file}: {str(e)}")

print("\n\nExtracción completada!")
