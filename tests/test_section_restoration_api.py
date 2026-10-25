"""Source-backed staged restoration through the same isolated customer session."""
from uuid import uuid4

from fastapi.testclient import TestClient

from api.main import app


def test_unaffected_customers_restore_before_fault_repair_and_full_service_requires_authorization():
    client = TestClient(app)
    headers = {'X-Session-ID': 'step-' + uuid4().hex}
    current = client.get('/api/scenario/current', headers=headers).json()

    def action(name, status=200):
        nonlocal current
        result = client.post('/api/restoration/section-action', headers=headers, json={
            'action': name, 'incident_id': current['incident_id'], 'expected_revision': current['revision'],
        })
        assert result.status_code == status, result.text
        if status == 200:
            current = result.json()
        return result

    action('start')
    assert len(current['affected_premise_tokens']) == 16
    action('authorize_unaffected', 400)
    action('authorize_repaired', 400)
    assert len(current['affected_premise_tokens']) == 16
    action('isolate_section')
    action('authorize_unaffected')
    assert len(current['affected_premise_tokens']) == 8
    assert current['status'] == 'OUTAGE'
    assert current['section_restoration']['completed_repair'] is False
    action('select_unaffected_premise')
    customer = client.get('/api/customer/snapshot', headers=headers).json()
    assert customer['status'] == 'RESTORED'
    assert customer['section_restoration']['restored_count'] == 8
    assert customer['restoration_planning']['kind'] == 'unavailable'
    assert 'all_premise_tokens' not in customer['section_restoration']
    action('select_faulted_premise')
    faulted_customer = client.get('/api/customer/snapshot', headers=headers).json()
    assert faulted_customer['status'] == 'OUTAGE'
    assert not any(item['type'] == 'RESTORATION_COMPLETE' for item in faulted_customer['notifications'])
    action('complete_repair')
    assert len(current['affected_premise_tokens']) == 8
    action('authorize_repaired')
    assert current['status'] == 'RESTORED'
    assert current['affected_premise_tokens'] == []
    assert len(current['section_restoration']['restored_premise_tokens']) == 16


def test_section_demo_rejects_stale_intents_and_legacy_status_bypass_without_mutation():
    client = TestClient(app)
    headers = {'X-Session-ID': 'step-' + uuid4().hex}
    before = client.get('/api/scenario/current', headers=headers).json()
    start = client.post('/api/restoration/section-action', headers=headers, json={
        'action': 'start', 'incident_id': before['incident_id'], 'expected_revision': before['revision'],
    }).json()
    stale = client.post('/api/restoration/section-action', headers=headers, json={
        'action': 'isolate_section', 'incident_id': before['incident_id'], 'expected_revision': before['revision'],
    })
    assert stale.status_code == 409
    bypass = client.post('/api/scenario/advance', headers=headers, json={
        'status': 'RESTORED', 'action': 'record_demo_authorization',
    })
    assert bypass.status_code == 400
    assert client.get('/api/scenario/current', headers=headers).json() == start
    assert client.get('/api/customer/snapshot', headers={'X-Session-ID': 'other-' + uuid4().hex}).json()['section_restoration'] is None


def test_repair_before_partial_release_does_not_automatically_restore_any_premise():
    client = TestClient(app)
    headers = {'X-Session-ID': 'step-' + uuid4().hex}
    current = client.get('/api/scenario/current', headers=headers).json()
    for name in ('start', 'isolate_section', 'complete_repair'):
        response = client.post('/api/restoration/section-action', headers=headers, json={
            'action': name, 'incident_id': current['incident_id'], 'expected_revision': current['revision'],
        })
        assert response.status_code == 200
        current = response.json()
    assert len(current['affected_premise_tokens']) == 16
    assert current['section_restoration']['restored_premise_tokens'] == []
