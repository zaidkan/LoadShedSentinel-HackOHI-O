import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ScenarioSnapshot } from '../../../contracts/types';
import {
  fetchAEPAssets,
  fetchCurrentScenario,
  fetchScenarios,
  resetScenario,
  selectScenario,
  type AEPSourceAsset,
  type ScenarioMeta,
} from '../services/api';

interface IncidentState {
  snapshot: ScenarioSnapshot | null;
  scenarios: ScenarioMeta[];
  aepAssets: AEPSourceAsset[];
  selectedScenarioId: string;
  activeAssetToken: string;
  loading: boolean;
  busy: boolean;
  connectionError: boolean;
  actionError: string | null;
  retry: () => Promise<void>;
  chooseScenario: (scenarioId: string) => Promise<boolean>;
  chooseAsset: (assetToken: string) => Promise<void>;
  reset: () => Promise<void>;
  /** Assets the backend accepts for the selected scenario: breakers for upstream interruptions, transformers otherwise. */
  selectableAssets: AEPSourceAsset[];
}

const IncidentContext = createContext<IncidentState | null>(null);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ScenarioSnapshot | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [aepAssets, setAepAssets] = useState<AEPSourceAsset[]>([]);
  const [activeAssetToken, setActiveAssetToken] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('local_protection');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const retry = useCallback(async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const [scenarioList, current, assets] = await Promise.all([
        fetchScenarios().catch(() => []),
        fetchCurrentScenario(),
        fetchAEPAssets().catch(() => []),
      ]);
      setScenarios(scenarioList);
      setAepAssets(assets);
      setSnapshot(current);
      setActiveAssetToken(current?.impact_source?.fault_asset_token || '');
      if (current?.scenario_id) setSelectedScenarioId(current.scenario_id);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void retry(); }, [retry]);

  const chooseScenario = useCallback(async (scenarioId: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const next = await selectScenario(scenarioId);
      setSnapshot(next);
      setSelectedScenarioId(scenarioId);
      setActiveAssetToken(next.impact_source?.fault_asset_token || '');
      return true;
    } catch (error) {
      console.error('Failed to select scenario:', error);
      setActionError('That scenario could not be loaded. The previous incident is still shown.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const chooseAsset = useCallback(async (assetToken: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const next = await selectScenario(selectedScenarioId, assetToken);
      setSnapshot(next);
      setActiveAssetToken(next.impact_source?.fault_asset_token || '');
    } catch (error) {
      console.error('Failed to select AEP asset:', error);
      setActionError('That equipment could not be simulated. The previous incident is still shown.');
    } finally {
      setBusy(false);
    }
  }, [selectedScenarioId]);

  const reset = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      const next = await resetScenario();
      setSnapshot(next);
      if (next?.scenario_id) setSelectedScenarioId(next.scenario_id);
      setActiveAssetToken(next?.impact_source?.fault_asset_token || '');
    } catch (error) {
      console.error('Failed to reset scenario:', error);
      setActionError('Reset failed. The current incident is unchanged.');
    } finally {
      setBusy(false);
    }
  }, []);

  const selectableAssets = useMemo(
    () => aepAssets.filter(asset => asset.kind === (selectedScenarioId === 'upstream_feeder' ? 'CIRCUIT_BREAKER' : 'TRANSFORMER')),
    [aepAssets, selectedScenarioId],
  );

  const value = useMemo<IncidentState>(() => ({
    snapshot, scenarios, aepAssets, selectedScenarioId, activeAssetToken, loading, busy, connectionError, actionError,
    retry, chooseScenario, chooseAsset, reset, selectableAssets,
  }), [snapshot, scenarios, aepAssets, selectedScenarioId, activeAssetToken, loading, busy, connectionError, actionError, retry, chooseScenario, chooseAsset, reset, selectableAssets]);

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncident() {
  const value = useContext(IncidentContext);
  if (!value) throw new Error('useIncident must be used inside IncidentProvider');
  return value;
}
