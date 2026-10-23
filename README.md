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
- `output/english1-final-cheatsheet.pdf` สรุปอ่านก่อนสอบ English I (080103001) Final
- `output/physics-exam-summary.pdf` สรุปอ่านก่อนสอบ ฟิสิกส์ (ความร้อน / ของไหล / ไฟฟ้ากระแส)
- `output/physics-exam-cheatsheet.pdf` สรุปก่อนสอบฟิสิกส์ (ของไหล + ความร้อน + ไฟฟ้ากระแสตรง) ฉบับกฎเหล็กและทริคข้อประยุกต์
- `output/chemistry-exam-questions.pdf` ชุดโจทย์เคมี 80 ข้อ (ข้อสอบ มีช่องกาคำตอบและพื้นที่แสดงวิธีคิดทุกข้อ)
