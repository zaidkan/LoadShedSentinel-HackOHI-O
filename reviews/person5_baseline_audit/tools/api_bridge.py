import json,sys,traceback
from fastapi.testclient import TestClient
from api.main import app
client=TestClient(app)
for line in sys.stdin:
    request=json.loads(line)
    try:
        r=client.request(request['method'],request['path'],headers=request.get('headers'),json=request.get('body'))
        out={'id':request['id'],'status':r.status_code,'content_type':r.headers.get('content-type','application/json'),'body':r.text}
    except Exception:
        traceback.print_exc(file=sys.stderr)
        out={'id':request['id'],'status':500,'content_type':'application/json','body':'{"detail":"audit bridge exception"}'}
    print(json.dumps(out),flush=True)
