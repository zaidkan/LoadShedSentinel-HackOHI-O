from pathlib import Path
import json,math,hashlib,zipfile,xml.etree.ElementTree as ET
from collections import Counter
from fastapi.testclient import TestClient
from api.main import app,SCENARIO_BLOCKERS
root=Path(__file__).resolve().parents[1];client=TestClient(app);results=[];evidence={}
def test(name,call):
 try:results.append({'case':name,'passed':True,'details':call()})
 except Exception as exc:results.append({'case':name,'passed':False,'error':repr(exc)})
def new():return {'X-Session-ID':client.post('/api/session/new').json()['session_id']}
def select(s,h,asset=None):
 r=client.post('/api/scenario/select',headers=h,json={'scenario_id':s,**({'asset_token':asset} if asset else {})});assert r.status_code==200,r.text;return r.json()
def scale():
 source=client.get('/api/aep/source').json();b=json.loads((root/'snapshot/data/processed/network_bundle.json').read_text());g=json.loads((root/'snapshot/data/processed/graph_summary.json').read_text());f=b['critical_facility_associations']
 assert len(b['supply_paths'])==source['premises_in_sample']==16 and g['matched_premises']==117549 and len(f)==52
 assert all(x['status']=='ASSUMED' for x in f)
 evidence['aep_source']=source;evidence['facility_summary']={'count':52,'kinds':dict(Counter(x['kind'] for x in f)),'status':'ASSUMED'}
 return {'sample':16,'offline_paths':117549,'facilities':evidence['facility_summary']}
test('Source scope and facility proximity-association boundary',scale)
def workbook():
 p=(root/'snapshot/aep_challenge_hack26/data/Install_Labor_HackOHIO.xlsx');ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 with zipfile.ZipFile(p) as z:
  wb=ET.fromstring(z.read('xl/workbook.xml'));rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheet=next(s for s in wb.findall('m:sheets/m:sheet',ns) if s.attrib['name'].rstrip('!')=='Labor time material related')
  target=rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  cells={c.attrib['r']:float(c.find('m:v',ns).text) for c in ET.fromstring(z.read(target)).findall('.//m:c',ns) if c.attrib['r'] in ('C21','D21')}
 expected=sum(cells.values())*4.5;s=select('confirmed_replacement',new());r=s['restoration']
 assert math.isclose(r['labor_work_hours'],expected,rel_tol=1e-12) and r['labor_work_unit']=='person-hours' and math.isclose(r['expected_hours'],expected/3,rel_tol=1e-12)
 evidence['workbook']={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'cells':cells,'multiplier':4.5,'person_hours':expected,'elapsed_at_3':expected/3};return evidence['workbook']
test('Independent workbook XML: C21+D21, single 4.5 multiplier and elapsed units',workbook)
scenarios={};customer={}
for name in ['local_protection','upstream_feeder','confirmed_replacement','insufficient_evidence']:
 def case(name=name):
  h=new();s=select(name,h);c=client.get('/api/customer/snapshot',headers=h).json();scenarios[name]=s;customer[name]=c
  assert c['revision']==s['revision'] and c['selected_premise_token']==s['selected_premise_token'] and s['crew_recommendation']['approved'] is False
  assert all(e['provenance'] in ['scenario','modeled_sensor'] for e in s['evidence']) and s['impact_source']['sample_premise_count']==16
  if name=='insufficient_evidence':assert s['status']=='UNDER_REVIEW' and s['customer_risk']['band']=='UNKNOWN' and s['affected_premise_tokens']==[] and s['restoration']['expected_hours'] is None and not any(n['type']=='OUTAGE_CONFIRMED' for n in c['notifications'])
  assert all(n['delivery_mode']=='demo' for n in c['notifications']) and 'Simulated demonstration preview' in c['alert_plan']['escalation_policy']
  return {'status':s['status'],'cutout':s['cutout_status'],'affected':len(s['affected_premise_tokens']),'crew_basis':s['crew_recommendation']['basis'],'capabilities':s['crew_recommendation']['capabilities'],'restoration':s['restoration']['kind']}
 test('Scenario and customer projection: '+name,case)
def assets():
 h=new();rows=[]
 for a in client.get('/api/aep/assets').json():
  if a['kind']=='TRANSFORMER':
   s=select('local_protection',h,a['asset_token']);rows.append({'asset':a['asset_token'],'sample_impact':len(s['affected_premise_tokens']),'capabilities':s['crew_recommendation']['capabilities']})
 assert any(x['sample_impact']!=3 for x in rows);evidence['local_asset_matrix']=rows;return rows
test('All selectable transformers: varying source-derived footprints',assets)
def sensitivity():
 h=new();s=select('confirmed_replacement',h);rows=[]
 for crew,access in [(6,0),(6,2)]:
  r=client.post('/api/scenario/advance',headers=h,json={'incident_id':s['incident_id'],'expected_revision':s['revision'],'crew_size':crew,'access_hours':access});assert r.status_code==200,r.text;s=r.json();c=client.get('/api/customer/snapshot',headers=h).json()
  assert math.isclose(s['restoration']['expected_hours'],s['restoration']['labor_work_hours']/crew+access) and c['restoration_planning']['expected_hours']==s['restoration']['expected_hours'];rows.append({'crew':crew,'access':access,'expected':s['restoration']['expected_hours']})
 before=client.get('/api/scenario/current',headers=h).json();assert client.post('/api/scenario/advance',headers=h,json={'expected_revision':before['revision']-1,'crew_size':8}).status_code==409;assert client.get('/api/scenario/current',headers=h).json()==before
 return rows
test('Sensitivity, shared customer range and stale revision rejection',sensitivity)
def gates():
 h=new();s=select('local_protection',h);assert client.post('/api/scenario/advance',headers=h,json={'status':'RESTORED'}).status_code==400
 assert client.post('/api/scenario/advance',headers=h,json={'completed_task_ids':SCENARIO_BLOCKERS['local_protection']}).status_code==200
 r=client.post('/api/scenario/advance',headers=h,json={'status':'RESTORED'});assert r.status_code==400 and 'authorization' in r.text
 r=client.post('/api/scenario/advance',headers=h,json={'status':'RESTORED','authorized_premises':s['affected_premise_tokens']});assert r.status_code==200 and r.json()['cutout_status']=='CLOSED';return {'uncleared':400,'cleared_without_authorization':400,'cleared_and_authorized':200}
test('Restoration needs cleared blockers AND explicit simulated authorization',gates)
def isolation():
 a,b=new(),new();select('local_protection',a);select('upstream_feeder',b);assert client.get('/api/scenario/current',headers=a).json()['scenario_id']=='local_protection';assert client.get('/api/scenario/current',headers=b).json()['scenario_id']=='upstream_feeder'
 client.post('/api/scenario/reset',headers=b);assert client.get('/api/scenario/current',headers=a).json()['scenario_id']=='local_protection';return 'Independent session state and reset verified'
test('X-Session-ID state and reset isolation',isolation)
def battery():
 rows=[]
 for usable in [.85,0]:
  p=dict(capacity_wh=1000,usable_fraction=usable,device_w=120,inverter_efficiency=.85,reserve_margin_pct=.15);r=client.post('/api/customer/battery-runtime',json=p);assert r.status_code==200,r.text;x=r.json()
  assert abs(x['conservative_hours']-x['theoretical_hours']*.85)<=.01 and abs(x['theoretical_hours']-1000*usable*.85/120)<=.01;rows.append(x)
 assert client.post('/api/customer/battery-runtime',json=dict(capacity_wh=-1,device_w=120)).status_code==400
 zero=client.post('/api/customer/battery-runtime',json=dict(capacity_wh=1000,device_w=0));assert zero.status_code==200 and zero.json()['conservative_hours']==0
 return rows
test('Battery physics: efficiency, reserve, zero energy and invalid inputs',battery)
def privacy():
 h=new();s=select('confirmed_replacement',h);c=client.get('/api/customer/snapshot',headers=h).json();raw=json.dumps(c)
 assert not {'current_asset_id','crew_recommendation','hypotheses','medical_device_notes','coordinates','latitude','longitude','street_address'}.intersection(c)
 assert c['impact_source']['fault_asset_token'].startswith('ASSET-')  # public anonymized asset token is intentional source metadata
 assert 'PRIVATE-INTERNAL' not in raw
 assert all(set(e)<={'id','kind','value','unit'} for e in c['public_evidence'])
 t=client.get('/api/topology/lookup',params={'premise_id':s['selected_premise_token']}).json();assert t['endpoint']=='Circuit Breaker' and t['substation_status']=='UNKNOWN'
 assert client.get('/api/topology/lookup',params={'premise_id':'PREM-NOT-IN-SAMPLE'}).json()['status']=='UNKNOWN';return {'customer_private_fields':False,'public_anonymous_asset_token_in_source_metadata':True,'endpoint':t['endpoint'],'substation':t['substation_status']}
test('Projection privacy and source-bounded known/unknown lookup',privacy)
def projection_injection():
 from api.schemas import ScenarioSnapshot, Evidence
 from engine.customer import project_customer_view
 s=ScenarioSnapshot(**scenarios['confirmed_replacement']).model_copy(deep=True)
 s.current_asset_id='PRIVATE-INTERNAL-ASSET'
 s.restoration.assumptions=['Declared work for asset=PRIVATE-INTERNAL-ASSET; review required']
 common=dict(incident_id=s.incident_id,asset_id=s.current_asset_id,timestamp_utc=s.timestamp_utc,provenance='modeled_sensor',quality='modeled')
 s.evidence=[Evidence(id='PUBLIC-EVIDENCE',kind='cutout_state',value='OPEN',visibility='customer_safe',**common),Evidence(id='OPERATOR-EVIDENCE',kind='operator_note',value='PRIVATE-OPERATOR-DETAIL',visibility='operator',**common)]
 view=project_customer_view(s);raw=json.dumps(view)
 assert 'PRIVATE-INTERNAL-ASSET' not in raw and 'PRIVATE-OPERATOR-DETAIL' not in raw
 assert len(view['public_evidence'])==1 and set(view['public_evidence'][0])=={'id','kind','value','unit','label'}
 assert 'asset_id' not in view['public_evidence'][0] and 'provenance' not in view['public_evidence'][0]
 return {'operator_record_excluded':True,'internal_assumption_token_sanitized':True,'safe_record_fields':['id','kind','value','unit','label']}
test('Injected private fields, operator-only records and assumption tokens stay out of customer projection',projection_injection)
evidence['scenarios']=scenarios;evidence['customer_views']=customer
(root/'receipts/backend-probe-results.json').write_text(json.dumps({'passed':all(r['passed'] for r in results),'results':results,'evidence':evidence},indent=2)+'\n')
print(json.dumps({'passed':all(r['passed'] for r in results),'results':results},indent=2));raise SystemExit(0 if all(r['passed'] for r in results) else 1)
