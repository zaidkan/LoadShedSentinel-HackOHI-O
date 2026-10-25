"""Read the supplied XLSX with stdlib only; preserve cell provenance and missing units.

Workbook INSTALL_HOURS/REMOVE_HOURS are unadjusted labor inputs: its explicit
ILM instruction and supplied AEP guide establish the 4.5 direct-to-person-hour
interpretation. Category averages are not exact construction units or damage codes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import posixpath
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

DEFAULT_WORKBOOK = Path(__file__).resolve().parents[1] / 'aep_challenge_hack26/data/Install_Labor_HackOHIO.xlsx'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
GROUPS = {
    'Crossarm': 'ARM', 'Bracket': 'BKT', 'Pole': 'POL', 'Transformer': 'TRANSFORMER',
    'Anchor': 'ANC', 'Equipment Lead': 'EQL', 'Grounding': 'GND', 'Guying': 'GYF',
    'Dead-End': 'DEC', 'Insulator': 'INS', 'Pin': 'PIN', 'Recloser': 'REC',
    'Secondary Conductor Attachment': 'SAA', 'Service': 'SVC', 'Switch': 'SWI', 'Fuse Cutout': 'XCO',
}


def _number(value):
    if isinstance(value, bool): return None
    try: result = float(value)
    except (ValueError, TypeError): return None
    return result if math.isfinite(result) and result >= 0 else None


def _read_sheets(path):
    with ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(node.itertext()) for node in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        rels = {node.attrib['Id']: node.attrib['Target'] for node in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        result = []
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            target = rels[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            target = posixpath.normpath(target.lstrip('/') if target.startswith('/') else 'xl/' + target)
            root = ET.fromstring(archive.read(target)); rows = {}; formulas = []
            for row in root.findall('s:sheetData/s:row', NS):
                cells = {}
                for cell in row.findall('s:c', NS):
                    ref = cell.attrib['r']; col = ref.rstrip('0123456789')
                    value = cell.find('s:v', NS); value = value.text if value is not None else None
                    if cell.get('t') == 's' and value is not None: value = strings[int(value)]
                    elif cell.get('t') == 'b': value = value == '1'
                    elif cell.get('t') == 'inlineStr': value = ''.join(cell.find('s:is', NS).itertext())
                    elif cell.get('t') not in ('str', 'e', 'b') and value is not None:
                        value = float(value)
                    formula = cell.find('s:f', NS)
                    if formula is not None: formulas.append({'cell': ref, 'formula': formula.text, 'cached_value': value})
                    cells[col] = {'value': value, 'formula': formula is not None, 'ref': ref}
                rows[int(row.attrib['r'])] = cells
            result.append((sheet.attrib['name'], rows, formulas))
        return result


def load_labor_catalog(path=DEFAULT_WORKBOOK):
    """Return raw references, all-sheet catalog, workbook hash, and explicit ILM basis."""
    path = Path(path); workbook_hash = hashlib.sha256(path.read_bytes()).hexdigest(); sheets = _read_sheets(path); by_name = {n: rows for n, rows, _ in sheets}
    indirect = by_name.get('Indirect Labor Multiplier', {})
    factor_cell = indirect.get(1, {}).get('B', {})
    note = str(indirect.get(3, {}).get('A', {}).get('value', ''))
    if factor_cell.get('formula') or _number(factor_cell.get('value')) != 4.5 or not all(t in note.lower() for t in ['labor hours', 'drive time', 'safety', 'set up']):
        raise ValueError('Workbook ILM basis is missing or changed; review units before multiplying.')
    records = []
    def add(code, sheet, row, install_col, remove_col=None, *, unit='construction_unit', label=None, kind='category_average'):
        def hours(col):
            cell = row.get(col, {})
            return None if cell.get('formula') else _number(cell.get('value'))
        row_number = next(iter(row.values()))['ref'].lstrip('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        records.append(dict(code=code, label=label or code, code_kind=kind,
                            install_hours=hours(install_col), remove_hours=hours(remove_col) if remove_col else None,
                            quantity_unit=unit, hour_basis='direct_job_site_hours', indirect_multiplier=4.5,
                            source={'workbook': path.name, 'workbook_sha256': workbook_hash, 'sheet': sheet, 'cells': [f'{c}{row_number}' for c in [install_col, remove_col] if c], 'missing_cells': [f'{c}{row_number}' for c in [install_col, remove_col] if c and (c not in row or row[c]['value'] is None)]},
                            requires_dispatcher_review=True, requires_unit_confirmation=unit == 'unspecified'))
    for name, rows, _ in sheets:
        if name == 'CNC':
            for _, row in sorted(rows.items()):
                code = str(row.get('A', {}).get('value', ''))
                if code.startswith('CNC-'): add(code, name, row, 'B', 'C', kind='construction_unit')
        elif name == 'Labor time material related':
            group = None
            for _, row in sorted(rows.items()):
                label = row.get('A', {}).get('value')
                if isinstance(label, str) and 'Average Hours' in label:
                    group = next((code for title, code in GROUPS.items() if label.startswith(title + ' ')), None)
                    continue
                if not group: continue
                if group == 'POL' and label in ['Small', 'Medium', 'Large']: add('POL:' + label, name, row, 'C', 'D', label=str(row.get('B', {}).get('value')))
                elif group == 'TRANSFORMER' and _number(label) is not None: add(f'TRANSFORMER:{float(label):g}', name, row, 'C', 'D', label=f'{float(label):g} kVA')
                elif group not in ['POL', 'TRANSFORMER'] and _number(label) is not None:
                    # Anchor has a count in A, unlike the other scalar average rows.
                    add(group, name, row, 'B' if group == 'ANC' else 'A', 'C' if group == 'ANC' else 'B')
        elif name == 'Labor only work':
            for number, row in sorted(rows.items()):
                if number == 1: continue
                label = str(row.get('A', {}).get('value', ''))
                unit = 'cubic_foot' if row.get('E', {}).get('value') == 'per cubic foot' else 'unspecified'
                add('LABOR:' + label, name, row, 'D', unit=unit, label=label, kind='labor_adder')
    if len({r['code'] for r in records}) != len(records): raise ValueError('Ambiguous duplicate labor reference keys')
    return dict(workbook=path.name, sha256=workbook_hash,
                indirect_multiplier=4.5, hour_basis='direct_job_site_hours',
                basis_evidence={'sheet': 'Indirect Labor Multiplier', 'cells': ['B1', 'A3'], 'instruction': note},
                category_descriptions={str(row.get('A', {}).get('value')): row.get('B', {}).get('value') for number, row in by_name.get('CU Group descriptions', {}).items() if number > 1},
                assumptions=['Person-hour interpretation follows the supplied AEP Data Guide; cell labels are INSTALL_HOURS/REMOVE_HOURS, not elapsed crew time.',
                             'Category averages are not exact work orders. Labor-only access/setup adders need overlap review.'],
                sheets=[dict(name=n, row_count=len(rows), max_row=max(rows, default=0),
                             columns=sorted({c for row in rows.values() for c in row}),
                             headers={c: x['value'] for c, x in rows.get(1, {}).items()},
                             formula_count=len(formulas), formulas=formulas) for n, rows, formulas in sheets], records=records)


def map_damage_to_work_packages(damage, catalog):
    """Candidate mapping, not an official ARCOS damage-code crosswalk or authorization.

ARCOS Asset_Type names drive reviewed category mappings. Conductor length,
unknown transformer ratings and unknown pole sizes never acquire invented hours.
Explicit quantity units must match the source denominator; no conversion is
inferred. Legacy unitless pole/transformer/switch quantities mean device counts.
"""
    result = dict(work_packages=[], missing_inputs=[], requires_dispatcher_review=True,
                  mapping_basis='Modeled asset/category mapping to sourced construction-unit averages')
    quantity = damage.get('quantity')
    if isinstance(quantity, bool) or _number(quantity) is None or float(quantity) <= 0:
        result['missing_inputs'].append('positive explicit quantity'); return result
    if str(damage.get('asset_type', '')).lower() in ('fuse bank', 'recloser bank') and damage.get('quantity_unit') != 'construction_unit':
        result['missing_inputs'].append('explicit component construction-unit count; a bank is not one device'); return result
    code = damage.get('damage_code')
    if code is None:
        code = {'pole': 'POL', 'transformer': 'TRANSFORMER', 'fuse bank': 'XCO',
                'recloser bank': 'REC', 'switch': 'SWI'}.get(str(damage.get('asset_type', '')).lower())
    if code == 'POL':
        height = _number(damage.get('pole_height_ft'))
        size = next((name for name, low, high in [('Small', 25, 35), ('Medium', 40, 55), ('Large', 60, math.inf)] if height is not None and low <= height <= high), None)
        code = 'POL:' + size if size else None
    elif code == 'TRANSFORMER':
        rating = _number(damage.get('transformer_kva'))
        code = f'TRANSFORMER:{rating:g}' if rating is not None else None
    record = next((r for r in catalog['records'] if r['code'] == code), None)
    if record is None:
        result['missing_inputs'].append('supported labor reference and exact rating/size'); return result
    unit = record.get('quantity_unit')
    if unit in (None, '', 'unknown', 'unspecified', 'task_assumption'):
        result['missing_inputs'].append('verified quantity denominator for labor reference'); return result
    quantity_unit = damage.get('quantity_unit')
    if 'quantity_unit' not in damage and str(damage.get('asset_type', '')).lower() in ('pole', 'transformer', 'switch'):
        quantity_unit = 'construction_unit'
    if quantity_unit != unit:
        result['missing_inputs'].append('explicit quantity unit matching the labor reference denominator'); return result
    operation = damage.get('operation', 'replace')
    if operation not in ('install', 'remove', 'replace'): raise ValueError('Unknown work operation')
    result['work_packages'].append(dict(labor_ref=record, quantity=float(quantity), quantity_unit=quantity_unit, operation=operation))
    if record['code'].startswith('POL:') and operation == 'replace':
        # Phases alone do not establish counts or voltage compatibility. The
        # representative drawings are not an exact bill of materials for this
        # pole. Keep the sourced pole component, but expose its incomplete scope.
        result['structure_complete'] = False
        result['mapping_basis'] += '; pole component only, not a complete structure replacement'
        result['missing_inputs'].append(
            'reviewed structure arrangement and crossarm/insulator/pin/grounding quantities; '
            'phase count and pole height alone do not specify associated hardware')
        result['omitted_hardware'] = []
        for code, label, cells in [('ARM', 'crossarms', ['A3', 'B3']),
                                   ('INS', 'insulators', ['A60', 'B60']),
                                   ('PIN', 'pins', ['A65', 'B65']),
                                   ('GND', 'grounding', ['A45', 'B45'])]:
            hardware = next((r for r in catalog['records'] if r['code'] == code), None)
            result['omitted_hardware'].append(dict(
                code=code, category=label, quantity=None,
                source=hardware['source'] if hardware else dict(
                    sheet='Labor time material related', cells=cells),
                reason='Omitted from labor total: construction-unit quantity and '
                       'structure/voltage compatibility require review; no hardware count inferred.'))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--workbook', type=Path, default=DEFAULT_WORKBOOK)
    print(json.dumps(load_labor_catalog(parser.parse_args().workbook), indent=2, allow_nan=False))
