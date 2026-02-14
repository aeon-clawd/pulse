#!/bin/bash
# Fetch GDELT sentiment via Raspberry Pi (to avoid VPS IP ban)
# Usage: ssh aeon@100.116.156.13 'bash -s' < fetch-gdelt.sh

OUTFILE="/tmp/gdelt-sentiment.json"

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

fetch_tone() {
  local query="$1"
  local url="https://api.gdeltproject.org/api/v2/doc/doc?query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")&mode=timelinetone&format=json&TIMELINESMOOTH=5"
  curl -sf --max-time 15 "$url" 2>/dev/null
}

echo '{"countries":{' > "$OUTFILE"
total=${#CODES[@]}
i=0
first=true

for code in "${CODES[@]}"; do
  i=$((i+1))
  name="${COUNTRIES[$code]}"
  fips="${FIPS[$code]}"

  # Fetch external (world about country)
  sleep 6
  ext_raw=$(fetch_tone "$name")
  
  # Fetch internal (local media)
  sleep 6
  int_raw=$(fetch_tone "sourcecountry:$fips")

  # Parse with python
  result=$(python3 -c "
import json, sys
def parse(raw):
    if not raw:
        return {'tone':0,'articleCount':0,'timeline':[]}
    try:
        d = json.loads(raw)
        series = d.get('timeline',[{}])[0].get('data',[])
        if not series:
            return {'tone':0,'articleCount':0,'timeline':[]}
        recent = series[-7:]
        avg = sum(x['value'] for x in recent) / len(recent)
        tl = [{'date':x['date'][:10],'tone':round(x['value'],2)} for x in series[-90:]]
        return {'tone':round(avg,2),'articleCount':len(recent),'timeline':tl}
    except:
        return {'tone':0,'articleCount':0,'timeline':[]}

ext = parse('''$ext_raw''')
int_ = parse('''$int_raw''')
dis = round(abs(int_['tone'] - ext['tone']), 2)
obj = {'name':'$name','code':'$code','internal':int_,'external':ext,'dissonance':dis,'tone':ext['tone'],'articleCount':ext['articleCount']+int_['articleCount']}
print(json.dumps(obj))
" 2>/dev/null)

  if [ -z "$result" ]; then
    result="{\"name\":\"$name\",\"code\":\"$code\",\"internal\":{\"tone\":0,\"articleCount\":0,\"timeline\":[]},\"external\":{\"tone\":0,\"articleCount\":0,\"timeline\":[]},\"dissonance\":0,\"tone\":0,\"articleCount\":0}"
  fi

  if [ "$first" = true ]; then
    first=false
  else
    echo ',' >> "$OUTFILE"
  fi
  echo "\"$code\":$result" >> "$OUTFILE"

  pct=$((i * 100 / total))
  tone=$(echo "$result" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(f'int={d[\"internal\"][\"tone\"]} ext={d[\"external\"][\"tone\"]} dis={d[\"dissonance\"]}')" 2>/dev/null || echo "?")
  echo "[$i/$total] ${pct}% | $name: $tone" >&2
done

echo '},"timestamp":'$(date +%s000)'}' >> "$OUTFILE"
echo "DONE — saved to $OUTFILE" >&2
cat "$OUTFILE"
