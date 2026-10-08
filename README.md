# mdtopdf

แปลงไฟล์ Markdown เป็น PDF โทนสี Blue / Navy / Light Blue / White สำหรับเอกสารมหาวิทยาลัย รองรับภาษาไทย (ฟอนต์ Sarabun)

## วิธีใช้

    npm install
    node convert.mjs input/ไฟล์.md                # ไฟล์สรุป แปลงตามปกติ
    node convert.mjs input/ไฟล์.md --exam         # ไฟล์ข้อสอบ เว้นช่องเขียนคำตอบให้ทุกข้อ

ไฟล์ PDF จะอยู่ในโฟลเดอร์ `output/`

## ไฟล์ที่แปลงแล้ว

- `output/lab10-11-exam-summary.pdf` สรุปก่อนสอบ ปฏิบัติการชีววิทยาพื้นฐาน แล็บ 10 และ 11
- `output/biodiversity-lab12-summary.pdf` สรุปก่อนสอบ บทปฏิบัติการที่ 12 ความหลากหลายทางนิเวศวิทยา (Biodiversity in ecosystem)
