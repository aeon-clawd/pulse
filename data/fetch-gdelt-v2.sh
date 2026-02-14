#!/bin/bash
# Fetch GDELT sentiment via Raspberry Pi — writes valid JSON after each country
# Run: ssh aeon@100.116.156.13 'bash -s' < fetch-gdelt-v2.sh

TMPDIR="/tmp/gdelt-countries"
rm -rf "$TMPDIR" && mkdir -p "$TMPDIR"

declare -A COUNTRIES=(
  [US]="United States" [CN]="China" [RU]="Russia" [GB]="United Kingdom"
  [DE]="Germany" [FR]="France" [JP]="Japan" [IN]="India" [BR]="Brazil"
  [AU]="Australia" [CA]="Canada" [KR]="South Korea" [MX]="Mexico"
  [IT]="Italy" [ES]="Spain" [TR]="Turkey" [SA]="Saudi Arabia"
  [IR]="Iran" [IL]="Israel" [UA]="Ukraine" [PL]="Poland"
  [NL]="Netherlands" [SE]="Sweden" [NO]="Norway" [AR]="Argentina"
  [CO]="Colombia" [EG]="Egypt" [NG]="Nigeria" [ZA]="South Africa"
  [ID]="Indonesia" [TH]="Thailand" [VN]="Vietnam" [PK]="Pakistan"
  [BD]="Bangladesh" [PH]="Philippines" [MY]="Malaysia" [TW]="Taiwan"
  [SG]="Singapore" [AE]="United Arab Emirates" [QA]="Qatar"
  [IQ]="Iraq" [SY]="Syria" [AF]="Afghanistan" [KE]="Kenya"
  [ET]="Ethiopia" [MM]="Myanmar" [VE]="Venezuela" [CL]="Chile"
  [PE]="Peru" [CU]="Cuba"
)

declare -A FIPS=(
  [US]="US" [CN]="CH" [RU]="RS" [GB]="UK" [DE]="GM" [FR]="FR" [JP]="JA" [IN]="IN"
  [BR]="BR" [AU]="AS" [CA]="CA" [KR]="KS" [MX]="MX" [IT]="IT" [ES]="SP" [TR]="TU"
  [SA]="SA" [IR]="IR" [IL]="IS" [UA]="UP" [PL]="PL" [NL]="NL" [SE]="SW" [NO]="NO"
  [AR]="AR" [CO]="CO" [EG]="EG" [NG]="NI" [ZA]="SF" [ID]="ID" [TH]="TH" [VN]="VM"
  [PK]="PK" [BD]="BG" [PH]="RP" [MY]="MY" [TW]="TW" [SG]="SN" [AE]="AE" [QA]="QA"
  [IQ]="IZ" [SY]="SY" [AF]="AF" [KE]="KE" [ET]="ET" [MM]="BM" [VE]="VE" [CL]="CI"
  [PE]="PE" [CU]="CU"
)

CODES=(US CN RU GB DE FR JP IN BR AU CA KR MX IT ES TR SA IR IL UA PL NL SE NO AR CO EG NG ZA ID TH VN PK BD PH MY TW SG AE QA IQ SY AF KE ET MM VE CL PE CU)

total=${#CODES[@]}
i=0

for code in "${CODES[@]}"; do
  i=$((i+1))
  name="${COUNTRIES[$code]}"
  fips="${FIPS[$code]}"
  
  encoded_name=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$name'))")

  sleep 6
  ext_raw=$(curl -sf --max-time 15 "https://api.gdeltproject.org/api/v2/doc/doc?query=${encoded_name}&mode=timelinetone&format=json&TIMELINESMOOTH=5" 2>/dev/null)
  
  sleep 6
  int_raw=$(curl -sf --max-time 15 "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcecountry:${fips}&mode=timelinetone&format=json&TIMELINESMOOTH=5" 2>/dev/null)

  # Save raw per-country JSON
  python3 -c "
import json, sys
def parse(raw):
    if not raw: return {'tone':0,'articleCount':0,'timeline':[]}
    try:
        d = json.loads(raw)
        series = d.get('timeline',[{}])[0].get('data',[])
        if not series: return {'tone':0,'articleCount':0,'timeline':[]}
        recent = series[-7:]
        avg = sum(x['value'] for x in recent) / len(recent)
        tl = [{'date':x['date'][:10],'tone':round(x['value'],2)} for x in series[-90:]]
        return {'tone':round(avg,2),'articleCount':len(recent),'timeline':tl}
    except: return {'tone':0,'articleCount':0,'timeline':[]}
ext = parse('''$(echo "$ext_raw" | sed "s/'/\\\\'/g")''')
int_ = parse('''$(echo "$int_raw" | sed "s/'/\\\\'/g")''')
dis = round(abs(int_['tone'] - ext['tone']), 2)
obj = {'name':'$name','code':'$code','internal':int_,'external':ext,'dissonance':dis,'tone':ext['tone'],'articleCount':ext['articleCount']+int_['articleCount']}
with open('$TMPDIR/$code.json','w') as f: json.dump(obj, f)
print(f'[$i/$total] $name: int={int_[\"tone\"]} ext={ext[\"tone\"]} dis={dis}')
" 2>&1

done

# Assemble final JSON from all country files
python3 -c "
import json, glob, time
countries = {}
for f in glob.glob('$TMPDIR/*.json'):
    code = f.split('/')[-1].replace('.json','')
    with open(f) as fh:
        countries[code] = json.load(fh)
result = {'countries': countries, 'timestamp': int(time.time()*1000)}
print(json.dumps(result))
"
