"""Piecewise-constant modeled node energy, not demonstrated hardware endurance."""
from __future__ import annotations
import copy
from datetime import datetime, timedelta, timezone
import math


def _number(value, name, *, positive=False, maximum=None):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or (positive and value == 0) or (maximum is not None and value > maximum):
        raise ValueError('Invalid finite range for ' + name)
    return float(value)


def _date(value):
    try: result = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError as exc: raise ValueError('Explicit timezone-aware timestamp required') from exc
    if result.tzinfo is None: raise ValueError('Explicit timezone-aware timestamp required')
    return result.astimezone(timezone.utc)


def _loads(config):
    standby = _number(config.get('standby_w', .015), 'standby_w')
    extra = _number(config.get('extra_load_w', 0), 'extra_load_w')
    message = _number(config.get('message_wh', .001), 'message_wh')
    interval = _number(config.get('message_interval_minutes', 5), 'message interval', positive=True)
    retries = _number(config.get('retry_attempts', 0), 'retry attempts')
    if not retries.is_integer(): raise ValueError('Retry attempts must be integer')
    return standby + extra, message * (1 + retries), interval


def daily_energy_wh(node_config=None):
    """Continuous-duty budget; event capture/queued-message loads are additional."""
    load, message, interval = _loads(node_config or {})
    return _number(load * 24 + message * 1440 / interval, 'daily energy')


def simulate_energy(node_config, weather_scenario, event_window):
    """Return {solar: api.schemas.SolarNode, trace, buffered_events, ...}.

weather_scenario.segments contains {hours, irradiance_fraction, connectivity?};
its durations must cover event_window.hours exactly. Each segment is constant,
not a weather forecast. Events retain their original timezone-aware timestamps.
"""
    nominal = _number(node_config.get('nominal_wh', 41), 'nominal capacity', positive=True)
    panel = _number(node_config.get('solar_w', 25), 'panel power')
    usable = _number(node_config.get('usable_fraction', 1), 'usable fraction', positive=True, maximum=1)
    cold = _number(node_config.get('cold_derating', 1), 'cold derating', positive=True, maximum=1)
    efficiency = _number(node_config.get('charge_efficiency', 1), 'charge efficiency', maximum=1)
    initial_soc = _number(node_config.get('initial_soc_pct', 100), 'initial SoC', maximum=100)
    step_hours = _number(node_config.get('step_minutes', 60), 'step minutes', positive=True) / 60
    event_capture = _number(node_config.get('event_capture_wh', 0), 'event capture energy')
    load, message_wh, interval = _loads(node_config)
    hours = _number(event_window.get('hours'), 'window hours', positive=True)
    if hours / step_hours > 10000: raise ValueError('Too many integration steps')
    start = _date(event_window.get('start_utc')); end = start + timedelta(hours=hours)
    segments = weather_scenario.get('segments', [{'hours': hours, 'irradiance_fraction': 0}])
    prepared = []
    for segment in segments:
        duration = _number(segment.get('hours'), 'segment hours', positive=True)
        fraction = _number(segment.get('irradiance_fraction'), 'irradiance fraction', maximum=1)
        connection = segment.get('connectivity', event_window.get('connectivity', 'ONLINE'))
        if connection not in ('ONLINE', 'OFFLINE', 'DELAYED'): raise ValueError('Invalid connectivity')
        prepared.append((duration, fraction, connection))
    if not prepared or not math.isclose(sum(s[0] for s in prepared), hours, abs_tol=1e-9): raise ValueError('Solar segments must cover the complete window')
    pending = copy.deepcopy(event_window.get('buffered_events', [])); events = copy.deepcopy(event_window.get('events', []))
    seen = set()
    for event in pending + events:
        if not isinstance(event, dict) or not isinstance(event.get('id'), str) or not event['id'] or event['id'] in seen: raise ValueError('Events require unique IDs')
        seen.add(event['id']); timestamp = _date(event.get('timestamp_utc'))
        if event in events and not (start <= timestamp < end): raise ValueError('Event timestamp outside simulation window')
        if event in pending and timestamp > start: raise ValueError('Buffered event is from the future')
    events.sort(key=lambda event: (_date(event['timestamp_utc']), event['id']))
    pending.sort(key=lambda event: (_date(event['timestamp_utc']), event['id']))
    capacity = nominal * usable * cold; energy = capacity * initial_soc / 100
    if not math.isfinite(capacity) or capacity <= 0: raise ValueError('Invalid effective capacity')
    elapsed = 0.0; cursor = 0; delivered = []; unserved = 0.0; total_solar = 0.0; total_demand = 0.0
    def point():
        return dict(timestamp_utc=(start + timedelta(hours=elapsed)).isoformat().replace('+00:00', 'Z'), battery_wh=energy, battery_soc_pct=energy / capacity * 100)
    trace = [point()]; final_connection = event_window.get('connectivity', 'ONLINE')
    for duration, fraction, connection in prepared:
        segment_end = elapsed + duration
        while elapsed < segment_end - 1e-12:
            dt = min(step_hours, segment_end - elapsed); next_time = start + timedelta(hours=elapsed + dt)
            new = []
            while cursor < len(events) and _date(events[cursor]['timestamp_utc']) < next_time:
                new.append(events[cursor]); cursor += 1
            heartbeats = math.floor((elapsed + dt) * 60 / interval + 1e-8) - math.floor(elapsed * 60 / interval + 1e-8)
            attempts = heartbeats + len(new) + (len(pending) if connection == 'ONLINE' else 0)
            demand = load * dt + message_wh * attempts + event_capture * len(new)
            solar = panel * fraction * dt * efficiency
            if not math.isfinite(demand + solar): raise ValueError('Energy arithmetic overflow')
            missing = max(0.0, demand - energy - solar)
            energy = min(capacity, max(0.0, energy + solar - demand))
            total_solar += solar; total_demand += demand; unserved += missing
            if connection == 'ONLINE' and missing <= 1e-12:
                delivered.extend(pending + new); pending = []
            else: pending.extend(new)
            elapsed += dt; final_connection = 'OFFLINE' if missing > 1e-12 else connection
            trace.append(point())
    daily = daily_energy_wh(node_config)
    solar = dict(battery_soc_pct=energy / capacity * 100, nominal_wh=nominal, solar_w=panel,
                 modeled_runtime_days=energy / daily if daily > 0 else None,
                 buffered_events=len(pending), connectivity=final_connection, provenance='modeled_sensor')
    return dict(solar=solar, trace=trace, buffered_events=pending, delivered_events=delivered,
                daily_load_wh=daily, demanded_wh=total_demand, harvested_wh=total_solar, unserved_wh=unserved,
                assumptions=[f'Usable battery={capacity}Wh; piecewise-constant irradiance; charging efficiency={efficiency}; SoC is relative to usable capacity.',
                             'Runtime is remaining battery-only reserve divided by modeled routine daily load; future captures/retries/weather may reduce it.',
                             'Offline/delayed events keep original timestamps; energy shortages prevent successful delivery.',
                             'Modeled design only; no hardware endurance, connectivity or real weather validation.'])
