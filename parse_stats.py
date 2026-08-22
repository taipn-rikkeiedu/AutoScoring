import csv
import json
import re
import sys
from bs4 import BeautifulSoup

def clean_text(text):
    if not text:
        return ""
    # Replace multiple whitespace/newlines with single space
    return re.sub(r'\s+', ' ', text).strip()

def parse_learning_statistics(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')

    # Page Header / Class Title
    class_info = ""
    # Find class name header
    for div in soup.find_all('div', class_='header'):
        txt = clean_text(div.get_text())
        if 'HCM-' in txt or 'CNTT' in txt or 'PTIT' in txt:
            class_info = txt
            break
    
    if not class_info:
        for div in soup.find_all(['div', 'h1', 'h2', 'h3', 'h4']):
            txt = clean_text(div.get_text())
            if '(' in txt and ')' in txt and any(k in txt for k in ['CNTT', 'PTIT', 'K25', 'HK']):
                class_info = txt
                break

    table = soup.find('table')
    if not table:
        print("No table found in HTML.")
        return None

    rows = table.find_all('tr')
    if not rows:
        print("No rows found in table.")
        return None

    # Column headers
    raw_headers = [clean_text(th.get_text()) for th in rows[0].find_all(['th', 'td'])]

    students = []
    for row in rows[1:]:
        tds = row.find_all(['td', 'th'])
        if not tds or len(tds) < 10:
            continue

        # STT
        stt_str = clean_text(tds[0].get_text())
        if not stt_str.isdigit():
            continue
        stt = int(stt_str)

        # Name and Email
        p_tags = tds[1].find_all('p')
        if len(p_tags) >= 2:
            name = clean_text(p_tags[0].get_text())
            email = clean_text(p_tags[1].get_text())
        else:
            full_text = clean_text(tds[1].get_text())
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', full_text)
            if email_match:
                email = email_match.group(0)
                name = full_text.replace(email, '').strip()
            else:
                name = full_text
                email = ""

        # Tỷ lệ nghỉ học
        ty_le_nghi_hoc = clean_text(tds[2].get_text())

        # Tỷ lệ thiếu bài tập
        ty_le_thieu_bt = clean_text(tds[3].get_text())

        # E-learning progress
        elearning = clean_text(tds[4].get_text())

        # Số bài chậm
        so_bai_cham = clean_text(tds[5].get_text()).replace(' !', '!')

        # Hackathon - TN (Trắc nghiệm)
        tn_divs = tds[6].find_all('div', class_='test-point')
        tn_scores = [clean_text(d.get_text()) for d in tn_divs if clean_text(d.get_text())]
        hackathon_tn = " / ".join(tn_scores) if tn_scores else "N/A"

        # Hackathon - TL (Tự luận)
        tl_divs = tds[7].find_all('div', class_='test-point')
        tl_scores = [clean_text(d.get_text()) for d in tl_divs if clean_text(d.get_text())]
        hackathon_tl = " / ".join(tl_scores) if tl_scores else "N/A"

        # R-Points
        rpoints = clean_text(tds[8].get_text())

        # Auto R-Points
        auto_rpoints = clean_text(tds[9].get_text())

        # Trạng thái chốt điểm
        trang_thai_chot = clean_text(tds[10].get_text()).replace('🔒', '').strip()

        # Điều kiện tham gia project
        dieu_kien_project = clean_text(tds[11].get_text()) if len(tds) > 11 else ""

        students.append({
            'stt': stt,
            'name': name,
            'email': email,
            'ty_le_nghi_hoc': ty_le_nghi_hoc,
            'ty_le_thieu_bai_tap': ty_le_thieu_bt,
            'elearning': elearning,
            'so_bai_cham': so_bai_cham,
            'hackathon_tn': hackathon_tn,
            'hackathon_tl': hackathon_tl,
            'rpoints': rpoints,
            'auto_rpoints': auto_rpoints,
            'trang_thai_chot': trang_thai_chot,
            'dieu_kien_project': dieu_kien_project
        })

    result = {
        'class_info': class_info,
        'total_students': len(students),
        'raw_headers': raw_headers,
        'students': students
    }

    return result

if __name__ == '__main__':
    html_file = 'file.html'
    if len(sys.argv) > 1:
        html_file = sys.argv[1]
    
    res = parse_learning_statistics(html_file)
    if res:
        json_file = 'scraped_learning_statistics.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(res, f, ensure_ascii=False, indent=2)
        print(f"✅ Successfully saved JSON ({res['total_students']} students) to {json_file}")

        csv_file = 'scraped_learning_statistics.csv'
        fieldnames = [
            'stt', 'name', 'email', 'ty_le_nghi_hoc', 'ty_le_thieu_bai_tap',
            'elearning', 'so_bai_cham', 'hackathon_tn', 'hackathon_tl',
            'rpoints', 'auto_rpoints', 'trang_thai_chot', 'dieu_kien_project'
        ]
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(res['students'])
        print(f"✅ Successfully saved CSV to {csv_file}")
