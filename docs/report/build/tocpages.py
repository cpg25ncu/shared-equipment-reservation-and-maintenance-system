import subprocess, json, re, sys
sys.path.insert(0,'.')
from report_content import CONTENT
n=int(re.search(r'Pages:\s+(\d+)',subprocess.run(['pdfinfo',sys.argv[1]],capture_output=True,text=True).stdout).group(1))
pages=[subprocess.run(['pdftotext','-f',str(i),'-l',str(i),'-layout',sys.argv[1],'-'],capture_output=True,text=True).stdout for i in range(1,n+1)]
out={};n1=n2=n3=0;start=3
for it in CONTENT:
    if it[0] not in('h1','h2','h3'): continue
    if it[0]=='h1': n1+=1;n2=n3=0;num=f'{n1}.'
    elif it[0]=='h2': n2+=1;n3=0;num=f'{n1}.{n2}'
    else: n3+=1;num=f'{n1}.{n2}.{n3}'
    pat=re.compile(r'^\s*'+re.escape(num.rstrip('.'))+r'\.?\s+'+re.escape(it[1][:30]),re.M)
    for i in range(start,n):
        if pat.search(pages[i]): out[f'{num} {it[1]}']=i+1; start=i; break
    else: print('MISSING',num,it[1])
json.dump(out,open('toc.json','w'),indent=1); print(len(out))
