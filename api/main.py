"""Person 4 API. Local single-process demo; no external notifications or dispatch."""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from api.schemas import (Action, CustomerPreferencesRequest, CustomerSnapshot, Notification,
                         PremiseSummary, ResetRequest, Risk, RiskRequest, ScenarioSummary, Snapshot)
from api.scenarios import ScenarioError, ScenarioStore, DISCLOSURE
from api.services import TeamServices


def create_app(services: TeamServices | None = None):
    services=services or TeamServices()
    store=ScenarioStore(enricher=services.enrich_snapshot)
    app=FastAPI(title='LoadShed Sentinel Integration API',version='0.1.0',
                description='Local synthetic integration demo. Customer projection is filtered on the server.')
    app.state.store=store
    app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],
                       allow_methods=['GET','POST'],allow_headers=['Content-Type'])

    @app.exception_handler(ScenarioError)
    async def scenario_error(request: Request,exc: ScenarioError):
        return JSONResponse(status_code=exc.status,content={'detail':exc.detail})

    @app.get('/api/health')
    def health():
        return {'status':'ok','schema_version':'integration_v1','mode':'synthetic_fixture',
                'scenario_count':len(store.definitions),'persistence':'in_memory_single_process',
                'module_adapters':{'snapshot':services.enrich_snapshot is not None,
                                   'network':services.network is not None,'risk':services.risk is not None}}

    @app.get('/api/metadata')
    def metadata():
        return {'mode':'synthetic_fixture','disclosure':DISCLOSURE,
                'source_data_path':'aep_challenge_hack26/', 'source_data_ingested':False,
                'delivery':'in_app_demo_only','module_status':{'data_graph':'awaiting_person_1',
                'diagnosis_labor_energy':'awaiting_person_2','visual_pages':'awaiting_person_3_and_customer_UI'},
                'source_legend':{'synthetic_fixture':'Invented integration connections and ranges',
                                 'scenario':'Explicit simulated events','modeled_sensor':'Conceptual sensor readings'},
                'security':'Local demo only. Operator routes are not authenticated; do not expose this server publicly.'}

    @app.get('/api/scenarios',response_model=list[ScenarioSummary])
    def scenarios():
        return [{k:s[k] for k in ['id','title','description','source']} for s in store.definitions.values()]

    @app.get('/api/premises',response_model=list[PremiseSummary])
    def premises(scenario_id: str='multi_fault'):
        result=store.get(scenario_id)
        return [PremiseSummary(token=p.premise_token,label=f'Demo home {i+1}')
                for i,p in enumerate(result.snapshot.premise_states)]

    @app.get('/api/network')
    def network(circuit_id: str='DEMO-CIRCUIT-A',scenario_id: str='multi_fault'):
        if services.network:
            return services.network(circuit_id)
        if circuit_id!='DEMO-CIRCUIT-A':
            raise HTTPException(404,'Only DEMO-CIRCUIT-A is available until the data adapter is connected')
        store.get(scenario_id)
        paths=store.definitions[scenario_id]['paths']
        return {'circuit_id':circuit_id,'source':'synthetic_fixture','geometry':None,
                'paths':[{'premise_token':p,'asset_tokens':a} for p,a in paths.items()],
                'limitations':['No geographic geometry in integration fixtures. Await Person 1 sanitized GeoJSON.',
                               'Relational fixture links are not live energized states.']}

    @app.post('/api/risk',response_model=Risk)
    def risk(body: RiskRequest):
        if services.risk:
            return services.risk(body)
        result=store.get(body.scenario_id)
        if body.premise_token not in result.customers:
            raise HTTPException(404,'Unknown premise in this scenario')
        band={'calm':'LOW','moderate':'MODERATE','severe':'HIGH','unknown':'UNKNOWN'}[body.storm_scenario]
        return Risk(band=band,confidence_kind='unavailable' if band=='UNKNOWN' else 'scenario_only',
                    drivers=['Fixed illustrative storm-input mapping; no historical risk model or calibrated probability.'])

    @app.get('/api/incidents/{incident_id}/snapshot',response_model=Snapshot)
    def snapshot(incident_id: str):
        return store.get_incident(incident_id).snapshot

    @app.post('/api/scenarios/{scenario_id}/reset',response_model=Snapshot)
    def reset(scenario_id: str,body: ResetRequest):
        return store.apply(scenario_id,body).snapshot

    @app.post('/api/scenarios/{scenario_id}/actions',response_model=Snapshot)
    def actions(scenario_id: str,body: Action):
        return store.apply(scenario_id,body).snapshot

    @app.post('/api/scenarios/{scenario_id}/advance',response_model=Snapshot)
    def advance(scenario_id: str,body: ResetRequest):
        return store.apply(scenario_id,Action(**body.model_dump(),action='advance')).snapshot

    @app.get('/api/customer/{scenario_id}/{premise_token}/snapshot',response_model=CustomerSnapshot)
    def customer_snapshot(scenario_id: str,premise_token: str):
        result=store.get(scenario_id)
        if premise_token not in result.customers:
            raise HTTPException(404,'Unknown premise in this scenario')
        return result.customers[premise_token]

    @app.post('/api/customer/{scenario_id}/{premise_token}/preferences',response_model=CustomerSnapshot)
    def customer_preferences(scenario_id: str,premise_token: str,body: CustomerPreferencesRequest):
        request=Action(**body.model_dump(),action='set_preferences',target_id=premise_token)
        return store.apply(scenario_id,request).customers[premise_token]

    @app.get('/api/customer/notifications',response_model=list[Notification])
    def notifications(premise_token: str,scenario_id: str='multi_fault'):
        result=store.get(scenario_id)
        if premise_token not in result.customers:
            raise HTTPException(404,'Unknown premise in this scenario')
        return result.customers[premise_token].notifications

    return app

app=create_app()
